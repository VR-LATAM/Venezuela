ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS new_passenger_discount  BOOLEAN       DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS discount_amount         NUMERIC(10,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS driver_discount_tracking (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ride_id     UUID        NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  is_voluntary BOOLEAN    NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_discount_driver_id  ON driver_discount_tracking(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_discount_created_at ON driver_discount_tracking(driver_id, created_at);
