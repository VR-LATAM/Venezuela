-- V-RIDE VENEZUELA — Migración 002
-- 24 estados venezolanos con configuración de tarifas en USD
-- Todos activos desde el inicio — lanzamiento nacional
-- Timezone único: America/Caracas (UTC-4, sin cambio de horario)
-- Tarifas: base $1.00 | $0.64/milla ($0.40/km) | $0.10/min | mín $2.50 | surge 1.3×

CREATE TABLE IF NOT EXISTS us_states (
  id                          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                        CHAR(2)     UNIQUE NOT NULL,
  name                        VARCHAR(100) NOT NULL,
  is_active                   BOOLEAN     NOT NULL DEFAULT false,
  launched_at                 TIMESTAMP,
  base_fare                   DECIMAL(6,2)  NOT NULL DEFAULT 1.00,
  price_per_mile              DECIMAL(6,2)  NOT NULL DEFAULT 0.64,
  price_per_minute            DECIMAL(6,2)  NOT NULL DEFAULT 0.10,
  min_fare                    DECIMAL(6,2)  NOT NULL DEFAULT 2.50,
  surge_multiplier            DECIMAL(3,2)  NOT NULL DEFAULT 1.30,
  platform_commission_percent DECIMAL(5,2)  NOT NULL DEFAULT 19.00,
  executive_multiplier        DECIMAL(3,2)  NOT NULL DEFAULT 1.50,
  accessible_multiplier       DECIMAL(3,2)  NOT NULL DEFAULT 1.40,
  military_multiplier         DECIMAL(3,2)  NOT NULL DEFAULT 1.00,
  medical_multiplier          DECIMAL(3,2)  NOT NULL DEFAULT 1.25,
  dialysis_multiplier         DECIMAL(3,2)  NOT NULL DEFAULT 1.20,
  family_multiplier           DECIMAL(3,2)  NOT NULL DEFAULT 1.30,
  hourly_2h_price             DECIMAL(8,2)  NOT NULL DEFAULT 20.00,
  hourly_4h_price             DECIMAL(8,2)  NOT NULL DEFAULT 35.00,
  hourly_8h_price             DECIMAL(8,2)  NOT NULL DEFAULT 60.00,
  wait_per_minute_rate        DECIMAL(6,2)  NOT NULL DEFAULT 0.10,
  wait_and_return_enabled     BOOLEAN       NOT NULL DEFAULT true,
  timezone                    VARCHAR(50)   NOT NULL DEFAULT 'America/Caracas',
  created_at                  TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMP     NOT NULL DEFAULT NOW()
);

INSERT INTO us_states (code, name, is_active, launched_at, timezone) VALUES
  ('DC', 'Distrito Capital',     true, NOW(), 'America/Caracas'),
  ('AM', 'Amazonas',             true, NOW(), 'America/Caracas'),
  ('AN', 'Anzoátegui',           true, NOW(), 'America/Caracas'),
  ('AP', 'Apure',                true, NOW(), 'America/Caracas'),
  ('AR', 'Aragua',               true, NOW(), 'America/Caracas'),
  ('BA', 'Barinas',              true, NOW(), 'America/Caracas'),
  ('BO', 'Bolívar',              true, NOW(), 'America/Caracas'),
  ('CA', 'Carabobo',             true, NOW(), 'America/Caracas'),
  ('CO', 'Cojedes',              true, NOW(), 'America/Caracas'),
  ('DE', 'Delta Amacuro',        true, NOW(), 'America/Caracas'),
  ('FA', 'Falcón',               true, NOW(), 'America/Caracas'),
  ('GU', 'Guárico',              true, NOW(), 'America/Caracas'),
  ('LG', 'La Guaira',            true, NOW(), 'America/Caracas'),
  ('LA', 'Lara',                 true, NOW(), 'America/Caracas'),
  ('ME', 'Mérida',               true, NOW(), 'America/Caracas'),
  ('MI', 'Miranda',              true, NOW(), 'America/Caracas'),
  ('MO', 'Monagas',              true, NOW(), 'America/Caracas'),
  ('NE', 'Nueva Esparta',        true, NOW(), 'America/Caracas'),
  ('PO', 'Portuguesa',           true, NOW(), 'America/Caracas'),
  ('SU', 'Sucre',                true, NOW(), 'America/Caracas'),
  ('TA', 'Táchira',              true, NOW(), 'America/Caracas'),
  ('TR', 'Trujillo',             true, NOW(), 'America/Caracas'),
  ('YA', 'Yaracuy',              true, NOW(), 'America/Caracas'),
  ('ZU', 'Zulia',                true, NOW(), 'America/Caracas')
ON CONFLICT (code) DO NOTHING;

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
