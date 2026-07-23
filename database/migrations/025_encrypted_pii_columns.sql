-- ═══════════════════════════════════════════════════════════════
-- 025_encrypted_pii_columns.sql
-- Columnas encriptadas para PII de conductores
-- La encriptación se hace en la capa de aplicación (AES-256-GCM).
-- Los campos originales se mantienen NULL tras la migración;
-- se pueden eliminar en una migración futura una vez confirmado.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS date_of_birth_enc  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS home_address_enc   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS license_number_enc TEXT DEFAULT NULL;

COMMENT ON COLUMN drivers.date_of_birth_enc  IS 'AES-256-GCM encrypted. Format: iv_b64.tag_b64.data_b64';
COMMENT ON COLUMN drivers.home_address_enc   IS 'AES-256-GCM encrypted. Format: iv_b64.tag_b64.data_b64';
COMMENT ON COLUMN drivers.license_number_enc IS 'AES-256-GCM encrypted. Format: iv_b64.tag_b64.data_b64';
