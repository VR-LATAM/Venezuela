-- ============================================================
-- Migración 021 — Agregar 'family' al CHECK constraint de service_type
-- El tipo 'family' existía en el código pero faltaba en la restricción
-- de la tabla rides, causando error al solicitar este servicio.
-- ============================================================

ALTER TABLE rides
  DROP CONSTRAINT IF EXISTS rides_service_type_check;

ALTER TABLE rides
  ADD CONSTRAINT rides_service_type_check
  CHECK (service_type IN ('standard', 'family', 'executive', 'accessible', 'scheduled', 'hourly'));
