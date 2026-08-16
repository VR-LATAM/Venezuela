/* Sistema de referidos para pasajeros:
   - Pasajero A refiere 3 personas (grupos de 3 en 3)
   - Los 3 deben completar 10 viajes cada uno en 30 días desde que entró el primero
   - Si lo logran: Pasajero A recibe $5 de crédito (auto-aplicado $1/viaje en rides >= $3)
   - Máximo 2 grupos completados por mes
*/

ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS referral_credit NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(30) DEFAULT NULL;

/* Grupos de referidos del pasajero */
CREATE TABLE IF NOT EXISTS passenger_referral_groups (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'active',
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

/* Miembros de cada grupo (máx 3 por grupo) */
CREATE TABLE IF NOT EXISTS passenger_referral_members (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID        NOT NULL REFERENCES passenger_referral_groups(id) ON DELETE CASCADE,
  passenger_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rides_completed INT      NOT NULL DEFAULT 0,
  status       VARCHAR(20) NOT NULL DEFAULT 'active',
  completed_at TIMESTAMPTZ,
  UNIQUE(passenger_id)
);

CREATE INDEX IF NOT EXISTS idx_prg_referrer  ON passenger_referral_groups(referrer_id, status);
CREATE INDEX IF NOT EXISTS idx_prm_group     ON passenger_referral_members(group_id);
CREATE INDEX IF NOT EXISTS idx_prm_passenger ON passenger_referral_members(passenger_id, status);
