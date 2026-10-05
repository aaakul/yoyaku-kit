import { describe, expect, it } from "vitest";
import {
  generateReservationNumber,
  isValidReservationNumber,
  RESERVATION_NUMBER_CHARSET,
} from "@/lib/engine/reservation-number";

describe("Reservation Number Generator", () => {
  it("should generate a 6-character string", () => {
    const code = generateReservationNumber();
    expect(code).toHaveLength(6);
    expect(typeof code).toBe("string");
  });

  it("should only contain characters from the specified charset", () => {
    // Generate 1000 numbers to test character distribution and constraints
    for (let i = 0; i < 1000; i++) {
      const code = generateReservationNumber();
      expect(isValidReservationNumber(code)).toBe(true);

      for (const char of code) {
        expect(RESERVATION_NUMBER_CHARSET).toContain(char);
      }

      // Must exclude confusing characters: I, O, 0, 1
      expect(code).not.toMatch(/[IO01]/);
    }
  });

  it("should correctly validate reservation number formats", () => {
    expect(isValidReservationNumber("ABCDEF")).toBe(true);
    expect(isValidReservationNumber("234567")).toBe(true);
    expect(isValidReservationNumber("ABC234")).toBe(true);

    // Invalid length
    expect(isValidReservationNumber("ABCDE")).toBe(false);
    expect(isValidReservationNumber("ABCDEFG")).toBe(false);
    expect(isValidReservationNumber("")).toBe(false);

    // Contains excluded characters
    expect(isValidReservationNumber("ABCDI1")).toBe(false);
    expect(isValidReservationNumber("ABCDO0")).toBe(false);
    expect(isValidReservationNumber("123456")).toBe(false);
    expect(isValidReservationNumber("023456")).toBe(false);

    // Lowercase should be invalid
    expect(isValidReservationNumber("abcdef")).toBe(false);

    // Special characters
    expect(isValidReservationNumber("ABC-EF")).toBe(false);
  });

  it("should exhibit randomness and low collision probability", () => {
    const generated = new Set<string>();
    const count = 5000;
    for (let i = 0; i < count; i++) {
      generated.add(generateReservationNumber());
    }
    // 32^6 = 1,073,741,824 combinations. 5,000 draws should be almost entirely unique
    expect(generated.size).toBeGreaterThanOrEqual(count - 2);
  });
});
