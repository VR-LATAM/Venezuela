-- Diseñado por: Edward Labrador
-- Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- Migración 036 — Incident Report + Re-dispatch
-- Agrega estado 'incident' a rides y columna rescue_for_ride_id
-- ═══════════════════════════════════════════════════════════════

-- 1. Ampliar el CHECK de status en rides para incluir 'incident'
ALTER TABLE rides DROP CONSTRAINT IF EXISTS rides_status_check;
ALTER TABLE rides ADD CONSTRAINT rides_status_check CHECK (status IN (
  'searching',
  'driver_assigned',
  'driver_arriving',
  'driver_arrived',
  'in_progress',
  'completed',
  'cancelled_passenger',
  'cancelled_driver',
  'no_driver_found',
  'incident'
));

-- 2. Columna para enlazar el viaje de rescate con el viaje original
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS rescue_for_ride_id UUID REFERENCES rides(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rides_rescue ON rides(rescue_for_ride_id) WHERE rescue_for_ride_id IS NOT NULL;
