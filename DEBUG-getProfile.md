# BUG ACTIVO: Conductores ven "Completa tu registro"

## Problema
`GET /driver/profile` devuelve 500 INTERNAL_ERROR → la app muestra pantalla "Completa tu registro" aunque el conductor esté `active` en la BD.

## Causa probable
`DRIVER_SELECT` en `driverRepository.ts` referencia columnas que pueden no existir en Supabase:
- `d.date_of_birth_enc`
- `d.home_address_enc`
- `d.license_number_enc`

## Lo que se hizo (commit fd5f2fd)
`driverController.ts` → `getProfile` modificado para mostrar el mensaje SQL exacto en la respuesta en vez de `INTERNAL_ERROR` genérico. Railway debe haber redesplazado automaticamente.

## Próximo paso
1. Esperar ~3 min al redespliegue de Railway
2. Abrir la app con un conductor
3. El error en Expo ya NO dirá `INTERNAL_ERROR` sino el mensaje SQL real
4. Si dice `column "date_of_birth_enc" does not exist`, correr en Supabase SQL Editor:

```sql
ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS date_of_birth_enc TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS home_address_enc TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS license_number_enc TEXT DEFAULT NULL;
```

## Archivos clave
- `backend/src/controllers/driverController.ts` ~línea 99: getProfile con try-catch separados
- `backend/src/repositories/driverRepository.ts` ~línea 34: DRIVER_SELECT
- `mobile/app/(driver)/home.tsx` ~línea 462: catch de loadProfile
