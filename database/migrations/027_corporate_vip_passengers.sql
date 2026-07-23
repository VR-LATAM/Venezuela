-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 027: Tipos de pasajero — Corporate y VIP/Premium
-- ═══════════════════════════════════════════════════════════════

-- 1. Tipo de pasajero en tabla base
ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS passenger_tier VARCHAR(20) NOT NULL DEFAULT 'standard'
    CHECK (passenger_tier IN ('standard', 'vip', 'corporate_employee'));

-- ── CUENTAS CORPORATIVAS ─────────────────────────────────────
-- 2. Empresa que paga por sus empleados
CREATE TABLE IF NOT EXISTS corporate_accounts (
  id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name          VARCHAR(200) NOT NULL,
  contact_name          VARCHAR(100),
  contact_email         VARCHAR(200) UNIQUE,
  contact_phone         VARCHAR(20),
  billing_email         VARCHAR(200),
  tax_id                VARCHAR(50),
  address               TEXT,
  monthly_spending_limit DECIMAL(10,2),          -- límite mensual total empresa
  balance               DECIMAL(10,2) DEFAULT 0, -- saldo prepago si aplica
  auto_invoice          BOOLEAN DEFAULT TRUE,     -- genera factura automática mensual
  is_active             BOOLEAN DEFAULT TRUE,
  api_key               VARCHAR(100) UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_corporate_email  ON corporate_accounts (contact_email);
CREATE INDEX idx_corporate_active ON corporate_accounts (is_active);

-- 3. Empleados vinculados a cuenta corporativa
CREATE TABLE IF NOT EXISTS corporate_employees (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  corporate_id    UUID         NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  passenger_id    UUID         NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  employee_code   VARCHAR(50),                   -- código interno de la empresa
  department      VARCHAR(100),
  spending_limit  DECIMAL(10,2),                 -- límite mensual por empleado
  spent_this_month DECIMAL(10,2) DEFAULT 0,      -- acumulado mes actual
  can_use_vip     BOOLEAN DEFAULT FALSE,          -- si puede pedir VIP a cargo de empresa
  is_active       BOOLEAN DEFAULT TRUE,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(corporate_id, passenger_id)
);
CREATE INDEX idx_corp_emp_corporate  ON corporate_employees (corporate_id);
CREATE INDEX idx_corp_emp_passenger  ON corporate_employees (passenger_id);

-- 4. Facturas mensuales corporativas
CREATE TABLE IF NOT EXISTS corporate_invoices (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  corporate_id         UUID        NOT NULL REFERENCES corporate_accounts(id),
  invoice_number       VARCHAR(50) NOT NULL UNIQUE,
  billing_period_start DATE        NOT NULL,
  billing_period_end   DATE        NOT NULL,
  total_rides          INTEGER     DEFAULT 0,
  total_amount         DECIMAL(10,2) DEFAULT 0,
  status               VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  pdf_url              TEXT,
  sent_at              TIMESTAMPTZ,
  paid_at              TIMESTAMPTZ,
  due_date             DATE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_corp_invoice_corp   ON corporate_invoices (corporate_id);
CREATE INDEX idx_corp_invoice_status ON corporate_invoices (status);
CREATE INDEX idx_corp_invoice_period ON corporate_invoices (billing_period_start);

-- ── PASAJEROS VIP / PREMIUM ──────────────────────────────────
-- 5. Perfil VIP extendido
CREATE TABLE IF NOT EXISTS vip_passengers (
  id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id        UUID         NOT NULL REFERENCES passengers(id) ON DELETE CASCADE UNIQUE,
  preferred_driver_id UUID         REFERENCES drivers(id) ON DELETE SET NULL,
  price_multiplier    DECIMAL(3,2) NOT NULL DEFAULT 1.30,  -- 30% extra sobre tarifa base
  priority_dispatch   BOOLEAN      DEFAULT TRUE,            -- se despacha antes que standard
  dedicated_support   BOOLEAN      DEFAULT TRUE,            -- canal de soporte prioritario
  preferences         TEXT,                                 -- notas especiales (temperatura, música, etc.)
  vip_since           TIMESTAMPTZ  DEFAULT NOW(),
  created_at          TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX idx_vip_passenger ON vip_passengers (passenger_id);
CREATE INDEX idx_vip_driver    ON vip_passengers (preferred_driver_id);

-- ── CAMPOS EN RIDES ──────────────────────────────────────────
-- 6. Vincular viaje a cuenta corporativa / VIP
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS passenger_tier        VARCHAR(20) DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS corporate_account_id  UUID REFERENCES corporate_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS corporate_invoice_id  UUID REFERENCES corporate_invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preferred_driver_id   UUID REFERENCES drivers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority_dispatch     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vip_multiplier        DECIMAL(3,2) DEFAULT 1.00;

CREATE INDEX IF NOT EXISTS idx_rides_corporate ON rides (corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_rides_tier      ON rides (passenger_tier);

-- 7. Trigger updated_at en corporate_accounts
CREATE TRIGGER corporate_accounts_updated_at
  BEFORE UPDATE ON corporate_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
