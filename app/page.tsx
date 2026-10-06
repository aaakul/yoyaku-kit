import { Suspense } from "react";
import { About } from "@/components/restaurant/about";
import { AccessHours } from "@/components/restaurant/access-hours";
import { Footer } from "@/components/restaurant/footer";
import { Header } from "@/components/restaurant/header";
import { Hero } from "@/components/restaurant/hero";
import { Menu } from "@/components/restaurant/menu";
import { News, NewsSkeleton } from "@/components/restaurant/news";
import { Reservation } from "@/components/restaurant/reservation";
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

export default function RestaurantHomePage() {
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
