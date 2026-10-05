import type { z } from "zod";
import { getUser } from "@/lib/db/queries";
import type { User } from "@/lib/db/schema";
import { AUTH_ERROR, type AuthErrorCode } from "@/lib/errors/codes";

export type ActionFunction<T> = (
  stateOrFormData: unknown,
  maybeFormData?: FormData,
) => Promise<T | { code: AuthErrorCode; message: string }>;

function extractFormData(first: unknown, second?: FormData): FormData {
  return second instanceof FormData ? second : (first as FormData);
}

type ValidatedActionWithUserFunction<S extends z.ZodTypeAny, T> = (
  data: z.infer<S>,
  formData: FormData,
  user: User,
) => Promise<T>;

export function canViewManagerPages(role?: string | null): boolean {
  return role === "manager" || role === "demo";
}

export async function assertManager(): Promise<User> {
  const user = await getUser();
  if (!user) {
    throw new Error("認証されていません。ログインしてください。");
  }
  if (user.role === "demo") {
    throw new Error("デモアカウントのため、この操作は許可されていません。");
  }
  if (user.role !== "manager") {
    throw new Error("この操作を実行する権限がありません（管理者権限が必要です）。");
  }
  return user;
}

export function validatedActionWithUser<S extends z.ZodTypeAny, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>,
): ActionFunction<T> {
  return async (first: unknown, second?: FormData) => {
    const formData = extractFormData(first, second);
    const user = await getUser();
    if (!user) {
      return {
        code: AUTH_ERROR.UNAUTHENTICATED,
        message: "認証されていません。ログインしてください。",
      };
    }
    if (user.role === "demo") {
      return {
        code: AUTH_ERROR.DEMO_RESTRICTED,
        message: "デモアカウントのため、この操作は許可されていません。",
      };
    }

    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return {
        code: AUTH_ERROR.VALIDATION_FAILED,
        message: result.error.issues[0].message,
      };
    }

    return action(result.data, formData, user);
  };
}

export function validatedActionWithManager<S extends z.ZodTypeAny, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>,
): ActionFunction<T> {
  return async (first: unknown, second?: FormData) => {
    const formData = extractFormData(first, second);
    let user: User;
    try {
      user = await assertManager();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "権限がありません。";
      const code = message.includes("デモ")
        ? AUTH_ERROR.DEMO_RESTRICTED
        : message.includes("管理者")
          ? AUTH_ERROR.FORBIDDEN
          : AUTH_ERROR.UNAUTHENTICATED;
      return { code, message };
    }

    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return {
        code: AUTH_ERROR.VALIDATION_FAILED,
        message: result.error.issues[0].message,
      };
    }

    return action(result.data, formData, user);
  };
}
