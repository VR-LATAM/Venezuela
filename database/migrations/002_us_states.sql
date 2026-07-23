-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 002: Tabla de estados de EE.UU.
-- Unidad administrativa principal — NO ciudades
-- Activar un estado = toda ciudad de ese estado puede usar la app
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS us_states (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code             CHAR(2)      UNIQUE NOT NULL,     -- 'TX', 'CA', 'FL', etc.
  name             VARCHAR(100) NOT NULL,             -- 'Texas', 'California', etc.

  -- Control de operaciones: activar estado = toda ciudad de ese estado habilitada
  is_active        BOOLEAN      NOT NULL DEFAULT false,
  launched_at      TIMESTAMP,

  -- Configuración de tarifas específica por estado (costo de vida diferente por estado)
  base_fare                   DECIMAL(6,2)  NOT NULL DEFAULT 3.00,   -- Cargo base por arranque
  price_per_km                DECIMAL(6,2)  NOT NULL DEFAULT 1.20,   -- Por kilómetro recorrido
  price_per_minute            DECIMAL(6,2)  NOT NULL DEFAULT 0.25,   -- Por minuto de viaje
  min_fare                    DECIMAL(6,2)  NOT NULL DEFAULT 6.00,   -- Mínimo por viaje
  surge_multiplier            DECIMAL(3,2)  NOT NULL DEFAULT 1.00,   -- Multiplicador horas pico
  platform_commission_percent DECIMAL(5,2)  NOT NULL DEFAULT 15.00,  -- Comisión plataforma (%) — baja según desempeño del conductor

  -- Tarifas por tipo de servicio (multiplicador sobre tarifa estándar)
  executive_multiplier        DECIMAL(3,2)  NOT NULL DEFAULT 1.80,   -- Ejecutivo ×1.8
  accessible_multiplier       DECIMAL(3,2)  NOT NULL DEFAULT 1.40,   -- Accesible ×1.4

  -- Precios de servicio por horas (USD fijo)
  hourly_2h_price             DECIMAL(8,2)  NOT NULL DEFAULT 45.00,
  hourly_4h_price             DECIMAL(8,2)  NOT NULL DEFAULT 80.00,
  hourly_8h_price             DECIMAL(8,2)  NOT NULL DEFAULT 140.00,

  timezone        VARCHAR(50)  NOT NULL DEFAULT 'America/Chicago',

  created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- INSERTAR LOS 50 ESTADOS DE EE.UU.
-- Texas activo desde el inicio (lanzamiento)
-- Los demás: inactivos, se activan desde el dashboard admin
-- ─────────────────────────────────────────────────────────────
INSERT INTO us_states (code, name, is_active, launched_at, timezone) VALUES
  -- LANZAMIENTO INICIAL
  ('TX', 'Texas',                true,  NOW(), 'America/Chicago'),

  -- EXPANSIÓN FASE 2 (Mes 3-4)
  ('CA', 'California',           false, NULL, 'America/Los_Angeles'),
  ('FL', 'Florida',              false, NULL, 'America/New_York'),

  -- EXPANSIÓN FASE 3 (Mes 6-9)
  ('NY', 'New York',             false, NULL, 'America/New_York'),
  ('IL', 'Illinois',             false, NULL, 'America/Chicago'),
  ('AZ', 'Arizona',              false, NULL, 'America/Phoenix'),
  ('NV', 'Nevada',               false, NULL, 'America/Los_Angeles'),

  -- RESTO DE ESTADOS (Año 2 — expansión nacional completa)
  ('AL', 'Alabama',              false, NULL, 'America/Chicago'),
  ('AK', 'Alaska',               false, NULL, 'America/Anchorage'),
  ('AR', 'Arkansas',             false, NULL, 'America/Chicago'),
  ('CO', 'Colorado',             false, NULL, 'America/Denver'),
  ('CT', 'Connecticut',          false, NULL, 'America/New_York'),
  ('DE', 'Delaware',             false, NULL, 'America/New_York'),
  ('GA', 'Georgia',              false, NULL, 'America/New_York'),
  ('HI', 'Hawaii',               false, NULL, 'Pacific/Honolulu'),
  ('ID', 'Idaho',                false, NULL, 'America/Denver'),
  ('IN', 'Indiana',              false, NULL, 'America/Indiana/Indianapolis'),
  ('IA', 'Iowa',                 false, NULL, 'America/Chicago'),
  ('KS', 'Kansas',               false, NULL, 'America/Chicago'),
  ('KY', 'Kentucky',             false, NULL, 'America/Kentucky/Louisville'),
  ('LA', 'Louisiana',            false, NULL, 'America/Chicago'),
  ('ME', 'Maine',                false, NULL, 'America/New_York'),
  ('MD', 'Maryland',             false, NULL, 'America/New_York'),
  ('MA', 'Massachusetts',        false, NULL, 'America/New_York'),
  ('MI', 'Michigan',             false, NULL, 'America/Detroit'),
  ('MN', 'Minnesota',            false, NULL, 'America/Chicago'),
  ('MS', 'Mississippi',          false, NULL, 'America/Chicago'),
  ('MO', 'Missouri',             false, NULL, 'America/Chicago'),
  ('MT', 'Montana',              false, NULL, 'America/Denver'),
  ('NE', 'Nebraska',             false, NULL, 'America/Chicago'),
  ('NH', 'New Hampshire',        false, NULL, 'America/New_York'),
  ('NJ', 'New Jersey',           false, NULL, 'America/New_York'),
  ('NM', 'New Mexico',           false, NULL, 'America/Denver'),
  ('NC', 'North Carolina',       false, NULL, 'America/New_York'),
  ('ND', 'North Dakota',         false, NULL, 'America/Chicago'),
  ('OH', 'Ohio',                 false, NULL, 'America/New_York'),
  ('OK', 'Oklahoma',             false, NULL, 'America/Chicago'),
  ('OR', 'Oregon',               false, NULL, 'America/Los_Angeles'),
  ('PA', 'Pennsylvania',         false, NULL, 'America/New_York'),
  ('RI', 'Rhode Island',         false, NULL, 'America/New_York'),
  ('SC', 'South Carolina',       false, NULL, 'America/New_York'),
  ('SD', 'South Dakota',         false, NULL, 'America/Chicago'),
  ('TN', 'Tennessee',            false, NULL, 'America/Chicago'),
  ('UT', 'Utah',                 false, NULL, 'America/Denver'),
  ('VT', 'Vermont',              false, NULL, 'America/New_York'),
  ('VA', 'Virginia',             false, NULL, 'America/New_York'),
  ('WA', 'Washington',           false, NULL, 'America/Los_Angeles'),
  ('WV', 'West Virginia',        false, NULL, 'America/New_York'),
  ('WI', 'Wisconsin',            false, NULL, 'America/Chicago'),
  ('WY', 'Wyoming',              false, NULL, 'America/Denver'),

  -- Distrito de Columbia (Washington D.C.)
  ('DC', 'Washington D.C.',      false, NULL, 'America/New_York')

ON CONFLICT (code) DO NOTHING;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER us_states_updated_at
  BEFORE UPDATE ON us_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
