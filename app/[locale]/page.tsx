import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { About } from "@/components/restaurant/about";
import { AccessHours } from "@/components/restaurant/access-hours";
import { Footer } from "@/components/restaurant/footer";
import { Header } from "@/components/restaurant/header";
import { Hero } from "@/components/restaurant/hero";
import { Menu } from "@/components/restaurant/menu";
import { News, NewsSkeleton } from "@/components/restaurant/news";
import { Reservation } from "@/components/restaurant/reservation";
import { getPathname } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";
import { getNewsList, getRestaurant } from "@/lib/db/queries";

async function DynamicReservation() {
  const restaurant = await getRestaurant();
  return <Reservation restaurant={restaurant} />;
}

async function DynamicAccessHours() {
  const restaurant = await getRestaurant();
  return <AccessHours restaurant={restaurant} />;
}

async function DynamicNews() {
  const restaurant = await getRestaurant();
  const newsList = restaurant ? await getNewsList(restaurant.id, true) : [];
  return <News newsList={newsList.length > 0 ? newsList : undefined} />;
}

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return {
    title: t("meta_title"),
    description: t("meta_desc"),
    alternates: {
      canonical: getPathname({ href: "/", locale: locale as Locale }),
      languages: Object.fromEntries(
        routing.locales.map((loc) => [loc, getPathname({ href: "/", locale: loc })]),
      ),
    },
  };
}

export default async function RestaurantHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen flex-col washi-bg text-foreground selection:bg-primary selection:text-primary-foreground">
      <Header />
      <main className="flex-1">
        <Hero />
        <About />
        <Menu />
        <Suspense fallback={<Reservation />}>
          <DynamicReservation />
        </Suspense>
        <Suspense fallback={<AccessHours />}>
          <DynamicAccessHours />
        </Suspense>
        <Suspense fallback={<NewsSkeleton />}>
          <DynamicNews />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
