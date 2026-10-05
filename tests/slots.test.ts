import { describe, expect, it } from "vitest";
import { formatTime, parseDateTime } from "@/lib/engine/slots";

describe("Timezone & Overnight Slot Calculations (Asia/Tokyo)", () => {
  it("should accurately convert Tokyo date and time to UTC Date", () => {
    // 2026-10-15 12:00 JST (UTC+9) corresponds to 2026-10-15 03:00 UTC
    const date = parseDateTime("2026-10-15", "12:00", 0, "Asia/Tokyo");
    expect(date.toISOString()).toBe("2026-10-15T03:00:00.000Z");
  });

  it("should handle overnight hours (+1 day offset) correctly", () => {
    // 2026-10-15 overnight to next day 01:30 JST corresponds to 2026-10-15 16:30 UTC
    const overnightDate = parseDateTime("2026-10-15", "01:30", 1, "Asia/Tokyo");
    expect(overnightDate.toISOString()).toBe("2026-10-15T16:30:00.000Z");
  });

  it("should format UTC Date back to Tokyo HH:mm format", () => {
    const utcDate = new Date("2026-10-15T09:30:00.000Z"); // +9h = 18:30 JST
    expect(formatTime(utcDate, "Asia/Tokyo")).toBe("18:30");
  });

  it("should return available slots for valid business days", async () => {
    const { getAvailableSlots } = await import("@/lib/engine/slots");
    const slots = await getAvailableSlots({ date: "2026-10-15", partySize: 2 });
    expect(slots.length).toBeGreaterThan(0);
    const availableSlot = slots.find((s) => s.available);
    expect(availableSlot).toBeDefined();
    expect(availableSlot?.remainingTables).toBeGreaterThan(0);
  });

  it("should return empty slots on regular closed days (Monday)", async () => {
    const { getAvailableSlots } = await import("@/lib/engine/slots");
    // 2026-10-19 is Monday
    const slots = await getAvailableSlots({ date: "2026-10-19", partySize: 2 });
    expect(slots).toEqual([]);
  });

  it("should include midnight slots (00:00 and 00:30) for overnight shift", async () => {
    const { getAvailableSlots } = await import("@/lib/engine/slots");
    // 2026-10-15 is Thursday (open business day)
    const slots = await getAvailableSlots({ date: "2026-10-15", partySize: 2 });
    const slotTimes = slots.map((s) => s.time);
    expect(slotTimes).toContain("00:00");
    expect(slotTimes).toContain("00:30");

    const midnightSlot = slots.find((s) => s.time === "00:00");
    expect(midnightSlot?.available).toBe(true);
  });
});

describe("Timeline Date Navigation", () => {
  it("should advance and step backwards correctly across month and year boundaries", async () => {
    const { addDays } = await import("@/lib/utils");
    expect(addDays("2026-10-02", 1)).toBe("2026-10-03");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-10-02", -1)).toBe("2026-10-01");
  });
});

describe("Timeline View Hours & Overnight Slot Positioning", () => {
  it("should format standard and overnight hours correctly", async () => {
    const { formatTimelineHour } = await import("@/components/dashboard/timeline-view");
    expect(formatTimelineHour(11)).toBe("11:00");
    expect(formatTimelineHour(18)).toBe("18:00");
    expect(formatTimelineHour(23)).toBe("23:00");
    expect(formatTimelineHour(24)).toBe("24:00");
    expect(formatTimelineHour(25)).toBe("翌01:00");
    expect(formatTimelineHour(26)).toBe("翌02:00");
  });

  it("should position midnight and overnight slots accurately on the right side and never at the far left", async () => {
    const { computeTimelineSlotPosition } = await import("@/components/dashboard/timeline-view");

    // 11:00 is at the start (0%)
    const openPos = computeTimelineSlotPosition("11:00");
    expect(openPos.leftPercent).toBeCloseTo(0, 1);

    // 23:00 is at (23 - 11) / 15 = 12 / 15 = 80%
    const lateEveningPos = computeTimelineSlotPosition("23:00");
    expect(lateEveningPos.leftPercent).toBeCloseTo(80, 1);

    // 00:00 midnight is at (24 - 11) / 15 = 13 / 15 = 86.67%
    const midnightPos = computeTimelineSlotPosition("00:00");
    expect(midnightPos.leftPercent).toBeCloseTo(86.67, 1);
    expect(midnightPos.leftPercent).toBeGreaterThan(0);

    // 00:30 midnight booking is at 24:30 -> (13.5 / 15) = 90%
    const overnightPos = computeTimelineSlotPosition("00:30");
    expect(overnightPos.leftPercent).toBeCloseTo(90, 1);
    expect(overnightPos.leftPercent).toBeGreaterThan(lateEveningPos.leftPercent);

    // Handle "翌00:30" string format safely
    const prefixedPos = computeTimelineSlotPosition("翌00:30");
    expect(prefixedPos.leftPercent).toBeCloseTo(90, 1);

    // 01:00 is at (25 - 11) / 15 = 14 / 15 = 93.33%
    const lateOvernightPos = computeTimelineSlotPosition("01:00");
    expect(lateOvernightPos.leftPercent).toBeCloseTo(93.33, 1);

    // 90 minute duration occupies 90 / 900 = 10% of total width
    expect(overnightPos.widthPercent).toBeCloseTo(10, 1);
  });

  it("should format display time with overnight prefix for early morning / midnight slots", async () => {
    const { formatDisplayTime } = await import("@/lib/utils");
    expect(formatDisplayTime("00:00")).toBe("翌00:00");
    expect(formatDisplayTime("00:30")).toBe("翌00:30");
    expect(formatDisplayTime("01:15")).toBe("翌01:15");
    expect(formatDisplayTime("02:00")).toBe("翌02:00");
    expect(formatDisplayTime("11:30")).toBe("11:30");
    expect(formatDisplayTime("18:00")).toBe("18:00");
    expect(formatDisplayTime("23:30")).toBe("23:30");
    expect(formatDisplayTime("翌00:30")).toBe("翌00:30");
  });
});
