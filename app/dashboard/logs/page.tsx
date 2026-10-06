import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canViewManagerPages } from "@/lib/auth/middleware";
import { getReservationLogs, getUser } from "@/lib/db/queries";
import { AuditLogsClient } from "./logs-client";

export const metadata: Metadata = {
  title: "操作履歴",
  description: "予約変更およびシステム操作の操作ログ",
};

export const instant = false;

export default async function AuditLogsPage() {
  const currentUser = await getUser();
  if (!currentUser) {
    redirect("/sign-in");
  }

  // Manager and demo route guard
  if (!canViewManagerPages(currentUser.role)) {
    redirect("/dashboard");
  }

  const initialLogs = await getReservationLogs({ limit: 100 });

  return <AuditLogsClient initialLogs={initialLogs} />;
}
