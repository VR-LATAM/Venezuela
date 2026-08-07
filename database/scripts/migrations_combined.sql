-- ============================================================
-- V-RIDE VENEZUELA — Migración completa
-- Pegar en Supabase SQL Editor y ejecutar todo de una vez
-- ============================================================

-- EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- FUNCIÓN GLOBAL updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────
-- ESTADOS VENEZOLANOS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS us_states (
  id                          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                        CHAR(2)      UNIQUE NOT NULL,
  name                        VARCHAR(100) NOT NULL,
  is_active                   BOOLEAN      NOT NULL DEFAULT false,
  launched_at                 TIMESTAMP,
  base_fare                   DECIMAL(6,2) NOT NULL DEFAULT 1.00,
  price_per_mile              DECIMAL(6,2) NOT NULL DEFAULT 0.64,
  price_per_minute            DECIMAL(6,2) NOT NULL DEFAULT 0.10,
  min_fare                    DECIMAL(6,2) NOT NULL DEFAULT 2.50,
  surge_multiplier            DECIMAL(3,2) NOT NULL DEFAULT 1.30,
  platform_commission_percent DECIMAL(5,2) NOT NULL DEFAULT 19.00,
  motorcycle_multiplier       DECIMAL(3,2) NOT NULL DEFAULT 0.75,
  suv_multiplier              DECIMAL(3,2) NOT NULL DEFAULT 1.30,
  hourly_2h_price             DECIMAL(8,2) NOT NULL DEFAULT 20.00,
  hourly_4h_price             DECIMAL(8,2) NOT NULL DEFAULT 35.00,
  hourly_8h_price             DECIMAL(8,2) NOT NULL DEFAULT 60.00,
  wait_per_minute_rate        DECIMAL(6,2) NOT NULL DEFAULT 0.10,
  wait_and_return_enabled     BOOLEAN      NOT NULL DEFAULT true,
  hourly_ride_enabled         BOOLEAN      NOT NULL DEFAULT false,
  timezone                    VARCHAR(50)  NOT NULL DEFAULT 'America/Caracas',
  created_at                  TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO us_states (code, name, is_active, launched_at, timezone) VALUES
  ('DC', 'Distrito Capital',  true, NOW(), 'America/Caracas'),
  ('AM', 'Amazonas',          true, NOW(), 'America/Caracas'),
  ('AN', 'Anzoátegui',        true, NOW(), 'America/Caracas'),
  ('AP', 'Apure',             true, NOW(), 'America/Caracas'),
  ('AR', 'Aragua',            true, NOW(), 'America/Caracas'),
  ('BA', 'Barinas',           true, NOW(), 'America/Caracas'),
  ('BO', 'Bolívar',           true, NOW(), 'America/Caracas'),
  ('CA', 'Carabobo',          true, NOW(), 'America/Caracas'),
  ('CO', 'Cojedes',           true, NOW(), 'America/Caracas'),
  ('DE', 'Delta Amacuro',     true, NOW(), 'America/Caracas'),
  ('FA', 'Falcón',            true, NOW(), 'America/Caracas'),
  ('GU', 'Guárico',           true, NOW(), 'America/Caracas'),
  ('LG', 'La Guaira',         true, NOW(), 'America/Caracas'),
  ('LA', 'Lara',              true, NOW(), 'America/Caracas'),
  ('ME', 'Mérida',            true, NOW(), 'America/Caracas'),
  ('MI', 'Miranda',           true, NOW(), 'America/Caracas'),
  ('MO', 'Monagas',           true, NOW(), 'America/Caracas'),
  ('NE', 'Nueva Esparta',     true, NOW(), 'America/Caracas'),
  ('PO', 'Portuguesa',        true, NOW(), 'America/Caracas'),
  ('SU', 'Sucre',             true, NOW(), 'America/Caracas'),
  ('TA', 'Táchira',           true, NOW(), 'America/Caracas'),
  ('TR', 'Trujillo',          true, NOW(), 'America/Caracas'),
  ('YA', 'Yaracuy',           true, NOW(), 'America/Caracas'),
  ('ZU', 'Zulia',             true, NOW(), 'America/Caracas')
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE TRIGGER us_states_updated_at
  BEFORE UPDATE ON us_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────
-- USUARIOS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid   VARCHAR(128) UNIQUE NOT NULL,
  email          VARCHAR(255) UNIQUE NOT NULL,
  name           VARCHAR(255) NOT NULL,
  phone          VARCHAR(20),
  phone_verified BOOLEAN      NOT NULL DEFAULT false,
  photo_url      TEXT,
  role           VARCHAR(20)  NOT NULL CHECK (role IN ('passenger', 'driver', 'admin')),
  language       VARCHAR(5)   NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en')),
  state_code     CHAR(2)      REFERENCES us_states(code),
  is_active      BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users (firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email        ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role         ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_state        ON users (state_code);

CREATE OR REPLACE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────
-- PASAJEROS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS passengers (
  id                      UUID         PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  rating_avg              DECIMAL(3,2) NOT NULL DEFAULT 5.00,
  total_rides             INTEGER      NOT NULL DEFAULT 0,
  emergency_contact_name  VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_email VARCHAR(255) DEFAULT NULL,
  stripe_customer_id      VARCHAR(100) UNIQUE,
  special_needs           JSONB        NOT NULL DEFAULT '{}',
  identity_doc_url        TEXT         DEFAULT NULL,
  identity_verified       BOOLEAN      NOT NULL DEFAULT false,
  created_at              TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- CONDUCTORES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drivers (
  id            UUID    PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state_code    CHAR(2) REFERENCES us_states(code),

  license_number    VARCHAR(50),
  license_expiry    DATE,
  license_front_url TEXT,
  license_back_url  TEXT,

  vehicle_plate             VARCHAR(20),
  vehicle_brand             VARCHAR(100),
  vehicle_model             VARCHAR(100),
  vehicle_year              INTEGER,
  vehicle_color             VARCHAR(50),
  vehicle_photo_front_url   TEXT,
  vehicle_photo_back_url    TEXT,
  vehicle_photo_left_url    TEXT,
  vehicle_photo_right_url   TEXT,
  vehicle_interior_url      TEXT,
  vehicle_vin               VARCHAR(17),
  vehicle_seats             INTEGER DEFAULT 4,

  insurance_doc_url       TEXT,
  insurance_expiry        DATE,
  insurance_company       VARCHAR(100),
  insurance_policy_number VARCHAR(100),

  background_check_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (background_check_status IN ('pending', 'approved', 'rejected')),
  accessible_cert_url TEXT,

  services TEXT[] NOT NULL DEFAULT '{sedan}',

  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'under_review', 'active', 'inactive', 'suspended', 'rejected')),
  rejection_reason  TEXT,
  suspension_reason TEXT,

  is_online          BOOLEAN   NOT NULL DEFAULT false,
  current_location   GEOGRAPHY(POINT, 4326),
  last_location_at   TIMESTAMP,
  current_state_code CHAR(2) REFERENCES us_states(code),

  rating_avg             DECIMAL(3,2)  NOT NULL DEFAULT 5.00,
  total_rides            INTEGER       NOT NULL DEFAULT 0,
  rides_this_month       INTEGER       NOT NULL DEFAULT 0,
  consecutive_rejections INTEGER       NOT NULL DEFAULT 0,
  total_earned           DECIMAL(12,2) NOT NULL DEFAULT 0,
  available_balance      DECIMAL(12,2) NOT NULL DEFAULT 0,

  referral_code  VARCHAR(20) UNIQUE,
  referred_by_id UUID REFERENCES drivers(id),

  stripe_account_id       VARCHAR(100) UNIQUE,
  stripe_account_verified BOOLEAN NOT NULL DEFAULT false,

  date_of_birth DATE,
  ssn_last4     CHAR(4),
  home_address  TEXT,

  languages         TEXT[] NOT NULL DEFAULT '{spanish}',
  special_equipment TEXT[] NOT NULL DEFAULT '{}',
  certifications    JSONB  NOT NULL DEFAULT '{}',

  smokes                  BOOLEAN NOT NULL DEFAULT false,
  long_distance_available BOOLEAN NOT NULL DEFAULT false,
  medical_exam_expiry     DATE,

  music_preference VARCHAR(50) NOT NULL DEFAULT 'any',
  music_artist     VARCHAR(100),

  daily_earnings_goal    DECIMAL(10,2) DEFAULT NULL,
  rides_offered          INT DEFAULT 0,
  rides_accepted         INT DEFAULT 0,
  last_ride_completed_at TIMESTAMPTZ DEFAULT NULL,
  inactivity_alert_sent  BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers USING GIST (current_location)
  WHERE is_online = true AND status = 'active';
CREATE INDEX IF NOT EXISTS idx_drivers_status    ON drivers (status);
CREATE INDEX IF NOT EXISTS idx_drivers_is_online ON drivers (is_online);
CREATE INDEX IF NOT EXISTS idx_drivers_state     ON drivers (state_code);
CREATE INDEX IF NOT EXISTS idx_drivers_referral  ON drivers (referral_code);

CREATE OR REPLACE TRIGGER drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────
-- TIPOS DE VEHÍCULO Y MEMBRESÍAS (Venezuela)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ve_vehicle_types (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code           VARCHAR(20) UNIQUE NOT NULL,
  name           VARCHAR(50) NOT NULL,
  weekly_fee_usd DECIMAL(8,2) NOT NULL,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMP   NOT NULL DEFAULT NOW()
);

INSERT INTO ve_vehicle_types (code, name, weekly_fee_usd) VALUES
  ('motorcycle', 'Motocicleta', 15.00),
  ('sedan',      'Sedán',       25.00),
  ('suv',        'SUV',         30.00)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS ve_driver_memberships (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id         UUID        NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_type_code VARCHAR(20) NOT NULL REFERENCES ve_vehicle_types(code),
  week_start        DATE        NOT NULL,
  week_end          DATE        NOT NULL,
  amount_usd        DECIMAL(8,2) NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP   NOT NULL DEFAULT NOW(),
  UNIQUE (driver_id, week_start)
);

CREATE OR REPLACE TRIGGER ve_memberships_updated_at
  BEFORE UPDATE ON ve_driver_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS ve_membership_payments (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  membership_id     UUID        NOT NULL REFERENCES ve_driver_memberships(id) ON DELETE CASCADE,
  driver_id         UUID        NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  amount_usd        DECIMAL(8,2) NOT NULL,
  payment_method    VARCHAR(30) NOT NULL,
  payment_reference VARCHAR(200),
  payment_proof_url TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending_verification',
  verified_by       UUID        REFERENCES users(id),
  verified_at       TIMESTAMP,
  rejection_reason  TEXT,
  paid_at           TIMESTAMP   NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ve_payment_methods (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          VARCHAR(30) UNIQUE NOT NULL,
  name          VARCHAR(50) NOT NULL,
  currency      VARCHAR(10) NOT NULL,
  instructions  TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  display_order INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMP   NOT NULL DEFAULT NOW()
);

INSERT INTO ve_payment_methods (code, name, currency, display_order) VALUES
  ('zelle',         'Zelle',                     'USD', 1),
  ('binance',       'Binance Pay',               'USD', 2),
  ('paypal',        'PayPal',                    'USD', 3),
  ('stripe',        'Tarjeta de crédito/débito', 'USD', 4),
  ('pago_movil',    'Pago Móvil',                'VES', 5),
  ('bank_transfer', 'Transferencia bancaria',    'VES', 6)
ON CONFLICT (code) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- VIAJES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rides (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id UUID NOT NULL REFERENCES passengers(id),
  driver_id    UUID REFERENCES drivers(id),
  state_code   CHAR(2) REFERENCES us_states(code),

  service_type VARCHAR(20) NOT NULL
    CHECK (service_type IN (
      'motorcycle', 'sedan', 'suv',
      'scheduled', 'hourly', 'wait_and_return'
    )),

  status VARCHAR(30) NOT NULL DEFAULT 'searching'
    CHECK (status IN (
      'searching', 'driver_assigned', 'driver_arriving', 'driver_arrived',
      'in_progress', 'completed', 'cancelled_passenger', 'cancelled_driver', 'no_driver_found'
    )),

  pickup_address   TEXT NOT NULL,
  pickup_location  GEOGRAPHY(POINT, 4326) NOT NULL,
  dropoff_address  TEXT NOT NULL,
  dropoff_location GEOGRAPHY(POINT, 4326) NOT NULL,

  search_max_radius_km     INTEGER DEFAULT 0,
  scheduled_at             TIMESTAMP,
  driver_assigned_at       TIMESTAMP,
  driver_arrived_pickup_at TIMESTAMP,
  started_at               TIMESTAMP,
  completed_at             TIMESTAMP,
  cancelled_at             TIMESTAMP,
  cancellation_reason      TEXT,

  distance_km      DECIMAL(8,3),
  duration_minutes INTEGER,

  base_fare           DECIMAL(8,2),
  distance_fare       DECIMAL(8,2),
  time_fare           DECIMAL(8,2),
  surge_multiplier    DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  service_multiplier  DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  cancellation_fee    DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  subtotal            DECIMAL(10,2),
  platform_commission DECIMAL(10,2),
  driver_earnings     DECIMAL(10,2),
  total_charged       DECIMAL(10,2),

  stripe_payment_intent_id VARCHAR(200),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),

  route_polyline         TEXT,
  promo_code             VARCHAR(30) DEFAULT NULL,
  promo_discount         DECIMAL(10,2) DEFAULT 0,
  subscription_discount  DECIMAL(10,2) DEFAULT 0,
  call_me_before_arrival BOOLEAN DEFAULT FALSE,
  driver_notes           TEXT DEFAULT NULL,

  return_address         TEXT,
  return_location        GEOGRAPHY(POINT, 4326),
  estimated_wait_minutes INTEGER  DEFAULT 60,
  wait_started_at        TIMESTAMP,
  wait_ended_at          TIMESTAMP,
  wait_minutes           INTEGER  DEFAULT 0,
  wait_fare              DECIMAL(8,2) DEFAULT 0.00,
  hourly_package_hours   INTEGER  DEFAULT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rides_status     ON rides (status);
CREATE INDEX IF NOT EXISTS idx_rides_passenger  ON rides (passenger_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver     ON rides (driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_state      ON rides (state_code);
CREATE INDEX IF NOT EXISTS idx_rides_created    ON rides (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_payment    ON rides (payment_status);
CREATE INDEX IF NOT EXISTS idx_rides_service    ON rides (service_type);
CREATE INDEX IF NOT EXISTS idx_rides_pickup_loc ON rides USING GIST (pickup_location);

CREATE TABLE IF NOT EXISTS scheduled_rides (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id     UUID NOT NULL REFERENCES passengers(id),
  service_type     VARCHAR(20) NOT NULL,
  pickup_address   TEXT NOT NULL,
  pickup_location  GEOGRAPHY(POINT, 4326) NOT NULL,
  dropoff_address  TEXT NOT NULL,
  dropoff_location GEOGRAPHY(POINT, 4326) NOT NULL,
  scheduled_at     TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'dispatching', 'assigned', 'cancelled', 'completed')),
  ride_id       UUID REFERENCES rides(id),
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_rides_passenger ON scheduled_rides (passenger_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_rides_scheduled ON scheduled_rides (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_rides_status    ON scheduled_rides (status);

CREATE OR REPLACE TRIGGER scheduled_rides_updated_at
  BEFORE UPDATE ON scheduled_rides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────
-- CALIFICACIONES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ratings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id    UUID NOT NULL REFERENCES rides(id),
  rater_id   UUID NOT NULL REFERENCES users(id),
  rated_id   UUID NOT NULL REFERENCES users(id),
  rater_role VARCHAR(20) NOT NULL CHECK (rater_role IN ('passenger', 'driver')),
  score      INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment    TEXT,
  punctuality_score  INT CHECK (punctuality_score  BETWEEN 1 AND 5),
  driving_score      INT CHECK (driving_score      BETWEEN 1 AND 5),
  friendliness_score INT CHECK (friendliness_score BETWEEN 1 AND 5),
  cleanliness_score  INT CHECK (cleanliness_score  BETWEEN 1 AND 5),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(ride_id, rater_role)
);

CREATE INDEX IF NOT EXISTS idx_ratings_ride  ON ratings (ride_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rated ON ratings (rated_id);

-- ────────────────────────────────────────────────────────────
-- GANANCIAS, RETIROS Y REFERIDOS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_earnings (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id    UUID NOT NULL REFERENCES drivers(id),
  ride_id      UUID REFERENCES rides(id),
  type         VARCHAR(30) NOT NULL
    CHECK (type IN ('ride', 'referral_bonus', 'performance_bonus', 'quality_bonus', 'correction')),
  gross_amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_amount   DECIMAL(10,2) NOT NULL,
  description  TEXT,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver  ON driver_earnings (driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_type    ON driver_earnings (type);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_created ON driver_earnings (created_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_withdrawals_driver ON driver_withdrawals (driver_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON driver_withdrawals (status);

CREATE TABLE IF NOT EXISTS referrals (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_driver_id    UUID NOT NULL REFERENCES drivers(id),
  referred_driver_id    UUID NOT NULL REFERENCES drivers(id),
  bonus_amount          DECIMAL(10,2) NOT NULL DEFAULT 600.00,
  referred_bonus        DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  rides_required        INTEGER NOT NULL DEFAULT 50,
  rides_completed       INTEGER NOT NULL DEFAULT 0,
  first_ride_bonus_paid BOOLEAN NOT NULL DEFAULT false,
  status                VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'paid')),
  completed_at TIMESTAMP,
  paid_at      TIMESTAMP,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(referrer_driver_id, referred_driver_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_driver_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals (referred_driver_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status   ON referrals (status);

-- ────────────────────────────────────────────────────────────
-- NOTIFICACIONES, SOS Y PAGOS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  platform   VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens (user_id);

CREATE TABLE IF NOT EXISTS sos_events (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id           UUID REFERENCES rides(id),
  triggered_by      UUID NOT NULL REFERENCES users(id),
  triggered_by_role VARCHAR(20) NOT NULL CHECK (triggered_by_role IN ('passenger', 'driver')),
  location          GEOGRAPHY(POINT, 4326),
  address_at_trigger TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'resolved', 'false_alarm')),
  notes       TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_events_status    ON sos_events (status);
CREATE INDEX IF NOT EXISTS idx_sos_events_triggered ON sos_events (triggered_by);
CREATE INDEX IF NOT EXISTS idx_sos_events_created   ON sos_events (created_at DESC);

CREATE TABLE IF NOT EXISTS passenger_payment_methods (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id             UUID NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR(100) NOT NULL,
  brand                    VARCHAR(20),
  last4                    CHAR(4),
  exp_month                INTEGER,
  exp_year                 INTEGER,
  is_default               BOOLEAN NOT NULL DEFAULT false,
  created_at               TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(passenger_id, stripe_payment_method_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_passenger ON passenger_payment_methods (passenger_id);

CREATE TABLE IF NOT EXISTS notification_campaigns (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID NOT NULL REFERENCES users(id),
  title      VARCHAR(255) NOT NULL,
  body       TEXT NOT NULL,
  target     VARCHAR(100) NOT NULL,
  sent_count INTEGER NOT NULL DEFAULT 0,
  status     VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  sent_at    TIMESTAMP
);

CREATE TABLE IF NOT EXISTS driver_warnings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id  UUID NOT NULL REFERENCES drivers(id),
  issued_by  UUID NOT NULL REFERENCES users(id),
  reason     TEXT NOT NULL,
  ride_id    UUID REFERENCES rides(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_warnings_driver ON driver_warnings (driver_id);

-- ────────────────────────────────────────────────────────────
-- ENTRENAMIENTO DE CONDUCTORES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_modules (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(20)  UNIQUE NOT NULL,
  title           VARCHAR(200) NOT NULL,
  content         JSONB        NOT NULL DEFAULT '[]',
  version         VARCHAR(10)  NOT NULL DEFAULT '1.0',
  passing_score   INTEGER      NOT NULL,
  total_questions INTEGER      NOT NULL DEFAULT 10,
  order_index     INTEGER      NOT NULL,
  is_required     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_questions (
  id             SERIAL PRIMARY KEY,
  module_id      INTEGER NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  question_text  TEXT    NOT NULL,
  option_a       TEXT    NOT NULL,
  option_b       TEXT    NOT NULL,
  option_c       TEXT    NOT NULL,
  option_d       TEXT    NOT NULL,
  correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A','B','C','D')),
  order_index    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS driver_training_progress (
  id        SERIAL PRIMARY KEY,
  driver_id VARCHAR(128) NOT NULL,
  module_id INTEGER NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  status    VARCHAR(20) NOT NULL DEFAULT 'not_started'
              CHECK (status IN ('not_started','reading','passed','failed')),
  attempts   INTEGER NOT NULL DEFAULT 0,
  last_score INTEGER,
  passed_at  TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (driver_id, module_id)
);

CREATE TABLE IF NOT EXISTS driver_quiz_attempts (
  id           SERIAL PRIMARY KEY,
  driver_id    VARCHAR(128) NOT NULL,
  module_id    INTEGER NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  answers      JSONB   NOT NULL,
  score        INTEGER NOT NULL,
  passed       BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_questions_module ON training_questions(module_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_driver  ON driver_training_progress(driver_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_driver      ON driver_quiz_attempts(driver_id, module_id);

CREATE OR REPLACE TRIGGER update_training_modules_updated_at
  BEFORE UPDATE ON training_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER update_driver_training_progress_updated_at
  BEFORE UPDATE ON driver_training_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────
-- FAVORITOS, PROPINAS, CÓDIGOS Y DISPUTAS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS passenger_favorite_destinations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  address      TEXT NOT NULL,
  lat          DECIMAL(10,7) NOT NULL,
  lng          DECIMAL(10,7) NOT NULL,
  icon         VARCHAR(10) DEFAULT '📍',
  use_count    INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (passenger_id, name)
);
CREATE INDEX IF NOT EXISTS idx_fav_dest_passenger ON passenger_favorite_destinations(passenger_id);

CREATE TABLE IF NOT EXISTS passenger_favorite_drivers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  driver_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (passenger_id, driver_id)
);
CREATE INDEX IF NOT EXISTS idx_fav_driver_passenger ON passenger_favorite_drivers(passenger_id);

CREATE TABLE IF NOT EXISTS ride_tips (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id               UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  passenger_id          UUID NOT NULL REFERENCES users(id),
  driver_id             UUID NOT NULL REFERENCES users(id),
  amount                DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  stripe_payment_intent VARCHAR(255),
  status                VARCHAR(20) DEFAULT 'completed',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ride_id)
);
CREATE INDEX IF NOT EXISTS idx_tips_driver ON ride_tips(driver_id);

CREATE TABLE IF NOT EXISTS promo_codes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             VARCHAR(30) NOT NULL UNIQUE,
  description      TEXT,
  discount_percent INT NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  max_uses         INT DEFAULT NULL,
  uses_count       INT DEFAULT 0,
  expires_at       TIMESTAMPTZ DEFAULT NULL,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_code_uses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_id     UUID NOT NULL REFERENCES promo_codes(id),
  passenger_id UUID NOT NULL REFERENCES users(id),
  ride_id      UUID REFERENCES rides(id),
  used_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (promo_id, passenger_id)
);

CREATE TABLE IF NOT EXISTS ride_disputes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id       UUID NOT NULL REFERENCES rides(id),
  reporter_id   UUID NOT NULL REFERENCES users(id),
  reporter_role VARCHAR(20) NOT NULL,
  reason        VARCHAR(100) NOT NULL,
  description   TEXT,
  status        VARCHAR(20) DEFAULT 'open',
  resolution    TEXT,
  resolved_by   UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_disputes_ride     ON ride_disputes(ride_id);
CREATE INDEX IF NOT EXISTS idx_disputes_reporter ON ride_disputes(reporter_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status   ON ride_disputes(status);

CREATE TABLE IF NOT EXISTS ride_stops (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id     UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  address     TEXT NOT NULL,
  lat         DECIMAL(10,7) NOT NULL,
  lng         DECIMAL(10,7) NOT NULL,
  arrived_at  TIMESTAMPTZ,
  UNIQUE (ride_id, order_index)
);

-- ────────────────────────────────────────────────────────────
-- ACCESIBILIDAD Y DOCUMENTOS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS passenger_accessibility_profiles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  wheelchair          BOOLEAN DEFAULT FALSE,
  walker              BOOLEAN DEFAULT FALSE,
  white_cane          BOOLEAN DEFAULT FALSE,
  service_animal      BOOLEAN DEFAULT FALSE,
  oxygen_support      BOOLEAN DEFAULT FALSE,
  hearing_impaired    BOOLEAN DEFAULT FALSE,
  visual_impaired     BOOLEAN DEFAULT FALSE,
  cognitive_support   BOOLEAN DEFAULT FALSE,
  extra_time_boarding BOOLEAN DEFAULT FALSE,
  notes               TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_document_alerts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type VARCHAR(30) NOT NULL,
  expires_at    DATE NOT NULL,
  alerted_30d   BOOLEAN DEFAULT FALSE,
  alerted_7d    BOOLEAN DEFAULT FALSE,
  alerted_1d    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (driver_id, document_type)
);
CREATE INDEX IF NOT EXISTS idx_doc_alerts_driver ON driver_document_alerts(driver_id);

-- ────────────────────────────────────────────────────────────
-- RECORDATORIOS Y SUSCRIPCIONES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scheduled_reminders (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id    UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id),
  remind_at  TIMESTAMPTZ NOT NULL,
  sent       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ride_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON scheduled_reminders(remind_at) WHERE sent = FALSE;

CREATE TABLE IF NOT EXISTS passenger_subscriptions (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan                   VARCHAR(30) NOT NULL DEFAULT 'monthly',
  price_usd              DECIMAL(8,2) NOT NULL DEFAULT 29.99,
  discount_percent       INT NOT NULL DEFAULT 15,
  stripe_subscription_id VARCHAR(100) UNIQUE,
  status                 VARCHAR(20) NOT NULL DEFAULT 'active',
  current_period_start   TIMESTAMPTZ,
  current_period_end     TIMESTAMPTZ,
  cancelled_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (passenger_id)
);
CREATE INDEX IF NOT EXISTS idx_sub_passenger ON passenger_subscriptions(passenger_id);
CREATE INDEX IF NOT EXISTS idx_sub_status    ON passenger_subscriptions(status);

-- ────────────────────────────────────────────────────────────
-- CLÍNICAS, VIAJES RECURRENTES Y FACTURAS MÉDICAS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinic_accounts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(200) NOT NULL,
  address       TEXT,
  contact_name  VARCHAR(100),
  contact_email VARCHAR(200) UNIQUE,
  contact_phone VARCHAR(20),
  billing_code  VARCHAR(50),
  is_active     BOOLEAN DEFAULT TRUE,
  api_key       VARCHAR(100) UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clinic_ride_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID NOT NULL REFERENCES clinic_accounts(id),
  passenger_id    UUID REFERENCES users(id),
  patient_name    VARCHAR(200) NOT NULL,
  patient_phone   VARCHAR(20),
  pickup_address  TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  service_type    VARCHAR(20) DEFAULT 'accessible',
  notes           TEXT,
  diagnosis_code  VARCHAR(20),
  ride_id         UUID REFERENCES rides(id),
  status          VARCHAR(20) DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clinic_requests_clinic ON clinic_ride_requests(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_requests_status ON clinic_ride_requests(status);

CREATE TABLE IF NOT EXISTS recurring_rides (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname        VARCHAR(100),
  pickup_address  TEXT NOT NULL,
  pickup_lat      DECIMAL(10,7),
  pickup_lng      DECIMAL(10,7),
  dropoff_address TEXT NOT NULL,
  dropoff_lat     DECIMAL(10,7),
  dropoff_lng     DECIMAL(10,7),
  service_type    VARCHAR(20) DEFAULT 'standard',
  days_of_week    INT[] NOT NULL,
  time_of_day     TIME NOT NULL,
  state_code      CHAR(2) DEFAULT 'DC',
  is_active       BOOLEAN DEFAULT TRUE,
  advance_hours   INT DEFAULT 2,
  last_created_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recurring_passenger ON recurring_rides(passenger_id);
CREATE INDEX IF NOT EXISTS idx_recurring_active    ON recurring_rides(is_active, days_of_week);

CREATE TABLE IF NOT EXISTS medical_invoices (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id        UUID NOT NULL REFERENCES rides(id),
  passenger_id   UUID NOT NULL REFERENCES users(id),
  clinic_id      UUID REFERENCES clinic_accounts(id),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  diagnosis_code VARCHAR(20),
  service_code   VARCHAR(20) DEFAULT 'A0100',
  amount_usd     DECIMAL(10,2) NOT NULL,
  insurance_type VARCHAR(30),
  member_id      VARCHAR(50),
  status         VARCHAR(20) DEFAULT 'draft',
  pdf_url        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoice_ride      ON medical_invoices(ride_id);
CREATE INDEX IF NOT EXISTS idx_invoice_passenger ON medical_invoices(passenger_id);

-- ────────────────────────────────────────────────────────────
-- INCIDENTES, RACHA Y LISTA DE ESPERA
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ride_incidents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id       UUID NOT NULL REFERENCES rides(id),
  reporter_id   UUID NOT NULL REFERENCES users(id),
  reporter_role VARCHAR(20) NOT NULL,
  incident_type VARCHAR(50) NOT NULL,
  description   TEXT,
  lat           DECIMAL(10,7),
  lng           DECIMAL(10,7),
  status        VARCHAR(20) DEFAULT 'open',
  admin_notes   TEXT,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_incidents_ride   ON ride_incidents(ride_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON ride_incidents(status);

CREATE TABLE IF NOT EXISTS driver_streaks (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  current_streak       INT DEFAULT 0,
  best_streak          INT DEFAULT 0,
  last_ride_at         TIMESTAMPTZ,
  total_streak_bonuses DECIMAL(10,2) DEFAULT 0,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_streak_driver ON driver_streaks(driver_id);

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
CREATE INDEX IF NOT EXISTS idx_waitlist_passenger ON ride_waitlist(passenger_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_active    ON ride_waitlist(expires_at) WHERE notified = FALSE;
