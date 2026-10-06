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
import { connection } from "next/server";
import { Suspense } from "react";
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

function ReservationDetailSkeleton() {
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

async function ReservationDetailContent({
  id,
  searchParams,
}: {
  id: string;
  searchParams: Promise<{ token?: string }>;
}) {
  await connection();
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
              ご利用ありがとうございました
            </h1>
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
              ご来店・お食事いただき誠にありがとうございました。またのご来店をお待ちしております。
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CheckCircle2 className="size-7" />
            </div>
            <h1 className="mt-4 font-serif text-2xl font-bold tracking-wider text-stone-900 dark:text-stone-100">
              ご予約を承りました
            </h1>
            <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
              ご予約確認メールをお送りしました。内容をご確認ください。
            </p>
          </>
        )}
      </div>

      <Card className="mt-8 overflow-hidden rounded-xl border-border shadow-xs">
        <CardHeader className="bg-secondary/40 pb-4 pt-5 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-stone-600 dark:text-stone-400">
              予約番号
            </span>
            <span className="font-mono text-xs font-bold text-foreground">
              {reservation.reservationNumber || reservation.id}
            </span>
          </div>
          <CardTitle className="mt-2 font-serif text-lg text-foreground">
            {reservation.customerName} 様
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 pt-5 text-xs">
          <div className="flex items-start justify-between border-b border-border pb-3">
            <span className="text-stone-600 dark:text-stone-400">ご来店日時</span>
            <div className="text-right">
              <p className="font-bold text-foreground">{dateDisplay}</p>
              <p className="text-stone-600 dark:text-stone-400">
                {timeDisplay}（{reservation.partySize}名様）
              </p>
            </div>
          </div>

          <div className="flex items-start justify-between border-b border-border pb-3">
            <span className="text-stone-600 dark:text-stone-400">お席</span>
            <span className="font-medium text-foreground">テーブル席（全席禁煙）</span>
          </div>

          <div className="flex items-start justify-between border-b border-border pb-3">
            <span className="text-stone-600 dark:text-stone-400">ご連絡先</span>
            <div className="text-right">
              <p className="font-mono text-foreground">
                {formatMaskedPhone(reservation.customerPhone)}
              </p>
              <p className="text-stone-600 dark:text-stone-400">{reservation.customerEmail}</p>
            </div>
          </div>

          {reservation.note && (
            <div className="flex items-start justify-between border-b border-border pb-3">
              <span className="text-stone-600 dark:text-stone-400">ご要望</span>
              <span className="max-w-[60%] text-right text-stone-700 dark:text-stone-300">
                {reservation.note}
              </span>
            </div>
          )}

          <div className="flex items-start justify-between">
            <span className="text-stone-600 dark:text-stone-400">ステータス</span>
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
                ? "キャンセル済"
                : isNoShow
                  ? "無断キャンセル"
                  : isCompleted
                    ? "利用完了"
                    : "予約確定"}
            </span>
          </div>
        </CardContent>
      </Card>

      {!isCancelled && !isCompleted && !isNoShow && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Calendar className="size-4 text-primary" />
            カレンダーに追加
          </div>
          <p className="mt-1 text-muted-foreground">
            ご予約内容を外部カレンダーにワンクリックで登録できます。
          </p>
          <div className="mt-3 flex gap-2">
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/50 py-2 font-medium text-foreground transition hover:bg-secondary"
            >
              Google カレンダー
            </a>
            <a
              href={icsDownloadUrl}
              download="reservation.ics"
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-secondary/50 py-2 font-medium text-foreground transition hover:bg-secondary"
            >
              <Download className="size-3.5" />
              iCal (.ics)
            </a>
          </div>
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
  );
}

async function ReservationDetailWrapper({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  return <ReservationDetailContent id={id} searchParams={searchParams} />;
}

export default function ReservationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
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

      <Suspense fallback={<ReservationDetailSkeleton />}>
        <ReservationDetailWrapper params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
