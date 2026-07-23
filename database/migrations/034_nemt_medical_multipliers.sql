-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 034: Multiplicadores NEMT — Alineación con mercado médico
--
-- Contexto: VeronaRide es primariamente NEMT (Non-Emergency Medical
-- Transportation). Los precios anteriores estaban calibrados vs Uber/Lyft
-- (rideshare estándar). Esta migración alinea los servicios médicos con
-- las tarifas reales del mercado NEMT (SafeRide, Roundtrip, ModivCare).
--
-- Cambios:
--   1. Nueva columna medical_multiplier  → 1.30x (postpartum, postop, embarazadas)
--   2. Nueva columna dialysis_multiplier → 1.25x (diálisis — descuento fidelidad 3x/sem)
--   3. accessible_multiplier 1.40 → 2.00  (WAV/silla de ruedas — mercado cobra $3-5/mi)
--
-- Referencia de mercado NEMT (tarifa ambulatoria, viaje 10 mi / 20 min):
--   SafeRide Health:    ~$20–25   →  VeronaRide medical TX: ~$23  ✓
--   Roundtrip:          ~$22–30   →  VeronaRide medical TX: ~$23  ✓
--   WAV specialists:    $3–5/mi   →  VeronaRide accessible TX: ~$2.30/mi (competitivo)
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────
-- 1. Nuevas columnas de multiplicadores médicos
-- ─────────────────────────────────────
ALTER TABLE us_states
  ADD COLUMN IF NOT EXISTS medical_multiplier  DECIMAL(3,2) NOT NULL DEFAULT 1.30,
  ADD COLUMN IF NOT EXISTS dialysis_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.25;

-- ─────────────────────────────────────
-- 2. Subir accessible_multiplier 1.40 → 2.00 en todos los estados
--    Antes: 1.40x — en línea con rideshare premium
--    Ahora: 2.00x — en línea con mercado WAV/NEMT especializado
-- ─────────────────────────────────────
UPDATE us_states SET accessible_multiplier = 2.00;

-- ─────────────────────────────────────
-- 3. Confirmar valores de los 3 multiplicadores para todos los estados
--    (medical y dialysis ya tienen DEFAULT correcto; accessible_multiplier
--    ya se actualizó arriba — esto es un guard explícito para producción)
-- ─────────────────────────────────────
UPDATE us_states SET
  medical_multiplier    = 1.30,
  dialysis_multiplier   = 1.25,
  accessible_multiplier = 2.00;

-- ─────────────────────────────────────
-- 4. Agregar 'medical' y 'dialysis' al ENUM service_type_enum
--    (usado en driver_service_certifications y training_modules)
-- ─────────────────────────────────────
ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'medical';
ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'dialysis';

-- ─────────────────────────────────────
-- 5. Actualizar CHECK constraint de la tabla rides
--    para aceptar los nuevos tipos de servicio médico
-- ─────────────────────────────────────
ALTER TABLE rides DROP CONSTRAINT IF EXISTS rides_service_type_check;
ALTER TABLE rides ADD CONSTRAINT rides_service_type_check
  CHECK (service_type IN (
    'standard', 'family', 'executive', 'accessible',
    'military', 'scheduled', 'hourly', 'wait_and_return',
    'medical', 'dialysis'
  ));
