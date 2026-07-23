-- Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 032: Ajuste tarifas NY y WY según costo de vida
-- Promedio nacional VeronaRide vs Uber: +$2.21 (10 millas / 20 min)
-- NY (costo de vida índice ~125): Uber ~$28.60 → VR $31.25 (+$2.65)
-- WY (costo de vida índice ~93):  Uber ~$15.65 → VR $17.60 (+$1.95)
-- ═══════════════════════════════════════════════════════════════

-- NEW YORK
UPDATE us_states SET
  base_fare            = 3.75,
  price_per_mile       = 1.95,
  price_per_minute     = 0.40,
  min_fare             = 11.00,
  hourly_2h_price      = 105.00,
  hourly_4h_price      = 189.00,
  hourly_8h_price      = 310.00,
  wait_per_minute_rate = 0.50
WHERE code = 'NY';

-- WYOMING
UPDATE us_states SET
  base_fare            = 1.70,
  price_per_mile       = 1.15,
  price_per_minute     = 0.22,
  min_fare             = 6.50,
  hourly_2h_price      = 66.00,
  hourly_4h_price      = 119.00,
  hourly_8h_price      = 193.00,
  wait_per_minute_rate = 0.33
WHERE code = 'WY';
