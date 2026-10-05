import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET } from "@/app/api/cron/reset/route";
import { db } from "@/lib/db/drizzle";
import { reservations, restaurantTables, session, user } from "@/lib/db/schema";

describe("Cron Database Reset API Route", () => {
  const originalEnv = { ...process.env };
  const testUserId = `test-user-${crypto.randomUUID()}`;

  beforeAll(async () => {
    // Insert a custom user to verify users are not wiped
    await db.insert(user).values({
      id: testUserId,
      name: "Custom User",
      email: `custom-${Date.now()}@example.com`,
      role: "staff",
      emailVerified: true,
    });
  });

  afterAll(async () => {
    process.env = originalEnv;
    // Clean up custom user
    await db.delete(user).where(eq(user.id, testUserId));
  });

  it("should return 403 Forbidden when DEMO_MODE is not true", async () => {
    process.env.DEMO_MODE = "false";
    process.env.CRON_SECRET = "secret-123";

    const request = new Request("http://localhost:3000/api/cron/reset", {
      headers: {
        authorization: "Bearer secret-123",
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Demo mode is not enabled");
  });

  it("should return 401 Unauthorized when authorization header is missing or invalid", async () => {
    process.env.DEMO_MODE = "true";
    process.env.CRON_SECRET = "secret-123";

    // Missing header
    const req1 = new Request("http://localhost:3000/api/cron/reset");
    const res1 = await GET(req1);
    expect(res1.status).toBe(401);

    // Wrong token
    const req2 = new Request("http://localhost:3000/api/cron/reset", {
      headers: {
        authorization: "Bearer wrong-secret",
      },
    });
    const res2 = await GET(req2);
    expect(res2.status).toBe(401);
  });

  it("should successfully reset demo data while preserving users and clearing sessions", async () => {
    process.env.DEMO_MODE = "true";
    process.env.CRON_SECRET = "secret-123";

    // Insert a dummy session for the custom user
    const dummySessionId = crypto.randomUUID();
    await db.insert(session).values({
      id: dummySessionId,
      token: `token-${Date.now()}`,
      userId: testUserId,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    });

    const request = new Request("http://localhost:3000/api/cron/reset", {
      headers: {
        authorization: "Bearer secret-123",
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    // Verify session was cleared
    const remainingSessions = await db.select().from(session).where(eq(session.id, dummySessionId));
    expect(remainingSessions.length).toBe(0);

    // Verify custom user was preserved
    const [preservedUser] = await db.select().from(user).where(eq(user.id, testUserId)).limit(1);
    expect(preservedUser).toBeDefined();

    // Verify sample reservations were re-seeded and Tanaka Misaki has sufficient table capacity
    const currentReservations = await db.select().from(reservations);
    expect(currentReservations.length).toBeGreaterThan(0);

    const tables = await db.select().from(restaurantTables);
    const tableMap = new Map(tables.map((t) => [t.id, t]));
    const tanaka = currentReservations.find((r) => r.customerName === "田中 美咲");
    expect(tanaka).toBeDefined();
    expect(tanaka?.partySize).toBe(3);
    const tanakaTable = tanaka ? tableMap.get(tanaka.tableId) : undefined;
    expect(tanakaTable).toBeDefined();
    expect(tanakaTable?.capacity).toBeGreaterThanOrEqual(tanaka?.partySize ?? 0);
  });
});
