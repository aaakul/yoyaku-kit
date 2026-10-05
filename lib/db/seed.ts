import crypto from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { DEFAULT_RESTAURANT_SLUG, restaurantConfig } from "@/config/restaurant";
import { generateReservationNumber } from "@/lib/engine/reservation-number";
import { db } from "./drizzle";
import { hashToken } from "./queries";
import {
  account,
  businessHours,
  news,
  reservationLogs,
  reservations,
  restaurants,
  restaurantTables,
  user,
} from "./schema";

export async function seed() {
  console.log("Seeding database...");

  const restaurantSlug = DEFAULT_RESTAURANT_SLUG;

  const restaurantDefaults = {
    name: restaurantConfig.name,
    slug: restaurantSlug,
    timezone: "Asia/Tokyo",
    address: restaurantConfig.contact.address,
    phone: restaurantConfig.contact.phone,
    defaultDurationMinutes: restaurantConfig.booking?.defaultDurationMinutes ?? 90,
    slotIntervalMinutes: restaurantConfig.booking?.slotIntervalMinutes ?? 30,
    minAdvanceHours: restaurantConfig.booking?.minAdvanceHours ?? 2,
    cancellationCutoffHours: restaurantConfig.booking?.cancellationCutoffHours ?? 24,
    closedDaysOfWeek: restaurantConfig.businessHours.closedDaysOfWeek?.join(",") ?? "1",
  };

  let [restaurant] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.slug, restaurantSlug))
    .limit(1);

  if (!restaurant) {
    [restaurant] = await db.insert(restaurants).values(restaurantDefaults).returning();
    console.log(`Created restaurant: ${restaurant.name} (${restaurant.id})`);
  } else {
    // Update existing restaurant record
    [restaurant] = await db
      .update(restaurants)
      .set(restaurantDefaults)
      .where(eq(restaurants.id, restaurant.id))
      .returning();
    console.log(`Updated restaurant: ${restaurant.name}`);
  }

  const existingTables = await db
    .select()
    .from(restaurantTables)
    .where(eq(restaurantTables.restaurantId, restaurant.id))
    .orderBy(restaurantTables.name);

  let createdTables = existingTables;
  if (existingTables.length === 0) {
    createdTables = await db
      .insert(restaurantTables)
      .values(
        restaurantConfig.tables.map((t) => ({
          ...t,
          restaurantId: restaurant.id,
          active: true,
        })),
      )
      .returning();
    console.log(
      `Initialized ${createdTables.length} tables (${restaurantConfig.totalSeats} total seats).`,
    );
  }
  createdTables = [...createdTables].sort((a, b) => a.name.localeCompare(b.name));

  const existingHours = await db
    .select()
    .from(businessHours)
    .where(eq(businessHours.restaurantId, restaurant.id));

  if (existingHours.length === 0) {
    await db.insert(businessHours).values(
      restaurantConfig.businessHours.periods.map((p) => ({
        name: p.name,
        openTime: p.openTime,
        closeTime: p.closeTime,
        isOvernight: p.isOvernight ?? false,
        restaurantId: restaurant.id,
      })),
    );
    console.log("Business hours initialized (lunch and dinner operating periods).");
  } else {
    for (const p of restaurantConfig.businessHours.periods) {
      await db
        .update(businessHours)
        .set({
          openTime: p.openTime,
          closeTime: p.closeTime,
          isOvernight: p.isOvernight ?? false,
        })
        .where(and(eq(businessHours.restaurantId, restaurant.id), eq(businessHours.name, p.name)));
    }
  }

  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || "12345678";
  const adminName = process.env.INITIAL_ADMIN_NAME || `admin`;
  let [adminUser] = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);

  const hashedPassword = await hashPassword(adminPassword);

  if (!adminUser) {
    const userId = crypto.randomUUID();
    [adminUser] = await db
      .insert(user)
      .values({
        id: userId,
        name: adminName,
        email: adminEmail,
        role: "manager",
        emailVerified: true,
      })
      .returning();

    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId: userId,
      password: hashedPassword,
    });
    console.log(`Default manager account initialized: ${adminEmail} / ${adminPassword}`);
  } else {
    await db
      .update(account)
      .set({ password: hashedPassword })
      .where(eq(account.userId, adminUser.id));
  }

  const demoEmail = process.env.INITIAL_DEMO_EMAIL || "demo@example.com";
  const demoPassword = process.env.INITIAL_DEMO_PASSWORD || "12345678";
  const demoName = process.env.INITIAL_DEMO_NAME || "デモアカウント";
  let [demoUser] = await db.select().from(user).where(eq(user.email, demoEmail)).limit(1);

  const hashedDemoPassword = await hashPassword(demoPassword);

  if (!demoUser) {
    const demoUserId = crypto.randomUUID();
    [demoUser] = await db
      .insert(user)
      .values({
        id: demoUserId,
        name: demoName,
        email: demoEmail,
        role: "demo",
        emailVerified: true,
      })
      .returning();

    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: demoUserId,
      providerId: "credential",
      userId: demoUserId,
      password: hashedDemoPassword,
    });
    console.log(`Default demo account initialized: ${demoEmail} / ${demoPassword}`);
  } else {
    await db
      .update(account)
      .set({ password: hashedDemoPassword })
      .where(eq(account.userId, demoUser.id));
  }

  const existingReservations = await db.select().from(reservations).limit(1);
  if (existingReservations.length === 0 && createdTables.length >= 4) {
    const tokyoDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const sampleReservations = [
      {
        restaurantId: restaurant.id,
        tableId: createdTables[0].id,
        reservationNumber: generateReservationNumber(),
        cancellationTokenHash: hashToken("tok_sato_demo_001"),
        startAt: new Date(`${tokyoDateStr}T03:00:00.000Z`), // 12:00 JST
        endAt: new Date(`${tokyoDateStr}T04:30:00.000Z`), // 13:30 JST
        partySize: 2,
        status: "completed",
        customerName: "佐藤 健一",
        customerNameKana: "サトウ ケンイチ",
        customerPhone: "090-1234-5678",
        customerEmail: "sato.k@example.com",
      },
      {
        restaurantId: restaurant.id,
        tableId: createdTables[4]?.id ?? createdTables[2].id,
        reservationNumber: generateReservationNumber(),
        cancellationTokenHash: hashToken("tok_tanaka_demo_002"),
        startAt: new Date(`${tokyoDateStr}T03:30:00.000Z`), // 12:30 JST
        endAt: new Date(`${tokyoDateStr}T05:00:00.000Z`), // 14:00 JST
        partySize: 3,
        status: "completed",
        customerName: "田中 美咲",
        customerNameKana: "タナカ ミサキ",
        customerPhone: "080-2345-6789",
        customerEmail: "tanaka.m@example.com",
      },
      {
        restaurantId: restaurant.id,
        tableId: createdTables[2].id,
        reservationNumber: generateReservationNumber(),
        cancellationTokenHash: hashToken("tok_yamamoto_demo_005"),
        startAt: new Date(`${tokyoDateStr}T04:00:00.000Z`), // 13:00 JST
        endAt: new Date(`${tokyoDateStr}T05:30:00.000Z`), // 14:30 JST
        partySize: 4,
        status: "no_show",
        customerName: "山本 大輔",
        customerNameKana: "ヤマモト ダイスケ",
        customerPhone: "090-5678-9012",
        customerEmail: "yamamoto.d@example.com",
        note: "連絡なし・来店なし",
      },
      {
        restaurantId: restaurant.id,
        tableId: createdTables[3].id,
        reservationNumber: generateReservationNumber(),
        cancellationTokenHash: hashToken("tok_watanabe_demo_006"),
        startAt: new Date(`${tokyoDateStr}T04:30:00.000Z`), // 13:30 JST
        endAt: new Date(`${tokyoDateStr}T06:00:00.000Z`), // 15:00 JST
        partySize: 2,
        status: "cancelled",
        customerName: "渡辺 翔太",
        customerNameKana: "ワタナベ ショウタ",
        customerPhone: "080-6789-0123",
        customerEmail: "watanabe.s@example.com",
        note: "急用のためキャンセル",
      },
      {
        restaurantId: restaurant.id,
        tableId: createdTables[0].id,
        reservationNumber: generateReservationNumber(),
        cancellationTokenHash: hashToken("tok_suzuki_demo_003"),
        startAt: new Date(`${tokyoDateStr}T09:00:00.000Z`), // 18:00 JST
        endAt: new Date(`${tokyoDateStr}T10:30:00.000Z`), // 19:30 JST
        partySize: 2,
        status: "confirmed",
        customerName: "鈴木 陽子",
        customerNameKana: "スズキ ヨウコ",
        customerPhone: "070-4567-8901",
        customerEmail: "suzuki.y@example.com",
        note: "結婚記念日のお祝いのため",
      },
      {
        restaurantId: restaurant.id,
        tableId: createdTables[4]?.id ?? createdTables[1].id,
        reservationNumber: generateReservationNumber(),
        cancellationTokenHash: hashToken("tok_kobayashi_demo_007"),
        startAt: new Date(`${tokyoDateStr}T09:00:00.000Z`), // 18:00 JST
        endAt: new Date(`${tokyoDateStr}T10:30:00.000Z`), // 19:30 JST
        partySize: 4,
        status: "confirmed",
        customerName: "小林 麻衣",
        customerNameKana: "コバヤシ マイ",
        customerPhone: "090-7890-1234",
        customerEmail: "kobayashi.m@example.com",
        note: "甲殻類アレルギーあり・対応希望",
      },
      {
        restaurantId: restaurant.id,
        tableId: createdTables[6]?.id ?? createdTables[2].id,
        reservationNumber: generateReservationNumber(),
        cancellationTokenHash: hashToken("tok_takahashi_demo_004"),
        startAt: new Date(`${tokyoDateStr}T09:30:00.000Z`), // 18:30 JST
        endAt: new Date(`${tokyoDateStr}T11:00:00.000Z`), // 20:00 JST
        partySize: 7,
        status: "confirmed",
        customerName: "高橋 裕太",
        customerNameKana: "タカハシ ユウタ",
        customerPhone: "090-3456-7890",
        customerEmail: "takahashi.y@example.com",
        note: "職場の懇親会",
      },
      {
        restaurantId: restaurant.id,
        tableId: createdTables[5]?.id ?? createdTables[3].id,
        reservationNumber: generateReservationNumber(),
        cancellationTokenHash: hashToken("tok_ito_demo_008"),
        startAt: new Date(`${tokyoDateStr}T11:00:00.000Z`), // 20:00 JST
        endAt: new Date(`${tokyoDateStr}T12:30:00.000Z`), // 21:30 JST
        partySize: 5,
        status: "confirmed",
        customerName: "伊藤 健太",
        customerNameKana: "イトウ ケンタ",
        customerPhone: "080-8901-2345",
        customerEmail: "ito.k@example.com",
        note: "接待のため",
      },
      {
        restaurantId: restaurant.id,
        tableId: createdTables[1].id,
        reservationNumber: generateReservationNumber(),
        cancellationTokenHash: hashToken("tok_nakamura_demo_009"),
        startAt: new Date(`${tokyoDateStr}T11:30:00.000Z`), // 20:30 JST
        endAt: new Date(`${tokyoDateStr}T13:00:00.000Z`), // 22:00 JST
        partySize: 2,
        status: "confirmed",
        customerName: "中村 葵",
        customerNameKana: "ナカムラ アオイ",
        customerPhone: "070-9012-3456",
        customerEmail: "nakamura.a@example.com",
      },
    ];

    const insertedReservations = await db
      .insert(reservations)
      .values(sampleReservations)
      .returning();

    // Initialize audit logs for sample reservations
    for (const rsv of insertedReservations) {
      await db.insert(reservationLogs).values({
        reservationId: rsv.id,
        action: "created",
        previousStatus: null,
        newStatus: rsv.status,
        operatorId: adminUser ? adminUser.id : null,
        operatorRole: "manager",
        note: "デモデータ初期作成",
        createdAt: rsv.createdAt,
      });
    }

    console.log("Sample reservations and audit logs initialized.");
  } else if (createdTables.length >= 4) {
    const tableForTanaka = createdTables[4]?.id ?? createdTables[2].id;
    await db
      .update(reservations)
      .set({ tableId: tableForTanaka })
      .where(
        and(
          eq(reservations.restaurantId, restaurant.id),
          eq(reservations.customerName, "田中 美咲"),
          eq(reservations.tableId, createdTables[1].id),
        ),
      );
  }

  // Initialize news items
  const existingNews = await db.select().from(news).where(eq(news.restaurantId, restaurant.id));

  if (existingNews.length === 0) {
    await db.insert(news).values(
      restaurantConfig.news.map((n, idx) => ({
        restaurantId: restaurant.id,
        category: n.category,
        title: n.title,
        content: n.content ?? "",
        publishedAt: n.date,
        isPublished: true,
        sortOrder: idx,
      })),
    );
    console.log(`News items initialized: ${restaurantConfig.news.length} items.`);
  }

  console.log("Database seeding completed.");
}

if (process.argv[1]?.includes("seed")) {
  seed()
    .catch((err) => {
      console.error("Seeding error:", err);
      process.exit(1);
    })
    .finally(() => {
      process.exit(0);
    });
}
