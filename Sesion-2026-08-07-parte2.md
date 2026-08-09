---
name: Sesion-2026-08-07-parte2
description: Fixes de producción — conductores bloqueados, tipos de servicio, columnas BD faltantes, seed de usuarios de prueba
metadata:
  node_type: memory
  type: project
  originSessionId: b6cf4583-785b-41c1-856a-cc4dc8bca46a
---

Sesión de corrección de bugs críticos en producción. El problema principal: conductores registrados eran enviados a "Completa tu registro" porque `GET /driver/profile` devolvía 500.

---

## Causa raíz del error 500 en /driver/profile

`DRIVER_SELECT` en `driverRepository.ts` pedía columnas `d.date_of_birth_enc`, `d.home_address_enc`, `d.license_number_enc` que nunca existieron en la BD de producción (eran columnas de una arquitectura PII encriptada que no se aplicó). Se removieron del SELECT.

Segundo error en cadena: `decryptDriver()` llamaba `decryptPII()` pasándole el valor de `date_of_birth`, que PostgreSQL devuelve como objeto `Date` (no string). `decryptPII` llamaba `.includes()` sobre ese objeto y explotaba con `ciphertext.includes is not a function`. Fix: función `safeDecrypt` que verifica `typeof val !== 'string'` antes de desencriptar.

**Archivos modificados:**
- `backend/src/repositories/driverRepository.ts` — DRIVER_SELECT y decryptDriver()

---

## Columnas faltantes en tabla drivers (producción)

La BD de producción fue creada con un schema antiguo. Faltaban columnas añadidas después:
`accessible_cert_url`, `current_state_code`, `rides_this_month`, `consecutive_rejections`, `total_earned`, `available_balance`, `certifications`, `languages`, `special_equipment`, `smokes`, `long_distance_available`, `music_preference`, `music_artist`, `stripe_account_id`, `stripe_account_verified`, `ssn_last4`, `daily_earnings_goal`, `rides_offered`, `rides_accepted`, `last_ride_completed_at`, `inactivity_alert_sent`, `online_since`, `medical_exam_expiry`, `vehicle_vin`, `vehicle_seats`.

**Fix:** SQL ejecutado manualmente en Supabase SQL Editor (`database/scripts/patch_missing_columns.sql`) con `ADD COLUMN IF NOT EXISTS` para cada una.

---

## Cambio de tipos de servicio

Se eliminaron: `standard`, `family`, `executive`, `accessible`, `military`, `medical`, `dialysis`.
Se añadieron: `motorcycle` (🏍️), `sedan` (🚗), `suv` (🚙).
Se mantuvieron: `scheduled`, `hourly`, `wait_and_return`.

**Archivos modificados:**
- `shared/src/types/index.ts` — ServiceType union type
- `backend/src/controllers/rideController.ts` — SERVICE_TYPES array, default 'sedan'
- `backend/src/controllers/scheduledRideController.ts`
- `backend/src/controllers/recurringRideController.ts`
- `backend/src/controllers/waitlistController.ts`
- `backend/src/controllers/adminController.ts` — motorcycle_multiplier, suv_multiplier
- `backend/src/services/fareService.ts` — SERVICE_MULTIPLIERS
- `backend/src/repositories/trainingRepository.ts`
- `mobile/app/(passenger)/home.tsx` — SERVICE_OPTIONS con emojis
- `mobile/src/store/rideStore.ts` — default 'sedan'
- `database/scripts/patch_service_types.sql` — migración de BD (correr en Supabase)

---

## Problema con Railway (caché de snapshots)

Railway Metal builder cacheaba el snapshot `d850125f...` y nunca tomaba el código nuevo de GitHub. Solución definitiva: `railway up` desde la CLI local, que sube los archivos directamente y genera un snapshot nuevo.

El primer `railway up` falló porque `rideController.ts` tenía `.default('standard')` que ya no es un valor válido del enum. Fix: cambiar a `.default('sedan')`.

**Cómo deployar en el futuro si Railway ignora GitHub:**
```bash
cd "D:\apps\V-Ride_Venezuela" && railway up
```

---

## Reset completo de datos de prueba

Se borraron todos los usuarios de prueba:
- Supabase: `TRUNCATE TABLE rides, drivers, users RESTART IDENTITY CASCADE;`
- Firebase: manual en Console → Authentication → Users

---

## Script de seed de usuarios de prueba

Creado en `scripts/seed_users.mjs`. Usa Firebase Admin SDK para crear usuarios con `emailVerified: true` y luego llama al backend real para registrarlos.

**Usuarios creados (contraseña: `Test1234!`):**
- pasajero1@vride.test, pasajero2@vride.test, pasajero3@vride.test
- conductor1@vride.test, conductor2@vride.test, conductor3@vride.test

**Para volver a correr el seed:**
```bash
node scripts/seed_users.mjs
```

---

## Estado al cierre de sesión

- Backend deployado y corriendo en Railway
- Conductores ya no deberían ver "Completa tu registro" al iniciar sesión
- Pendiente verificar con el tester en Venezuela que el login de conductor funcione correctamente
- Pendiente correr `database/scripts/patch_service_types.sql` en Supabase para migrar los tipos de servicio en rides y drivers existentes
