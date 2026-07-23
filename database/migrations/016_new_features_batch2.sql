-- ============================================================
-- Migración 016 — Batch 2 de nuevas características
-- Suscripción, clínicas, viajes recurrentes, calificación detallada,
-- incidentes, racha conductores, lista de espera, facturas médicas
-- ============================================================

-- ── Suscripciones mensuales del pasajero ──────────────────────
CREATE TABLE IF NOT EXISTS passenger_subscriptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan                VARCHAR(30) NOT NULL DEFAULT 'monthly',  -- 'monthly' | 'annual'
  price_usd           DECIMAL(8,2) NOT NULL DEFAULT 29.99,
  discount_percent    INT NOT NULL DEFAULT 15,
  stripe_subscription_id VARCHAR(100) UNIQUE,
  status              VARCHAR(20) NOT NULL DEFAULT 'active',   -- 'active' | 'cancelled' | 'past_due'
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (passenger_id)  -- un solo plan activo por pasajero
);
CREATE INDEX idx_sub_passenger ON passenger_subscriptions(passenger_id);
CREATE INDEX idx_sub_status    ON passenger_subscriptions(status);

-- Descuento de suscripción aplicado en el viaje
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS subscription_discount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS call_me_before_arrival BOOLEAN DEFAULT FALSE;

-- ── Cuentas de clínicas y hospitales ─────────────────────────
CREATE TABLE IF NOT EXISTS clinic_accounts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(200) NOT NULL,
  address       TEXT,
  contact_name  VARCHAR(100),
  contact_email VARCHAR(200) UNIQUE,
  contact_phone VARCHAR(20),
  billing_code  VARCHAR(50),  -- código de facturación Medicare/Medicaid
  is_active     BOOLEAN DEFAULT TRUE,
  api_key       VARCHAR(100) UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Solicitudes de viaje hechas por clínicas (para sus pacientes)
CREATE TABLE IF NOT EXISTS clinic_ride_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID NOT NULL REFERENCES clinic_accounts(id),
  passenger_id    UUID REFERENCES users(id),  -- NULL si el paciente no tiene cuenta
  patient_name    VARCHAR(200) NOT NULL,
  patient_phone   VARCHAR(20),
  pickup_address  TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  service_type    VARCHAR(20) DEFAULT 'accessible',
  notes           TEXT,
  diagnosis_code  VARCHAR(20),  -- ICD-10 code para facturación médica
  ride_id         UUID REFERENCES rides(id),  -- viaje asignado
  status          VARCHAR(20) DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_clinic_requests_clinic ON clinic_ride_requests(clinic_id);
CREATE INDEX idx_clinic_requests_status ON clinic_ride_requests(status);

-- ── Viajes recurrentes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recurring_rides (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname        VARCHAR(100),  -- ej. "Diálisis martes"
  pickup_address  TEXT NOT NULL,
  pickup_lat      DECIMAL(10,7),
  pickup_lng      DECIMAL(10,7),
  dropoff_address TEXT NOT NULL,
  dropoff_lat     DECIMAL(10,7),
  dropoff_lng     DECIMAL(10,7),
  service_type    VARCHAR(20) DEFAULT 'standard',
  -- Frecuencia: días de la semana (0=domingo ... 6=sábado), JSON array
  days_of_week    INT[] NOT NULL,  -- ej. {2, 4} = martes y jueves
  time_of_day     TIME NOT NULL,   -- ej. 09:00
  state_code      CHAR(2) DEFAULT 'TX',
  is_active       BOOLEAN DEFAULT TRUE,
  advance_hours   INT DEFAULT 2,   -- cuántas horas antes se crea el viaje
  last_created_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_recurring_passenger ON recurring_rides(passenger_id);
CREATE INDEX idx_recurring_active    ON recurring_rides(is_active, days_of_week);

-- ── Facturas médicas ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id         UUID NOT NULL REFERENCES rides(id),
  passenger_id    UUID NOT NULL REFERENCES users(id),
  clinic_id       UUID REFERENCES clinic_accounts(id),
  invoice_number  VARCHAR(50) NOT NULL UNIQUE,
  diagnosis_code  VARCHAR(20),   -- ICD-10
  service_code    VARCHAR(20) DEFAULT 'A0100',  -- Non-emergency transport
  amount_usd      DECIMAL(10,2) NOT NULL,
  insurance_type  VARCHAR(30),   -- 'medicaid' | 'medicare' | 'private' | 'self_pay'
  member_id       VARCHAR(50),   -- ID del paciente en el seguro
  status          VARCHAR(20) DEFAULT 'draft',  -- 'draft' | 'submitted' | 'paid' | 'rejected'
  pdf_url         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_invoice_ride      ON medical_invoices(ride_id);
CREATE INDEX idx_invoice_passenger ON medical_invoices(passenger_id);

-- ── Calificación detallada ────────────────────────────────────
-- Añadir columnas de subcategorías al rating existente
ALTER TABLE ratings
  ADD COLUMN IF NOT EXISTS punctuality_score   INT CHECK (punctuality_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS driving_score       INT CHECK (driving_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS friendliness_score  INT CHECK (friendliness_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS cleanliness_score   INT CHECK (cleanliness_score BETWEEN 1 AND 5);

-- ── Reportes de incidentes durante el viaje ───────────────────
CREATE TABLE IF NOT EXISTS ride_incidents (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id        UUID NOT NULL REFERENCES rides(id),
  reporter_id    UUID NOT NULL REFERENCES users(id),
  reporter_role  VARCHAR(20) NOT NULL,
  incident_type  VARCHAR(50) NOT NULL,
  -- 'aggressive_passenger' | 'aggressive_driver' | 'accident' | 'mechanical_failure'
  -- 'route_deviation' | 'unauthorized_stop' | 'property_damage' | 'other'
  description    TEXT,
  lat            DECIMAL(10,7),
  lng            DECIMAL(10,7),
  status         VARCHAR(20) DEFAULT 'open',
  admin_notes    TEXT,
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_incidents_ride   ON ride_incidents(ride_id);
CREATE INDEX idx_incidents_status ON ride_incidents(status);

-- ── Racha del conductor (streak bonus) ───────────────────────
CREATE TABLE IF NOT EXISTS driver_streaks (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  current_streak      INT DEFAULT 0,
  best_streak         INT DEFAULT 0,
  last_ride_at        TIMESTAMPTZ,
  total_streak_bonuses DECIMAL(10,2) DEFAULT 0,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_streak_driver ON driver_streaks(driver_id);

-- ── Lista de espera por zona ──────────────────────────────────
CREATE TABLE IF NOT EXISTS ride_waitlist (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pickup_lat      DECIMAL(10,7) NOT NULL,
  pickup_lng      DECIMAL(10,7) NOT NULL,
  pickup_address  TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  service_type    VARCHAR(20) DEFAULT 'standard',
  state_code      CHAR(2),
  notified        BOOLEAN DEFAULT FALSE,
  expires_at      TIMESTAMPTZ DEFAULT NOW() + INTERVAL '2 hours',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_waitlist_passenger ON ride_waitlist(passenger_id);
CREATE INDEX idx_waitlist_active    ON ride_waitlist(expires_at) WHERE notified = FALSE;

-- ── Conductores inactivos — tracking ─────────────────────────
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS last_ride_completed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS inactivity_alert_sent   BOOLEAN DEFAULT FALSE;
