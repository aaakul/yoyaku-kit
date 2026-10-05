import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db/drizzle";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  secret: process.env.AUTH_SECRET,
  baseURL:
    process.env.BETTER_AUTH_URL ||
    (process.env.BASE_URL && process.env.BASE_URL !== "/"
      ? process.env.BASE_URL
      : "http://localhost:3000"),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "staff",
      },
    },
  },
  plugins: [nextCookies()],
});
