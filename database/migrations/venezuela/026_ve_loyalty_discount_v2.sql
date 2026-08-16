/* Rediseño del sistema de descuentos:
   - Promo bienvenida: $1 en viajes >= $3, solo 3 veces, cuenta solo cuando se aplica
   - Fidelidad: cada 8 viajes el 9no tiene descuento ($1 o $2 según tarifa)
   - loyalty_cycle_rides: 0-8 (al llegar a 8 el siguiente viaje es el de descuento)
*/

/* Contador de descuentos de bienvenida usados (0-3) */
ALTER TABLE passengers
  ADD COLUMN IF NOT EXISTS new_passenger_discounts_used INT NOT NULL DEFAULT 0;

/* Inicializar para pasajeros existentes */
UPDATE passengers
  SET new_passenger_discounts_used = LEAST(COALESCE(total_rides, 0), 3);

/* Tipo de descuento aplicado al viaje */
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT NULL;

/* Reiniciar loyalty_cycle_rides con el nuevo ciclo de 9 (0-8):
   comienza a contar solo después de usar los 3 descuentos de bienvenida */
UPDATE passengers
  SET loyalty_cycle_rides = CASE
    WHEN COALESCE(new_passenger_discounts_used, 0) < 3 THEN 0
    ELSE LEAST((COALESCE(total_rides, 0) - 3) % 9, 8)
  END;
