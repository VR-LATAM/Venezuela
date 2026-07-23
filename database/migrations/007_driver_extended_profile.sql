-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 007: Perfil extendido del conductor
-- Agrega datos personales, seguro, vehículo, certificaciones,
-- idiomas y equipamiento especial
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE drivers
  -- Datos personales
  ADD COLUMN IF NOT EXISTS date_of_birth        DATE,
  ADD COLUMN IF NOT EXISTS ssn_last4            CHAR(4),
  ADD COLUMN IF NOT EXISTS home_address         TEXT,

  -- Vehículo extendido
  ADD COLUMN IF NOT EXISTS vehicle_vin          VARCHAR(17),
  ADD COLUMN IF NOT EXISTS vehicle_seats        INTEGER DEFAULT 4,

  -- Seguro del vehículo
  ADD COLUMN IF NOT EXISTS insurance_company        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS insurance_policy_number  VARCHAR(100),
  -- insurance_expiry ya existe desde migración 003

  -- Idiomas que habla el conductor
  ADD COLUMN IF NOT EXISTS languages            TEXT[]  NOT NULL DEFAULT '{english}',

  -- Equipamiento especial disponible en el vehículo
  -- Valores posibles: wheelchair_ramp, baby_seat, oxygen_support, hearing_loop, visual_aid
  ADD COLUMN IF NOT EXISTS special_equipment    TEXT[]  NOT NULL DEFAULT '{}',

  -- Certificaciones — JSONB para flexibilidad
  -- Formato: {"defensive_driving": {"verified": false, "expiry": null, "doc_url": null}, ...}
  ADD COLUMN IF NOT EXISTS certifications       JSONB   NOT NULL DEFAULT '{}';
