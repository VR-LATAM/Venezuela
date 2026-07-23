-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 031: Ajuste tarifas Texas
-- base_fare: 1.75 → 1.55 (reducción psicológica del cargo base)
-- executive_multiplier: 1.80 → 1.70 (evitar sobreprecio vs Uber Black)
-- ═══════════════════════════════════════════════════════════════

UPDATE us_states SET
  base_fare            = 1.55,
  executive_multiplier = 1.70
WHERE code = 'TX';
