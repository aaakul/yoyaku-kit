"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MoreVertical,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  UserPlus,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createStaffAccount, deleteStaffAccount, updateUserRole } from "@/lib/auth/actions";
import type { User } from "@/lib/db/schema";
import { type CreateStaffAccountInput, createStaffAccountSchema } from "@/lib/validations/auth";

interface AccountsClientProps {
  initialUsers: User[];
  currentUserId: string;
}

export function AccountsClient({ initialUsers, currentUserId }: AccountsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const managerCount = initialUsers.filter((u) => u.role === "manager").length;
  const staffCount = initialUsers.filter((u) => u.role === "staff").length;

  const {
    register: registerAdd,
    handleSubmit: handleAddSubmit,
    setValue: setAddValue,
    watch: watchAdd,
    reset: resetAdd,
    formState: { errors: addErrors, isSubmitting: isAddSubmitting },
  } = useForm<CreateStaffAccountInput>({
    resolver: zodResolver(createStaffAccountSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "staff",
    },
  });

  const currentAddRole = watchAdd("role");

  const onAddStaff = async (data: CreateStaffAccountInput) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("email", data.email);
    formData.append("password", data.password);
    formData.append("role", data.role);

    const res = await createStaffAccount({}, formData);
    if ("message" in res && res.message) {
      setErrorMsg(res.message);
    } else if ("success" in res && res.success) {
      setSuccessMsg(res.success);
      setIsAddOpen(false);
      resetAdd();
      router.refresh();
    }
  };

  const handleRoleChange = (userId: string, newRole: "staff" | "manager") => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("role", newRole);

    startTransition(async () => {
      const res = await updateUserRole({}, formData);
      if ("message" in res && res.message) {
        setErrorMsg(res.message);
      } else if ("success" in res && res.success) {
        setSuccessMsg(res.success);
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append("userId", deleteTarget.id);

    startTransition(async () => {
      const res = await deleteStaffAccount({}, formData);
      if ("message" in res && res.message) {
        setErrorMsg(res.message);
      } else if ("success" in res && res.success) {
        setSuccessMsg(res.success);
        setDeleteTarget(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-3xl">
            アカウント管理
          </h1>
        </div>

        <Button
          onClick={() => {
            setErrorMsg(null);
            resetAdd();
            setIsAddOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5 shadow-xs"
        >
          <UserPlus className="size-3.5" />
          新規アカウント登録
        </Button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">登録アカウント総数</p>
              <p className="text-2xl font-bold font-serif text-foreground mt-0.5">
                {initialUsers.length}{" "}
                <span className="text-xs font-sans font-normal text-muted-foreground">名</span>
              </p>
            </div>
            <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              <Users className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-primary">管理者</p>
              <p className="text-2xl font-bold font-serif text-foreground mt-0.5">
                {managerCount}{" "}
                <span className="text-xs font-sans font-normal text-muted-foreground">名</span>
              </p>
            </div>
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-200/80 shadow-xs dark:border-stone-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400">スタッフ</p>
              <p className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-100 mt-0.5">
                {staffCount}{" "}
                <span className="text-xs font-sans font-normal text-stone-500">名</span>
              </p>
            </div>
            <div className="size-10 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300">
              <UserIcon className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-stone-200/80 shadow-xs dark:border-stone-800">
        <CardHeader className="pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold">スタッフ一覧</CardTitle>
              <CardDescription className="text-xs">
                店舗管理サイトにアクセスできるアカウント
              </CardDescription>
            </div>
            {isPending && (
              <div className="flex items-center gap-1.5 text-xs text-stone-400">
                <Loader2 className="size-3.5 animate-spin" />
                更新中...
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/75 border-b border-stone-200/80 dark:bg-stone-900/60 dark:border-stone-800 text-[11px] text-stone-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">表示名</th>
                  <th className="py-3 px-4 font-semibold">メールアドレス</th>
                  <th className="py-3 px-4 font-semibold">権限</th>
                  <th className="py-3 px-4 font-semibold">登録日</th>
                  <th className="py-3 px-4 font-semibold text-right">メニュー</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {initialUsers.map((item) => {
                  const isCurrent = item.id === currentUserId;
                  const isManager = item.role === "manager";
                  const isDemo = item.role === "demo";
                  const isOnlyManager = isManager && managerCount <= 1;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-stone-50/50 dark:hover:bg-stone-900/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8">
                            <AvatarFallback
                              className={`text-xs font-medium ${
                                isManager
                                  ? "bg-primary/10 text-primary"
                                  : isDemo
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {item.name.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-foreground flex items-center gap-1.5">
                              {item.name}
                              {isCurrent && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4 px-1 py-0 font-normal border-primary/30 text-primary bg-primary/10"
                                >
                                  自分（ログイン中）
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                        {item.email}
                      </td>
                      <td className="py-3 px-4">
                        {isManager ? (
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/15 border-primary/20 text-[10px] gap-1 px-2 py-0.5">
                            <ShieldCheck className="size-3" />
                            管理者
                          </Badge>
                        ) : isDemo ? (
                          <Badge
                            variant="secondary"
                            className="bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 border-amber-500/20 text-[10px] gap-1 px-2 py-0.5"
                          >
                            <UserIcon className="size-3" />
                            デモ
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-stone-100 text-stone-700 hover:bg-stone-200/80 dark:bg-stone-800 dark:text-stone-300 text-[10px] gap-1 px-2 py-0.5"
                          >
                            <UserIcon className="size-3" />
                            スタッフ
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-500 dark:text-stone-400 text-[11px]">
                        {new Date(item.createdAt).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                              disabled={isDemo || isPending}
                              title={isDemo ? "デモアカウントは変更・削除できません" : undefined}
                            >
                              <MoreVertical className="size-3.5" />
                              <span className="sr-only">メニューを開く</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-[11px] font-normal text-stone-500">
                              権限設定
                            </DropdownMenuLabel>
                            {isManager ? (
                              <DropdownMenuItem
                                className="cursor-pointer text-xs"
                                disabled={isOnlyManager || isPending}
                                onClick={() => handleRoleChange(item.id, "staff")}
                              >
                                <UserIcon className="mr-2 size-3.5 text-stone-500" />
                                スタッフに変更
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="cursor-pointer text-xs"
                                disabled={isPending}
                                onClick={() => handleRoleChange(item.id, "manager")}
                              >
                                <ShieldCheck className="mr-2 size-3.5 text-primary" />
                                管理者に昇格
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              className="cursor-pointer text-xs text-red-600 focus:text-red-600 dark:text-red-400"
                              disabled={isCurrent || isOnlyManager || isPending}
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="mr-2 size-3.5" />
                              アカウントを削除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Add staff */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">新規アカウント登録</DialogTitle>
            <DialogDescription className="text-xs">
              店舗管理コンソールにログイン可能なスタッフアカウントを発行します。
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit(onAddStaff)} noValidate className="space-y-2.5 py-2">
            <div className="space-y-1">
              <Label htmlFor="staff-name" className="text-xs font-medium">
                氏名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="staff-name"
                {...registerAdd("name")}
                placeholder="例：佐藤 健一"
                className={`h-9 text-xs ${addErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              <FieldError error={addErrors.name?.message} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="staff-email" className="text-xs font-medium">
                メールアドレス <span className="text-red-500">*</span>
              </Label>
              <Input
                id="staff-email"
                type="email"
                {...registerAdd("email")}
                placeholder="staff@example.com"
                className={`h-9 text-xs font-mono ${addErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              <FieldError error={addErrors.email?.message} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="staff-password" className="text-xs font-medium">
                初期パスワード <span className="text-red-500">*</span>
              </Label>
              <Input
                id="staff-password"
                type="password"
                {...registerAdd("password")}
                placeholder="半角英数字8文字以上"
                className={`h-9 text-xs ${addErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              <FieldError error={addErrors.password?.message} />
              <p className="text-[10px] text-stone-400">
                ※ 登録後、スタッフ自身でセキュリティ設定からパスワードを変更可能です。
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">役割・権限</Label>
              <RadioGroup
                value={currentAddRole}
                onValueChange={(val) =>
                  setAddValue("role", val as "staff" | "manager", {
                    shouldValidate: true,
                  })
                }
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                <label
                  htmlFor="role-staff"
                  className={`flex items-start space-x-2.5 rounded-lg border p-3 cursor-pointer transition-colors ${
                    currentAddRole === "staff" ? "border-primary/40 bg-primary/5" : "border-border"
                  }`}
                >
                  <RadioGroupItem value="staff" id="role-staff" className="mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground block">スタッフ</span>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      予約台帳の閲覧、来店受付・キャンセル対応
                    </p>
                  </div>
                </label>

                <label
                  htmlFor="role-manager"
                  className={`flex items-start space-x-2.5 rounded-lg border p-3 cursor-pointer transition-colors ${
                    currentAddRole === "manager"
                      ? "border-primary/40 bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <RadioGroupItem value="manager" id="role-manager" className="mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground block">管理者</span>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      座席・営業時間・CMS・スタッフアカウント管理を含む全権限
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="text-xs h-9"
                onClick={() => setIsAddOpen(false)}
                disabled={isPending || isAddSubmitting}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9"
                disabled={isPending || isAddSubmitting}
              >
                {isPending || isAddSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                    登録中...
                  </>
                ) : (
                  "スタッフを登録"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Delete confirmation */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <ShieldAlert className="size-5" />
              <AlertDialogTitle className="text-sm font-bold">
                アカウントの削除確認
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-stone-600 dark:text-stone-300">
              スタッフ「{deleteTarget?.name}」（{deleteTarget?.email}
              ）のアカウントを完全に削除します。
              削除後はこのアカウントで店舗管理コンソールにログインできなくなります。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs" disabled={isPending}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white text-xs"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "削除中..." : "削除する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
