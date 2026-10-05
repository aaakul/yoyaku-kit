import { sendEmail } from "./client";
import { renderReservationCancellationEmail } from "./templates/reservation-cancellation";
import { renderReservationConfirmationEmail } from "./templates/reservation-confirmation";
import type { EmailSendResult, ReservationEmailData } from "./types";

export async function sendReservationConfirmationEmail(
  data: ReservationEmailData,
): Promise<EmailSendResult> {
  try {
    const { subject, text, html } = renderReservationConfirmationEmail(data);
    return await sendEmail({
      to: data.customerEmail,
      subject,
      text,
      html,
    });
  } catch (error: unknown) {
    const err = error as { message?: string } | undefined;
    console.error("[EmailService] Failed to send confirmation email:", error);
    return {
      success: false,
      error: err?.message || "Failed to send confirmation email",
    };
  }
}

export async function sendReservationCancellationEmail(
  data: ReservationEmailData,
): Promise<EmailSendResult> {
  try {
    const { subject, text, html } = renderReservationCancellationEmail(data);
    return await sendEmail({
      to: data.customerEmail,
      subject,
      text,
      html,
    });
  } catch (error: unknown) {
    const err = error as { message?: string } | undefined;
    console.error("[EmailService] Failed to send cancellation email:", error);
    return {
      success: false,
      error: err?.message || "Failed to send cancellation email",
    };
  }
}
