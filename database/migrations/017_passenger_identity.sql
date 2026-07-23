-- ============================================================
-- Migración 017 — Documento de identidad del pasajero
-- Foto del ID gubernamental (licencia, pasaporte, cédula estatal)
-- Obligatorio para verificar identidad antes del primer viaje
-- ============================================================

ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS identity_doc_url  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN passengers.identity_doc_url  IS 'URL Firebase Storage del documento de identidad (frente)';
COMMENT ON COLUMN passengers.identity_verified IS 'true cuando el admin aprueba el documento';
