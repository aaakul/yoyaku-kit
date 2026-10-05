ALTER TABLE "reservations" ADD COLUMN "reservation_number" varchar(6);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_reservations_reservation_number" ON "reservations" ("reservation_number");
