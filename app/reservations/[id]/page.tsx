import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Download,
  MapPin,
  Phone,
  XCircle,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { restaurantConfig } from "@/config/restaurant";
import { getReservationByToken } from "@/lib/db/queries";
import { formatJstDateTime, formatMaskedPhone } from "@/lib/utils";
import { CancelReservationDialog } from "./cancel-dialog";

export const metadata: Metadata = {
  title: "ご予約内容の確認",
  description: "ご予約内容の確認およびキャンセル手続き。",
  robots: {
    index: false,
    follow: false,
  },
  referrer: "no-referrer",
};

export default async function ReservationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!token) {
    notFound();
  }
  const validToken: string = token;

  const data = await getReservationByToken(token);
  if (!data || data.reservation.id !== id) {
    notFound();
  }

  const { reservation, restaurant } = data;

  const { dateDisplay, timeDisplay } = formatJstDateTime(reservation.startAt, reservation.endAt);

  const isCancelled = reservation.status === "cancelled";
  const isCompleted = reservation.status === "completed";
  const isNoShow = reservation.status === "no_show";

  const cutoffHours =
    restaurant.cancellationCutoffHours || restaurantConfig.booking.cancellationCutoffHours;
  const cutoffMs = cutoffHours * 60 * 60 * 1000;
  const isPastCutoff = reservation.startAt.getTime() - Date.now() < cutoffMs;

  const address = restaurant.address || restaurantConfig.contact.address;
  const phone = restaurant.phone || restaurantConfig.contact.phone;
  const mapQuery = address || restaurant.name || restaurantConfig.name;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  const restaurantName = restaurant.name || restaurantConfig.name;
  const formatGCalDate = (date: Date) =>
    date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const gcalDates = `${formatGCalDate(reservation.startAt)}/${formatGCalDate(reservation.endAt)}`;
  const gcalDetails = [
    `ご予約店舗：${restaurantName}`,
    `予約者：${reservation.customerName} 様`,
    `人数：${reservation.partySize}名`,
    `電話番号：${phone}`,
    reservation.note ? `ご要望：${reservation.note}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    `${restaurantName} ご予約`,
  )}&dates=${gcalDates}&details=${encodeURIComponent(gcalDetails)}&location=${encodeURIComponent(
    address,
  )}`;
  const icsDownloadUrl = `/api/reservations/ics?token=${token}`;

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
          <span className="font-serif text-sm font-bold tracking-widest text-primary">
            {restaurantConfig.name}
          </span>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-8 sm:px-6">
        <div className="text-center">
          {isCancelled ? (
            <>
              <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                <XCircle className="size-7" />
              </div>
              <h1 className="mt-4 font-serif text-2xl font-bold tracking-wider text-stone-900 dark:text-stone-100">
                ご予約はキャンセルされました
              </h1>
              <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                キャンセルを承りました。またのご来店をお待ちしております。
              </p>
            </>
          ) : isNoShow ? (
            <>
              <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                <XCircle className="size-7" />
              </div>
              <h1 className="mt-4 font-serif text-2xl font-bold tracking-wider text-stone-900 dark:text-stone-100">
                ご予約は無断キャンセルとして記録されています
              </h1>
              <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                ご予約時間にご来店が確認できなかったため、無断キャンセルとして処理されました。
              </p>
            </>
          ) : isCompleted ? (
            <>
              <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                <CheckCircle2 className="size-7" />
              </div>
              <h1 className="mt-4 font-serif text-2xl font-bold tracking-wider text-stone-900 dark:text-stone-100">
                ご来店ありがとうございました
              </h1>
              <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
                またのご来店をお待ちしております。
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <CheckCircle2 className="size-7" />
              </div>
              <h1 className="mt-4 font-serif text-2xl font-bold tracking-wider text-stone-900 dark:text-stone-100">
                ご予約が確定いたしました
              </h1>
            </>
          )}
        </div>

        <Card className="mt-6 border-border shadow-xs">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-serif text-lg font-bold text-foreground">
                  予約内容
                </CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">{restaurant.name}</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-5 text-xs">
            <div className="grid grid-cols-3 gap-2 border-b border-border/60 pb-3">
              <span className="text-muted-foreground">予約番号</span>
              <span className="col-span-2 font-mono text-sm font-bold tracking-wider text-primary">
                {reservation.reservationNumber || reservation.id}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 border-b border-border/60 pb-3">
              <span className="text-muted-foreground">ご来店日時</span>
              <span className="col-span-2 font-bold text-foreground">
                {dateDisplay} <br />
                <span className="text-primary font-bold">{timeDisplay}</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 border-b border-border/60 pb-3">
              <span className="text-muted-foreground">ご利用人数</span>
              <span className="col-span-2 font-semibold text-foreground">
                {reservation.partySize}名様
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 border-b border-border/60 pb-3">
              <span className="text-muted-foreground">代表者名</span>
              <span className="col-span-2 font-semibold text-foreground">
                {reservation.customerName} 様（{reservation.customerNameKana}）
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 border-b border-border/60 pb-3">
              <span className="text-muted-foreground">電話番号</span>
              <span className="col-span-2 font-semibold text-foreground">
                {formatMaskedPhone(reservation.customerPhone)}
              </span>
            </div>

            {reservation.note && (
              <div className="grid grid-cols-3 gap-2 border-b border-border/60 pb-3">
                <span className="text-muted-foreground">ご要望・備考</span>
                <span className="col-span-2 text-foreground">{reservation.note}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {!isCancelled && !isNoShow && (
          <div className="mt-3 flex gap-2">
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2 text-xs font-medium text-foreground shadow-2xs transition hover:bg-accent"
            >
              <Calendar className="size-3.5 text-primary" />
              Google カレンダーに追加
            </a>
            <a
              href={icsDownloadUrl}
              download={`reservation-${reservation.reservationNumber || reservation.id.slice(0, 8)}.ics`}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2 text-xs font-medium text-foreground shadow-2xs transition hover:bg-accent"
            >
              <Download className="size-3.5 text-muted-foreground" />
              カレンダーに追加（.ics）
            </a>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-border bg-card p-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <MapPin className="size-4 text-primary" />
            店舗情報
          </div>
          <p className="mt-1 text-muted-foreground">{address}</p>
          <div className="mt-3 flex gap-2">
            <a
              href={`tel:${phone}`}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/50 py-2 font-medium text-foreground transition hover:bg-secondary"
            >
              <Phone className="size-3.5" />
              店舗に電話する
            </a>
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/50 py-2 font-medium text-foreground transition hover:bg-secondary"
            >
              <MapPin className="size-3.5" />
              地図を開く
            </a>
          </div>
        </div>

        {!isCancelled && !isCompleted && !isNoShow && (
          <div className="mt-6 rounded-xl border border-border bg-muted/40 p-5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-foreground">
              <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" />
              ご予約のキャンセルについて
            </div>
            {isPastCutoff ? (
              <p className="mt-1 text-[11px] text-stone-600 dark:text-stone-400">
                キャンセル受付期限（ご来店時間の{cutoffHours}
                時間前）を過ぎているため、WEB上でのキャンセルはできません。お電話にてお問い合わせください。
              </p>
            ) : (
              <>
                <p className="mt-1 text-[11px] text-stone-600 dark:text-stone-400">
                  ご来店予定時刻の{cutoffHours}
                  時間前まで、こちらのページからWEBキャンセルが可能です。
                </p>

                <div className="mt-3">
                  <CancelReservationDialog token={validToken} />
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
