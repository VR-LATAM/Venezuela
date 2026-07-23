-- ============================================================
-- Migración 014 — Nuevas funcionalidades
-- Destinos favoritos, conductores favoritos, propinas,
-- códigos de descuento, disputas, multi-parada
-- ============================================================

-- Destinos favoritos del pasajero
CREATE TABLE IF NOT EXISTS passenger_favorite_destinations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,         -- "Casa", "Clínica", "Trabajo"
  address      TEXT NOT NULL,
  lat          DECIMAL(10, 7) NOT NULL,
  lng          DECIMAL(10, 7) NOT NULL,
  icon         VARCHAR(10) DEFAULT '📍',
  use_count    INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (passenger_id, name)
);
CREATE INDEX idx_fav_dest_passenger ON passenger_favorite_destinations(passenger_id);

-- Conductores favoritos del pasajero
CREATE TABLE IF NOT EXISTS passenger_favorite_drivers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  driver_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note         TEXT,                           -- nota del pasajero sobre el conductor
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (passenger_id, driver_id)
);
CREATE INDEX idx_fav_driver_passenger ON passenger_favorite_drivers(passenger_id);

-- Propinas al conductor
CREATE TABLE IF NOT EXISTS ride_tips (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id                UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  passenger_id           UUID NOT NULL REFERENCES users(id),
  driver_id              UUID NOT NULL REFERENCES users(id),
  amount                 DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  stripe_payment_intent  VARCHAR(255),
  status                 VARCHAR(20) DEFAULT 'completed',
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ride_id)       -- una sola propina por viaje
);
CREATE INDEX idx_tips_driver ON ride_tips(driver_id);

-- Códigos de descuento
CREATE TABLE IF NOT EXISTS promo_codes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             VARCHAR(30) NOT NULL UNIQUE,
  description      TEXT,
  discount_percent INT NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  max_uses         INT DEFAULT NULL,           -- NULL = usos ilimitados
  uses_count       INT DEFAULT 0,
  expires_at       TIMESTAMPTZ DEFAULT NULL,   -- NULL = no vence
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Usos de códigos por pasajero (evita doble uso)
CREATE TABLE IF NOT EXISTS promo_code_uses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_id     UUID NOT NULL REFERENCES promo_codes(id),
  passenger_id UUID NOT NULL REFERENCES users(id),
  ride_id      UUID REFERENCES rides(id),
  used_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (promo_id, passenger_id)              -- un código por pasajero
);

-- Disputas de viaje
CREATE TABLE IF NOT EXISTS ride_disputes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id      UUID NOT NULL REFERENCES rides(id),
  reporter_id  UUID NOT NULL REFERENCES users(id),
  reporter_role VARCHAR(20) NOT NULL,          -- 'passenger' | 'driver'
  reason       VARCHAR(100) NOT NULL,
  description  TEXT,
  status       VARCHAR(20) DEFAULT 'open',     -- 'open' | 'reviewing' | 'resolved' | 'closed'
  resolution   TEXT,
  resolved_by  UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ
);
CREATE INDEX idx_disputes_ride     ON ride_disputes(ride_id);
CREATE INDEX idx_disputes_reporter ON ride_disputes(reporter_id);
CREATE INDEX idx_disputes_status   ON ride_disputes(status);

-- Paradas intermedias de un viaje
CREATE TABLE IF NOT EXISTS ride_stops (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id     UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  address     TEXT NOT NULL,
  lat         DECIMAL(10, 7) NOT NULL,
  lng         DECIMAL(10, 7) NOT NULL,
  arrived_at  TIMESTAMPTZ,
  UNIQUE (ride_id, order_index)
);

-- Meta de ganancias diaria del conductor
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS daily_earnings_goal DECIMAL(10,2) DEFAULT NULL;

-- Tasa de aceptación del conductor
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS rides_offered     INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rides_accepted    INT DEFAULT 0;

-- Promo code en el viaje
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS promo_code        VARCHAR(30) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promo_discount    DECIMAL(10,2) DEFAULT 0;

-- Perfil de accesibilidad guardado del pasajero
CREATE TABLE IF NOT EXISTS passenger_accessibility_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  wheelchair      BOOLEAN DEFAULT FALSE,
  walker          BOOLEAN DEFAULT FALSE,
  white_cane      BOOLEAN DEFAULT FALSE,
  service_animal  BOOLEAN DEFAULT FALSE,
  oxygen_support  BOOLEAN DEFAULT FALSE,
  hearing_impaired BOOLEAN DEFAULT FALSE,
  visual_impaired BOOLEAN DEFAULT FALSE,
  cognitive_support BOOLEAN DEFAULT FALSE,
  extra_time_boarding BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Alertas de vencimiento de documentos del conductor
CREATE TABLE IF NOT EXISTS driver_document_alerts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type VARCHAR(30) NOT NULL,  -- 'license' | 'insurance'
  expires_at   DATE NOT NULL,
  alerted_30d  BOOLEAN DEFAULT FALSE,
  alerted_7d   BOOLEAN DEFAULT FALSE,
  alerted_1d   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (driver_id, document_type)
);
CREATE INDEX idx_doc_alerts_driver ON driver_document_alerts(driver_id);
