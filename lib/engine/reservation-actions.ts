"use server";

import { and, eq, notInArray, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { DEFAULT_RESTAURANT_SLUG, restaurantConfig } from "@/config/restaurant";
import { assertManager, canViewManagerPages } from "@/lib/auth/middleware";
import { db } from "@/lib/db/drizzle";
import {
  getReservationLogs,
  getReservations,
  getRestaurant,
  getRestaurantTables,
  getUser,
  hashToken,
} from "@/lib/db/queries";
import {
  businessHours,
  reservationLogs,
  reservations,
  restaurants,
  restaurantTables,
} from "@/lib/db/schema";
import { sendReservationCancellationEmail, sendReservationConfirmationEmail } from "@/lib/email";
import { getDayOfWeek } from "@/lib/utils";
import { generateReservationNumber } from "./reservation-number";
import { getAvailableSlots, parseDateTime } from "./slots";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore missing static generation store outside Next.js request context (e.g. in test environment)
  }
}

import {
  RESERVATION_ERROR,
  type ReservationErrorCode,
  TABLE_ERROR,
  type TableErrorCode,
} from "@/lib/errors/codes";
import { type ReservationInput, reservationSchema } from "@/lib/validations/reservation";

export type ReservationFieldErrors = Partial<Record<keyof ReservationInput, string>>;

export type CreateReservationResult =
  | { success: true; reservationId: string; reservationNumber?: string; cancellationToken: string }
  | {
      success: false;
      code: ReservationErrorCode;
      message: string;
      fieldErrors?: ReservationFieldErrors;
    };

export type ActionResult<TCode extends string = string> =
  | { success: true }
  | { success: false; code: TCode; message: string };

