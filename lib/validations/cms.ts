import { z } from "zod";

export const newsItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(100, "タイトルは100文字以内で入力してください"),
  content: z
    .string()
    .trim()
    .min(1, "本文を入力してください")
    .max(1000, "本文は1000文字以内で入力してください"),
  category: z
    .string()
    .trim()
    .min(1, "カテゴリーを入力してください")
    .max(30, "カテゴリーは30文字以内で入力してください"),
  publishedAt: z.string().trim().min(1, "日付を入力してください"),
  isPublished: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export type NewsItemInput = z.infer<typeof newsItemSchema>;
