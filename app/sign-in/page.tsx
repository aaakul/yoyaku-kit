import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignIn } from "@/components/auth/sign-in";
import { getUser } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "店舗管理者ログイン",
  description: "店舗管理・予約システム ログイン画面",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SignInPage() {
  const user = await getUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}
