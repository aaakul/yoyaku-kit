import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type EmailProvider,
  getEmailProvider,
  type ReservationEmailData,
  renderReservationCancellationEmail,
  renderReservationConfirmationEmail,
  sendEmail,
  sendReservationCancellationEmail,
  sendReservationConfirmationEmail,
  setEmailProvider,
} from "@/lib/email";

describe("Email Module", () => {
  const sampleData: ReservationEmailData = {
    reservationId: "res-test-123456",
    cancellationToken: "tok_abcdef12345678901234",
    restaurantName: "京都しゃぶしゃぶ",
    restaurantAddress: "京都市中京区寺町通御池上る",
    restaurantPhone: "075-222-3111",
    cancellationCutoffHours: 24,
    customerName: "山田 太郎",
    customerEmail: "yamada@example.com",
    partySize: 4,
    startAt: new Date("2026-10-15T10:00:00.000Z"), // 19:00 JST
    endAt: new Date("2026-10-15T11:30:00.000Z"), // 20:30 JST
    tableName: "テーブル 1",
    note: "窓際の席を希望",
  };

  afterEach(() => {
    setEmailProvider(null);
  });

  describe("ConsoleEmailProvider & Dispatcher", () => {
    it("uses ConsoleEmailProvider by default and formats output to console", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const provider = getEmailProvider();
      expect(provider.name).toBe("console");

      const result = await sendEmail({
        to: "guest@example.com",
        subject: "テスト件名",
        text: "テスト本文",
        html: "<p>テスト本文</p>",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^mock-/);
      expect(consoleSpy).toHaveBeenCalled();

      const loggedOutput = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
      expect(loggedOutput).toContain("EMAIL SIMULATION");
      expect(loggedOutput).toContain("guest@example.com");
      expect(loggedOutput).toContain("テスト件名");
      expect(loggedOutput).toContain("テスト本文");

      consoleSpy.mockRestore();
    });

    it("handles provider failure gracefully without crashing", async () => {
      const failingProvider: EmailProvider = {
        name: "mock-failure",
        send: async () => {
          throw new Error("SMTP connection timed out");
        },
      };

      setEmailProvider(failingProvider);

      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await sendEmail({
        to: "guest@example.com",
        subject: "テスト",
        text: "テスト",
        html: "<p>テスト</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("SMTP connection timed out");
      errSpy.mockRestore();
    });
  });

  describe("Email Templates", () => {
    it("renders reservation confirmation email with minimal verification details", () => {
      const dataWithNumber = {
        ...sampleData,
        reservationNumber: "ABC987",
      };
      const { subject, text, html } = renderReservationConfirmationEmail(dataWithNumber);

      expect(subject).toContain("京都しゃぶしゃぶ");
      expect(subject).toContain("予約完了");
      expect(subject).toContain("ABC987");

      expect(text).toContain("山田 太郎様");
      expect(text).toContain("予約番号：ABC987");
      expect(text).toContain("4名");
      expect(text).toContain("/reservations/res-test-123456?token=tok_abcdef12345678901234");

      expect(html).toContain("山田 太郎様");
      expect(html).toContain("ABC987");
      expect(html).toContain("/reservations/res-test-123456?token=tok_abcdef12345678901234");
    });

    it("renders reservation cancellation email with minimal details", () => {
      const dataWithNumber = {
        ...sampleData,
        reservationNumber: "ABC987",
      };
      const { subject, text, html } = renderReservationCancellationEmail(dataWithNumber);

      expect(subject).toContain("京都しゃぶしゃぶ");
      expect(subject).toContain("予約キャンセル");
      expect(subject).toContain("ABC987");

      expect(text).toContain("山田 太郎様");
      expect(text).toContain("予約番号：ABC987");
      expect(text).toContain("4名");

      expect(html).toContain("山田 太郎様");
      expect(html).toContain("ABC987");
    });

    it("escapes special HTML characters in templates to prevent HTML injection", () => {
      const maliciousData = {
        ...sampleData,
        customerName: "<script>alert('xss')</script> & Bob",
      };
      const confirmation = renderReservationConfirmationEmail(maliciousData);
      expect(confirmation.html).not.toContain("<script>");
      expect(confirmation.html).toContain(
        "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt; &amp; Bob様",
      );

      const cancellation = renderReservationCancellationEmail(maliciousData);
      expect(cancellation.html).not.toContain("<script>");
      expect(cancellation.html).toContain(
        "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt; &amp; Bob様",
      );
    });
  });

  describe("Domain Email Service", () => {
    it("sendReservationConfirmationEmail sends confirmation email without errors", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const result = await sendReservationConfirmationEmail(sampleData);
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      consoleSpy.mockRestore();
    });

    it("sendReservationCancellationEmail sends cancellation email without errors", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const result = await sendReservationCancellationEmail(sampleData);
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      consoleSpy.mockRestore();
    });
  });
});
