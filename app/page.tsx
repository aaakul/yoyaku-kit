import { About } from "@/components/restaurant/about";
import { AccessHours } from "@/components/restaurant/access-hours";
import { Footer } from "@/components/restaurant/footer";
import { Header } from "@/components/restaurant/header";
import { Hero } from "@/components/restaurant/hero";
import { Menu } from "@/components/restaurant/menu";
import { News } from "@/components/restaurant/news";
import { Reservation } from "@/components/restaurant/reservation";
import { getNewsList, getRestaurant } from "@/lib/db/queries";

export default async function RestaurantHomePage() {
  const restaurant = await getRestaurant();

  const newsList = restaurant ? await getNewsList(restaurant.id, true) : [];

  return (
    <div className="flex min-h-screen flex-col washi-bg text-foreground selection:bg-primary selection:text-primary-foreground">
      <Header />
      <main className="flex-1">
        <Hero />
        <About />
        <Menu />
        <Reservation restaurant={restaurant} />
        <AccessHours restaurant={restaurant} />
        <News newsList={newsList.length > 0 ? newsList : undefined} />
      </main>
      <Footer />
    </div>
  );
}
