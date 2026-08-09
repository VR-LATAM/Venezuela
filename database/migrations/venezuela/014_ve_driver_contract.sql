ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS contract_signed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_signature  TEXT;
