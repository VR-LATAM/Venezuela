-- Ciclo de fidelidad del pasajero: cada 8 viajes a partir del 4to, el 8vo recibe descuento.
-- Los primeros 3 viajes son la promo de bienvenida y NO cuentan para el ciclo.
-- loyalty_cycle_rides: posición en el ciclo actual (0–6 = viajes regulares, 7 = el 8vo → descuento)
-- Viaje 4 = posición 1, viaje 11 = posición 8 (primer descuento de fidelidad)

ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS loyalty_cycle_rides INT NOT NULL DEFAULT 0;

-- Inicializar para pasajeros existentes:
-- Los primeros 3 viajes no cuentan, el ciclo comienza desde el viaje 4
UPDATE passengers
  SET loyalty_cycle_rides = CASE
    WHEN COALESCE(total_rides, 0) <= 3 THEN 0
    ELSE (COALESCE(total_rides, 0) - 3) % 8
  END;

-- Asegurar rango válido
UPDATE passengers SET loyalty_cycle_rides = 0 WHERE loyalty_cycle_rides < 0 OR loyalty_cycle_rides > 7;

-- Índice auxiliar para el conteo de descuentos por conductor (ya existe en 023, este refuerza con 96h)
CREATE INDEX IF NOT EXISTS idx_driver_discount_driver_created ON driver_discount_tracking(driver_id, created_at DESC);