export async function createReservationAction(rawInput: unknown): Promise<CreateReservationResult> {
  const validated = reservationSchema.safeParse(rawInput);
  if (!validated.success) {
    const fieldErrors: ReservationFieldErrors = {};
    for (const issue of validated.error.issues) {
      const field = issue.path[0] as keyof ReservationInput;
      if (field && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return {
      success: false,
      code: RESERVATION_ERROR.VALIDATION_FAILED,
      message: validated.error.issues[0]?.message || "入力内容に誤りがあります",
      fieldErrors,
    };
  }

  const {
    restaurantSlug,
    date,
    time,
    partySize,
    customerName,
    customerNameKana,
    customerPhone,
    customerEmail,
    note,
    idempotencyKey,
  } = validated.data;

  let restaurantId: string | null = null;

  try {
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.slug, restaurantSlug))
      .limit(1);

    if (!restaurant) {
      return {
        success: false,
        code: RESERVATION_ERROR.RESTAURANT_NOT_FOUND,
        message: "指定された店舗が見つかりません",
      };
    }

    restaurantId = restaurant.id;

    if (idempotencyKey) {
      const [existing] = await db
        .select({ id: reservations.id })
        .from(reservations)
        .where(
          and(
            eq(reservations.restaurantId, restaurant.id),
            eq(reservations.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);

      if (existing) {
        // Raw token is not stored — it was delivered to the customer in the first response and email.
        // Returning the reservation ID alone is sufficient for the caller to detect the duplicate.
        return {
          success: true,
          reservationId: existing.id,
          cancellationToken: "",
        };
      }
    }

    const dayOfWeek = getDayOfWeek(date, restaurant.timezone);

    const closedDays = (restaurant.closedDaysOfWeek || "1").split(",").map(Number);

    if (closedDays.includes(dayOfWeek)) {
      return {
        success: false,
        code: RESERVATION_ERROR.CLOSED_DAY,
        message: "指定された日は定休日です。",
      };
    }

    const hours = await db
      .select()
      .from(businessHours)
      .where(eq(businessHours.restaurantId, restaurant.id))
      .orderBy(businessHours.openTime);

    const activeHours = hours.length > 0 ? hours : restaurantConfig.businessHours.periods;

    let matchedPeriod: (typeof activeHours)[number] | null = null;
    let dayOffset = 0;

    for (const bh of activeHours) {
      const isOvernight = bh.isOvernight || bh.closeTime < bh.openTime;
      if (isOvernight) {
        if (time >= bh.openTime) {
          matchedPeriod = bh;
          dayOffset = 0;
          break;
        } else if (time <= bh.closeTime) {
          matchedPeriod = bh;
          dayOffset = 1;
          break;
        }
      } else {
        if (time >= bh.openTime && time <= bh.closeTime) {
          matchedPeriod = bh;
          dayOffset = 0;
          break;
        }
      }
    }

    if (!matchedPeriod) {
      return {
        success: false,
        code: RESERVATION_ERROR.OUTSIDE_HOURS,
        message: "営業時間外の時間帯です。",
      };
    }

    const defaultDurationMinutes =
      restaurant.defaultDurationMinutes || restaurantConfig.booking.defaultDurationMinutes;
    const durationMs = defaultDurationMinutes * 60 * 1000;

    const startAt = parseDateTime(date, time, dayOffset, restaurant.timezone);
    const endAt = new Date(startAt.getTime() + durationMs);

    const isOvernightShift =
      matchedPeriod.isOvernight || matchedPeriod.closeTime < matchedPeriod.openTime;
    const sessionEnd = parseDateTime(
      date,
      matchedPeriod.closeTime,
      isOvernightShift ? 1 : 0,
      restaurant.timezone,
    );

    if (endAt.getTime() > sessionEnd.getTime()) {
      return {
        success: false,
        code: RESERVATION_ERROR.EXCEEDS_CLOSING,
        message: "閉店時間を超えるため、この時間帯でのご予約は受け付けられません。",
      };
    }

    const currentUser = await getUser();
    if (currentUser?.role === "demo") {
      return {
        success: false,
        code: RESERVATION_ERROR.DEMO_RESTRICTED,
        message: "デモアカウントのため、この操作は許可されていません。",
      };
    }
    const isStaffOrManager = currentUser?.role === "staff" || currentUser?.role === "manager";

    const now = new Date();
    if (!isStaffOrManager) {
      const minAdvanceHours =
        restaurant.minAdvanceHours || restaurantConfig.booking.minAdvanceHours;
      const minAdvanceMs = minAdvanceHours * 60 * 60 * 1000;
      if (startAt.getTime() < now.getTime() + minAdvanceMs) {
        return {
          success: false,
          code: RESERVATION_ERROR.ADVANCE_NOTICE_REQUIRED,
          message: `ご来店の${minAdvanceHours}時間前までにご予約ください`,
        };
      }
    } else {
      if (endAt.getTime() < now.getTime()) {
        return {
          success: false,
          code: RESERVATION_ERROR.PAST_TIME_NOT_ALLOWED,
          message: "過去の予約（終了時刻を過ぎた時間帯）は登録できません",
        };
      }
    }

    const rawCancellationToken = nanoid(21);
    const cancellationTokenHash = hashToken(rawCancellationToken);

    const result = await db.transaction(async (tx) => {
      // Lock candidate tables with pessimistic row locks ordered by capacity ASC, id ASC to prevent deadlocks
      const candidateTablesResult = await tx.execute<{
        id: string;
        name: string;
        capacity: number;
      }>(sql`
        SELECT id, name, capacity
        FROM restaurant_tables
        WHERE restaurant_id = ${restaurant.id}
          AND active = true
          AND capacity >= ${partySize}
        ORDER BY capacity ASC, id ASC
        FOR UPDATE;
      `);

      const tables = Array.from(candidateTablesResult);
      if (tables.length === 0) {
        throw new Error("ご希望の人数に対応できるお席がございません。");
      }

      // Find first available table for requested time range (Best-Fit)
      let selectedTableId: string | null = null;

      for (const table of tables) {
        const overlapResult = await tx.execute<{ id: string }>(sql`
          SELECT id
          FROM reservations
          WHERE table_id = ${table.id}
            AND status NOT IN ('cancelled', 'no_show')
            AND start_at < ${endAt.toISOString()}::timestamptz
            AND end_at > ${startAt.toISOString()}::timestamptz
          LIMIT 1;
        `);

        if (Array.from(overlapResult).length === 0) {
          selectedTableId = table.id;
          break;
        }
      }

      if (!selectedTableId) {
        throw new Error("申し訳ございません。ご指定の日時はすでに満席となっております。");
      }

      // Generate unique 6-character human-readable reservationNumber with retry loop
      let newReservation: typeof reservations.$inferSelect | undefined;
      const MAX_ATTEMPTS = 5;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const candidateNumber = generateReservationNumber();
        try {
          const insertResult = await tx
            .insert(reservations)
            .values({
              restaurantId: restaurant.id,
              tableId: selectedTableId,
              reservationNumber: candidateNumber,
              startAt,
              endAt,
              partySize,
              status: "confirmed",
              cancellationTokenHash,
              idempotencyKey: idempotencyKey || null,
              customerName,
              customerNameKana,
              customerPhone,
              customerEmail,
              note,
            })
            .returning();
          newReservation = insertResult[0];
          break;
        } catch (insertError: unknown) {
          const err = insertError as { code?: string; message?: string } | undefined;
          const isConflict =
            err?.code === "23505" &&
            (err?.message?.includes("reservation_number") ||
              err?.message?.includes("idx_reservations_reservation_number"));
          if (isConflict && attempt < MAX_ATTEMPTS - 1) {
            continue;
          }
          throw insertError;
        }
      }

      if (!newReservation) {
        throw new Error("予約番号の発行に失敗しました。時間をおいて再度お試しください。");
      }

      // Record audit log for reservation creation
      await tx.insert(reservationLogs).values({
        reservationId: newReservation.id,
        action: "created",
        previousStatus: null,
        newStatus: "confirmed",
        operatorId: currentUser?.id ?? null,
        operatorRole: currentUser?.role ?? "customer",
        note: currentUser ? "スタッフによる予約登録" : "お客様によるウェブ予約",
      });

      const selectedTable = tables.find((t) => t.id === selectedTableId);
      return {
        reservation: newReservation,
        tableName: selectedTable?.name || "テーブル席",
      };
    });

    safeRevalidate("/dashboard");
    safeRevalidate("/reserve");

    sendReservationConfirmationEmail({
      reservationId: result.reservation.id,
      reservationNumber: result.reservation.reservationNumber || undefined,
      cancellationToken: rawCancellationToken,
      restaurantName: restaurant.name,
      restaurantAddress: restaurant.address,
      restaurantPhone: restaurant.phone,
      cancellationCutoffHours:
        restaurant.cancellationCutoffHours || restaurantConfig.booking.cancellationCutoffHours,
      customerName,
      customerEmail,
      partySize,
      startAt,
      endAt,
      tableName: result.tableName,
      note,
    }).catch((err) => {
      console.error("[Email] Failed to send reservation confirmation:", err);
    });

    return {
      success: true,
      reservationId: result.reservation.id,
      reservationNumber: result.reservation.reservationNumber || undefined,
      cancellationToken: rawCancellationToken,
    };
  } catch (error: unknown) {
    const err = error as
      | {
          code?: string;
          message?: string;
          cause?: { code?: string; message?: string };
        }
      | undefined;
    const errorCode = err?.code || err?.cause?.code;
    const errorMessage = `${err?.message || ""} ${err?.cause?.message || ""}`;

    // Handle unique violation on idx_reservations_idempotency (concurrent duplicate submit)
    if (errorCode === "23505" && idempotencyKey && restaurantId) {
      const [existing] = await db
        .select({ id: reservations.id, reservationNumber: reservations.reservationNumber })
        .from(reservations)
        .where(
          and(
            eq(reservations.restaurantId, restaurantId),
            eq(reservations.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);

      if (existing) {
        return {
          success: true,
          reservationId: existing.id,
          reservationNumber: existing.reservationNumber || undefined,
          cancellationToken: "",
        };
      }
    }

    // Catch PostgreSQL GiST exclusion constraint violation (23P01 exclusion_violation)
    if (errorCode === "23P01" || errorMessage.includes("no_overlapping_reservations")) {
      return {
        success: false,
        code: RESERVATION_ERROR.FULLY_BOOKED,
        message: "ご指定の日時はすでに満席です。別の時間帯をお選びください。",
      };
    }

    return {
      success: false,
      code: RESERVATION_ERROR.SERVER_ERROR,
      message: err?.message || "予約の受付中にエラーが発生しました。もう一度お試しください。",
    };
  }
}

export async function cancelReservationAction(
  token: string,
): Promise<ActionResult<ReservationErrorCode>> {
  try {
    if (!token || token.length < 10) {
      return {
        success: false,
        code: RESERVATION_ERROR.INVALID_CANCEL_TOKEN,
        message: "無効なキャンセルトークンです。",
      };
    }

    const tokenHash = hashToken(token);

    const [found] = await db
      .select({
        id: reservations.id,
        reservationNumber: reservations.reservationNumber,
        startAt: reservations.startAt,
        endAt: reservations.endAt,
        partySize: reservations.partySize,
        status: reservations.status,
        customerName: reservations.customerName,
        customerEmail: reservations.customerEmail,
        restaurantName: restaurants.name,
        restaurantAddress: restaurants.address,
        restaurantPhone: restaurants.phone,
        cutoffHours: restaurants.cancellationCutoffHours,
      })
      .from(reservations)
      .innerJoin(restaurants, eq(reservations.restaurantId, restaurants.id))
      .where(eq(reservations.cancellationTokenHash, tokenHash))
      .limit(1);

    if (!found) {
      return {
        success: false,
        code: RESERVATION_ERROR.NOT_FOUND,
        message: "該当するご予約が見つかりませんでした。",
      };
    }

    if (found.status === "cancelled") {
      return {
        success: false,
        code: RESERVATION_ERROR.ALREADY_CANCELLED,
        message: "このご予約はすでにキャンセル済みです。",
      };
    }

    if (found.status === "completed") {
      return {
        success: false,
        code: RESERVATION_ERROR.CANNOT_CANCEL_COMPLETED,
        message: "ご来店済みの予約はキャンセルできません。",
      };
    }

    if (found.status === "no_show") {
      return {
        success: false,
        code: RESERVATION_ERROR.CANNOT_CANCEL_NOSHOW,
        message: "無断不来店として処理された予約はキャンセルできません。",
      };
    }

    if (found.status !== "confirmed") {
      return {
        success: false,
        code: RESERVATION_ERROR.CANNOT_CANCEL,
        message: "この予約はキャンセルできません。",
      };
    }

    const cutoffHours = found.cutoffHours || restaurantConfig.booking.cancellationCutoffHours;
    const cutoffMs = cutoffHours * 60 * 60 * 1000;
    const now = new Date();
    if (found.startAt.getTime() - now.getTime() < cutoffMs) {
      return {
        success: false,
        code: RESERVATION_ERROR.CUTOFF_EXCEEDED,
        message: `キャンセル受付期限（ご来店時間の${cutoffHours}時間前）を過ぎているため、WEB上でのキャンセルはできません。お電話にてお問い合わせください。`,
      };
    }

    const result = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(reservations)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(reservations.id, found.id),
            notInArray(reservations.status, ["cancelled", "completed", "no_show"]),
          ),
        )
        .returning();

      if (!updated) {
        return null;
      }

      await tx.insert(reservationLogs).values({
        reservationId: found.id,
        action: "cancelled",
        previousStatus: found.status,
        newStatus: "cancelled",
        operatorId: null,
        operatorRole: "customer",
        note: "お客様によるウェブからのキャンセル",
      });

      return updated;
    });

    if (!result) {
      return {
        success: false,
        code: RESERVATION_ERROR.CANNOT_CANCEL,
        message: "このご予約はすでにキャンセル済みか、キャンセルできない状態です。",
      };
    }

    safeRevalidate("/dashboard");
    safeRevalidate("/reserve");

    sendReservationCancellationEmail({
      reservationId: found.id,
      reservationNumber: found.reservationNumber || undefined,
      cancellationToken: "",
      restaurantName: found.restaurantName,
      restaurantAddress: found.restaurantAddress,
      restaurantPhone: found.restaurantPhone,
      customerName: found.customerName,
      customerEmail: found.customerEmail,
      partySize: found.partySize,
      startAt: found.startAt,
      endAt: found.endAt,
    }).catch((err) => {
      console.error("[Email] Failed to send cancellation email:", err);
    });

    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string } | undefined;
    return {
      success: false,
      code: RESERVATION_ERROR.SERVER_ERROR,
      message: err?.message || "予約のキャンセルに失敗しました。",
    };
  }
}

