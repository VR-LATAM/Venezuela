-- ============================================================
-- Migración 019 — Autenticación de dos factores (2FA) para admin
-- TOTP compatible con Google Authenticator / Authy
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS totp_secret  TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN users.totp_secret  IS 'Secreto TOTP cifrado — solo para usuarios con rol admin';
COMMENT ON COLUMN users.totp_enabled IS 'true cuando el admin ha verificado y activado el 2FA';
