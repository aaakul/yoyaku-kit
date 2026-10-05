import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("staff"), // "manager" | "staff" | "demo"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const restaurants = pgTable("restaurants", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  timezone: text("timezone").notNull().default("Asia/Tokyo"),
  address: text("address"),
  phone: text("phone"),
  defaultDurationMinutes: integer("default_duration_minutes").notNull().default(90),
  slotIntervalMinutes: integer("slot_interval_minutes").notNull().default(30),
  minAdvanceHours: integer("min_advance_hours").notNull().default(2),
  cancellationCutoffHours: integer("cancellation_cutoff_hours").notNull().default(24),
  closedDaysOfWeek: text("closed_days_of_week").notNull().default("1"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const restaurantTables = pgTable("restaurant_tables", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().default("テーブル席"),
  capacity: integer("capacity").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const businessHours = pgTable("business_hours", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("dinner"),
  openTime: varchar("open_time", { length: 5 }).notNull(),
  closeTime: varchar("close_time", { length: 5 }).notNull(),
  isOvernight: boolean("is_overnight").notNull().default(false),
});

export const reservations = pgTable(
  "reservations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    restaurantId: text("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    tableId: text("table_id")
      .notNull()
      .references(() => restaurantTables.id, { onDelete: "restrict" }),
    cancellationTokenHash: text("cancellation_token_hash").notNull().unique(),
    reservationNumber: varchar("reservation_number", { length: 6 }).unique(),
    idempotencyKey: text("idempotency_key"),
    startAt: timestamp("start_at", { withTimezone: true, mode: "date" }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true, mode: "date" }).notNull(),
    partySize: integer("party_size").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("confirmed"),
    customerName: text("customer_name").notNull(),
    customerNameKana: text("customer_name_kana").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerEmail: text("customer_email").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_reservations_idempotency").on(table.restaurantId, table.idempotencyKey),
    uniqueIndex("idx_reservations_reservation_number").on(table.reservationNumber),
  ],
);

export const reservationLogs = pgTable("reservation_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  reservationId: text("reservation_id")
    .notNull()
    .references(() => reservations.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 50 }).notNull(),
  previousStatus: varchar("previous_status", { length: 20 }),
  newStatus: varchar("new_status", { length: 20 }).notNull(),
  operatorId: text("operator_id").references(() => user.id, { onDelete: "set null" }),
  operatorRole: varchar("operator_role", { length: 20 }).notNull().default("customer"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const news = pgTable("news", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 50 }).notNull().default("お知らせ"),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  publishedAt: varchar("published_at", { length: 20 }).notNull(),
  isPublished: boolean("is_published").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const restaurantsRelations = relations(restaurants, ({ many }) => ({
  tables: many(restaurantTables),
  businessHours: many(businessHours),
  reservations: many(reservations),
  news: many(news),
}));

export const restaurantTablesRelations = relations(restaurantTables, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [restaurantTables.restaurantId],
    references: [restaurants.id],
  }),
  reservations: many(reservations),
}));

export const businessHoursRelations = relations(businessHours, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [businessHours.restaurantId],
    references: [restaurants.id],
  }),
}));

export const reservationsRelations = relations(reservations, ({ one, many }) => ({
  restaurant: one(restaurants, {
    fields: [reservations.restaurantId],
    references: [restaurants.id],
  }),
  table: one(restaurantTables, {
    fields: [reservations.tableId],
    references: [restaurantTables.id],
  }),
  logs: many(reservationLogs),
}));

export const reservationLogsRelations = relations(reservationLogs, ({ one }) => ({
  reservation: one(reservations, {
    fields: [reservationLogs.reservationId],
    references: [reservations.id],
  }),
  operator: one(user, {
    fields: [reservationLogs.operatorId],
    references: [user.id],
  }),
}));

export const newsRelations = relations(news, ({ one }) => ({
  restaurant: one(restaurants, {
    fields: [news.restaurantId],
    references: [restaurants.id],
  }),
}));

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type Restaurant = typeof restaurants.$inferSelect;
export type NewRestaurant = typeof restaurants.$inferInsert;
export type RestaurantTable = typeof restaurantTables.$inferSelect;
export type NewRestaurantTable = typeof restaurantTables.$inferInsert;
export type BusinessHour = typeof businessHours.$inferSelect;
export type NewBusinessHour = typeof businessHours.$inferInsert;
export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;
export type ReservationLog = typeof reservationLogs.$inferSelect;
export type NewReservationLog = typeof reservationLogs.$inferInsert;
export type NewsItem = typeof news.$inferSelect;
export type NewNewsItem = typeof news.$inferInsert;