export async function updateReservationStatusAction(
  reservationId: string,
  newStatus: "confirmed" | "completed" | "cancelled" | "no_show",
  reason?: string,
  options?: { bypassTimeGuard?: boolean },
): Promise<ActionResult<ReservationErrorCode>> {
  try {
    const currentUser = await getUser();
    if (currentUser?.role === "demo") {
      return {
        success: false,
        code: RESERVATION_ERROR.DEMO_RESTRICTED,
        message: "デモアカウントのため、この操作は許可されていません。",
      };
    }

    const [existing] = await db
      .select({
        id: reservations.id,
        status: reservations.status,
        restaurantId: reservations.restaurantId,
        customerName: reservations.customerName,
        customerEmail: reservations.customerEmail,
        partySize: reservations.partySize,
        startAt: reservations.startAt,
        endAt: reservations.endAt,
      })
      .from(reservations)
      .where(eq(reservations.id, reservationId))
      .limit(1);

    if (!existing) {
      return {
        success: false,
        code: RESERVATION_ERROR.NOT_FOUND,
        message: "指定された予約が見つかりません。",
      };
    }

    if (existing.status === newStatus) {
      return { success: true };
    }

    if (existing.status === "completed") {
      return {
        success: false,
        code: RESERVATION_ERROR.INVALID_STATUS_TRANSITION,
        message: "来店済みの予約はステータスを変更できません。",
      };
    }

    if (existing.status === "cancelled") {
      return {
        success: false,
        code: RESERVATION_ERROR.INVALID_STATUS_TRANSITION,
        message: "キャンセル済みの予約はステータスを変更できません。",
      };
    }

    if (
      existing.status === "confirmed" &&
      !["completed", "cancelled", "no_show"].includes(newStatus)
    ) {
      return {
        success: false,
        code: RESERVATION_ERROR.INVALID_STATUS_TRANSITION,
        message: "確定済みの予約はこのステータスに変更できません。",
      };
    }

    if (existing.status === "no_show" && newStatus !== "confirmed" && newStatus !== "completed") {
      return {
        success: false,
        code: RESERVATION_ERROR.INVALID_STATUS_TRANSITION,
        message: "ノーショウの予約は「確定」または「来店済み」にのみ変更できます。",
      };
    }

    const isManager = currentUser?.role === "manager";

    // Enforce grace period time guard before marking confirmed reservation as no_show
    if (existing.status === "confirmed" && newStatus === "no_show") {
      const now = new Date();
      const gracePeriodMinutes = restaurantConfig.booking?.noShowGracePeriodMinutes ?? 15;
      const gracePeriodMs = gracePeriodMinutes * 60 * 1000;
      if (
        now.getTime() < existing.startAt.getTime() + gracePeriodMs &&
        !options?.bypassTimeGuard &&
        !isManager
      ) {
        return {
          success: false,
          code: RESERVATION_ERROR.EARLY_NO_SHOW,
          message: `来店予定時刻から${gracePeriodMinutes}分が経過するまでノーショウに変更できません。`,
        };
      }
    }

    const updated = await db.transaction(async (tx) => {
      const [rec] = await tx
        .update(reservations)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(reservations.id, reservationId))
        .returning();

      const logNote = reason?.trim()
        ? `ステータス変更：${existing.status} → ${newStatus} (${reason.trim()})`
        : `ステータス変更：${existing.status} → ${newStatus}`;

      await tx.insert(reservationLogs).values({
        reservationId,
        action: "status_changed",
        previousStatus: existing.status,
        newStatus,
        operatorId: currentUser?.id ?? null,
        operatorRole: currentUser?.role ?? "staff",
        note: logNote,
      });

      return rec;
    });

    if (updated && newStatus === "cancelled" && existing.status !== "cancelled") {
      const [restaurant] = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, updated.restaurantId))
        .limit(1);

      if (restaurant) {
        sendReservationCancellationEmail({
          reservationId: updated.id,
          reservationNumber: updated.reservationNumber || undefined,
          cancellationToken: "",
          restaurantName: restaurant.name,
          restaurantAddress: restaurant.address,
          restaurantPhone: restaurant.phone,
          customerName: updated.customerName,
          customerEmail: updated.customerEmail,
          partySize: updated.partySize,
          startAt: updated.startAt,
          endAt: updated.endAt,
        }).catch((err) => {
          console.error("[Email] Failed to send cancellation email on status update:", err);
        });
      }
    }

    safeRevalidate("/dashboard");
    safeRevalidate("/dashboard/logs");
    return { success: true };
  } catch (error: unknown) {
    const err = error as
      | {
          code?: string;
          message?: string;
          cause?: { code?: string; message?: string };
        }
      | undefined;
    const errorCode = err?.code || err?.cause?.code;
    const errorMessage = `${err?.message || ""} ${err?.cause?.message || ""}`;
    if (errorCode === "23P01" || errorMessage.includes("no_overlapping_reservations")) {
      return {
        success: false,
        code: RESERVATION_ERROR.FULLY_BOOKED,
        message:
          "他のお客様のご予約と重複しているため、予約を確定できません。別の座席または時間帯を選択してください。",
      };
    }
    return {
      success: false,
      code: RESERVATION_ERROR.SERVER_ERROR,
      message: err?.message || "ステータスの更新に失敗しました。",
    };
  }
}

