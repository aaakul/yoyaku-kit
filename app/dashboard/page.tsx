import { connection } from "next/server";
import { Suspense } from "react";
import { DEFAULT_RESTAURANT_SLUG } from "@/config/restaurant";
import { getReservations, getRestaurant, getRestaurantTables } from "@/lib/db/queries";
import { getTodayJst, mapDbReservation } from "@/lib/utils";
import { OperationalDashboardClient } from "./dashboard-client";
import { DashboardSkeleton } from "./dashboard-skeleton";

async function DashboardContent() {
  await connection();
  const todayStr = getTodayJst();
  const restaurant = await getRestaurant(DEFAULT_RESTAURANT_SLUG);
  const [dbTables, dbReservations] = await Promise.all([
    restaurant ? getRestaurantTables(restaurant.id) : [],
    getReservations({ date: todayStr }),
  ]);

  const initialTables = dbTables.map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type || "テーブル席",
    capacity: t.capacity,
    active: t.active,
  }));

  const initialTodayReservations = dbReservations.map(mapDbReservation);

  return (
    <OperationalDashboardClient
      initialTables={initialTables}
      initialTodayReservations={initialTodayReservations}
    />
  );
}

export const instant = false;

export default function OperationalDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
