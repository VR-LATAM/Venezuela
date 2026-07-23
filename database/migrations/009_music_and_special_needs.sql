-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- Migración 009: Preferencias musicales del conductor
--               + Perfil de necesidades especiales del pasajero
-- ═══════════════════════════════════════════════════════════════

-- Conductor: preferencia musical
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS music_preference VARCHAR(50) NOT NULL DEFAULT 'any',
  ADD COLUMN IF NOT EXISTS music_artist     VARCHAR(100);

-- Pasajero: perfil de necesidades especiales (JSONB flexible)
ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS special_needs JSONB NOT NULL DEFAULT '{}';
