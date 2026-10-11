import { useTranslations } from "next-intl";
import { restaurantConfig } from "@/config/restaurant";
import type { Restaurant } from "@/lib/db/schema";
import { MapFacade } from "./map-facade";

export interface AccessHoursProps {
  restaurant?: Partial<Restaurant> | null;
}

export function AccessHours({ restaurant }: AccessHoursProps = {}) {
  const t = useTranslations("home");
  const tCommon = useTranslations("common");
  const { businessHours, contact, access } = restaurantConfig;
  const { lunch } = businessHours;
  const dinner = t("dinner_hours");
  const closedDays = t("closed_days_value");
  const note = t("hours_note");
  const address = tCommon("address");
  const phone = restaurant?.phone || contact.phone;
  const email = contact.email;
  const googleMapsEmbedUrl = access.googleMapsEmbedUrl;

  let stations = access.station;
  try {
    const raw = t.raw("transit_stations");
    if (Array.isArray(raw) && raw.length > 0) {
      stations = raw as typeof stations;
    }
  } catch {
    // Fallback to static config
  }

  return (
    <section
      id="access"
      className="scroll-mt-16 py-20 text-stone-900 transition-colors dark:text-stone-100"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center animate-fade-up">
          <h2 className="mt-2 font-serif text-2xl font-bold tracking-widest text-stone-900 dark:text-stone-100 sm:text-3xl">
            {t("access_title")}
          </h2>
          <div className="mx-auto my-3 h-px w-10 bg-primary/60" />
        </div>

        <div className="mt-12 grid grid-cols-1 items-stretch gap-8 lg:grid-cols-2">
          {/* Store hours and details */}
          <div className="space-y-6 rounded-lg border border-border bg-card/60 p-6 sm:p-8 animate-fade-up">
            <div>
              <h3 className="border-b border-border pb-3 font-serif text-lg font-bold tracking-wider text-stone-900 dark:text-stone-100">
                {t("hours_heading")}
              </h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-500 dark:text-stone-400">{t("lunch")}</dt>
                  <dd className="font-medium text-stone-800 dark:text-stone-200">{lunch}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500 dark:text-stone-400">{t("dinner")}</dt>
                  <dd className="font-medium text-stone-800 dark:text-stone-200">{dinner}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500 dark:text-stone-400">{t("closed_days")}</dt>
                  <dd className="font-medium text-stone-800 dark:text-stone-200">{closedDays}</dd>
                </div>
              </dl>
              {note && <p className="mt-4 text-xs font-medium text-primary">{note}</p>}
            </div>

            <div className="pt-2">
              <h3 className="border-b border-border pb-3 font-serif text-lg font-bold tracking-wider text-stone-900 dark:text-stone-100">
                {t("info_heading")}
              </h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-stone-500 dark:text-stone-400">
                    {t("address_label")}
                  </dt>
                  <dd className="mt-0.5 text-stone-800 dark:text-stone-200">{address}</dd>
                </div>
                <div>
                  <dt className="text-xs text-stone-500 dark:text-stone-400">{t("phone_label")}</dt>
                  <dd className="mt-0.5 font-medium text-stone-800 dark:text-stone-200">
                    <a
                      href={`tel:${phone}`}
                      className="transition hover:text-primary hover:underline"
                    >
                      {phone}
                    </a>
                  </dd>
                </div>
                {email && (
                  <div>
                    <dt className="text-xs text-stone-500 dark:text-stone-400">
                      {t("email_label")}
                    </dt>
                    <dd className="mt-0.5 text-stone-800 dark:text-stone-200">{email}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Transit access and map */}
          <div className="flex flex-col space-y-6 rounded-lg border border-border bg-card/60 p-6 sm:p-8 animate-fade-up [animation-delay:150ms]">
            <div>
              <h3 className="border-b border-border pb-3 font-serif text-lg font-bold tracking-wider text-stone-900 dark:text-stone-100">
                {t("access_heading")}
              </h3>
              <ul className="mt-4 space-y-2 text-xs sm:text-sm">
                {stations.map((st) => (
                  <li key={st.name} className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-stone-800 dark:text-stone-200">
                      {st.name}
                    </span>
                    <span className="text-stone-500 dark:text-stone-400">{st.description}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <p>{t("parking_car")}</p>
                <p className="mt-1">{t("parking_bicycle")}</p>
              </div>
            </div>

            <div className="relative min-h-[220px] flex-1 overflow-hidden rounded-md border border-border bg-muted">
              <MapFacade embedUrl={googleMapsEmbedUrl} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
