-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 005: Calificaciones, ganancias, retiros y referidos
-- ═══════════════════════════════════════════════════════════════


-- CALIFICACIONES (bidireccional: pasajero califica conductor y viceversa)
CREATE TABLE IF NOT EXISTS ratings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id    UUID NOT NULL REFERENCES rides(id),
  rater_id   UUID NOT NULL REFERENCES users(id),   -- Quien califica
  rated_id   UUID NOT NULL REFERENCES users(id),   -- Quien es calificado
  rater_role VARCHAR(20) NOT NULL CHECK (rater_role IN ('passenger', 'driver')),
  score      INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(ride_id, rater_role)   -- Un solo rating por rol por viaje
);

CREATE INDEX idx_ratings_ride   ON ratings (ride_id);
CREATE INDEX idx_ratings_rated  ON ratings (rated_id);


-- ─────────────────────────────────────────────────────────────
-- GANANCIAS DE CONDUCTORES
-- Registro detallado de cada ingreso (viaje + bonos + correcciones)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_earnings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id   UUID NOT NULL REFERENCES drivers(id),
  ride_id     UUID REFERENCES rides(id),           -- NULL para bonos que no son de un viaje
  type        VARCHAR(30) NOT NULL
    CHECK (type IN (
      'ride',                -- Ganancia de un viaje completado
      'referral_bonus',      -- Bono por completar 50 viajes el referido ($600)
      'performance_bonus',   -- Bono mensual por 100+ viajes ($50)
      'quality_bonus',       -- Bono por mantener calificación ≥ 4.8
      'correction'           -- Ajuste manual por admin
    )),
  gross_amount   DECIMAL(10,2) NOT NULL,  -- Tarifa bruta del viaje
  platform_fee   DECIMAL(10,2) NOT NULL DEFAULT 0,  -- Comisión retenida (13%)
  net_amount     DECIMAL(10,2) NOT NULL,  -- Ganancia neta del conductor
  description    TEXT,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_driver_earnings_driver  ON driver_earnings (driver_id);
CREATE INDEX idx_driver_earnings_type    ON driver_earnings (type);
CREATE INDEX idx_driver_earnings_created ON driver_earnings (created_at DESC);


-- ─────────────────────────────────────────────────────────────
-- RETIROS DE CONDUCTORES
-- Vía Stripe Connect — transferencia a cuenta bancaria americana
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_withdrawals (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id          UUID NOT NULL REFERENCES drivers(id),
  amount             DECIMAL(10,2) NOT NULL,
  status             VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  stripe_transfer_id VARCHAR(200),
  failure_reason     TEXT,
  requested_at       TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at       TIMESTAMP
);

CREATE INDEX idx_withdrawals_driver ON driver_withdrawals (driver_id);
CREATE INDEX idx_withdrawals_status ON driver_withdrawals (status);


-- ─────────────────────────────────────────────────────────────
-- PROGRAMA DE REFERIDOS
-- Conductor refiere a otro conductor:
--   $600 cuando el referido completa 50 viajes
--   $50 para el referido al completar su primer viaje
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_driver_id  UUID NOT NULL REFERENCES drivers(id),
  referred_driver_id  UUID NOT NULL REFERENCES drivers(id),
  bonus_amount        DECIMAL(10,2) NOT NULL DEFAULT 600.00,   -- Bono para quien refiere
  referred_bonus      DECIMAL(10,2) NOT NULL DEFAULT 50.00,    -- Bono para el referido
  rides_required      INTEGER NOT NULL DEFAULT 50,              -- Viajes requeridos para activar bono
  rides_completed     INTEGER NOT NULL DEFAULT 0,               -- Progreso actual del referido
  first_ride_bonus_paid BOOLEAN NOT NULL DEFAULT false,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'paid')),
  completed_at        TIMESTAMP,
  paid_at             TIMESTAMP,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(referrer_driver_id, referred_driver_id)
);

CREATE INDEX idx_referrals_referrer ON referrals (referrer_driver_id);
CREATE INDEX idx_referrals_referred ON referrals (referred_driver_id);
CREATE INDEX idx_referrals_status   ON referrals (status);
