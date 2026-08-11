/* V-RIDE VENEZUELA — Migración 018
   Ajuste de tarifas: mínimo $1.00, 3 km ≈ $1.25
   base_fare = $0.65 | price_per_mile = $0.26 | price_per_minute = $0.01 | min_fare = $1.00
*/

UPDATE us_states SET
  base_fare        = 0.65,
  price_per_mile   = 0.26,
  price_per_minute = 0.01,
  min_fare         = 1.00
WHERE is_active = true;
