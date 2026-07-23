-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 013: Sistema de certificación por tipo de servicio
-- Vincula módulos de entrenamiento a tipos de servicio.
-- Un conductor solo puede ofrecer un servicio si aprobó su examen.
-- ═══════════════════════════════════════════════════════════════

-- Tipos de servicio válidos en la plataforma
CREATE TYPE service_type_enum AS ENUM (
  'standard',
  'executive',
  'accessible',
  'scheduled'
);

-- Agregar columna service_type a training_modules
-- NULL = módulo prerequisito (aplica a todos los servicios)
ALTER TABLE training_modules
  ADD COLUMN service_type service_type_enum NULL,
  ADD COLUMN is_prerequisite BOOLEAN NOT NULL DEFAULT FALSE;

-- Certificaciones del conductor por tipo de servicio
-- Se inserta automáticamente cuando el conductor aprueba el examen del módulo
CREATE TABLE driver_service_certifications (
  id            SERIAL PRIMARY KEY,
  driver_id     VARCHAR(128)       NOT NULL,
  service_type  service_type_enum  NOT NULL,
  certified_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ        NOT NULL DEFAULT (NOW() + INTERVAL '1 year'),
  is_active     BOOLEAN            NOT NULL DEFAULT TRUE,
  UNIQUE (driver_id, service_type)
);

CREATE INDEX idx_service_cert_driver ON driver_service_certifications(driver_id);
CREATE INDEX idx_service_cert_active ON driver_service_certifications(driver_id, is_active);

-- Vista útil: certificaciones vigentes por conductor
CREATE VIEW active_driver_certifications AS
  SELECT driver_id, service_type, certified_at, expires_at
  FROM driver_service_certifications
  WHERE is_active = TRUE AND expires_at > NOW();
