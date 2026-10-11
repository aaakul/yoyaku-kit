import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getUser } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: {
    default: "店舗管理コンソール",
    template: "%s | 店舗管理コンソール",
  },
  description: "店舗管理・予約台帳コンソール",
  robots: {
    index: false,
    follow: false,
  },
};

export const instant = false;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  return <DashboardShell initialUser={user}>{children}</DashboardShell>;
}
