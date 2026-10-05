import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/[...all]/route";
import { auth } from "@/lib/auth/better-auth";

describe("Authentication Flow", () => {
  it("authenticates admin credentials via API and issues session cookie", async () => {
    const req = new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@example.com",
        password: "12345678",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("better-auth.session_token=");

    const cookieMatch = setCookie?.match(/better-auth\.session_token=([^;]+)/);
    const sessionCookie = cookieMatch ? cookieMatch[1] : "";

    const session = await auth.api.getSession({
      headers: new Headers({
        cookie: `better-auth.session_token=${sessionCookie}`,
      }),
    });

    expect(session).toBeDefined();
    expect(session?.user?.email).toBe("admin@example.com");
  });

  it("rejects invalid credentials with localized error message", async () => {
    const req = new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@example.com",
        password: "wrong-password",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.message).toBe("メールアドレスまたはパスワードが正しくありません。");
  });

  it("localizes common Better Auth error codes properly", async () => {
    const { localizeAuthError } = await import("@/lib/auth/errors");

    expect(localizeAuthError({ code: "INVALID_EMAIL_OR_PASSWORD" })).toBe(
      "メールアドレスまたはパスワードが正しくありません。",
    );
    expect(localizeAuthError({ message: "Invalid email or password" })).toBe(
      "メールアドレスまたはパスワードが正しくありません。",
    );
    expect(localizeAuthError({ code: "USER_ALREADY_EXISTS" })).toBe(
      "このメールアドレスは既に登録されています。",
    );
    expect(localizeAuthError({ code: "PASSWORD_TOO_SHORT" })).toBe(
      "パスワードは8文字以上で入力してください。",
    );
    expect(localizeAuthError(null)).toBe("メールアドレスまたはパスワードが正しくありません。");
  });
});

describe("Staff Account Management & RBAC Flow", () => {
  const testStaffEmail = "test-staff@example.com";
  let testStaffId = "";

  it("retrieves users list with role information via getUsers", async () => {
    const { getUsers } = await import("@/lib/db/queries");
    const users = await getUsers();
    expect(users.length).toBeGreaterThan(0);
    const admin = users.find((u) => u.email === "admin@example.com");
    expect(admin).toBeDefined();
    expect(admin?.role).toBe("manager");
  });

  it("creates a staff user and authenticates successfully with role=staff", async () => {
    const { db } = await import("@/lib/db/drizzle");
    const { user, account } = await import("@/lib/db/schema");
    const { hashPassword } = await import("better-auth/crypto");
    const { eq } = await import("drizzle-orm");

    // Clean up if existing
    await db.delete(user).where(eq(user.email, testStaffEmail));

    const hashedPassword = await hashPassword("staffpass123");
    testStaffId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      await tx.insert(user).values({
        id: testStaffId,
        name: "テスト店員",
        email: testStaffEmail,
        role: "staff",
        emailVerified: true,
      });

      await tx.insert(account).values({
        id: crypto.randomUUID(),
        accountId: testStaffId,
        providerId: "credential",
        userId: testStaffId,
        password: hashedPassword,
      });
    });

    // Authenticate as new staff
    const req = new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testStaffEmail,
        password: "staffpass123",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const setCookie = res.headers.get("set-cookie");
    const cookieMatch = setCookie?.match(/better-auth\.session_token=([^;]+)/);
    const sessionCookie = cookieMatch ? cookieMatch[1] : "";

    const session = await auth.api.getSession({
      headers: new Headers({
        cookie: `better-auth.session_token=${sessionCookie}`,
      }),
    });

    expect(session).toBeDefined();
    expect(session?.user?.email).toBe(testStaffEmail);
    expect((session?.user as { role?: string })?.role).toBe("staff");
  });

  it("allows promoting staff to manager and demoting back", async () => {
    const { db } = await import("@/lib/db/drizzle");
    const { user } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");

    // Promote to manager
    await db.update(user).set({ role: "manager" }).where(eq(user.id, testStaffId));

    const [promoted] = await db.select().from(user).where(eq(user.id, testStaffId)).limit(1);
    expect(promoted?.role).toBe("manager");

    // Demote back to staff
    await db.update(user).set({ role: "staff" }).where(eq(user.id, testStaffId));

    const [demoted] = await db.select().from(user).where(eq(user.id, testStaffId)).limit(1);
    expect(demoted?.role).toBe("staff");

    // Clean up test staff
    await db.delete(user).where(eq(user.id, testStaffId));
  });

  it("strictly enforces assertManager guard against staff users", async () => {
    const { assertManager } = await import("@/lib/auth/middleware");
    // When no manager session is present, assertManager must throw
    await expect(assertManager()).rejects.toThrow();
  });
});

