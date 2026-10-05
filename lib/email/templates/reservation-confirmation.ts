import type { ReservationEmailData } from "../types";
import { escapeHtml, formatJstDateTime, getBaseUrl } from "./helpers";

export function renderReservationConfirmationEmail(data: ReservationEmailData): {
  subject: string;
  text: string;
  html: string;
} {
  const { dateDisplay, timeDisplay } = formatJstDateTime(data.startAt, data.endAt);
  const baseUrl = getBaseUrl();
  const manageUrl = `${baseUrl}/reservations/${data.reservationId}?token=${data.cancellationToken}`;

  const reservationCode = data.reservationNumber || data.reservationId.slice(0, 8);
  const subject = `[予約完了] ${data.restaurantName} (${reservationCode})`;
  const text = [
    `${data.customerName}様`,
    `ご予約を承りました。`,
    `予約番号：${reservationCode}`,
    `日時：${dateDisplay} ${timeDisplay}`,
    `人数：${data.partySize}名`,
    `確認・キャンセル：${manageUrl}`,
  ].join("\n");

  const safeCustomerName = escapeHtml(data.customerName);
  const safeDateDisplay = escapeHtml(dateDisplay);
  const safeTimeDisplay = escapeHtml(timeDisplay);
  const safeManageUrl = escapeHtml(manageUrl);
  const safeReservationCode = escapeHtml(reservationCode);

  const html = [
    `<p>${safeCustomerName}様<br>`,
    `ご予約が完了しました。<br>`,
    `予約番号：<strong>${safeReservationCode}</strong><br>`,
    `日時：${safeDateDisplay} ${safeTimeDisplay}<br>`,
    `人数：${data.partySize}名<br>`,
    `確認・キャンセル：<a href="${safeManageUrl}">${safeManageUrl}</a></p>`,
  ].join("");

  return { subject, text, html };
}
