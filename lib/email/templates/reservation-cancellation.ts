import type { ReservationEmailData } from "../types";
import { escapeHtml, formatJstDateTime } from "./helpers";

export function renderReservationCancellationEmail(data: ReservationEmailData): {
  subject: string;
  text: string;
  html: string;
} {
  const locale = data.locale || "ja";
  const { dateDisplay, timeDisplay } = formatJstDateTime(data.startAt, data.endAt, locale);

  const reservationCode = data.reservationNumber || data.reservationId.slice(0, 8);
  const safeCustomerName = escapeHtml(data.customerName);
  const safeDateDisplay = escapeHtml(dateDisplay);
  const safeTimeDisplay = escapeHtml(timeDisplay);
  const safeReservationCode = escapeHtml(reservationCode);

  let subject = `[予約キャンセル] ${data.restaurantName} (${reservationCode})`;
  let text = [
    `${data.customerName}様`,
    `ご予約のキャンセルを承りました。`,
    `予約番号：${reservationCode}`,
    `日時：${dateDisplay} ${timeDisplay}`,
    `人数：${data.partySize}名`,
  ].join("\n");

  let html = [
    `<p>${safeCustomerName}様<br>`,
    `ご予約のキャンセルを承りました。<br>`,
    `予約番号：<strong>${safeReservationCode}</strong><br>`,
    `日時：${safeDateDisplay} ${safeTimeDisplay}<br>`,
    `人数：${data.partySize}名</p>`,
  ].join("");

  if (locale === "en") {
    subject = `[Booking Cancelled] ${data.restaurantName} (${reservationCode})`;
    text = [
      `Dear ${data.customerName},`,
      `Your reservation has been cancelled.`,
      `Reservation Number: ${reservationCode}`,
      `Date & Time: ${dateDisplay} ${timeDisplay}`,
      `Guests: ${data.partySize}`,
    ].join("\n");
    html = [
      `<p>Dear ${safeCustomerName},<br>`,
      `Your reservation has been cancelled.<br>`,
      `Reservation Number: <strong>${safeReservationCode}</strong><br>`,
      `Date & Time: ${safeDateDisplay} ${safeTimeDisplay}<br>`,
      `Guests: ${data.partySize}</p>`,
    ].join("");
  } else if (locale === "zh-Hans") {
    subject = `[预订已取消] ${data.restaurantName} (${reservationCode})`;
    text = [
      `${data.customerName} 贵客：`,
      `您的预订已成功取消。`,
      `预订编号：${reservationCode}`,
      `到店时间：${dateDisplay} ${timeDisplay}`,
      `用餐人数：${data.partySize}人`,
    ].join("\n");
    html = [
      `<p>${safeCustomerName} 贵客：<br>`,
      `您的预订已成功取消。<br>`,
      `预订编号：<strong>${safeReservationCode}</strong><br>`,
      `到店时间：${safeDateDisplay} ${safeTimeDisplay}<br>`,
      `用餐人数：${data.partySize}人</p>`,
    ].join("");
  } else if (locale === "zh-Hant") {
    subject = `[預約已取消] ${data.restaurantName} (${reservationCode})`;
    text = [
      `${data.customerName} 貴客：`,
      `您的預約已成功取消。`,
      `預約編號：${reservationCode}`,
      `到店時間：${dateDisplay} ${timeDisplay}`,
      `用餐人數：${data.partySize}人`,
    ].join("\n");
    html = [
      `<p>${safeCustomerName} 貴客：<br>`,
      `您的預約已成功取消。<br>`,
      `預約編號：<strong>${safeReservationCode}</strong><br>`,
      `到店時間：${safeDateDisplay} ${safeTimeDisplay}<br>`,
      `用餐人數：${data.partySize}人</p>`,
    ].join("");
  }

  return { subject, text, html };
}
