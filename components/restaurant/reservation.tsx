import { useTranslations } from "next-intl";
import { restaurantConfig } from "@/config/restaurant";
import { Link } from "@/i18n/navigation";
import type { Restaurant } from "@/lib/db/schema";

export interface ReservationProps {
  restaurant?: Partial<Restaurant> | null;
}

export function Reservation({ restaurant }: ReservationProps = {}) {
  const t = useTranslations("home");
  const { contact, totalSeats, booking } = restaurantConfig;
  const diningDurationMinutes =
    restaurant?.defaultDurationMinutes ?? booking.defaultDurationMinutes;

  return (
    <section
      id="reservation"
      className="scroll-mt-16 bg-secondary/40 py-20 transition-colors border-y border-border"
    >
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 animate-fade-up">
        <h2 className="mt-2 font-serif text-2xl font-bold tracking-widest text-stone-900 dark:text-stone-100 sm:text-3xl">
          {t("reservation_title")}
        </h2>
        <div className="mx-auto my-3 h-px w-10 bg-primary/60" />
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          {t("reservation_note")}
        </p>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          {t("reservation_seats", { count: totalSeats })}
        </p>
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          {t("reservation_duration", { minutes: diningDurationMinutes })}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/reserve"
            className="inline-flex w-full items-center justify-center rounded bg-primary px-8 py-3.5 text-center font-serif text-sm font-semibold tracking-widest text-primary-foreground shadow-xs transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
          >
            {t("reservation_cta_web")}
          </Link>
          <a
            href={`tel:${contact.phone}`}
            className="inline-flex w-full items-center justify-center rounded border border-primary/30 bg-transparent px-8 py-3.5 text-center font-serif text-sm font-semibold tracking-widest text-primary transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
          >
            {t("reservation_cta_phone", { phone: contact.phoneDisplay })}
          </a>
        </div>
      </div>
    </section>
  );
}
