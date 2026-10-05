import { nanoid } from "nanoid";
import type { EmailPayload, EmailProvider, EmailSendResult } from "../types";

export class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console";

  async send(payload: EmailPayload): Promise<EmailSendResult> {
    const messageId = `mock-${nanoid(16)}`;
    const separator = "=".repeat(60);
    const subSeparator = "-".repeat(60);

    const output = [
      `\n${separator}`,
      `[EMAIL SIMULATION] (${this.name.toUpperCase()})`,
      `Message-ID: ${messageId}`,
      `To:         ${payload.to}`,
      `From:       ${payload.from || "Default Sender"}`,
      payload.replyTo ? `Reply-To:   ${payload.replyTo}` : null,
      `Subject:    ${payload.subject}`,
      `Timestamp:  ${new Date().toISOString()}`,
      subSeparator,
      payload.text.trim(),
      `${separator}\n`,
    ]
      .filter(Boolean)
      .join("\n");

    console.log(output);

    return {
      success: true,
      messageId,
    };
  }
}
