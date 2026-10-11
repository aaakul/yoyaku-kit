import type { ReservationEmailData } from "../types";
import { escapeHtml, formatJstDateTime, getBaseUrl } from "./helpers";

export function renderReservationConfirmationEmail(data: ReservationEmailData): {
  subject: string;
  text: string;
  html: string;
} {
  const locale = data.locale || "ja";
  const { dateDisplay, timeDisplay } = formatJstDateTime(data.startAt, data.endAt, locale);
  const baseUrl = getBaseUrl();
  const manageUrl =
    locale && locale !== "ja"
      ? `${baseUrl}/${locale}/reservations/${data.reservationId}?token=${data.cancellationToken}`
      : `${baseUrl}/reservations/${data.reservationId}?token=${data.cancellationToken}`;

  const reservationCode = data.reservationNumber || data.reservationId.slice(0, 8);
  const safeCustomerName = escapeHtml(data.customerName);
  const safeDateDisplay = escapeHtml(dateDisplay);
  const safeTimeDisplay = escapeHtml(timeDisplay);
  const safeManageUrl = escapeHtml(manageUrl);
  const safeReservationCode = escapeHtml(reservationCode);

  let subject = `[予約完了] ${data.restaurantName} (${reservationCode})`;
  let text = [
    `${data.customerName}様`,
    `ご予約を承りました。`,
    `予約番号：${reservationCode}`,
    `日時：${dateDisplay} ${timeDisplay}`,
    `人数：${data.partySize}名`,
    `確認・キャンセル：${manageUrl}`,
  ].join("\n");

  let html = [
    `<p>${safeCustomerName}様<br>`,
    `ご予約が完了しました。<br>`,
    `予約番号：<strong>${safeReservationCode}</strong><br>`,
    `日時：${safeDateDisplay} ${safeTimeDisplay}<br>`,
    `人数：${data.partySize}名<br>`,
    `確認・キャンセル：<a href="${safeManageUrl}">${safeManageUrl}</a></p>`,
  ].join("");

  if (locale === "en") {
    subject = `[Booking Confirmed] ${data.restaurantName} (${reservationCode})`;
    text = [
      `Dear ${data.customerName},`,
      `Your reservation has been confirmed.`,
      `Reservation Number: ${reservationCode}`,
      `Date & Time: ${dateDisplay} ${timeDisplay}`,
      `Guests: ${data.partySize}`,
      `View / Cancel: ${manageUrl}`,
    ].join("\n");
    html = [
      `<p>Dear ${safeCustomerName},<br>`,
      `Your reservation has been confirmed.<br>`,
      `Reservation Number: <strong>${safeReservationCode}</strong><br>`,
      `Date & Time: ${safeDateDisplay} ${safeTimeDisplay}<br>`,
      `Guests: ${data.partySize}<br>`,
      `View / Cancel: <a href="${safeManageUrl}">${safeManageUrl}</a></p>`,
    ].join("");
  } else if (locale === "zh-Hans") {
    subject = `[预订已确认] ${data.restaurantName} (${reservationCode})`;
    text = [
      `${data.customerName} 贵客：`,
      `您的预订已确认。`,
      `预订编号：${reservationCode}`,
      `到店时间：${dateDisplay} ${timeDisplay}`,
      `用餐人数：${data.partySize}人`,
      `查看 / 取消预订：${manageUrl}`,
    ].join("\n");
    html = [
      `<p>${safeCustomerName} 贵客：<br>`,
      `您的预订已确认。<br>`,
      `预订编号：<strong>${safeReservationCode}</strong><br>`,
      `到店时间：${safeDateDisplay} ${safeTimeDisplay}<br>`,
      `用餐人数：${data.partySize}人<br>`,
      `查看 / 取消预订：<a href="${safeManageUrl}">${safeManageUrl}</a></p>`,
    ].join("");
  } else if (locale === "zh-Hant") {
    subject = `[預約已確認] ${data.restaurantName} (${reservationCode})`;
    text = [
      `${data.customerName} 貴客：`,
      `您的預約已確認。`,
      `預約編號：${reservationCode}`,
      `到店時間：${dateDisplay} ${timeDisplay}`,
      `用餐人數：${data.partySize}人`,
      `查看 / 取消預約：${manageUrl}`,
    ].join("\n");
    html = [
      `<p>${safeCustomerName} 貴客：<br>`,
      `您的預約已確認。<br>`,
      `預約編號：<strong>${safeReservationCode}</strong><br>`,
      `到店時間：${safeDateDisplay} ${safeTimeDisplay}<br>`,
      `用餐人數：${data.partySize}人<br>`,
      `查看 / 取消預約：<a href="${safeManageUrl}">${safeManageUrl}</a></p>`,
    ].join("");
  }

  return { subject, text, html };
}
