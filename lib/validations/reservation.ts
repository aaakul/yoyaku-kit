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

export const RESERVATION_VALIDATION_MESSAGES = {
  DATE_REQUIRED: "validation.date_required",
  DATE_INVALID_FORMAT: "validation.date_invalid_format",
  DATE_PAST: "validation.date_past",
  DATE_MAX_ADVANCE: "validation.date_max_advance",
  TIME_INVALID_FORMAT: "validation.time_invalid_format",
  PARTY_SIZE_MIN: "validation.party_size_min",
  PARTY_SIZE_MAX: "validation.party_size_max",
  CUSTOMER_NAME_REQUIRED: "validation.customer_name_required",
  CUSTOMER_NAME_MAX: "validation.customer_name_max",
  CUSTOMER_NAME_KANA_MAX: "validation.customer_name_kana_max",
  CUSTOMER_NAME_KANA_INVALID: "validation.customer_name_kana_invalid",
  CUSTOMER_PHONE_REQUIRED: "validation.customer_phone_required",
  CUSTOMER_PHONE_INVALID: "validation.customer_phone_invalid",
  CUSTOMER_EMAIL_REQUIRED: "validation.customer_email_required",
  CUSTOMER_EMAIL_INVALID: "validation.customer_email_invalid",
  CUSTOMER_EMAIL_MAX: "validation.customer_email_max",
  NOTE_MAX: "validation.note_max",
} as const;

export function createReservationSchema(maxAdvanceDays = defaultMaxAdvanceDays) {
  return z.object({
    restaurantSlug: z.string().default(DEFAULT_RESTAURANT_SLUG),
    source: z.enum(["web", "staff"]).default("web"),
    date: z
      .string()
      .min(1, RESERVATION_VALIDATION_MESSAGES.DATE_REQUIRED)
      .superRefine((val, ctx) => {
        const targetDate = parseDateString(val);
        if (!targetDate) {
          ctx.addIssue({
            code: "custom",
            message: RESERVATION_VALIDATION_MESSAGES.DATE_INVALID_FORMAT,
          });
          return;
        }

        const todayStart = getTokyoTodayStart();
        if (targetDate.getTime() < todayStart.getTime()) {
          ctx.addIssue({
            code: "custom",
            message: RESERVATION_VALIDATION_MESSAGES.DATE_PAST,
          });
          return;
        }

        const maxDate = new Date(todayStart);
        maxDate.setUTCDate(maxDate.getUTCDate() + maxAdvanceDays);

        if (targetDate.getTime() > maxDate.getTime()) {
          ctx.addIssue({
            code: "custom",
            message: RESERVATION_VALIDATION_MESSAGES.DATE_MAX_ADVANCE,
          });
          return;
        }
      }),
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, RESERVATION_VALIDATION_MESSAGES.TIME_INVALID_FORMAT),
    partySize: z.coerce
      .number()
      .int()
      .min(minParty, RESERVATION_VALIDATION_MESSAGES.PARTY_SIZE_MIN)
      .max(maxParty, RESERVATION_VALIDATION_MESSAGES.PARTY_SIZE_MAX),
    customerName: z
      .string()
      .trim()
      .min(1, RESERVATION_VALIDATION_MESSAGES.CUSTOMER_NAME_REQUIRED)
      .max(50, RESERVATION_VALIDATION_MESSAGES.CUSTOMER_NAME_MAX),
    customerNameKana: z
      .string()
      .trim()
      .max(50, RESERVATION_VALIDATION_MESSAGES.CUSTOMER_NAME_KANA_MAX)
      .refine(
        (val) => !val || /^[ァ-ヶー・\s　]+$/.test(val),
        RESERVATION_VALIDATION_MESSAGES.CUSTOMER_NAME_KANA_INVALID,
      )
      .default(""),
    customerPhone: z
      .string()
      .trim()
      .min(1, RESERVATION_VALIDATION_MESSAGES.CUSTOMER_PHONE_REQUIRED)
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
          message: RESERVATION_VALIDATION_MESSAGES.CUSTOMER_PHONE_INVALID,
        },
      ),
    customerEmail: z
      .string()
      .trim()
      .min(1, RESERVATION_VALIDATION_MESSAGES.CUSTOMER_EMAIL_REQUIRED)
      .email(RESERVATION_VALIDATION_MESSAGES.CUSTOMER_EMAIL_INVALID)
      .max(100, RESERVATION_VALIDATION_MESSAGES.CUSTOMER_EMAIL_MAX),
    note: z.string().max(500, RESERVATION_VALIDATION_MESSAGES.NOTE_MAX).optional(),
    idempotencyKey: z.string().trim().max(100).optional(),
    locale: z.string().optional(),
  });
}

export const reservationSchema = createReservationSchema();

export type ReservationInput = z.input<typeof reservationSchema>;
export type ReservationOutput = z.output<typeof reservationSchema>;
export type ReservationFormValues = ReservationInput;
