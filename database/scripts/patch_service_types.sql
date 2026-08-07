-- ============================================================
-- PARCHE: Cambiar tipos de servicio a Motocicleta / Sedán / SUV
-- Correr en Supabase SQL Editor UNA SOLA VEZ
-- ============================================================

/* 1. Añadir columnas nuevas de multiplicadores a us_states */
ALTER TABLE us_states
  ADD COLUMN IF NOT EXISTS motorcycle_multiplier DECIMAL(3,2) NOT NULL DEFAULT 0.75,
  ADD COLUMN IF NOT EXISTS suv_multiplier        DECIMAL(3,2) NOT NULL DEFAULT 1.30;

/* 2. Actualizar el CHECK constraint de rides.service_type */
ALTER TABLE rides DROP CONSTRAINT IF EXISTS rides_service_type_check;
ALTER TABLE rides
  ADD CONSTRAINT rides_service_type_check
  CHECK (service_type IN ('motorcycle', 'sedan', 'suv', 'scheduled', 'hourly', 'wait_and_return'));

/* 3. Cambiar el default de drivers.services */
ALTER TABLE drivers ALTER COLUMN services SET DEFAULT '{sedan}';

/* 4. Actualizar conductores existentes que tengan '{standard}' → '{sedan}' */
UPDATE drivers
  SET services = ARRAY_REPLACE(services, 'standard', 'sedan')
  WHERE 'standard' = ANY(services);

UPDATE drivers
  SET services = ARRAY_REPLACE(services, 'family', 'suv')
  WHERE 'family' = ANY(services);

UPDATE drivers
  SET services = ARRAY_REPLACE(services, 'executive', 'suv')
  WHERE 'executive' = ANY(services);

UPDATE drivers
  SET services = ARRAY_REPLACE(services, 'accessible', 'sedan')
  WHERE 'accessible' = ANY(services);

UPDATE drivers
  SET services = ARRAY_REPLACE(services, 'military', 'sedan')
  WHERE 'military' = ANY(services);

/* 5. Actualizar viajes existentes (solo los que estén en estado no-final) */
UPDATE rides SET service_type = 'sedan'
  WHERE service_type IN ('standard', 'accessible', 'military', 'medical', 'dialysis')
    AND status NOT IN ('completed', 'cancelled_passenger', 'cancelled_driver', 'no_driver_found');

UPDATE rides SET service_type = 'suv'
  WHERE service_type IN ('family', 'executive')
    AND status NOT IN ('completed', 'cancelled_passenger', 'cancelled_driver', 'no_driver_found');
