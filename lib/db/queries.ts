import { createHash } from "node:crypto";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";
import { DEFAULT_RESTAURANT_SLUG } from "@/config/restaurant";
import { auth } from "@/lib/auth/better-auth";
import { addDays } from "@/lib/utils";
import { db } from "./drizzle";
import {
  type BusinessHour,
  businessHours,
  type NewsItem,
  news,
  type Restaurant,
  type RestaurantTable,
  reservationLogs,
  reservations,
  restaurants,
  restaurantTables,
  type User,
  user,
} from "./schema";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const getUser = cache(async (): Promise<User | null> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return null;
    }
    const found = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);

    return found[0] || null;
  } catch {
    return null;
  }
});

export const getUsers = cache(async (): Promise<User[]> => {
  return await db.select().from(user).orderBy(asc(user.role), desc(user.createdAt));
});

export const getRestaurant = cache(
  async (slug = DEFAULT_RESTAURANT_SLUG): Promise<Restaurant | null> => {
    const result = await db.select().from(restaurants).where(eq(restaurants.slug, slug)).limit(1);

    return result[0] || null;
  },
);

export const getNewsList = cache(
  async (restaurantId: string, onlyPublished = false): Promise<NewsItem[]> => {
    const conditions = [eq(news.restaurantId, restaurantId)];
    if (onlyPublished) {
      conditions.push(eq(news.isPublished, true));
    }

    return await db
      .select()
      .from(news)
      .where(and(...conditions))
      .orderBy(asc(news.sortOrder), desc(news.publishedAt), desc(news.createdAt));
  },
);

export const getNewsItem = cache(async (id: string): Promise<NewsItem | null> => {
  const result = await db.select().from(news).where(eq(news.id, id)).limit(1);
  return result[0] || null;
});

export const getRestaurantTables = cache(
  async (restaurantId: string): Promise<RestaurantTable[]> => {
    return await db
      .select()
      .from(restaurantTables)
      .where(eq(restaurantTables.restaurantId, restaurantId))
      .orderBy(restaurantTables.capacity, restaurantTables.name);
  },
);

export const getBusinessHours = cache(async (restaurantId: string): Promise<BusinessHour[]> => {
  return await db
    .select()
    .from(businessHours)
    .where(eq(businessHours.restaurantId, restaurantId))
    .orderBy(businessHours.openTime);
});

export async function getReservations(options?: {
  restaurantId?: string;
  date?: string; // "YYYY-MM-DD"
  status?: string;
}) {
  const conditions = [];

  if (options?.restaurantId) {
    conditions.push(eq(reservations.restaurantId, options.restaurantId));
  }

  if (options?.status) {
    conditions.push(eq(reservations.status, options.status));
  }

  if (options?.date) {
    const dayStart = new Date(`${options.date}T05:00:00+09:00`);
    const nextDay = addDays(options.date, 1);
    const dayEnd = new Date(`${nextDay}T04:59:59+09:00`);
    conditions.push(gte(reservations.startAt, dayStart));
    conditions.push(lte(reservations.startAt, dayEnd));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return await db
    .select({
      id: reservations.id,
      reservationNumber: reservations.reservationNumber,
      restaurantId: reservations.restaurantId,
      tableId: reservations.tableId,
      tableName: restaurantTables.name,
      tableType: restaurantTables.type,
      tableCapacity: restaurantTables.capacity,
      customerName: reservations.customerName,
      customerNameKana: reservations.customerNameKana,
      customerPhone: reservations.customerPhone,
      customerEmail: reservations.customerEmail,
      partySize: reservations.partySize,
      startAt: reservations.startAt,
      endAt: reservations.endAt,
      status: reservations.status,
      note: reservations.note,
      createdAt: reservations.createdAt,
    })
    .from(reservations)
    .leftJoin(restaurantTables, eq(reservations.tableId, restaurantTables.id))
    .where(whereClause)
    .orderBy(desc(reservations.startAt));
}

export type ReservationSummary = Awaited<ReturnType<typeof getReservations>>[number];

export const getReservationByToken = cache(async (rawToken: string) => {
  const tokenHash = hashToken(rawToken);

  const result = await db
    .select({
      reservation: reservations,
      table: restaurantTables,
      restaurant: restaurants,
    })
    .from(reservations)
    .innerJoin(restaurantTables, eq(reservations.tableId, restaurantTables.id))
    .innerJoin(restaurants, eq(reservations.restaurantId, restaurants.id))
    .where(eq(reservations.cancellationTokenHash, tokenHash))
    .limit(1);

  return result[0] || null;
});

export interface GetReservationLogsOptions {
  reservationId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

export async function getReservationLogs(options?: GetReservationLogsOptions) {
  const conditions = [];

  if (options?.reservationId) {
    conditions.push(eq(reservationLogs.reservationId, options.reservationId));
  }

  if (options?.action) {
    conditions.push(eq(reservationLogs.action, options.action));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  return await db
    .select({
      id: reservationLogs.id,
      reservationId: reservationLogs.reservationId,
      reservationNumber: reservations.reservationNumber,
      action: reservationLogs.action,
      previousStatus: reservationLogs.previousStatus,
      newStatus: reservationLogs.newStatus,
      operatorId: reservationLogs.operatorId,
      operatorRole: reservationLogs.operatorRole,
      operatorName: user.name,
      operatorEmail: user.email,
      note: reservationLogs.note,
      createdAt: reservationLogs.createdAt,
      customerName: reservations.customerName,
      customerPhone: reservations.customerPhone,
      startAt: reservations.startAt,
    })
    .from(reservationLogs)
    .leftJoin(user, eq(reservationLogs.operatorId, user.id))
    .leftJoin(reservations, eq(reservationLogs.reservationId, reservations.id))
    .where(whereClause)
    .orderBy(desc(reservationLogs.createdAt))
    .limit(limit)
    .offset(offset);
}
