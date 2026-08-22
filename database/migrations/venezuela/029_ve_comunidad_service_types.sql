/* Migración VE-029 — Nuevos tipos de servicio Comunidad */

ALTER TABLE rides DROP CONSTRAINT IF EXISTS rides_service_type_check;
ALTER TABLE rides ADD CONSTRAINT rides_service_type_check
  CHECK (service_type IN (
    'standard','family','executive','accessible',
    'scheduled','hourly','wait_and_return',
    'motorcycle','sedan','suv',
    'encomienda','pickup','plataforma','carga',
    'cisterna','grua','mecanico','planta_electrica','tanque_gas',
    'baterias','cauchos','gasolina','aire_acondicionado','mudanza'
  ));
