import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ReservationForm, ReservationFormSkeleton } from "@/components/restaurant/reservation-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { restaurantConfig } from "@/config/restaurant";

export default function ReservePage() {
  return (
    <div className="min-h-screen bg-background pb-20 text-foreground transition-colors">
      <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-primary"
          >
            <ChevronLeft className="size-4" />
            店舗トップへ戻る
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-serif text-sm font-bold tracking-widest text-primary">
              {restaurantConfig.name}
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-8 sm:px-6">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold tracking-widest text-foreground sm:text-3xl">
            WEB予約
          </h1>
        </div>

        <Suspense fallback={<ReservationFormSkeleton />}>
          <ReservationForm />
        </Suspense>
      </main>
    </div>
  );
}
