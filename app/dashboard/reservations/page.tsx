import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getReservations, getUser } from "@/lib/db/queries";
import { mapDbReservation } from "@/lib/utils";
import { ReservationsClient } from "./reservations-client";

export const metadata: Metadata = {
  title: "予約管理",
  description: "予約一覧の確認およびステータス管理",
};

export const instant = false;

export default async function DashboardReservationsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  const rawList = await getReservations();
  const initialReservations = rawList.map(mapDbReservation);

  return <ReservationsClient initialReservations={initialReservations} />;
}
