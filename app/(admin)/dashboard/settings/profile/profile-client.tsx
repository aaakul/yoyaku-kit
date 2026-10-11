"use client";

import { CheckCircle2, KeyRound, Loader2, Trash2, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccount, updateAccount, updatePassword } from "@/lib/auth/actions";
import type { User } from "@/lib/db/schema";

type AccountState = {
  name?: string;
  code?: string;
  message?: string;
  success?: string;
};

type PasswordState = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  code?: string;
  message?: string;
  success?: string;
};

type DeleteState = {
  password?: string;
  code?: string;
  message?: string;
  success?: string;
};

function AccountFormFields({
  state,
  nameValue,
  emailValue,
  roleValue,
}: {
  state: AccountState;
  nameValue: string;
  emailValue: string;
  roleValue: string;
}) {
  return (
    <>
      <div className="flex items-center gap-2 pb-1">
        <span className="text-xs text-stone-500 dark:text-stone-400">権限：</span>
        <Badge
          variant="outline"
          className={`text-[10px] px-2 py-0.5 font-normal ${
            roleValue === "manager"
              ? "border-primary/30 text-primary bg-primary/10"
              : roleValue === "demo"
                ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                : "border-border text-muted-foreground bg-muted/50"
          }`}
        >
          {roleValue === "manager"
            ? "管理者"
            : roleValue === "demo"
              ? "閲覧専用"
              : "スタッフ（予約確認・受付）"}
        </Badge>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-xs font-medium text-foreground">
          表示名
        </Label>
        <Input
          id="name"
          name="name"
          placeholder="山田 太郎"
          defaultValue={state.name || nameValue}
          required
          className="h-9 text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-medium text-foreground">
          ログインメールアドレス
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="staff@example.com"
          defaultValue={emailValue}
          required
          className="h-9 text-xs font-mono"
        />
      </div>
    </>
  );
}

function AccountSection({ initialUser }: { initialUser: User }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<AccountState, FormData>(updateAccount, {});

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <Card className="border-border shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserIcon className="size-4 text-primary" />
          <CardTitle className="text-sm font-bold">基本情報</CardTitle>
        </div>
        <CardDescription className="text-xs">
          管理画面で表示される名前や、通知・ログインに使用するメールアドレスを変更します
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" action={formAction}>
          <AccountFormFields
            state={state}
            nameValue={initialUser?.name ?? ""}
            emailValue={initialUser?.email ?? ""}
            roleValue={initialUser?.role ?? "staff"}
          />
          {state.message ? (
            <FieldError error={state.message} />
          ) : state.success ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium min-h-4">
              <CheckCircle2 className="size-4" />
              <span>{state.success}</span>
            </div>
          ) : (
            <FieldError error={null} />
          )}
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                保存中...
              </>
            ) : (
              "基本情報を保存する"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordSection() {
  const [passwordState, passwordAction, isPasswordPending] = useActionState<
    PasswordState,
    FormData
  >(updatePassword, {});

  return (
    <Card className="border-border shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary" />
          <CardTitle className="text-sm font-bold">パスワードを変更</CardTitle>
        </div>
        <CardDescription className="text-xs">
          8文字以上のパスワードを設定してください
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-3.5" action={passwordAction}>
          <div className="space-y-1.5">
            <Label htmlFor="current-password" className="text-xs font-medium text-foreground">
              現在のパスワード
            </Label>
            <Input
              id="current-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              maxLength={100}
              defaultValue={passwordState.currentPassword}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-xs font-medium text-foreground">
              新しいパスワード
            </Label>
            <Input
              id="new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={100}
              defaultValue={passwordState.newPassword}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-xs font-medium text-foreground">
              新しいパスワード（確認用）
            </Label>
            <Input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              maxLength={100}
              defaultValue={passwordState.confirmPassword}
              className="h-9 text-xs"
            />
          </div>

          {passwordState.message ? (
            <FieldError error={passwordState.message} />
          ) : passwordState.success ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium min-h-4">
              <CheckCircle2 className="size-4" />
              <span>{passwordState.success}</span>
            </div>
          ) : (
            <FieldError error={null} />
          )}

          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
            disabled={isPasswordPending}
          >
            {isPasswordPending ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                更新中...
              </>
            ) : (
              "パスワードを更新する"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DangerZoneSection() {
  const [deleteState, deleteAction, isDeletePending] = useActionState<DeleteState, FormData>(
    deleteAccount,
    {},
  );

  return (
    <Card className="border-red-200/60 shadow-xs dark:border-red-950">
      <CardHeader>
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <Trash2 className="size-4" />
          <CardTitle className="text-sm font-bold">アカウントを削除</CardTitle>
        </div>
        <CardDescription className="text-xs">
          アカウントを削除すると、システムにログインできなくなります（※
          管理者アカウントが1つしかない場合は削除できません。）
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={deleteAction} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label
              htmlFor="delete-password"
              className="text-xs font-medium text-stone-700 dark:text-stone-300"
            >
              削除を確認するため、現在のパスワードを入力してください
            </Label>
            <Input
              id="delete-password"
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={100}
              defaultValue={deleteState.password}
              className="h-9 text-xs"
              placeholder="現在のパスワード"
            />
          </div>

          <FieldError error={deleteState.message} />

          <Button
            type="submit"
            variant="destructive"
            className="text-xs"
            disabled={isDeletePending}
          >
            {isDeletePending ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                削除処理中...
              </>
            ) : (
              "アカウントを削除する"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ProfileClient({ initialUser }: { initialUser: User }) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-3xl">
          アカウント設定
        </h1>
      </div>

      <AccountSection initialUser={initialUser} />
      <PasswordSection />
      <DangerZoneSection />
    </div>
  );
}
