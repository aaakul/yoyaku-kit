import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canViewManagerPages } from "@/lib/auth/middleware";
import { getUser, getUsers } from "@/lib/db/queries";
import { AccountsClient } from "./accounts-client";

export const metadata: Metadata = {
  title: "アカウント設定",
  description: "管理者およびスタッフアカウントの管理",
};

export default async function AccountsPage() {
  const currentUser = await getUser();
  if (!currentUser) {
    redirect("/sign-in");
  }

  // Manager and demo route guard
  if (!canViewManagerPages(currentUser.role)) {
    redirect("/dashboard");
  }

  const users = await getUsers();

  return <AccountsClient initialUsers={users} currentUserId={currentUser.id} />;
}
