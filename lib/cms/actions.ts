"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { assertManager } from "@/lib/auth/middleware";
import { db } from "@/lib/db/drizzle";
import { news } from "@/lib/db/schema";
import { CMS_ERROR } from "@/lib/errors/codes";
import { newsItemSchema } from "@/lib/validations/cms";

export async function createNewsAction(data: {
  restaurantId: string;
  category: string;
  title: string;
  content: string;
  publishedAt: string;
  isPublished?: boolean;
  sortOrder?: number;
}) {
  try {
    await assertManager();

    const validated = newsItemSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: false,
        code: CMS_ERROR.VALIDATION_FAILED,
        message: validated.error.issues[0]?.message || "入力内容に誤りがあります",
      };
    }

    const [item] = await db
      .insert(news)
      .values({
        restaurantId: data.restaurantId,
        category: validated.data.category,
        title: validated.data.title,
        content: validated.data.content,
        publishedAt: validated.data.publishedAt,
        isPublished: validated.data.isPublished ?? true,
        sortOrder: validated.data.sortOrder ?? 0,
      })
      .returning();

    revalidatePath("/");
    revalidatePath("/dashboard/news");
    updateTag("news");
    return { success: true, item };
  } catch (err: unknown) {
    const error = err as { message?: string } | undefined;
    return {
      success: false,
      code: CMS_ERROR.SERVER_ERROR,
      message: error?.message || "お知らせの追加に失敗しました",
    };
  }
}

export async function updateNewsAction(data: {
  id: string;
  category: string;
  title: string;
  content: string;
  publishedAt: string;
  isPublished?: boolean;
  sortOrder?: number;
}) {
  try {
    await assertManager();

    const validated = newsItemSchema.safeParse(data);
    if (!validated.success) {
      return {
        success: false,
        code: CMS_ERROR.VALIDATION_FAILED,
        message: validated.error.issues[0]?.message || "入力内容に誤りがあります",
      };
    }

    const [item] = await db
      .update(news)
      .set({
        category: validated.data.category,
        title: validated.data.title,
        content: validated.data.content,
        publishedAt: validated.data.publishedAt,
        ...(validated.data.isPublished !== undefined
          ? { isPublished: validated.data.isPublished }
          : {}),
        ...(validated.data.sortOrder !== undefined ? { sortOrder: validated.data.sortOrder } : {}),
        updatedAt: new Date(),
      })
      .where(eq(news.id, data.id))
      .returning();

    revalidatePath("/");
    revalidatePath(`/news/${data.id}`);
    revalidatePath("/dashboard/news");
    updateTag("news");
    return { success: true, item };
  } catch (err: unknown) {
    const error = err as { message?: string } | undefined;
    return {
      success: false,
      code: CMS_ERROR.SERVER_ERROR,
      message: error?.message || "お知らせの更新に失敗しました",
    };
  }
}

export async function toggleNewsPublishedAction(id: string, isPublished: boolean) {
  try {
    await assertManager();
    await db.update(news).set({ isPublished, updatedAt: new Date() }).where(eq(news.id, id));

    revalidatePath("/");
    revalidatePath(`/news/${id}`);
    revalidatePath("/dashboard/news");
    updateTag("news");
    return { success: true };
  } catch (err: unknown) {
    const error = err as { message?: string } | undefined;
    return {
      success: false,
      code: CMS_ERROR.SERVER_ERROR,
      message: error?.message || "公開状態の更新に失敗しました",
    };
  }
}

export async function deleteNewsAction(id: string) {
  try {
    await assertManager();
    await db.delete(news).where(eq(news.id, id));

    revalidatePath("/");
    revalidatePath(`/news/${id}`);
    revalidatePath("/dashboard/news");
    updateTag("news");
    return { success: true };
  } catch (err: unknown) {
    const error = err as { message?: string } | undefined;
    return {
      success: false,
      code: CMS_ERROR.SERVER_ERROR,
      message: error?.message || "お知らせの削除に失敗しました",
    };
  }
}

export async function reorderNewsAction(newsIds: string[]) {
  try {
    await assertManager();
    for (let i = 0; i < newsIds.length; i++) {
      await db
        .update(news)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(eq(news.id, newsIds[i]));
    }

    revalidatePath("/");
    revalidatePath("/dashboard/news");
    updateTag("news");
    return { success: true };
  } catch (err: unknown) {
    const error = err as { message?: string } | undefined;
    return {
      success: false,
      code: CMS_ERROR.SERVER_ERROR,
      message: error?.message || "並び替えに失敗しました",
    };
  }
}
