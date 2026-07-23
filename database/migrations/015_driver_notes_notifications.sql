-- ============================================================
-- Migración 015 — Notas del conductor + contactos emergencia
-- ============================================================

-- Notas del conductor al finalizar el viaje
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS driver_notes TEXT DEFAULT NULL;

-- Email del contacto de emergencia del pasajero (para alertas SOS)
ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS emergency_contact_email VARCHAR(255) DEFAULT NULL;

-- Notificaciones pendientes de recordatorio (viajes programados)
CREATE TABLE IF NOT EXISTS scheduled_reminders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id     UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  remind_at   TIMESTAMPTZ NOT NULL,
  sent        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ride_id, user_id)
);
CREATE INDEX idx_reminders_pending ON scheduled_reminders(remind_at) WHERE sent = FALSE;
