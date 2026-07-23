-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- Migración 008: Preferencias del conductor
-- Agrega campos de salud, disponibilidad y equipamiento adicional
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS smokes                  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS long_distance_available BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_exam_expiry      DATE;

-- Nota: dashcam, usb_charger y wifi se guardan en el array special_equipment existente
-- Nota: examen médico se guarda en certifications JSONB existente (clave 'medical_exam')
