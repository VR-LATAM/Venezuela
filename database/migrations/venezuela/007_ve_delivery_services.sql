/* ──────────────────────────────────────────────────────────────────
   Migración VE-007 — Servicios de delivery: Encomienda, Pick-Up, Plataforma
   ────────────────────────────────────────────────────────────────── */

/* Ampliar el CHECK constraint de rides.service_type */
ALTER TABLE rides DROP CONSTRAINT IF EXISTS rides_service_type_check;

ALTER TABLE rides
  ADD CONSTRAINT rides_service_type_check
  CHECK (service_type IN (
    'standard', 'family', 'executive', 'accessible',
    'scheduled', 'hourly', 'wait_and_return',
    'motorcycle', 'sedan', 'suv',
    'encomienda', 'pickup', 'plataforma'
  ));

/* Columnas de encomienda/delivery en rides */
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS package_description VARCHAR(200),
  ADD COLUMN IF NOT EXISTS package_size        VARCHAR(20)
    CHECK (package_size IN ('small', 'medium', 'large')),
  ADD COLUMN IF NOT EXISTS recipient_name      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS recipient_phone     VARCHAR(30);

/* Tipos de vehículo para Pick-Up y Plataforma */
INSERT INTO ve_vehicle_types (code, name, weekly_fee_usd)
VALUES
  ('pickup',     'Pick-Up',     35.00),
  ('plataforma', 'Plataforma',  40.00)
ON CONFLICT (code) DO NOTHING;
