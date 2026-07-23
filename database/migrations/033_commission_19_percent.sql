-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 033: Actualizar comisión de plataforma 15% → 19%
-- Tiers de lealtad: 14%→18% (silver), 13%→17% (elite)
-- Justificación: margen neto sube de ~6.5% a ~10.5%
-- Conductores siguen ganando 81% vs 70-75% con Uber/Lyft
-- ═══════════════════════════════════════════════════════════════

UPDATE us_states
SET platform_commission_percent = 19.00;
