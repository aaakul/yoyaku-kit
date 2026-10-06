import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/db/queries";
import { ProfileClient } from "./profile-client";

export const metadata: Metadata = {
  title: "プロフィール設定",
  description: "アカウントのプロフィールおよびパスワード設定",
};

export const instant = false;

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  return <ProfileClient initialUser={user} />;
}
