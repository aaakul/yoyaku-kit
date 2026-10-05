import { randomInt } from "node:crypto";

// 32-character base32 set excluding visually ambiguous glyphs (I, O, 0, 1).
export const RESERVATION_NUMBER_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const RESERVATION_NUMBER_LENGTH = 6;

export function generateReservationNumber(): string {
  let result = "";
  const charsetLength = RESERVATION_NUMBER_CHARSET.length;
  for (let i = 0; i < RESERVATION_NUMBER_LENGTH; i++) {
    result += RESERVATION_NUMBER_CHARSET[randomInt(charsetLength)];
  }
  return result;
}

export function isValidReservationNumber(code: string): boolean {
  if (!code || code.length !== RESERVATION_NUMBER_LENGTH) {
    return false;
  }
  const regex = new RegExp(`^[${RESERVATION_NUMBER_CHARSET}]{${RESERVATION_NUMBER_LENGTH}}$`);
  return regex.test(code);
}
