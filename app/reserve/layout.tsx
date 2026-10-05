import type { Metadata } from "next";
import { restaurantConfig } from "@/config/restaurant";

export const metadata: Metadata = {
  title: "オンライン予約",
  description: `${restaurantConfig.name}のオンライン予約。日時・人数を選択して24時間いつでもご予約いただけます。`,
};

export default function ReserveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
