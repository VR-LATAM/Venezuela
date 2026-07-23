-- ============================================================
-- Migración 020 — Dorso del documento de identidad del pasajero
-- ============================================================

ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS identity_doc_back_url TEXT DEFAULT NULL;

COMMENT ON COLUMN passengers.identity_doc_back_url IS 'URL Firebase Storage del dorso del documento de identidad';
