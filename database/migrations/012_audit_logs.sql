-- ============================================================
-- Migración 012 — Audit Logs
-- Registro de acciones administrativas y operaciones sensibles
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event       VARCHAR(100)  NOT NULL,
  actor_id    UUID          REFERENCES users(id) ON DELETE SET NULL,
  target_id   UUID,
  target_type VARCHAR(50),
  metadata    JSONB         DEFAULT '{}',
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor   ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_event   ON audit_logs(event);
CREATE INDEX idx_audit_logs_target  ON audit_logs(target_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
