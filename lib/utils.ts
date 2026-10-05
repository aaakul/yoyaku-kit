import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().split("T")[0];
}

export function getTodayJst(): string {
  const nowJst = new Date(Date.now() + 9 * 3600 * 1000);
  return nowJst.toISOString().split("T")[0];
}

export function formatDisplayTime(timeStr: string): string {
  if (!timeStr) return "";
  if (timeStr.startsWith("翌")) return timeStr;
  const clean = timeStr.replace(/^[^\d]*/, "");
  const hour = parseInt(clean.split(":")[0], 10);
  if (!Number.isNaN(hour) && hour < 6) {
    return `翌${clean}`;
  }
  return timeStr;
}

export type ReservationStatus = "confirmed" | "completed" | "cancelled" | "no_show";

export interface ReservationStatusConfig {
  label: string;
  badgeVariant: "success" | "info" | "warning" | "destructive";
  badgeClassName: string;
  timeline: {
    bg: string;
    border: string;
    text: string;
  };
}

export const RESERVATION_STATUS_CONFIG: Record<ReservationStatus, ReservationStatusConfig> = {
  confirmed: {
    label: "確定済み",
    badgeVariant: "success",
    badgeClassName:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    timeline: {
      bg: "bg-emerald-700 hover:bg-emerald-800",
      border: "border-emerald-800",
      text: "text-white",
    },
  },
  completed: {
    label: "来店済み",
    badgeVariant: "info",
    badgeClassName:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    timeline: {
      bg: "bg-sky-700 hover:bg-sky-800",
      border: "border-sky-800",
      text: "text-white",
    },
  },
  cancelled: {
    label: "キャンセル",
    badgeVariant: "destructive",
    badgeClassName:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    timeline: {
      bg: "bg-stone-300 dark:bg-stone-700 line-through opacity-60",
      border: "border-stone-400 dark:border-stone-600",
      text: "text-stone-800 dark:text-stone-200",
    },
  },
  no_show: {
    label: "無断キャンセル",
    badgeVariant: "destructive",
    badgeClassName:
      "bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700",
    timeline: {
      bg: "bg-rose-200 dark:bg-rose-950/60 line-through opacity-60",
      border: "border-rose-300 dark:border-rose-900",
      text: "text-rose-800 dark:text-rose-200",
    },
  },
};

export const JAPANESE_WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function getDayOfWeek(dateStr: string, timezone = "Asia/Tokyo"): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const approxUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const shortDay = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(approxUtc);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(shortDay);
}

export interface ReservationItem {
  id: string;
  reservationNumber?: string;
  tableId?: string;
  customerName: string;
  customerNameKana: string;
  phone: string;
  email: string;
  partySize: number;
  tableNumber: string;
  date: string;
  time: string;
  startAt: string;
  endAt: string;
  session: "lunch" | "dinner";
  status: ReservationStatus;
  note?: string;
  cancellationToken?: string;
}

export function mapDbReservation(d: {
  id: string;
  reservationNumber?: string | null;
  tableId?: string | null;
  customerName: string;
  customerNameKana: string;
  customerPhone: string;
  customerEmail: string;
  partySize: number;
  tableName?: string | null;
  tableCapacity?: number | null;
  startAt: Date;
  endAt: Date;
  status: string;
  note?: string | null;
}): ReservationItem {
  const startDate = new Date(d.startAt);
  const jstTime = new Date(startDate.getTime() + 9 * 3600 * 1000);
  const hour = jstTime.getUTCHours();
  const timeStr = jstTime.toISOString().split("T")[1].slice(0, 5);

  const isOvernight = hour < 6;
  const serviceDateObj = isOvernight ? new Date(jstTime.getTime() - 24 * 3600 * 1000) : jstTime;
  const dateStr = serviceDateObj.toISOString().split("T")[0];

  return {
    id: d.id,
    reservationNumber: d.reservationNumber ?? undefined,
    tableId: d.tableId ?? undefined,
    customerName: d.customerName,
    customerNameKana: d.customerNameKana,
    phone: d.customerPhone,
    email: d.customerEmail,
    partySize: d.partySize,
    tableNumber: `${d.tableName || "T-01"} (${d.tableCapacity || 2}名席)`,
    date: dateStr,
    time: timeStr,
    startAt: d.startAt.toISOString(),
    endAt: d.endAt.toISOString(),
    session: hour >= 6 && hour < 16 ? "lunch" : "dinner",
    status: d.status as ReservationStatus,
    note: d.note || undefined,
  };
}

export function formatJstDateTime(startAt: Date, endAt: Date) {
  const startJST = new Date(startAt.getTime() + 9 * 3600 * 1000);
  const endJST = new Date(endAt.getTime() + 9 * 3600 * 1000);

  const dayName = JAPANESE_WEEKDAYS[startJST.getUTCDay()];

  const dateDisplay = `${startJST.getUTCFullYear()}年${startJST.getUTCMonth() + 1}月${startJST.getUTCDate()}日（${dayName}）`;
  const timeDisplay = `${String(startJST.getUTCHours()).padStart(2, "0")}:${String(startJST.getUTCMinutes()).padStart(2, "0")}～${String(endJST.getUTCHours()).padStart(2, "0")}:${String(endJST.getUTCMinutes()).padStart(2, "0")}`;

  return { dateDisplay, timeDisplay };
}

export function formatMaskedPhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) {
    return phone;
  }
  const last4 = digits.slice(-4);
  return `***-****-${last4}`;
}
