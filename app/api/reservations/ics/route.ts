import { notFound } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";
import { restaurantConfig } from "@/config/restaurant";
import { getReservationByToken } from "@/lib/db/queries";

function formatICSDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

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

  const restaurantName = restaurant.name || restaurantConfig.name;
  const address = restaurant.address || restaurantConfig.contact.address;
  const phone = restaurant.phone || restaurantConfig.contact.phone;

  const dtStart = formatICSDate(reservation.startAt);
  const dtEnd = formatICSDate(reservation.endAt);
  const dtStamp = formatICSDate(new Date());

  const reservationCode = reservation.reservationNumber || reservation.id.slice(0, 8);
  const summary = `${restaurantName} ご予約`;
  const description = [
    `【ご予約内容】`,
    `予約番号：${reservationCode}`,
    `店舗名：${restaurantName}`,
    `予約者名：${reservation.customerName} 様`,
    `人数：${reservation.partySize}名`,
    `電話番号：${phone}`,
    reservation.note ? `ご要望：${reservation.note}` : "",
  ]
    .filter(Boolean)
    .join("\\n");

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//yoyaku-kit//Reservation Calendar//JA",
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
