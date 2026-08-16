-- Ciclo de fidelidad del pasajero: cada 8 viajes completados, el octavo recibe descuento.
-- El viaje 8 (con descuento) NO cuenta como viaje 1 del siguiente ciclo.
-- loyalty_cycle_rides: posición en el ciclo actual (0–6 = viajes regulares, 7 = el 8vo ride → descuento)

ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS loyalty_cycle_rides INT NOT NULL DEFAULT 0;

-- Inicializar desde total_rides existentes para no resetear el progreso de pasajeros actuales
UPDATE passengers
  SET loyalty_cycle_rides = COALESCE(total_rides, 0) % 8
  WHERE loyalty_cycle_rides = 0;

-- Asegurar que el valor esté en rango válido
UPDATE passengers SET loyalty_cycle_rides = 0 WHERE loyalty_cycle_rides < 0 OR loyalty_cycle_rides > 7;

-- Índice auxiliar para el conteo de descuentos por conductor (ya existe en 023, este refuerza con 96h)
CREATE INDEX IF NOT EXISTS idx_driver_discount_driver_created ON driver_discount_tracking(driver_id, created_at DESC);
