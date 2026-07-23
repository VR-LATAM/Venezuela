-- ============================================================
-- Migración 023 — Wait & Return + Hourly Ride
-- Nuevos tipos de servicio: wait_and_return (sin licencia especial)
-- Hourly Ride ya existía pero se activa solo para TX y FL
-- ============================================================

-- 1. Ampliar CHECK constraint de service_type en rides
ALTER TABLE rides DROP CONSTRAINT IF EXISTS rides_service_type_check;
ALTER TABLE rides ADD CONSTRAINT rides_service_type_check
  CHECK (service_type IN (
    'standard', 'family', 'executive', 'accessible',
    'scheduled', 'hourly', 'wait_and_return'
  ));

-- 2. Columnas adicionales en rides para Wait & Return y Hourly
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS return_address         TEXT,
  ADD COLUMN IF NOT EXISTS return_location        GEOGRAPHY(POINT, 4326),
  ADD COLUMN IF NOT EXISTS estimated_wait_minutes INTEGER  DEFAULT 60,
  ADD COLUMN IF NOT EXISTS wait_started_at        TIMESTAMP,
  ADD COLUMN IF NOT EXISTS wait_ended_at          TIMESTAMP,
  ADD COLUMN IF NOT EXISTS wait_minutes           INTEGER  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wait_fare              DECIMAL(8,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS hourly_package_hours   INTEGER  DEFAULT NULL;

-- 3. Columnas en us_states para tarifas y habilitación por estado
ALTER TABLE us_states
  ADD COLUMN IF NOT EXISTS wait_per_minute_rate    DECIMAL(6,4) NOT NULL DEFAULT 0.30,
  ADD COLUMN IF NOT EXISTS wait_and_return_enabled BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hourly_ride_enabled     BOOLEAN      NOT NULL DEFAULT false;

-- 4. Texas — activar ambos servicios con tarifas de mercado
UPDATE us_states SET
  wait_per_minute_rate    = 0.30,
  hourly_2h_price         = 50.00,
  hourly_4h_price         = 90.00,
  hourly_8h_price         = 160.00,
  wait_and_return_enabled = true,
  hourly_ride_enabled     = true
WHERE code = 'TX';

-- 5. Florida — activar ambos servicios con tarifas ligeramente mayores
UPDATE us_states SET
  wait_per_minute_rate    = 0.35,
  hourly_2h_price         = 55.00,
  hourly_4h_price         = 100.00,
  hourly_8h_price         = 175.00,
  wait_and_return_enabled = true,
  hourly_ride_enabled     = true
WHERE code = 'FL';
