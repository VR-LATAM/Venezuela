/* V-RIDE VENEZUELA — Migración 015
   Renombra los códigos de los 5 módulos base de capacitación
   de la convención antigua VRN-TRN-0XX a la convención VE-VERONA
   usada por el resto de los módulos venezolanos.
   El campo `code` se muestra al conductor en:
     mobile/app/(driver)/training.tsx
     mobile/app/(driver)/training-module.tsx
   No hay lógica de negocio que compare por `code` en backend ni mobile,
   por lo que el renombrado es seguro.
*/

UPDATE training_modules SET code = 'VE-VERONA-002' WHERE code = 'VRN-TRN-021';
UPDATE training_modules SET code = 'VE-VERONA-003' WHERE code = 'VRN-TRN-022';
UPDATE training_modules SET code = 'VE-VERONA-004' WHERE code = 'VRN-TRN-023';
UPDATE training_modules SET code = 'VE-VERONA-005' WHERE code = 'VRN-TRN-024';
UPDATE training_modules SET code = 'VE-VERONA-006' WHERE code = 'VRN-TRN-025';
