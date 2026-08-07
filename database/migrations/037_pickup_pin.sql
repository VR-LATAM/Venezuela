-- Migración 037: PIN de verificación de recogida
-- El pasajero recibe un PIN de 4 dígitos al confirmar el viaje.
-- El conductor debe ingresarlo antes de marcar "Start ride".

ALTER TABLE rides ADD COLUMN IF NOT EXISTS pickup_pin VARCHAR(4);

-- Generar PIN para rides existentes sin PIN (solo activos)
UPDATE rides
SET pickup_pin = LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
WHERE pickup_pin IS NULL
  AND status NOT IN ('completed', 'cancelled_passenger', 'cancelled_driver', 'no_driver_found');
