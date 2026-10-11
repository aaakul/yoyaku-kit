import { notFound } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { restaurantConfig } from "@/config/restaurant";
import { type Locale, routing } from "@/i18n/routing";
import { getReservationByToken } from "@/lib/db/queries";
import { formatCalendarDate } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    notFound();
  }

  const data = await getReservationByToken(token);
  if (!data) {
    notFound();
  }

  const { reservation, restaurant } = data;
  const rawLocale = searchParams.get("locale");
  const locale: Locale =
    rawLocale && routing.locales.includes(rawLocale as Locale)
      ? (rawLocale as Locale)
      : routing.defaultLocale;

  const t = await getTranslations({ locale, namespace: "reservations" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  const restaurantName = restaurant.name || tCommon("restaurant_name");
  const address = restaurant.address || restaurantConfig.contact.address || tCommon("address");
  const phone = restaurant.phone || restaurantConfig.contact.phone;

  const dtStart = formatCalendarDate(reservation.startAt);
  const dtEnd = formatCalendarDate(reservation.endAt);
  const dtStamp = formatCalendarDate(new Date());

  const reservationCode = reservation.reservationNumber || reservation.id.slice(0, 8);
  const summary = t("gcal_title", { restaurant: restaurantName });
  const description = [
    `${t("reservation_number")}: ${reservationCode}`,
    t("gcal_store", { name: restaurantName }),
    t("gcal_guest", { name: reservation.customerName }),
    t("gcal_party", { count: reservation.partySize }),
    t("gcal_phone", { phone }),
    reservation.note ? t("gcal_note", { note: reservation.note }) : "",
  ]
    .filter(Boolean)
    .join("\\n");

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//yoyaku-kit//Reservation Calendar//${locale.toUpperCase()}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${reservation.id}@${restaurant.slug || "yoyaku-kit"}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${address}`,
    `STATUS:${reservation.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const icsBody = icsLines.join("\r\n");

  return new NextResponse(icsBody, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="reservation-${reservationCode}.ics"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
