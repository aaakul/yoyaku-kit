import { describe, expect, it } from "vitest";
import { DEFAULT_RESTAURANT_SLUG } from "@/config/restaurant";
import { createReservationAction } from "@/lib/engine/reservation-actions";
import { RESERVATION_ERROR } from "@/lib/errors/codes";
import {
  createReservationSchema,
  getTokyoTodayStart,
  reservationSchema,
} from "@/lib/validations/reservation";

describe("Reservation Form Validation (Zod SSOT & Two-Tier Architecture)", () => {
  const getValidBaseData = () => {
    const todayStart = getTokyoTodayStart();
    const validDate = new Date(todayStart);
    validDate.setUTCDate(validDate.getUTCDate() + 3);
    const dateStr = validDate.toISOString().split("T")[0];

    return {
      restaurantSlug: DEFAULT_RESTAURANT_SLUG,
      date: dateStr,
      time: "18:00",
      partySize: 2,
      customerName: "佐藤 健一",
      customerNameKana: "サトウ ケンイチ",
      customerPhone: "090-1234-5678",
      customerEmail: "sato.k@example.com",
      note: "窓側希望",
    };
  };

  describe("customerName rule", () => {
    it("accepts valid Japanese and romanized names within 1-50 chars", () => {
      const data = getValidBaseData();
      expect(reservationSchema.safeParse(data).success).toBe(true);

      expect(reservationSchema.safeParse({ ...data, customerName: "John Doe" }).success).toBe(true);
    });

    it("rejects empty or whitespace-only name", () => {
      const data = getValidBaseData();
      const resEmpty = reservationSchema.safeParse({
        ...data,
        customerName: "",
      });
      expect(resEmpty.success).toBe(false);
      if (!resEmpty.success) {
        expect(resEmpty.error.issues[0]?.message).toBe("お名前を入力してください");
      }

      const resWhitespace = reservationSchema.safeParse({
        ...data,
        customerName: "   ",
      });
      expect(resWhitespace.success).toBe(false);
      if (!resWhitespace.success) {
        expect(resWhitespace.error.issues[0]?.message).toBe("お名前を入力してください");
      }
    });

    it("rejects names longer than 50 characters", () => {
      const data = getValidBaseData();
      const longName = "あ".repeat(51);
      const res = reservationSchema.safeParse({
        ...data,
        customerName: longName,
      });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toBe("お名前は50文字以内で入力してください");
      }
    });
  });

  describe("customerNameKana rule", () => {
    it("accepts valid full-width katakana with spaces and prolonged sound marks", () => {
      const data = getValidBaseData();
      expect(
        reservationSchema.safeParse({
          ...data,
          customerNameKana: "サトウ ケンイチ",
        }).success,
      ).toBe(true);

      expect(
        reservationSchema.safeParse({
          ...data,
          customerNameKana: "アーサー・ペンドラゴン",
        }).success,
      ).toBe(true);
    });

    it("rejects hiragana, kanji, or alphabet characters", () => {
      const data = getValidBaseData();

      const resHiragana = reservationSchema.safeParse({
        ...data,
        customerNameKana: "さとう けんいち",
      });
      expect(resHiragana.success).toBe(false);
      if (!resHiragana.success) {
        expect(resHiragana.error.issues[0]?.message).toBe(
          "フリガナは全角カタカナで入力してください",
        );
      }

      const resKanji = reservationSchema.safeParse({
        ...data,
        customerNameKana: "佐藤健一",
      });
      expect(resKanji.success).toBe(false);
    });

    it("rejects empty or excessively long katakana", () => {
      const data = getValidBaseData();
      const resEmpty = reservationSchema.safeParse({
        ...data,
        customerNameKana: "",
      });
      expect(resEmpty.success).toBe(false);

      const resLong = reservationSchema.safeParse({
        ...data,
        customerNameKana: "ア".repeat(51),
      });
      expect(resLong.success).toBe(false);
    });
  });

  describe("customerPhone rule (libphonenumber-js)", () => {
    it("accepts standard Japanese mobile, landline, and international formats", () => {
      const data = getValidBaseData();

      expect(reservationSchema.safeParse({ ...data, customerPhone: "090-1234-5678" }).success).toBe(
        true,
      );
      expect(reservationSchema.safeParse({ ...data, customerPhone: "09012345678" }).success).toBe(
        true,
      );
      expect(reservationSchema.safeParse({ ...data, customerPhone: "03-1234-5678" }).success).toBe(
        true,
      );
      expect(reservationSchema.safeParse({ ...data, customerPhone: "075-123-4567" }).success).toBe(
        true,
      );
      expect(reservationSchema.safeParse({ ...data, customerPhone: "0120-123-456" }).success).toBe(
        true,
      );
      expect(
        reservationSchema.safeParse({
          ...data,
          customerPhone: "+81 90 1234 5678",
        }).success,
      ).toBe(true);
    });

    it("rejects invalid, malformed, or too-short phone numbers without rigid manual regexes", () => {
      const data = getValidBaseData();

      const resShort = reservationSchema.safeParse({
        ...data,
        customerPhone: "12345",
      });
      expect(resShort.success).toBe(false);
      if (!resShort.success) {
        expect(resShort.error.issues[0]?.message).toBe(
          "有効な電話番号を入力してください（例：090-1234-5678）",
        );
      }

      const resAlpha = reservationSchema.safeParse({
        ...data,
        customerPhone: "invalid-phone",
      });
      expect(resAlpha.success).toBe(false);
    });
  });

  describe("customerEmail rule (Zod .email())", () => {
    it("accepts well-formed email addresses", () => {
      const data = getValidBaseData();
      expect(
        reservationSchema.safeParse({
          ...data,
          customerEmail: "guest@example.co.jp",
        }).success,
      ).toBe(true);
    });

    it("rejects invalid emails via Zod email validator", () => {
      const data = getValidBaseData();

      const res1 = reservationSchema.safeParse({
        ...data,
        customerEmail: "not-an-email",
      });
      expect(res1.success).toBe(false);
      if (!res1.success) {
        expect(res1.error.issues[0]?.message).toBe("有効なメールアドレスを入力してください");
      }

      const res2 = reservationSchema.safeParse({
        ...data,
        customerEmail: "@missing-user.com",
      });
      expect(res2.success).toBe(false);
    });
  });

  describe("date rule (Date object comparison & boundary checks)", () => {
    it("rejects past dates by Date object comparison", () => {
      const data = getValidBaseData();
      const todayStart = getTokyoTodayStart();
      const yesterday = new Date(todayStart);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      const res = reservationSchema.safeParse({ ...data, date: yesterdayStr });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toBe("過去の日付は指定できません");
      }
    });

    it("accepts today and dates within maxAdvanceDays", () => {
      const data = getValidBaseData();
      const todayStart = getTokyoTodayStart();
      const todayStr = todayStart.toISOString().split("T")[0];

      const resToday = reservationSchema.safeParse({ ...data, date: todayStr });
      expect(resToday.success).toBe(true);

      const day30 = new Date(todayStart);
      day30.setUTCDate(day30.getUTCDate() + 30);
      const day30Str = day30.toISOString().split("T")[0];

      const res30 = reservationSchema.safeParse({ ...data, date: day30Str });
      expect(res30.success).toBe(true);
    });

    it("rejects dates exceeding maxAdvanceDays with customized error", () => {
      const data = getValidBaseData();
      const todayStart = getTokyoTodayStart();
      const day31 = new Date(todayStart);
      day31.setUTCDate(day31.getUTCDate() + 31);
      const day31Str = day31.toISOString().split("T")[0];

      const customSchema = createReservationSchema(30);
      const res = customSchema.safeParse({ ...data, date: day31Str });
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toBe("30日以上先のご予約はお電話にて承ります");
      }
    });
  });

  describe("Server Action Two-Tier Validation Guard", () => {
    it("returns structured field errors when invalid payload is sent to server action", async () => {
      const invalidPayload = {
        restaurantSlug: DEFAULT_RESTAURANT_SLUG,
        date: "2020-01-01", // Past date
        time: "18:00",
        partySize: 2,
        customerName: "", // Empty name
        customerNameKana: "さとう けんいち", // Hiragana not allowed
        customerPhone: "123", // Invalid phone
        customerEmail: "bad-email", // Invalid email
      };

      const result = await createReservationAction(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe(RESERVATION_ERROR.VALIDATION_FAILED);
        expect(result.message).toBeDefined();
        expect(result.fieldErrors).toBeDefined();
        expect(result.fieldErrors?.customerName).toBe("お名前を入力してください");
        expect(result.fieldErrors?.customerNameKana).toBe(
          "フリガナは全角カタカナで入力してください",
        );
        expect(result.fieldErrors?.customerPhone).toBe(
          "有効な電話番号を入力してください（例：090-1234-5678）",
        );
        expect(result.fieldErrors?.customerEmail).toBe("有効なメールアドレスを入力してください");
        expect(result.fieldErrors?.date).toBe("過去の日付は指定できません");
      }
    });
  });
});

