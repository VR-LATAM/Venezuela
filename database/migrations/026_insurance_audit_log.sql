-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 026: Auditoría de seguro — timestamps y log GPS
-- Requerido por aseguradoras TNC para determinar qué póliza cubre
-- cada accidente: personal del conductor vs. corporativa $1M.
-- ═══════════════════════════════════════════════════════════════

-- 1. Timestamp exacto de cuándo el conductor se conectó (fue "online")
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS online_since TIMESTAMP;

-- 2. Log histórico de posición GPS durante viajes activos
--    Se guarda cada actualización mientras ride_id no sea NULL.
--    Retención: 3 años (suficiente para reclamaciones de seguro).
CREATE TABLE IF NOT EXISTS driver_location_log (
  id          BIGSERIAL PRIMARY KEY,
  driver_id   UUID        NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  ride_id     UUID        REFERENCES rides(id) ON DELETE SET NULL,
  latitude    DECIMAL(10, 7) NOT NULL,
  longitude   DECIMAL(10, 7) NOT NULL,
  heading     DECIMAL(6, 2),
  speed       DECIMAL(6, 2),
  recorded_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loc_log_driver  ON driver_location_log (driver_id, recorded_at DESC);
CREATE INDEX idx_loc_log_ride    ON driver_location_log (ride_id, recorded_at ASC);
CREATE INDEX idx_loc_log_time    ON driver_location_log (recorded_at DESC);
