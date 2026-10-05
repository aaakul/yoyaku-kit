import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/db/queries";
import { ReservationsClient } from "./reservations-client";

export const metadata: Metadata = {
  title: "予約管理",
  description: "予約一覧の確認およびステータス管理",
};

export default async function DashboardReservationsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  return <ReservationsClient />;
}
