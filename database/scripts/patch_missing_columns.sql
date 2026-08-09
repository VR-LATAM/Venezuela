/* ============================================================
   PARCHE: Añadir columnas faltantes a la tabla drivers
   Correr en Supabase SQL Editor UNA SOLA VEZ
   Es seguro correrlo aunque ya existan las columnas (IF NOT EXISTS)
   ============================================================ */

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS accessible_cert_url       TEXT,
  ADD COLUMN IF NOT EXISTS current_state_code        CHAR(2) REFERENCES us_states(code),
  ADD COLUMN IF NOT EXISTS rides_this_month          INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consecutive_rejections    INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_earned              DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_balance         DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS certifications            JSONB         NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages                 TEXT[]        NOT NULL DEFAULT '{spanish}',
  ADD COLUMN IF NOT EXISTS special_equipment         TEXT[]        NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS smokes                    BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS long_distance_available   BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS music_preference          VARCHAR(50)   NOT NULL DEFAULT 'any',
  ADD COLUMN IF NOT EXISTS music_artist              VARCHAR(100),
  ADD COLUMN IF NOT EXISTS stripe_account_id         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS stripe_account_verified   BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ssn_last4                 CHAR(4),
  ADD COLUMN IF NOT EXISTS daily_earnings_goal       DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rides_offered             INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rides_accepted            INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_ride_completed_at    TIMESTAMPTZ   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS inactivity_alert_sent     BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS online_since              TIMESTAMPTZ   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS medical_exam_expiry       DATE,
  ADD COLUMN IF NOT EXISTS vehicle_vin               VARCHAR(17),
  ADD COLUMN IF NOT EXISTS vehicle_seats             INTEGER       DEFAULT 4;
