export const authErrorMessages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "メールアドレスまたはパスワードが正しくありません。",
  INVALID_PASSWORD: "パスワードが正しくありません。",
  USER_NOT_FOUND: "メールアドレスまたはパスワードが正しくありません。",
  USER_EMAIL_NOT_FOUND: "メールアドレスまたはパスワードが正しくありません。",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "メールアドレスまたはパスワードが正しくありません。",
  INVALID_EMAIL: "有効なメールアドレスを入力してください。",
  PASSWORD_TOO_SHORT: "パスワードは8文字以上で入力してください。",
  PASSWORD_TOO_LONG: "パスワードが長すぎます。",
  USER_ALREADY_EXISTS: "このメールアドレスは既に登録されています。",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "このメールアドレスは既に登録されています。別のメールアドレスをお使いください。",
  SESSION_EXPIRED: "セッションの有効期限が切れました。再度ログインしてください。",
  FAILED_TO_CREATE_USER: "アカウントの作成に失敗しました。",
  FAILED_TO_CREATE_SESSION: "セッションの作成に失敗しました。",
};

export function localizeAuthError(error?: unknown): string {
  if (!error) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }

  const errObj = error as
    | { code?: string; message?: string; body?: { code?: string; message?: string } }
    | undefined;
  const rawCode = typeof error === "string" ? error : errObj?.code || errObj?.body?.code;
  const rawMessage = typeof error === "string" ? error : errObj?.message || errObj?.body?.message;

  if (rawCode && authErrorMessages[rawCode]) {
    return authErrorMessages[rawCode];
  }

  const normalized = `${rawCode || ""} ${rawMessage || ""}`.toLowerCase();
  if (
    normalized.includes("invalid_email_or_password") ||
    normalized.includes("invalid email or password") ||
    normalized.includes("invalid password") ||
    normalized.includes("user not found") ||
    normalized.includes("unauthorized") ||
    normalized.includes("credential")
  ) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }

  if (normalized.includes("already exists")) {
    return "このメールアドレスは既に登録されています。";
  }

  if (normalized.includes("too short")) {
    return "パスワードは8文字以上で入力してください。";
  }

  if (normalized.includes("invalid email")) {
    return "有効なメールアドレスを入力してください。";
  }

  return "ログイン処理中にエラーが発生しました。入力内容をご確認ください。";
}
