import { z } from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください"),
  password: z
    .string()
    .min(1, "パスワードを入力してください")
    .min(6, "パスワードは6文字以上で入力してください"),
});

export const createStaffAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "氏名を入力してください")
    .max(100, "氏名は100文字以内で入力してください"),
  email: z
    .string()
    .trim()
    .min(1, "メールアドレスを入力してください")
    .email("有効なメールアドレスを入力してください"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
  role: z.enum(["staff", "manager"]),
});

export const updateAccountSchema = z.object({
  name: z.string().trim().min(1, "氏名を入力してください").max(100),
  email: z.string().trim().email("有効なメールアドレスを入力してください"),
});

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
    newPassword: z.string().min(8, "新しいパスワードは8文字以上で入力してください"),
    confirmPassword: z.string().min(1, "パスワードを入力してください"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "新しいパスワードが一致しません。",
    path: ["confirmPassword"],
  });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "パスワードを入力してください"),
});

export const updateUserRoleSchema = z.object({
  userId: z.string().min(1, "ユーザーIDを指定してください"),
  role: z.enum(["staff", "manager"]),
});

export const deleteStaffAccountSchema = z.object({
  userId: z.string().min(1, "ユーザーIDを指定してください"),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type CreateStaffAccountInput = z.infer<typeof createStaffAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type DeleteStaffAccountInput = z.infer<typeof deleteStaffAccountSchema>;