describe("Demo Account & Read-Only Enforcement", () => {
  const testDemoEmail = "test-demo@example.com";
  let testDemoId = "";

  it("verifies canViewManagerPages allows manager and demo but denies staff", async () => {
    const { canViewManagerPages } = await import("@/lib/auth/middleware");
    expect(canViewManagerPages("manager")).toBe(true);
    expect(canViewManagerPages("demo")).toBe(true);
    expect(canViewManagerPages("staff")).toBe(false);
    expect(canViewManagerPages(null)).toBe(false);
    expect(canViewManagerPages(undefined)).toBe(false);
  });

  it("creates a demo user and authenticates successfully with role=demo", async () => {
    const { db } = await import("@/lib/db/drizzle");
    const { user, account } = await import("@/lib/db/schema");
    const { hashPassword } = await import("better-auth/crypto");
    const { eq } = await import("drizzle-orm");

    await db.delete(user).where(eq(user.email, testDemoEmail));

    const hashedPassword = await hashPassword("demopass123");
    testDemoId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      await tx.insert(user).values({
        id: testDemoId,
        name: "テストデモ",
        email: testDemoEmail,
        role: "demo",
        emailVerified: true,
      });

      await tx.insert(account).values({
        id: crypto.randomUUID(),
        accountId: testDemoId,
        providerId: "credential",
        userId: testDemoId,
        password: hashedPassword,
      });
    });

    const req = new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testDemoEmail,
        password: "demopass123",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const setCookie = res.headers.get("set-cookie");
    const cookieMatch = setCookie?.match(/better-auth\.session_token=([^;]+)/);
    const sessionCookie = cookieMatch ? cookieMatch[1] : "";

    const session = await auth.api.getSession({
      headers: new Headers({
        cookie: `better-auth.session_token=${sessionCookie}`,
      }),
    });

    expect(session).toBeDefined();
    expect(session?.user?.email).toBe(testDemoEmail);
    expect((session?.user as { role?: string })?.role).toBe("demo");
  });

  it("prevents changing role or deleting demo account in staff management", async () => {
    const { updateUserRole, deleteStaffAccount } = await import("@/lib/auth/actions");
    const queries = await import("@/lib/db/queries");

    // Simulate logged in manager
    const spy = vi.spyOn(queries, "getUser").mockResolvedValue({
      id: "mock-manager-id",
      name: "Mock Manager",
      email: "admin@example.com",
      role: "manager",
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const roleFormData = new FormData();
    roleFormData.append("userId", testDemoId);
    roleFormData.append("role", "staff");

    // Attempt to update role of demo user
    const { AUTH_ERROR } = await import("@/lib/errors/codes");
    const updateRes = await updateUserRole({}, roleFormData);
    expect("code" in updateRes && updateRes.code).toBe(AUTH_ERROR.CANNOT_MODIFY_DEMO);

    // Attempt to delete demo user
    const deleteFormData = new FormData();
    deleteFormData.append("userId", testDemoId);
    const deleteRes = await deleteStaffAccount({}, deleteFormData);
    expect("code" in deleteRes && deleteRes.code).toBe(AUTH_ERROR.CANNOT_MODIFY_DEMO);

    spy.mockRestore();
  });

  it("blocks demo users from mutating account profile or performing writes", async () => {
    const { updateAccount } = await import("@/lib/auth/actions");
    const { assertManager } = await import("@/lib/auth/middleware");
    const { updateReservationStatusAction } = await import("@/lib/engine/reservation-actions");
    const { AUTH_ERROR, RESERVATION_ERROR } = await import("@/lib/errors/codes");
    const queries = await import("@/lib/db/queries");

    // Simulate logged in demo user
    const spy = vi.spyOn(queries, "getUser").mockResolvedValue({
      id: testDemoId,
      name: "テストデモ",
      email: testDemoEmail,
      role: "demo",
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 1. assertManager throws readable error for demo
    await expect(assertManager()).rejects.toThrow(
      "デモアカウントのため、この操作は許可されていません。",
    );

    // 2. Profile update blocked
    const updateFormData = new FormData();
    updateFormData.append("name", "New Name");
    updateFormData.append("email", "new@example.com");
    const profileRes = await updateAccount({}, updateFormData);
    expect("code" in profileRes && profileRes.code).toBe(AUTH_ERROR.DEMO_RESTRICTED);

    // 3. Reservation status update blocked
    const rsvRes = await updateReservationStatusAction("dummy-id", "completed");
    expect(rsvRes.success).toBe(false);
    if (!rsvRes.success) {
      expect(rsvRes.code).toBe(RESERVATION_ERROR.DEMO_RESTRICTED);
    }

    spy.mockRestore();
  });

  it("cleans up test demo user", async () => {
    const { db } = await import("@/lib/db/drizzle");
    const { user } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");

    await db.delete(user).where(eq(user.id, testDemoId));
  });
});
