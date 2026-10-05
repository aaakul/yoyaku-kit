import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/better-auth";
import { localizeAuthError } from "@/lib/auth/errors";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export async function POST(req: Request) {
  const res = await handler.POST(req);
  if (!res.ok) {
    try {
      const cloned = res.clone();
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await cloned.json();
        if (data?.message || data?.code) {
          const localized = localizeAuthError(data);
          const newBody = JSON.stringify({ ...data, message: localized });
          return new Response(newBody, {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
          });
        }
      }
    } catch {
      // Fallback to original response
    }
  }
  return res;
}
