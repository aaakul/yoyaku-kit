import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Download,
  MapPin,
  Phone,
  XCircle,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { restaurantConfig } from "@/config/restaurant";
import type { Reservation, Restaurant } from "@/lib/db/schema";
import { formatCalendarDate, formatJstDateTime, formatMaskedPhone } from "@/lib/utils";
import { CancelReservationDialog } from "./cancel-reservation-dialog";

export interface ReservationDetailProps {
  reservation: Reservation;
  restaurant: Restaurant;
  token: string;
  locale: string;
}

export function ReservationDetailSkeleton() {
  return (
    <main className="mx-auto max-w-xl px-4 pt-8 sm:px-6">
      <div className="text-center animate-pulse">
        <div className="mx-auto size-14 rounded-2xl bg-stone-200 dark:bg-stone-800" />
        <div className="mx-auto mt-4 h-7 w-48 rounded bg-stone-200 dark:bg-stone-800" />
        <div className="mx-auto mt-2 h-4 w-64 rounded bg-stone-200 dark:bg-stone-800" />
      </div>
      <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-xs animate-pulse space-y-4">
        <div className="h-6 w-32 rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-4 w-full rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-4 w-3/4 rounded bg-stone-200 dark:bg-stone-800" />
      </div>
    </main>
  );
}

