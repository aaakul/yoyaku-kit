import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import {
  ReservationDetail,
  ReservationDetailSkeleton,
} from "@/components/restaurant/reservation-detail";
import { SubpageHeader } from "@/components/restaurant/subpage-header";
import { getReservationByToken } from "@/lib/db/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reservations" });
  return {
    title: t("meta_title"),
    description: t("meta_desc"),
    robots: {
      index: false,
      follow: false,
    },
    referrer: "no-referrer",
  };
}

async function ReservationDetailContent({
  id,
  locale,
  searchParams,
}: {
  id: string;
  locale: string;
  searchParams: Promise<{ token?: string }>;
}) {
  await connection();
  const { token } = await searchParams;

  if (!token) {
    notFound();
  }

  const data = await getReservationByToken(token);
  if (!data || data.reservation.id !== id) {
    notFound();
  }

  return (
    <ReservationDetail
      reservation={data.reservation}
      restaurant={data.restaurant}
      token={token}
      locale={locale}
    />
  );
}

export const instant = false;

export default async function ReservationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("reservations");

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground transition-colors">
      <SubpageHeader backLabel={t("back_to_home")} />
      <Suspense fallback={<ReservationDetailSkeleton />}>
        <ReservationDetailContent id={id} locale={locale} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
