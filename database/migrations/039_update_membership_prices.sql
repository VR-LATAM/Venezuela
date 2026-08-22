/* Actualización de precios de membresía semanal — Moto $8 | Sedán $15 | SUV $15 */
UPDATE membership_plans SET price_usd = 8.00  WHERE vehicle_type = 'moto';
UPDATE membership_plans SET price_usd = 15.00 WHERE vehicle_type = 'sedan';
UPDATE membership_plans SET price_usd = 15.00 WHERE vehicle_type = 'suv';