export async function ReservationDetail({
  reservation,
  restaurant,
  token,
  locale,
}: ReservationDetailProps) {
  const t = await getTranslations({ locale, namespace: "reservations" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  const { dateDisplay, timeDisplay } = formatJstDateTime(
    reservation.startAt,
    reservation.endAt,
    locale,
  );

  const isCancelled = reservation.status === "cancelled";
  const isCompleted = reservation.status === "completed";
  const isNoShow = reservation.status === "no_show";

  const cutoffHours =
    restaurant.cancellationCutoffHours || restaurantConfig.booking.cancellationCutoffHours;
  const cutoffMs = cutoffHours * 60 * 60 * 1000;
  const isPastCutoff = reservation.startAt.getTime() - Date.now() < cutoffMs;

  const address = tCommon("address");
  const phone = restaurant.phone || restaurantConfig.contact.phone;
  const mapQuery = restaurant.address || restaurantConfig.contact.address || address;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  const restaurantName = tCommon("restaurant_name");
  const gcalDates = `${formatCalendarDate(reservation.startAt)}/${formatCalendarDate(reservation.endAt)}`;
  const gcalDetails = [
    t("gcal_store", { name: restaurantName }),
    t("gcal_guest", { name: reservation.customerName }),
    t("gcal_party", { count: reservation.partySize }),
    t("gcal_phone", { phone }),
    reservation.note ? t("gcal_note", { note: reservation.note }) : "",
  ]
    .filter(Boolean)
    .join("\n");
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    t("gcal_title", { restaurant: restaurantName }),
  )}&dates=${gcalDates}&details=${encodeURIComponent(gcalDetails)}&location=${encodeURIComponent(
    address,
  )}`;
  const icsDownloadUrl = `/api/reservations/ics?token=${token}&locale=${locale}`;

  return (
    <main className="mx-auto max-w-xl px-4 pt-8 sm:px-6">
      <div className="text-center">
        {isCancelled ? (
          <>
            <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              <XCircle className="size-7" />
            </div>
            <h1 className="mt-4 font-serif text-2xl font-bold tracking-wider text-stone-900 dark:text-stone-100">
              {t("title_cancelled")}
            </h1>
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">{t("desc_cancelled")}</p>
          </>
        ) : isNoShow ? (
          <>
            <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              <XCircle className="size-7" />
            </div>
            <h1 className="mt-4 font-serif text-2xl font-bold tracking-wider text-stone-900 dark:text-stone-100">
              {t("title_no_show")}
            </h1>
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">{t("desc_no_show")}</p>
          </>
        ) : isCompleted ? (
          <>
            <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
              <CheckCircle2 className="size-7" />
            </div>
            <h1 className="mt-4 font-serif text-2xl font-bold tracking-wider text-stone-900 dark:text-stone-100">
              {t("title_completed")}
            </h1>
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">{t("desc_completed")}</p>
          </>
        ) : (
          <>
            <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CheckCircle2 className="size-7" />
            </div>
            <h1 className="mt-4 font-serif text-2xl font-bold tracking-wider text-stone-900 dark:text-stone-100">
              {t("title_confirmed")}
            </h1>
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">{t("desc_confirmed")}</p>
          </>
        )}
      </div>

      <Card className="mt-8 overflow-hidden rounded-xl border-border shadow-xs">
        <CardHeader className="bg-secondary/40 pb-4 pt-5 border-b border-border">
          <CardTitle className="font-serif text-lg text-foreground">
            {t("customer_honorific", { name: reservation.customerName })}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 pt-5 text-xs">
          <div className="flex items-start justify-between border-b border-border pb-3">
            <span className="text-stone-600 dark:text-stone-400">{t("reservation_number")}</span>
            <span className="font-mono font-bold text-foreground">
              {reservation.reservationNumber || reservation.id}
            </span>
          </div>

          <div className="flex items-start justify-between border-b border-border pb-3">
            <span className="text-stone-600 dark:text-stone-400">{t("datetime_label")}</span>
            <div className="text-right">
              <p className="font-bold text-foreground">{dateDisplay}</p>
              <p className="text-stone-600 dark:text-stone-400">
                {timeDisplay}（{t("guests_unit", { count: reservation.partySize })}）
              </p>
            </div>
          </div>

          <div className="flex items-start justify-between border-b border-border pb-3">
            <span className="text-stone-600 dark:text-stone-400">{t("table_label")}</span>
            <span className="font-medium text-foreground">{t("table_value")}</span>
          </div>

          <div className="flex items-start justify-between border-b border-border pb-3">
            <span className="text-stone-600 dark:text-stone-400">{t("contact_label")}</span>
            <div className="text-right">
              <p className="font-mono text-foreground">
                {formatMaskedPhone(reservation.customerPhone)}
              </p>
              <p className="text-stone-600 dark:text-stone-400">{reservation.customerEmail}</p>
            </div>
          </div>

          {reservation.note && (
            <div className="flex items-start justify-between border-b border-border pb-3">
              <span className="text-stone-600 dark:text-stone-400">{t("note_label")}</span>
              <span className="max-w-[60%] text-right text-stone-700 dark:text-stone-300">
                {reservation.note}
              </span>
            </div>
          )}

          <div className="flex items-start justify-between">
            <span className="text-stone-600 dark:text-stone-400">{t("status_label")}</span>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                isCancelled
                  ? "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                  : isNoShow
                    ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                    : isCompleted
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
              }`}
            >
              {isCancelled
                ? t("status_cancelled")
                : isNoShow
                  ? t("status_no_show")
                  : isCompleted
                    ? t("status_completed")
                    : t("status_confirmed")}
            </span>
          </div>
        </CardContent>
      </Card>

      {!isCancelled && !isCompleted && !isNoShow && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Calendar className="size-4 text-primary" />
            {t("calendar_card_title")}
          </div>
          <p className="mt-1 text-muted-foreground">{t("calendar_card_desc")}</p>
          <div className="mt-3 flex gap-2">
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/50 py-2 font-medium text-foreground transition hover:bg-secondary"
            >
              {t("google_calendar")}
            </a>
            <a
              href={icsDownloadUrl}
              download="reservation.ics"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/50 py-2 font-medium text-foreground transition hover:bg-secondary"
            >
              <Download className="size-3.5" />
              {t("download_ical")}
            </a>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-border bg-card p-4 text-xs">
        <div className="flex items-center gap-2 font-bold text-foreground">
          <MapPin className="size-4 text-primary" />
          {t("store_info_title")}
        </div>
        <p className="mt-1 text-muted-foreground">{address}</p>
        <div className="mt-3 flex gap-2">
          <a
            href={`tel:${phone}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/50 py-2 font-medium text-foreground transition hover:bg-secondary"
          >
            <Phone className="size-3.5" />
            {t("call_store")}
          </a>
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/50 py-2 font-medium text-foreground transition hover:bg-secondary"
          >
            <MapPin className="size-3.5" />
            {t("open_map")}
          </a>
        </div>
      </div>

      {!isCancelled && !isCompleted && !isNoShow && (
        <div className="mt-6 rounded-xl border border-border bg-muted/40 p-5 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-foreground">
            <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" />
            {t("cancel_policy_title")}
          </div>
          {isPastCutoff ? (
            <p className="mt-1 text-[11px] text-stone-600 dark:text-stone-400">
              {t("past_cutoff_notice", { hours: cutoffHours })}
            </p>
          ) : (
            <>
              <p className="mt-1 text-[11px] text-stone-600 dark:text-stone-400">
                {t("cancel_cutoff_notice", { hours: cutoffHours })}
              </p>

              <div className="mt-3">
                <CancelReservationDialog token={token} />
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
