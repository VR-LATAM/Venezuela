-- Ajuste precio por km: 0.86 → 0.90
UPDATE us_states
SET price_per_mile = 0.90
WHERE code = 'VE';
