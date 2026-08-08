/* ═══════════════════════════════════════════════════════════════
   Membresías semanales de conductores — modelo Venezuela
   Pago cada viernes. Periodo: viernes → jueves siguiente.
   Precios: Moto $15 | Sedán $25 | SUV $35 (en USD)
   ═══════════════════════════════════════════════════════════════ */

/* Precios base por tipo de vehículo */
CREATE TABLE membership_plans (
  vehicle_type  VARCHAR(20) PRIMARY KEY,
  price_usd     DECIMAL(6,2) NOT NULL
);

INSERT INTO membership_plans (vehicle_type, price_usd) VALUES
  ('moto',  15.00),
  ('sedan', 25.00),
  ('suv',   35.00);

/* Registro de pagos de membresía semanales */
CREATE TABLE driver_memberships (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id         UUID    NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_type      VARCHAR(20) NOT NULL,
  amount_usd        DECIMAL(6,2) NOT NULL,
  period_start      DATE    NOT NULL,
  period_end        DATE    NOT NULL,
  status            VARCHAR(30) NOT NULL DEFAULT 'pending_payment',
  payment_method    VARCHAR(50),
  payment_reference VARCHAR(200),
  submitted_at      TIMESTAMPTZ,
  approved_by       UUID    REFERENCES users(id),
  approved_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (driver_id, period_start)
);

/* status: 'pending_payment' | 'pending_approval' | 'active' | 'rejected' | 'expired' */

CREATE INDEX idx_memberships_driver  ON driver_memberships(driver_id);
CREATE INDEX idx_memberships_status  ON driver_memberships(status);
CREATE INDEX idx_memberships_period  ON driver_memberships(period_start, period_end);

/* Estado rápido cacheado en la tabla drivers */
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS membership_status  VARCHAR(30) NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS membership_expires DATE;

/* membership_status: 'inactive' | 'pending_approval' | 'active' | 'suspended' */
