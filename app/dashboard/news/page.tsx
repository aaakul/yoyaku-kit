import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canViewManagerPages } from "@/lib/auth/middleware";
import { getNewsList, getRestaurant, getUser } from "@/lib/db/queries";
import { NewsClient } from "./news-client";

export const metadata: Metadata = {
  title: "お知らせ管理",
  description: "店舗お知らせの投稿・編集・公開管理",
};

export default async function DashboardNewsPage() {
  const user = await getUser();
  if (!user || !canViewManagerPages(user.role)) {
    redirect("/dashboard");
  }

  const restaurant = await getRestaurant();
  if (!restaurant) {
    redirect("/dashboard");
  }

  const newsList = await getNewsList(restaurant.id, false);

  return <NewsClient restaurantId={restaurant.id} initialNews={newsList} />;
}