export async function fetchReservationsAction(date?: string) {
  try {
    return await getReservations({ date });
  } catch {
    return [];
  }
}

export async function fetchTablesAction() {
  try {
    const restaurant = await getRestaurant(DEFAULT_RESTAURANT_SLUG);
    if (!restaurant) return [];
    return await getRestaurantTables(restaurant.id);
  } catch {
    return [];
  }
}

export async function fetchAvailableSlotsAction(date: string, partySize: number) {
  try {
    return await getAvailableSlots({ date, partySize });
  } catch {
    return [];
  }
}

export async function createTableAction(input: {
  name: string;
  type?: string;
  capacity: number;
}): Promise<ActionResult<TableErrorCode>> {
  try {
    await assertManager();

    const name = input.name?.trim();
    if (!name) {
      return {
        success: false,
        code: TABLE_ERROR.VALIDATION_FAILED,
        message: "座席番号・名称を入力してください。",
      };
    }
    const capacity = Number(input.capacity);
    if (!capacity || capacity <= 0) {
      return {
        success: false,
        code: TABLE_ERROR.VALIDATION_FAILED,
        message: "有効な収容人数（1名以上）を入力してください。",
      };
    }

    const restaurant = await getRestaurant(DEFAULT_RESTAURANT_SLUG);
    if (!restaurant) {
      return {
        success: false,
        code: TABLE_ERROR.RESTAURANT_NOT_FOUND,
        message: "店舗情報が見つかりません。",
      };
    }

    await db.insert(restaurantTables).values({
      restaurantId: restaurant.id,
      name,
      type: input.type?.trim() || "テーブル席",
      capacity,
      active: true,
    });

    safeRevalidate("/dashboard");
    safeRevalidate("/dashboard/tables");
    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string } | undefined;
    return {
      success: false,
      code: TABLE_ERROR.SERVER_ERROR,
      message: err?.message || "座席の追加に失敗しました。",
    };
  }
}

