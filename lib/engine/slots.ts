import { and, eq, notInArray, sql } from "drizzle-orm";
import { DEFAULT_RESTAURANT_SLUG, restaurantConfig } from "@/config/restaurant";
import { db } from "@/lib/db/drizzle";
import { businessHours, reservations, restaurants, restaurantTables } from "@/lib/db/schema";
import { getDayOfWeek } from "@/lib/utils";

export interface TimeSlot {
  time: string; // e.g. "12:00"
  startAt: string; // ISO 8601 UTC
  endAt: string; // ISO 8601 UTC
  available: boolean;
  remainingTables: number;
}

/**
 * Returns the UTC offset in minutes for a given IANA timezone at an approximate UTC instant.
 * Uses the Intl.DateTimeFormat trick: compare the UTC time against what the formatter reports
 * as the local time in the target timezone.
 */
function getUtcOffsetMinutes(timezone: string, approxUtc: Date): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(approxUtc);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  // Normalize hour 24 → 0 (some locales emit 24 for midnight)
  const localUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return (localUtc - approxUtc.getTime()) / 60_000;
}

/**
 * Parses "YYYY-MM-DD" + "HH:mm" as a wall-clock time in the given IANA timezone
 * and returns the corresponding UTC Date.
 * dayOffset shifts the date by N calendar days (used for overnight shifts).
 */
export function parseDateTime(
  dateStr: string,
  timeStr: string,
  dayOffset: number,
  timezone: string,
): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  const adjustedDay = day + dayOffset;

  // Treat the local wall-clock time as if it were UTC to get a starting reference point.
  const asIfUtc = new Date(Date.UTC(year, month - 1, adjustedDay, hours, minutes, 0));
  // Find the actual UTC offset at that instant and apply it.
  const offsetMinutes = getUtcOffsetMinutes(timezone, asIfUtc);
  return new Date(asIfUtc.getTime() - offsetMinutes * 60_000);
}

/**
 * Formats a UTC Date as "HH:mm" wall-clock time in the given IANA timezone.
 */
export function formatTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(/^24:/, "00:"); // normalize midnight edge case
}

/**
 * Computes available booking time slots for a given date and party size.
 */
export async function getAvailableSlots(options: {
  restaurantSlug?: string;
  date: string; // "YYYY-MM-DD"
  partySize: number;
}): Promise<TimeSlot[]> {
  const slug = options.restaurantSlug || DEFAULT_RESTAURANT_SLUG;
  const [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.slug, slug))
    .limit(1);

  if (!restaurant) {
    return [];
  }

  const candidateTables = await db
    .select()
    .from(restaurantTables)
    .where(
      and(
        eq(restaurantTables.restaurantId, restaurant.id),
        eq(restaurantTables.active, true),
        sql`${restaurantTables.capacity} >= ${options.partySize}`,
      ),
    )
    .orderBy(restaurantTables.capacity, restaurantTables.name);

  if (candidateTables.length === 0) {
    return [];
  }

  // Compute day-of-week (0=Sun … 6=Sat) in the restaurant's timezone
  const dayOfWeekNum = getDayOfWeek(options.date, restaurant.timezone);

  const closedDays = (restaurant.closedDaysOfWeek || "1").split(",").map(Number);

  if (closedDays.includes(dayOfWeekNum)) {
    return [];
  }

  const hours = await db
    .select()
    .from(businessHours)
    .where(eq(businessHours.restaurantId, restaurant.id))
    .orderBy(businessHours.openTime);

  const activeHours = hours.length > 0 ? hours : restaurantConfig.businessHours.periods;

  if (activeHours.length === 0) {
    return [];
  }

  const defaultDurationMinutes =
    restaurant.defaultDurationMinutes || restaurantConfig.booking.defaultDurationMinutes;
  const slotIntervalMinutes =
    restaurant.slotIntervalMinutes || restaurantConfig.booking.slotIntervalMinutes;
  const minAdvanceHours = restaurant.minAdvanceHours || restaurantConfig.booking.minAdvanceHours;

  const durationMs = defaultDurationMinutes * 60 * 1000;
  const slotIntervalMs = slotIntervalMinutes * 60 * 1000;
  const now = new Date();
  const minAdvanceMs = minAdvanceHours * 60 * 60 * 1000;
  const earliestAllowed = new Date(now.getTime() + minAdvanceMs);

  const tz = restaurant.timezone;

  // Determine query range dynamically based on active shifts for the serviceDate
  let maxSessionEnd = parseDateTime(options.date, "23:59", 0, tz);
  for (const bh of activeHours) {
    const isOvernight = bh.isOvernight || bh.closeTime < bh.openTime;
    const sEnd = parseDateTime(options.date, bh.closeTime, isOvernight ? 1 : 0, tz);
    if (sEnd.getTime() > maxSessionEnd.getTime()) {
      maxSessionEnd = sEnd;
    }
  }

  const rangeStart = parseDateTime(options.date, "00:00", 0, tz);
  const rangeEnd = maxSessionEnd;

  const existingReservations = await db
    .select({
      id: reservations.id,
      tableId: reservations.tableId,
      startAt: reservations.startAt,
      endAt: reservations.endAt,
    })
    .from(reservations)
    .where(
      and(
        eq(reservations.restaurantId, restaurant.id),
        notInArray(reservations.status, ["cancelled", "no_show"]),
        sql`${reservations.startAt} < ${rangeEnd.toISOString()}::timestamptz AND ${reservations.endAt} > ${rangeStart.toISOString()}::timestamptz`,
      ),
    );

  const slots: TimeSlot[] = [];
  const candidateTableIds = candidateTables.map((t) => t.id);

  for (const bh of activeHours) {
    const isOvernight = bh.isOvernight || bh.closeTime < bh.openTime;
    const sessionStart = parseDateTime(options.date, bh.openTime, 0, tz);
    // When overnight, closeTime falls on the following day
    const sessionEnd = parseDateTime(options.date, bh.closeTime, isOvernight ? 1 : 0, tz);

    // Latest possible slot start must accommodate the full dining duration
    const lastPossibleStart = new Date(sessionEnd.getTime() - durationMs);

    let currentSlotStart = new Date(sessionStart.getTime());

    while (currentSlotStart.getTime() <= lastPossibleStart.getTime()) {
      const currentSlotEnd = new Date(currentSlotStart.getTime() + durationMs);
      const isPastOrTooEarly = currentSlotStart.getTime() < earliestAllowed.getTime();

      if (isPastOrTooEarly) {
        slots.push({
          time: formatTime(currentSlotStart, tz),
          startAt: currentSlotStart.toISOString(),
          endAt: currentSlotEnd.toISOString(),
          available: false,
          remainingTables: 0,
        });
      } else {
        let availableCount = 0;
        for (const tableId of candidateTableIds) {
          const isOverlapping = existingReservations.some(
            (r) =>
              r.tableId === tableId &&
              r.startAt.getTime() < currentSlotEnd.getTime() &&
              r.endAt.getTime() > currentSlotStart.getTime(),
          );
          if (!isOverlapping) {
            availableCount++;
          }
        }

        slots.push({
          time: formatTime(currentSlotStart, tz),
          startAt: currentSlotStart.toISOString(),
          endAt: currentSlotEnd.toISOString(),
          available: availableCount > 0,
          remainingTables: availableCount,
        });
      }

      currentSlotStart = new Date(currentSlotStart.getTime() + slotIntervalMs);
    }
  }

  slots.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  return slots;
}
