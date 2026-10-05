"use server";

import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/better-auth";
import { validatedActionWithManager, validatedActionWithUser } from "@/lib/auth/middleware";
import { db } from "@/lib/db/drizzle";
import { account, user } from "@/lib/db/schema";
import { AUTH_ERROR } from "@/lib/errors/codes";
import {
  createStaffAccountSchema,
  deleteAccountSchema,
  deleteStaffAccountSchema,
  updateAccountSchema,
  updatePasswordSchema,
  updateUserRoleSchema,
} from "@/lib/validations/auth";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, currentUser) => {
    const { name, email } = data;
    await db
      .update(user)
      .set({ name, email, updatedAt: new Date() })
      .where(eq(user.id, currentUser.id));
    safeRevalidate("/dashboard/settings/profile");
    return { name, success: "アカウント情報を更新しました。" };
  },
);

export const updatePassword = validatedActionWithUser(updatePasswordSchema, async (data) => {
  const { currentPassword, newPassword } = data;

  try {
    await auth.api.changePassword({
      body: {
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
    return { success: "パスワードを更新しました。" };
  } catch (err: unknown) {
    const error = err as { message?: string } | undefined;
    return {
      code: AUTH_ERROR.PASSWORD_CHANGE_FAILED,
      message: error?.message || "パスワードの変更に失敗しました。",
    };
  }
});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (_, __, currentUser) => {
    if (currentUser.role === "manager") {
      const managers = await db.select({ id: user.id }).from(user).where(eq(user.role, "manager"));

      if (managers.length <= 1) {
        return {
          code: AUTH_ERROR.CANNOT_DELETE_LAST_MANAGER,
          message: "最後の管理者アカウントは削除できません。別の管理者を任命してください。",
        };
      }
    }

    await db.delete(user).where(eq(user.id, currentUser.id));
    redirect("/sign-in");
  },
);

export const createStaffAccount = validatedActionWithManager(
  createStaffAccountSchema,
  async (data) => {
    const { name, email, password, role } = data;

    const existing = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existing.length > 0) {
      return {
        code: AUTH_ERROR.EMAIL_ALREADY_EXISTS,
        message: "このメールアドレスは既に登録されています。",
      };
    }

    const { hashPassword } = await import("better-auth/crypto");
    const hashedPassword = await hashPassword(password);
    const newUserId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      await tx.insert(user).values({
        id: newUserId,
        name,
        email,
        role,
        emailVerified: true,
      });

      await tx.insert(account).values({
        id: crypto.randomUUID(),
        accountId: newUserId,
        providerId: "credential",
        userId: newUserId,
        password: hashedPassword,
      });
    });

    safeRevalidate("/dashboard/settings/accounts");
    return { success: `アカウント「${name}」を作成しました。` };
  },
);

export const updateUserRole = validatedActionWithManager(updateUserRoleSchema, async (data) => {
  const { userId, role } = data;

  const [target] = await db.select().from(user).where(eq(user.id, userId)).limit(1);

  if (!target) {
    return {
      code: AUTH_ERROR.USER_NOT_FOUND,
      message: "対象のアカウントが見つかりません。",
    };
  }

  if (target.role === "demo") {
    return {
      code: AUTH_ERROR.CANNOT_MODIFY_DEMO,
      message: "デモアカウントの権限は変更できません。",
    };
  }

  if (target.role === "manager" && role !== "manager") {
    const managers = await db.select({ id: user.id }).from(user).where(eq(user.role, "manager"));

    if (managers.length <= 1) {
      return {
        code: AUTH_ERROR.CANNOT_DEMOTE_LAST_MANAGER,
        message: "最後の管理者アカウントは降格できません。",
      };
    }
  }

  await db.update(user).set({ role, updatedAt: new Date() }).where(eq(user.id, userId));

  safeRevalidate("/dashboard/settings/accounts");
  return { success: `「${target.name}」の権限を更新しました。` };
});

export const deleteStaffAccount = validatedActionWithManager(
  deleteStaffAccountSchema,
  async (data, _, currentUser) => {
    const { userId } = data;

    if (userId === currentUser.id) {
      return {
        code: AUTH_ERROR.CANNOT_DELETE_SELF,
        message: "自分自身のアカウントはここから削除できません。",
      };
    }

    const [target] = await db.select().from(user).where(eq(user.id, userId)).limit(1);

    if (!target) {
      return {
        code: AUTH_ERROR.USER_NOT_FOUND,
        message: "対象のアカウントが見つかりません。",
      };
    }

    if (target.role === "demo") {
      return {
        code: AUTH_ERROR.CANNOT_MODIFY_DEMO,
        message: "デモアカウントは削除できません。",
      };
    }

    if (target.role === "manager") {
      const managers = await db.select({ id: user.id }).from(user).where(eq(user.role, "manager"));

      if (managers.length <= 1) {
        return {
          code: AUTH_ERROR.CANNOT_DELETE_LAST_MANAGER,
          message: "最後の管理者アカウントは削除できません。",
        };
      }
    }

    await db.delete(user).where(eq(user.id, userId));

    safeRevalidate("/dashboard/settings/accounts");
    return { success: `アカウント「${target.name}」を削除しました。` };
  },
);
