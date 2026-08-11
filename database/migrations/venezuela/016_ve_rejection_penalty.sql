/* V-RIDE VENEZUELA — Migración 016
   Sistema de penalidad por rechazos:
   - suspension_credit_days: días de membresía no usados al momento de la suspensión
   - suspension_reactivation_date: fecha en que el conductor se reactiva gratis la semana siguiente
*/

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS suspension_credit_days       INT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suspension_reactivation_date DATE NULL;
