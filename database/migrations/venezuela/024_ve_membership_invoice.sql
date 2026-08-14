ALTER TABLE users
  ADD COLUMN IF NOT EXISTS cedula VARCHAR(20);

ALTER TABLE driver_memberships
  ADD COLUMN IF NOT EXISTS invoice_number       TEXT,
  ADD COLUMN IF NOT EXISTS invoice_rate_ves     NUMERIC(18,6),
  ADD COLUMN IF NOT EXISTS invoice_amount_ves   NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS invoice_iva_ves      NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS invoice_total_ves    NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS invoice_generated_at TIMESTAMPTZ;

CREATE SEQUENCE IF NOT EXISTS membership_invoice_seq START WITH 1;