async function getFutureActiveReservationCount(tableId: string): Promise<number> {
  const [futureRsv] = await db
    .select({ count: sql<number>`count(*)` })
    .from(reservations)
    .where(
      and(
        eq(reservations.tableId, tableId),
        notInArray(reservations.status, ["cancelled", "no_show"]),
        sql`${reservations.endAt} > ${new Date().toISOString()}::timestamptz`,
      ),
    );
  return Number(futureRsv?.count || 0);
}

export async function updateTableDetailsAction(
  tableId: string,
  input: {
    name: string;
    type?: string;
    capacity: number;
    active: boolean;
  },
): Promise<ActionResult<TableErrorCode>> {
  try {
    await assertManager();

    const name = input.name?.trim();
    if (!name) {
      return {
        success: false,
        code: TABLE_ERROR.VALIDATION_FAILED,
        message: "座席番号・名称を入力してください。",
      };
    }
    const capacity = Number(input.capacity);
    if (!capacity || capacity <= 0) {
      return {
        success: false,
        code: TABLE_ERROR.VALIDATION_FAILED,
        message: "有効な収容人数（1名以上）を入力してください。",
      };
    }

    if (!input.active) {
      const count = await getFutureActiveReservationCount(tableId);
      if (count > 0) {
        return {
          success: false,
          code: TABLE_ERROR.HAS_FUTURE_RESERVATIONS,
          message: `この座席には今後の有効な予約が${count}件存在するため休止できません。先に予約の変更またはキャンセルを行ってください。`,
        };
      }
    }

    const [oversizedRsv] = await db
      .select({ id: reservations.id, partySize: reservations.partySize })
      .from(reservations)
      .where(
        and(
          eq(reservations.tableId, tableId),
          notInArray(reservations.status, ["cancelled", "no_show"]),
          sql`${reservations.endAt} > ${new Date().toISOString()}::timestamptz`,
          sql`${reservations.partySize} > ${capacity}`,
        ),
      )
      .limit(1);

    if (oversizedRsv) {
      return {
        success: false,
        code: TABLE_ERROR.CAPACITY_CONFLICT,
        message: `この座席には収容人数（${capacity}名）を超える今後の予約（${oversizedRsv.partySize}名様）が存在するため、人数を変更できません。`,
      };
    }

    await db
      .update(restaurantTables)
      .set({
        name,
        type: input.type?.trim() || "テーブル席",
        capacity,
        active: input.active,
      })
      .where(eq(restaurantTables.id, tableId));

    safeRevalidate("/dashboard");
    safeRevalidate("/dashboard/tables");
    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string } | undefined;
    return {
      success: false,
      code: TABLE_ERROR.SERVER_ERROR,
      message: err?.message || "座席の更新に失敗しました。",
    };
  }
}

export async function updateTableStatusAction(
  tableId: string,
  active: boolean,
): Promise<ActionResult<TableErrorCode>> {
  try {
    await assertManager();

    if (!active) {
      const count = await getFutureActiveReservationCount(tableId);
      if (count > 0) {
        return {
          success: false,
          code: TABLE_ERROR.HAS_FUTURE_RESERVATIONS,
          message: `この座席には今後の有効な予約が${count}件存在するため休止できません。先に予約の変更またはキャンセルを行ってください。`,
        };
      }
    }

    await db.update(restaurantTables).set({ active }).where(eq(restaurantTables.id, tableId));

    safeRevalidate("/dashboard");
    safeRevalidate("/dashboard/tables");
    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string } | undefined;
    return {
      success: false,
      code: TABLE_ERROR.SERVER_ERROR,
      message: err?.message || "座席情報の更新に失敗しました。",
    };
  }
}

export async function fetchReservationLogsAction(options?: {
  reservationId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const user = await getUser();
    if (!user || !canViewManagerPages(user.role)) {
      return [];
    }
    return await getReservationLogs(options);
  } catch {
    return [];
  }
}
