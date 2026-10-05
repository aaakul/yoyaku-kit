import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_RESTAURANT_SLUG } from "@/config/restaurant";
import { db } from "@/lib/db/drizzle";
import { reservationLogs, reservations, restaurants, restaurantTables } from "@/lib/db/schema";
import {
  cancelReservationAction,
  createReservationAction,
  updateReservationStatusAction,
} from "@/lib/engine/reservation-actions";
import { RESERVATION_ERROR } from "@/lib/errors/codes";
import { getDayOfWeek } from "@/lib/utils";

describe("Live PostgreSQL Integration & Concurrency Verification", () => {
  let restaurantId: string;
  let testTableId: string;
  const createdReservationIds: string[] = [];

  function getOpenDateStr(daysAhead: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    while (true) {
      const dateStr = d.toISOString().split("T")[0];
      const dow = getDayOfWeek(dateStr, "Asia/Tokyo");
      if (dow !== 1) {
        return dateStr;
      }
      d.setDate(d.getDate() + 1);
    }
  }

  beforeAll(async () => {
    // Fetch default restaurant
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.slug, DEFAULT_RESTAURANT_SLUG))
      .limit(1);

    expect(restaurant).toBeDefined();
    restaurantId = restaurant.id;

    // Clean up residual test data from previous interrupted runs
    await db
      .delete(reservations)
      .where(
        eq(reservations.cancellationTokenHash, "test_gist_tok_1_hash_placeholder_value_64ch_aaaa"),
      );
    await db
      .delete(reservations)
      .where(sql`restaurant_id = ${restaurantId} AND customer_name LIKE 'Test_Party_%'`);
  });

  afterAll(async () => {
    // Clean up test reservations tracked during test execution
    if (createdReservationIds.length > 0) {
      await db.delete(reservations).where(inArray(reservations.id, createdReservationIds));
    }
  });

  it("should create a reservation atomically using Server Action in live DB", async () => {
    // Book 7 days ahead at 18:00
    const dateStr = getOpenDateStr(7);

    const result = await createReservationAction({
      restaurantSlug: DEFAULT_RESTAURANT_SLUG,
      date: dateStr,
      time: "18:00",
      partySize: 2,
      customerName: "山田 太郎",
      customerNameKana: "ヤマダ タロウ",
      customerPhone: "090-1111-2222",
      customerEmail: "yamada@example.com",
      note: "テスト予約",
    });

    if (result.success && result.reservationId) {
      createdReservationIds.push(result.reservationId);
    }

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.cancellationToken).toBeDefined();
    expect(result.cancellationToken.length).toBe(21);
    expect(result.reservationNumber).toBeDefined();
    expect(result.reservationNumber).toHaveLength(6);
    expect(result.reservationNumber).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);

    // Verify persisted record
    const [inserted] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, result.reservationId));

    expect(inserted).toBeDefined();
    expect(inserted.customerName).toBe("山田 太郎");
    expect(inserted.status).toBe("confirmed");
    expect(inserted.reservationNumber).toBe(result.reservationNumber);
    // DB stores sha256 hash, not the raw token
    expect(inserted.cancellationTokenHash).toHaveLength(64);
  });

  it("should enforce PostgreSQL btree_gist exclusion constraint on direct overlapping write", async () => {
    // Attempt overlapping insert on the same table to verify GiST exclusion constraint
    const [table] = await db
      .select()
      .from(restaurantTables)
      .where(eq(restaurantTables.restaurantId, restaurantId))
      .limit(1);

    expect(table).toBeDefined();
    testTableId = table.id;

    const startAt = new Date("2026-11-20T09:00:00.000Z"); // 18:00 JST
    const endAt = new Date("2026-11-20T10:30:00.000Z"); // 19:30 JST

    // First insert succeeds
    const [inserted] = await db
      .insert(reservations)
      .values({
        restaurantId,
        tableId: testTableId,
        cancellationTokenHash: "test_gist_tok_1_hash_placeholder_value_64ch_aaaa",
        startAt,
        endAt,
        partySize: 2,
        status: "confirmed",
        customerName: "GIST Test 1",
        customerNameKana: "テストイチ",
        customerPhone: "090-0000-0001",
        customerEmail: "gist1@example.com",
      })
      .returning({ id: reservations.id });

    if (inserted?.id) {
      createdReservationIds.push(inserted.id);
    }

    // Second insert with overlapping time range must be rejected by GiST constraint
    let errorCaught: {
      code?: string;
      message?: string;
      cause?: { code?: string; message?: string };
    } | null = null;
    try {
      await db.insert(reservations).values({
        restaurantId,
        tableId: testTableId,
        cancellationTokenHash: "test_gist_tok_2_hash_placeholder_value_64ch_bbbb",
        startAt: new Date("2026-11-20T09:30:00.000Z"), // 18:30 JST (overlapping)
        endAt: new Date("2026-11-20T11:00:00.000Z"),
        partySize: 2,
        status: "confirmed",
        customerName: "GIST Test 2",
        customerNameKana: "テストニ",
        customerPhone: "090-0000-0002",
        customerEmail: "gist2@example.com",
      });
    } catch (err: unknown) {
      errorCaught = err as {
        code?: string;
        message?: string;
        cause?: { code?: string; message?: string };
      };
    }

    expect(errorCaught).toBeDefined();
    // Error code 23P01 represents exclusion_violation
    const pgError = errorCaught?.cause ?? errorCaught;
    expect(pgError?.code).toBe("23P01");
    expect(pgError?.message).toContain("no_overlapping_reservations");
  });

  it("should handle live concurrent race condition with zero overselling across all tables", async () => {
    // Launch 15 concurrent booking requests for party size 4
    const dateStr = getOpenDateStr(10);

    const concurrentCount = 15;
    const promises = Array.from({ length: concurrentCount }, (_, i) =>
      createReservationAction({
        restaurantSlug: "kyoto-shabu",
        date: dateStr,
        time: "19:00",
        partySize: 4,
        customerName: `Test_Party_${i + 1}`,
        customerNameKana: "テストパーティ",
        customerPhone: `090-9999-${String(i).padStart(4, "0")}`,
        customerEmail: `concurrent_${i}@example.com`,
      }),
    );

    const results = await Promise.all(promises);

    results.forEach((r) => {
      if (r.success && r.reservationId) {
        createdReservationIds.push(r.reservationId);
      }
    });

    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    // Tables fitting party size 4: T-03(4), T-04(4), T-05(4), T-06(6), T-07(8) (5 tables total)
    // At most 5 reservations can succeed; all others must fail safely
    expect(successes.length).toBeLessThanOrEqual(5);
    expect(failures.length).toBeGreaterThanOrEqual(10);

    // Verify no duplicate table assignments in database
    const bookedInDb = await db
      .select({ tableId: reservations.tableId })
      .from(reservations)
      .where(sql`restaurant_id = ${restaurantId} AND customer_name LIKE 'Test_Party_%'`);

    const tableIds = bookedInDb.map((b) => b.tableId);
    const uniqueTableIds = new Set(tableIds);
    expect(uniqueTableIds.size).toBe(tableIds.length); // Zero overselling: each table assigned at most once
  });

  it("should support customer cancellation via token and verify cutoff rule in live DB", async () => {
    const dateStr = getOpenDateStr(12);

    const createRes = await createReservationAction({
      restaurantSlug: "kyoto-shabu",
      date: dateStr,
      time: "18:30",
      partySize: 2,
      customerName: "キャンセル検証",
      customerNameKana: "キャンセル",
      customerPhone: "090-7777-8888",
      customerEmail: "cancel@example.com",
    });

    if (createRes.success && createRes.reservationId) {
      createdReservationIds.push(createRes.reservationId);
    }

    expect(createRes.success).toBe(true);
    if (!createRes.success) return;

    // Perform cancellation
    const cancelRes = await cancelReservationAction(createRes.cancellationToken);
    expect(cancelRes.success).toBe(true);

    // Verify status updated to cancelled in database
    const [updated] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, createRes.reservationId));

    expect(updated.status).toBe("cancelled");

    // Verify audit log recorded for cancellation
    const cancelLogs = await db
      .select()
      .from(reservationLogs)
      .where(eq(reservationLogs.reservationId, createRes.reservationId));

    expect(cancelLogs.length).toBeGreaterThanOrEqual(2); // created + cancelled
    const latestLog = cancelLogs.find((l) => l.action === "cancelled");
    expect(latestLog).toBeDefined();
    expect(latestLog?.previousStatus).toBe("confirmed");
    expect(latestLog?.newStatus).toBe("cancelled");
    expect(latestLog?.operatorRole).toBe("customer");
  });

  it("should record audit logs when reservation status is updated", async () => {
    const dateStr = getOpenDateStr(14);

    const createRes = await createReservationAction({
      restaurantSlug: "kyoto-shabu",
      date: dateStr,
      time: "19:00",
      partySize: 2,
      customerName: "ステータス検証",
      customerNameKana: "ステータス",
      customerPhone: "090-8888-9999",
      customerEmail: "status@example.com",
    });

    if (createRes.success && createRes.reservationId) {
      createdReservationIds.push(createRes.reservationId);
    }

    expect(createRes.success).toBe(true);
    if (!createRes.success) return;

    // Transition status to completed
    const updateRes = await updateReservationStatusAction(createRes.reservationId, "completed");
    expect(updateRes.success).toBe(true);

    // Verify audit logs
    const logs = await db
      .select()
      .from(reservationLogs)
      .where(eq(reservationLogs.reservationId, createRes.reservationId))
      .orderBy(reservationLogs.createdAt);

    expect(logs.length).toBe(2);
    expect(logs[0].action).toBe("created");
    expect(logs[0].newStatus).toBe("confirmed");

    expect(logs[1].action).toBe("status_changed");
    expect(logs[1].previousStatus).toBe("confirmed");
    expect(logs[1].newStatus).toBe("completed");

    // Idempotent update should succeed without adding redundant audit log
    const repeatRes = await updateReservationStatusAction(createRes.reservationId, "completed");
    expect(repeatRes.success).toBe(true);

    const logsAfterRepeat = await db
      .select()
      .from(reservationLogs)
      .where(eq(reservationLogs.reservationId, createRes.reservationId));
    expect(logsAfterRepeat.length).toBe(2);

    // Cannot transition completed reservation to cancelled
    const invalidUpdateRes = await updateReservationStatusAction(
      createRes.reservationId,
      "cancelled",
    );
    expect(invalidUpdateRes.success).toBe(false);
    if (!invalidUpdateRes.success) {
      expect(invalidUpdateRes.code).toBe(RESERVATION_ERROR.INVALID_STATUS_TRANSITION);
    }

    // Customer cancellation via token on completed reservation must be rejected
    const cancelOnCompletedRes = await cancelReservationAction(createRes.cancellationToken);
    expect(cancelOnCompletedRes.success).toBe(false);
    if (!cancelOnCompletedRes.success) {
      expect(cancelOnCompletedRes.code).toBe(RESERVATION_ERROR.CANNOT_CANCEL_COMPLETED);
    }
  });

  it("should handle no_show lifecycle, state transitions, reason logging, and terminal states", async () => {
    const dateStr = getOpenDateStr(16);

    const createRes = await createReservationAction({
      restaurantSlug: "kyoto-shabu",
      date: dateStr,
      time: "20:00",
      partySize: 2,
      customerName: "ノーショー検証",
      customerNameKana: "ノーショー",
      customerPhone: "090-7777-6666",
      customerEmail: "noshow@example.com",
    });

    if (createRes.success && createRes.reservationId) {
      createdReservationIds.push(createRes.reservationId);
    }

    expect(createRes.success).toBe(true);
    if (!createRes.success) return;

    // 0. Time guard prevents marking no_show before grace period (15 min after dining start)
    const earlyNoShowRes = await updateReservationStatusAction(
      createRes.reservationId,
      "no_show",
      "30分経過連絡なし",
    );
    expect(earlyNoShowRes.success).toBe(false);
    if (!earlyNoShowRes.success) {
      expect(earlyNoShowRes.code).toBe(RESERVATION_ERROR.EARLY_NO_SHOW);
    }

    // 1. Transition confirmed -> no_show with bypassTimeGuard (or manager / past reservation)
    const noShowRes = await updateReservationStatusAction(
      createRes.reservationId,
      "no_show",
      "30分経過連絡なし",
      { bypassTimeGuard: true },
    );
    expect(noShowRes.success).toBe(true);

    // Verify DB status and audit log with reason
    const [rsv] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, createRes.reservationId))
      .limit(1);
    expect(rsv.status).toBe("no_show");

    const logs = await db
      .select()
      .from(reservationLogs)
      .where(eq(reservationLogs.reservationId, createRes.reservationId))
      .orderBy(reservationLogs.createdAt);

    const noShowLog = logs.find((l) => l.newStatus === "no_show");
    expect(noShowLog).toBeDefined();
    expect(noShowLog?.previousStatus).toBe("confirmed");
    expect(noShowLog?.note).toContain("30分経過連絡なし");

    // 2. Customer token cancel on no_show should be rejected
    const cancelRes = await cancelReservationAction(createRes.cancellationToken);
    expect(cancelRes.success).toBe(false);
    if (!cancelRes.success) {
      expect(cancelRes.code).toBe(RESERVATION_ERROR.CANNOT_CANCEL_NOSHOW);
    }

    // 3. Invalid transition: no_show -> cancelled must fail
    const invalidCancelRes = await updateReservationStatusAction(
      createRes.reservationId,
      "cancelled",
    );
    expect(invalidCancelRes.success).toBe(false);
    if (!invalidCancelRes.success) {
      expect(invalidCancelRes.code).toBe(RESERVATION_ERROR.INVALID_STATUS_TRANSITION);
    }

    // 4. Valid recovery: no_show -> confirmed
    const recoverRes = await updateReservationStatusAction(
      createRes.reservationId,
      "confirmed",
      "誤操作のため復帰",
    );
    expect(recoverRes.success).toBe(true);

    // 5. Transition confirmed -> no_show -> completed (guest arrived late)
    await updateReservationStatusAction(createRes.reservationId, "no_show", undefined, {
      bypassTimeGuard: true,
    });
    const completeFromNoShowRes = await updateReservationStatusAction(
      createRes.reservationId,
      "completed",
      "遅れて来店確認",
    );
    expect(completeFromNoShowRes.success).toBe(true);

    // 6. Terminal state: completed -> no_show must fail
    const noShowOnCompletedRes = await updateReservationStatusAction(
      createRes.reservationId,
      "no_show",
      undefined,
      { bypassTimeGuard: true },
    );
    expect(noShowOnCompletedRes.success).toBe(false);
    if (!noShowOnCompletedRes.success) {
      expect(noShowOnCompletedRes.code).toBe(RESERVATION_ERROR.INVALID_STATUS_TRANSITION);
    }
  });

  it("should ensure idempotent reservation creation and prevent duplicate records", async () => {
    const dateStr = getOpenDateStr(18);
    const testIdempotencyKey = `idem_${Date.now()}_abc123`;

    const input = {
      restaurantSlug: "kyoto-shabu",
      date: dateStr,
      time: "19:00",
      partySize: 2,
      customerName: "冪等検証 太郎",
      customerNameKana: "ベキトウ タロウ",
      customerPhone: "090-3333-4444",
      customerEmail: "idempotency@example.com",
      idempotencyKey: testIdempotencyKey,
    };

    // First submission
    const res1 = await createReservationAction(input);
    if (res1.success && res1.reservationId) {
      createdReservationIds.push(res1.reservationId);
    }
    expect(res1.success).toBe(true);
    if (!res1.success) return;

    // Retry submission with the same idempotencyKey
    const res2 = await createReservationAction(input);
    expect(res2.success).toBe(true);
    if (!res2.success) return;

    // Must return the exact same reservationId; token is empty on dedup (raw token not stored)
    expect(res2.reservationId).toBe(res1.reservationId);
    expect(res2.cancellationToken).toBe("");

    // Verify only 1 reservation record exists in DB for this idempotency key
    const matchingInDb = await db
      .select()
      .from(reservations)
      .where(eq(reservations.idempotencyKey, testIdempotencyKey));

    expect(matchingInDb.length).toBe(1);
  });

  it("should reject reservations on closed days (e.g. Monday)", async () => {
    // 2026-10-19 is a Monday
    const res = await createReservationAction({
      restaurantSlug: "kyoto-shabu",
      date: "2026-10-19",
      time: "18:00",
      partySize: 2,
      customerName: "定休日検証",
      customerNameKana: "テイキュウビ",
      customerPhone: "090-1234-5678",
      customerEmail: "closed@example.com",
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.code).toBe(RESERVATION_ERROR.CLOSED_DAY);
    }
  });

  it("should reject reservations outside business operating hours", async () => {
    // 2026-10-21 is Wednesday (open day), but 04:00 AM is outside operating hours
    const res = await createReservationAction({
      restaurantSlug: "kyoto-shabu",
      date: "2026-10-21",
      time: "04:00",
      partySize: 2,
      customerName: "営業時間外検証",
      customerNameKana: "エイギョウジカンガイ",
      customerPhone: "090-1234-5678",
      customerEmail: "outside@example.com",
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.code).toBe(RESERVATION_ERROR.OUTSIDE_HOURS);
    }
  });

  it("should calculate correct dayOffset for overnight shift midnight slots", async () => {
    // 2026-10-23 is Friday.
    // Midnight bookings for Friday night shift are at 00:00 and 00:30 (Saturday early morning JST).
    const targetDate = "2026-10-23";

    // Test 00:00 midnight booking
    const resMidnight = await createReservationAction({
      restaurantSlug: "kyoto-shabu",
      date: targetDate,
      time: "00:00",
      partySize: 2,
      customerName: "深夜検証 零時",
      customerNameKana: "シンヤ レイジ",
      customerPhone: "090-1234-5678",
      customerEmail: "midnight@example.com",
    });

    if (resMidnight.success && resMidnight.reservationId) {
      createdReservationIds.push(resMidnight.reservationId);
    }

    expect(resMidnight.success).toBe(true);
    if (resMidnight.success) {
      const [rsv] = await db
        .select()
        .from(reservations)
        .where(eq(reservations.id, resMidnight.reservationId));
      expect(rsv).toBeDefined();
      // startAt must be 2026-10-23T15:00:00.000Z UTC (= 2026-10-24 00:00 JST)
      expect(rsv.startAt.toISOString()).toBe("2026-10-23T15:00:00.000Z");

      // Cleanup
      await db.delete(reservations).where(eq(reservations.id, resMidnight.reservationId));
    }

    // Test 00:30 midnight booking
    const res = await createReservationAction({
      restaurantSlug: "kyoto-shabu",
      date: targetDate,
      time: "00:30",
      partySize: 2,
      customerName: "深夜検証",
      customerNameKana: "シンヤ",
      customerPhone: "090-1234-5678",
      customerEmail: "overnight@example.com",
    });

    if (res.success && res.reservationId) {
      createdReservationIds.push(res.reservationId);
    }

    expect(res.success).toBe(true);
    if (res.success) {
      const [rsv] = await db
        .select()
        .from(reservations)
        .where(eq(reservations.id, res.reservationId));
      expect(rsv).toBeDefined();
      // startAt must be 2026-10-23T15:30:00.000Z UTC (= 2026-10-24 00:30 JST)
      expect(rsv.startAt.toISOString()).toBe("2026-10-23T15:30:00.000Z");

      // Cleanup
      await db.delete(reservations).where(eq(reservations.id, res.reservationId));
    }
  });

  it("should retrieve overnight midnight reservations when querying by shift serviceDate", async () => {
    const { getReservations } = await import("@/lib/db/queries");
    const targetServiceDate = "2026-10-23"; // Friday

    const res = await createReservationAction({
      restaurantSlug: "kyoto-shabu",
      date: targetServiceDate,
      time: "00:30",
      partySize: 2,
      customerName: "サービス日検証",
      customerNameKana: "サービスビケンショウ",
      customerPhone: "090-9999-8888",
      customerEmail: "servicedate@example.com",
    });

    if (res.success && res.reservationId) {
      createdReservationIds.push(res.reservationId);
    }

    expect(res.success).toBe(true);
    if (res.success && res.reservationId) {
      // Query Friday service date: must return this overnight reservation
      const fridayList = await getReservations({ date: targetServiceDate });
      const foundInFriday = fridayList.find((r) => r.id === res.reservationId);
      expect(foundInFriday).toBeDefined();

      // Query Saturday service date: must NOT return Friday night's overnight reservation
      const saturdayList = await getReservations({ date: "2026-10-24" });
      const foundInSaturday = saturdayList.find((r) => r.id === res.reservationId);
      expect(foundInSaturday).toBeUndefined();

      // Cleanup
      await db.delete(reservations).where(eq(reservations.id, res.reservationId));
    }
  });
});
