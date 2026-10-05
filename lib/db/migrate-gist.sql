-- Enable btree_gist extension
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Ensure column idempotency_key exists
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Rename cancellation_token → cancellation_token_hash (store sha256 digest only)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'cancellation_token'
  ) THEN
    ALTER TABLE reservations RENAME COLUMN cancellation_token TO cancellation_token_hash;
  ELSE
    ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_token_hash text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Add partial unique index for idempotency_key per restaurant
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_idempotency
ON reservations (restaurant_id, idempotency_key)
WHERE (idempotency_key IS NOT NULL);

-- Ensure unique index on cancellation_token_hash
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_cancellation_token_hash
ON reservations (cancellation_token_hash);

-- Ensure column reservation_number exists and has unique index
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reservation_number varchar(6);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_reservation_number
ON reservations (reservation_number);

-- Add check constraints for data integrity
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS check_start_before_end;
ALTER TABLE reservations ADD CONSTRAINT check_start_before_end CHECK (start_at < end_at);

ALTER TABLE reservations DROP CONSTRAINT IF EXISTS check_party_size_positive;
ALTER TABLE reservations ADD CONSTRAINT check_party_size_positive CHECK (party_size > 0);

ALTER TABLE restaurant_tables DROP CONSTRAINT IF EXISTS check_table_capacity_positive;
ALTER TABLE restaurant_tables ADD CONSTRAINT check_table_capacity_positive CHECK (capacity > 0);

-- Drop existing constraint if present
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS no_overlapping_reservations;

-- Add GiST exclusion constraint to prevent overlapping active reservations on the same table
ALTER TABLE reservations ADD CONSTRAINT no_overlapping_reservations
EXCLUDE USING gist (
  table_id WITH =,
  tstzrange(start_at, end_at) WITH &&
) WHERE (status NOT IN ('cancelled', 'no_show'));

