"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Loader2, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { restaurantConfig } from "@/config/restaurant";
import { authClient } from "@/lib/auth/auth-client";
import { localizeAuthError } from "@/lib/auth/errors";
import { type SignInInput, signInSchema } from "@/lib/validations/auth";

export function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [serverError, setServerError] = useState<string | null>(null);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    mode: "onTouched",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: SignInInput) => {
    setServerError(null);

    try {
      const { error: signInError } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });

      if (signInError) {
        setServerError(localizeAuthError(signInError));
        return;
      }

      router.push(redirect);
      router.refresh();
    } catch (err: unknown) {
      setServerError(localizeAuthError(err));
    }
  };

  const handleDemoLogin = async () => {
    setServerError(null);
    setIsDemoLoading(true);

    try {
      const { error: signInError } = await authClient.signIn.email({
        email: process.env.NEXT_PUBLIC_INITIAL_DEMO_EMAIL || "demo@example.com",
        password: process.env.NEXT_PUBLIC_INITIAL_DEMO_PASSWORD || "12345678",
      });

      if (signInError) {
        setServerError(localizeAuthError(signInError));
        setIsDemoLoading(false);
        return;
      }

      router.push(redirect);
      router.refresh();
    } catch (err: unknown) {
      setServerError(localizeAuthError(err));
      setIsDemoLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-background p-4 text-foreground sm:p-8">
      {/* Top right quick theme toggle & home link */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <ThemeToggle />
        <Link
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          店舗トップへ
        </Link>
      </div>

      <div className="w-full max-w-[420px] space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <UtensilsCrossed className="size-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
              {restaurantConfig.name}
            </h1>
            <p className="text-xs tracking-widest text-muted-foreground">
              店舗管理システム・ログイン
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-border bg-card p-7 shadow-xs">
          {serverError && (
            <div className="mb-5 rounded-lg bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20 flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-medium text-foreground">
                メールアドレス
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                className={`h-10 text-sm ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                placeholder="admin@example.com"
              />
              <FieldError error={errors.email?.message} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium text-foreground">
                  パスワード
                </Label>
              </div>
              <Input
                id="password"
                type="password"
                {...register("password")}
                className={`h-10 text-sm ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              <FieldError error={errors.password?.message} />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || isDemoLoading}
              className="w-full h-11 shadow-xs font-medium transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="size-4 mr-2" />
              )}
              ログイン
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting || isDemoLoading}
              onClick={handleDemoLogin}
              className="w-full h-10 text-xs font-medium border-border"
            >
              {isDemoLoading && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              デモログイン
            </Button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-stone-400">
          © {new Date().getFullYear()} {restaurantConfig.name} All Rights Reserved.
        </p>
      </div>
    </main>
  );
}
