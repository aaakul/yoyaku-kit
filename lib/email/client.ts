import { ConsoleEmailProvider } from "./providers/console";
import type { EmailPayload, EmailProvider, EmailSendResult } from "./types";

const providers: Record<string, () => EmailProvider> = {
  console: () => new ConsoleEmailProvider(),
};

let activeProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (activeProvider) {
    return activeProvider;
  }

  const configured = (process.env.EMAIL_PROVIDER || "console").toLowerCase();
  const factory = providers[configured] || providers.console;
  return factory();
}

export function setEmailProvider(provider: EmailProvider | null): void {
  activeProvider = provider;
}

export async function sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
  const provider = getEmailProvider();
  const defaultFrom = process.env.EMAIL_FROM || "Restaurant <noreply@example.com>";

  const fullPayload: EmailPayload = {
    ...payload,
    from: payload.from || defaultFrom,
  };

  try {
    return await provider.send(fullPayload);
  } catch (error: unknown) {
    const err = error as { message?: string } | undefined;
    console.error(`[Email] Provider '${provider.name}' failed:`, error);
    return {
      success: false,
      error: err?.message || "Failed to dispatch email",
    };
  }
}
