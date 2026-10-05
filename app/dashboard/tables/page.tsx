import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canViewManagerPages } from "@/lib/auth/middleware";
import { getUser } from "@/lib/db/queries";
import { TablesClient } from "./tables-client";

export const metadata: Metadata = {
  title: "座席管理",
  description: "テーブル配置および座席ステータスの管理",
};

export default async function DashboardTablesPage() {
  const user = await getUser();
  if (!user || !canViewManagerPages(user.role)) {
    redirect("/dashboard");
  }

  return <TablesClient />;
}
