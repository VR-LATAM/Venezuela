-- Diseñado por: Edward Labrador
-- Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- Portal de clínicas NEMT
-- Tablas: clinic_accounts, clinic_ride_requests
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Cuentas de clínicas ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinic_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200) NOT NULL,
  address         TEXT,
  contact_name    VARCHAR(100),
  contact_email   VARCHAR(200) UNIQUE,
  contact_phone   VARCHAR(20),
  billing_code    VARCHAR(50),
  password_hash   TEXT,
  api_key         TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  plan            VARCHAR(20) NOT NULL DEFAULT 'basic',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN clinic_accounts.plan IS 'basic | professional | enterprise';
COMMENT ON COLUMN clinic_accounts.api_key IS 'Para integración directa por API';
COMMENT ON COLUMN clinic_accounts.password_hash IS 'bcrypt — para login en el portal web';

-- ── 2. Solicitudes de transporte ────────────────────────────────
CREATE TABLE IF NOT EXISTS clinic_ride_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID NOT NULL REFERENCES clinic_accounts(id) ON DELETE CASCADE,
  passenger_id    UUID REFERENCES users(id),
  patient_name    VARCHAR(200) NOT NULL,
  patient_phone   VARCHAR(20),
  pickup_address  TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  service_type    VARCHAR(50) NOT NULL DEFAULT 'accessible',
  notes           TEXT,
  diagnosis_code  VARCHAR(20),
  ride_id         UUID REFERENCES rides(id),
  status          VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN clinic_ride_requests.status IS 'pending | scheduled | in_progress | completed | cancelled';
COMMENT ON COLUMN clinic_ride_requests.diagnosis_code IS 'ICD-10 opcional';

-- ── 3. Índices ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clinic_requests_clinic_id  ON clinic_ride_requests(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_requests_status     ON clinic_ride_requests(status);
CREATE INDEX IF NOT EXISTS idx_clinic_requests_scheduled  ON clinic_ride_requests(scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinic_accounts_email      ON clinic_accounts(contact_email);
CREATE INDEX IF NOT EXISTS idx_clinic_accounts_api_key    ON clinic_accounts(api_key);

-- ── 4. updated_at automático ────────────────────────────────────
CREATE OR REPLACE FUNCTION set_clinic_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_clinic_accounts_updated_at ON clinic_accounts;
CREATE TRIGGER trg_clinic_accounts_updated_at
  BEFORE UPDATE ON clinic_accounts
  FOR EACH ROW EXECUTE FUNCTION set_clinic_updated_at();

DROP TRIGGER IF EXISTS trg_clinic_requests_updated_at ON clinic_ride_requests;
CREATE TRIGGER trg_clinic_requests_updated_at
  BEFORE UPDATE ON clinic_ride_requests
  FOR EACH ROW EXECUTE FUNCTION set_clinic_updated_at();
