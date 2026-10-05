import type { ReservationEmailData } from "../types";
import { escapeHtml, formatJstDateTime } from "./helpers";

export function renderReservationCancellationEmail(data: ReservationEmailData): {
  subject: string;
  text: string;
  html: string;
} {
  const { dateDisplay, timeDisplay } = formatJstDateTime(data.startAt, data.endAt);

  const reservationCode = data.reservationNumber || data.reservationId.slice(0, 8);
  const subject = `[予約キャンセル] ${data.restaurantName} (${reservationCode})`;
  const text = [
    `${data.customerName}様`,
    `ご予約のキャンセルを承りました。`,
    `予約番号：${reservationCode}`,
    `日時：${dateDisplay} ${timeDisplay}`,
    `人数：${data.partySize}名`,
  ].join("\n");

  const safeCustomerName = escapeHtml(data.customerName);
  const safeDateDisplay = escapeHtml(dateDisplay);
  const safeTimeDisplay = escapeHtml(timeDisplay);
  const safeReservationCode = escapeHtml(reservationCode);

  const html = [
    `<p>${safeCustomerName}様<br>`,
    `ご予約のキャンセルを承りました。<br>`,
    `予約番号：<strong>${safeReservationCode}</strong><br>`,
    `日時：${safeDateDisplay} ${safeTimeDisplay}<br>`,
    `人数：${data.partySize}名</p>`,
  ].join("");

  return { subject, text, html };
}