describe("Auth Schemas Validation (SSOT)", () => {
  it("validates signInSchema requirements", async () => {
    const { signInSchema } = await import("@/lib/validations/auth");

    expect(
      signInSchema.safeParse({
        email: "admin@example.com",
        password: "12345678",
      }).success,
    ).toBe(true);
    expect(signInSchema.safeParse({ email: "invalid", password: "123" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "admin@example.com", password: "123" }).success).toBe(
      false,
    );
  });

  it("validates createStaffAccountSchema rules and role enum", async () => {
    const { createStaffAccountSchema } = await import("@/lib/validations/auth");

    expect(
      createStaffAccountSchema.safeParse({
        name: "田中 太郎",
        email: "tanaka@example.com",
        password: "securepassword",
        role: "staff",
      }).success,
    ).toBe(true);

    expect(
      createStaffAccountSchema.safeParse({
        name: "",
        email: "tanaka@example.com",
        password: "securepassword",
        role: "staff",
      }).success,
    ).toBe(false);

    expect(
      createStaffAccountSchema.safeParse({
        name: "田中 太郎",
        email: "tanaka@example.com",
        password: "short",
        role: "staff",
      }).success,
    ).toBe(false);

    expect(
      createStaffAccountSchema.safeParse({
        name: "田中 太郎",
        email: "tanaka@example.com",
        password: "securepassword",
        role: "superadmin",
      }).success,
    ).toBe(false);
  });

  it("validates updatePasswordSchema confirmation matching", async () => {
    const { updatePasswordSchema } = await import("@/lib/validations/auth");

    expect(
      updatePasswordSchema.safeParse({
        currentPassword: "oldpassword1",
        newPassword: "newpassword1",
        confirmPassword: "newpassword1",
      }).success,
    ).toBe(true);

    const mismatch = updatePasswordSchema.safeParse({
      currentPassword: "oldpassword1",
      newPassword: "newpassword1",
      confirmPassword: "differentpassword",
    });
    expect(mismatch.success).toBe(false);
    if (!mismatch.success) {
      expect(mismatch.error.issues[0]?.message).toBe("新しいパスワードが一致しません。");
    }
  });
});

describe("CMS Schemas Validation (SSOT)", () => {
  it("validates newsItemSchema", async () => {
    const { newsItemSchema } = await import("@/lib/validations/cms");

    expect(
      newsItemSchema.safeParse({
        title: "秋の特別コース開始",
        category: "季節限定",
        content: "旬の食材を使用した特別コースを本日より開始します。",
        publishedAt: "2026.10.01",
      }).success,
    ).toBe(true);

    expect(
      newsItemSchema.safeParse({
        title: "",
        category: "季節限定",
        content: "本文",
        publishedAt: "2026.10.01",
      }).success,
    ).toBe(false);

    expect(
      newsItemSchema.safeParse({
        title: "タイトル",
        category: "季節限定",
        content: "",
        publishedAt: "2026.10.01",
      }).success,
    ).toBe(false);
  });
});
