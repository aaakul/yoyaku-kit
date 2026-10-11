import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { ReservationForm, ReservationFormSkeleton } from "@/components/restaurant/reservation-form";
import { SubpageHeader } from "@/components/restaurant/subpage-header";

export const instant = false;

export default async function ReservePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("reserve");

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground transition-colors">
      <SubpageHeader backLabel={t("back_to_top")} />

      <main className="mx-auto max-w-2xl px-4 pt-8 sm:px-6">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold tracking-widest text-foreground sm:text-3xl">
            {t("page_title")}
          </h1>
        </div>

        <Suspense fallback={<ReservationFormSkeleton />}>
          <ReservationForm />
        </Suspense>
      </main>
    </div>
  );
}
