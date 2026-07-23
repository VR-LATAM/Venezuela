-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 006: Tokens push, eventos SOS, logs de auditoría
-- ═══════════════════════════════════════════════════════════════


-- TOKENS PUSH (Firebase Cloud Messaging)
-- Almacena el token FCM de cada dispositivo
CREATE TABLE IF NOT EXISTS push_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  platform   VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, platform)   -- Un token por plataforma por usuario
);

CREATE INDEX idx_push_tokens_user ON push_tokens (user_id);


-- ─────────────────────────────────────────────────────────────
-- EVENTOS SOS
-- Alerta de emergencia — disponible en todo momento durante el viaje
-- Visible como prioridad máxima en el dashboard del admin
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sos_events (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id            UUID REFERENCES rides(id),
  triggered_by       UUID NOT NULL REFERENCES users(id),
  triggered_by_role  VARCHAR(20) NOT NULL CHECK (triggered_by_role IN ('passenger', 'driver')),
  -- Coordenadas exactas en el momento de activar el SOS
  location           GEOGRAPHY(POINT, 4326),
  address_at_trigger TEXT,
  status             VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'resolved', 'false_alarm')),
  notes              TEXT,
  resolved_by        UUID REFERENCES users(id),   -- Admin que resolvió
  resolved_at        TIMESTAMP,
  created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sos_events_status    ON sos_events (status);
CREATE INDEX idx_sos_events_triggered ON sos_events (triggered_by);
CREATE INDEX idx_sos_events_created   ON sos_events (created_at DESC);


-- ─────────────────────────────────────────────────────────────
-- MÉTODOS DE PAGO DE PASAJEROS
-- Los datos de tarjeta NUNCA se almacenan aquí — solo en Stripe
-- Solo guardamos el payment method ID de Stripe
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS passenger_payment_methods (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id            UUID NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR(100) NOT NULL,
  brand                   VARCHAR(20),    -- 'visa', 'mastercard', etc.
  last4                   CHAR(4),        -- Últimos 4 dígitos para mostrar en UI
  exp_month               INTEGER,
  exp_year                INTEGER,
  is_default              BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(passenger_id, stripe_payment_method_id)
);

CREATE INDEX idx_payment_methods_passenger ON passenger_payment_methods (passenger_id);


-- ─────────────────────────────────────────────────────────────
-- LOG DE NOTIFICACIONES MASIVAS (del admin)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_campaigns (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by   UUID NOT NULL REFERENCES users(id),
  title        VARCHAR(255) NOT NULL,
  body         TEXT NOT NULL,
  -- Target: 'all_drivers', 'all_passengers', 'state_drivers:TX', 'state_passengers:TX', etc.
  target       VARCHAR(100) NOT NULL,
  sent_count   INTEGER NOT NULL DEFAULT 0,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  sent_at      TIMESTAMP
);


-- ─────────────────────────────────────────────────────────────
-- LOG DE ADVERTENCIAS A CONDUCTORES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_warnings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id   UUID NOT NULL REFERENCES drivers(id),
  issued_by   UUID NOT NULL REFERENCES users(id),   -- Admin que emite la advertencia
  reason      TEXT NOT NULL,
  ride_id     UUID REFERENCES rides(id),             -- Viaje relacionado (opcional)
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_driver_warnings_driver ON driver_warnings (driver_id);
