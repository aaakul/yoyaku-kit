import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";
import { DEFAULT_RESTAURANT_SLUG, restaurantConfig } from "@/config/restaurant";

const minParty = restaurantConfig.booking?.minPartySize ?? 1;
const maxParty = restaurantConfig.booking?.maxPartySize ?? 8;
const defaultMaxAdvanceDays = restaurantConfig.booking?.maxAdvanceDays ?? 30;

export function getTokyoTodayStart(): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.format(new Date()).split("-").map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0));
}

export function parseDateString(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function createReservationSchema(maxAdvanceDays = defaultMaxAdvanceDays) {
  return z.object({
    restaurantSlug: z.string().default(DEFAULT_RESTAURANT_SLUG),
    source: z.enum(["web", "staff"]).default("web"),
    date: z
      .string()
      .min(1, "ご来店日を選択してください")
      .superRefine((val, ctx) => {
        const targetDate = parseDateString(val);
        if (!targetDate) {
          ctx.addIssue({
            code: "custom",
            message: "日付の形式が正しくありません (YYYY-MM-DD)",
          });
          return;
        }

        const todayStart = getTokyoTodayStart();
        if (targetDate.getTime() < todayStart.getTime()) {
          ctx.addIssue({
            code: "custom",
            message: "過去の日付は指定できません",
          });
          return;
        }

        const maxDate = new Date(todayStart);
        maxDate.setUTCDate(maxDate.getUTCDate() + maxAdvanceDays);

        if (targetDate.getTime() > maxDate.getTime()) {
          ctx.addIssue({
            code: "custom",
            message: `${maxAdvanceDays}日以上先のご予約はお電話にて承ります`,
          });
          return;
        }
      }),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "時間の形式が正しくありません (HH:mm)"),
    partySize: z.coerce
      .number()
      .int()
      .min(minParty, `${minParty}名様以上でご予約ください`)
      .max(maxParty, `${maxParty}名様を超えるご予約はお電話にてお問い合わせください`),
    customerName: z
      .string()
      .trim()
      .min(1, "お名前を入力してください")
      .max(50, "お名前は50文字以内で入力してください"),
    customerNameKana: z
      .string()
      .trim()
      .min(1, "フリガナを入力してください")
      .max(50, "フリガナは50文字以内で入力してください")
      .regex(/^[ァ-ヶー・\s　]+$/, "フリガナは全角カタカナで入力してください"),
    customerPhone: z
      .string()
      .trim()
      .min(1, "お電話番号を入力してください")
      .refine(
        (val) => {
          try {
            return (
              isValidPhoneNumber(val, "JP") || (val.startsWith("+") && isValidPhoneNumber(val))
            );
          } catch {
            return false;
          }
        },
        {
          message: "有効な電話番号を入力してください（例：090-1234-5678）",
        },
      ),
    customerEmail: z
      .string()
      .trim()
      .min(1, "メールアドレスを入力してください")
      .email("有効なメールアドレスを入力してください")
      .max(100, "メールアドレスは100文字以内で入力してください"),
    note: z.string().max(500, "ご要望は500文字以内で入力してください").optional(),
    idempotencyKey: z.string().trim().max(100).optional(),
  });
}

export const reservationSchema = createReservationSchema();

export type ReservationInput = z.input<typeof reservationSchema>;
export type ReservationOutput = z.output<typeof reservationSchema>;
export type ReservationFormValues = ReservationInput;
