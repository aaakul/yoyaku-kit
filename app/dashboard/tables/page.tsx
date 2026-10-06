import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DEFAULT_RESTAURANT_SLUG } from "@/config/restaurant";
import { canViewManagerPages } from "@/lib/auth/middleware";
import { getRestaurant, getRestaurantTables, getUser } from "@/lib/db/queries";
import { TablesClient } from "./tables-client";

export const metadata: Metadata = {
  title: "座席管理",
  description: "テーブル配置および座席ステータスの管理",
};

export const instant = false;

export default async function DashboardTablesPage() {
  const user = await getUser();
  if (!user || !canViewManagerPages(user.role)) {
    redirect("/dashboard");
  }

  const restaurant = await getRestaurant(DEFAULT_RESTAURANT_SLUG);
  const rawTables = restaurant ? await getRestaurantTables(restaurant.id) : [];
  const initialTables = rawTables.map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type || "テーブル席",
    capacity: t.capacity,
    active: t.active,
  }));

  return <TablesClient initialTables={initialTables} />;
}
