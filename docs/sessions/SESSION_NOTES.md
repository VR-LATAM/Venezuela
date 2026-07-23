# Sesión 27 Mayo 2026 — Resumen para continuar mañana

## Estado actual del proyecto
- **Backend:** Deployado en Railway ✅ → `https://vridebackend-production-00dd.up.railway.app`
- **Base de datos:** Supabase (PostgreSQL + PostGIS), 11 migraciones aplicadas
- **APK Android:** Build exitoso ✅ → Build ID `139a91de-c9e7-43d7-b4f3-1ae0ac1fc511`
  - Link: https://expo.dev/accounts/edward1234/projects/veronaride/builds/139a91de-c9e7-43d7-b4f3-1ae0ac1fc511
- **iOS:** Nunca se ha hecho build (requiere Apple Developer Program $99/año)

---

## Qué se hizo esta sesión

### 1. Security Deep Dive — 11 vulnerabilidades corregidas (commit `a9878af`)

| Severidad | Problema | Fix |
|-----------|----------|-----|
| Critical | Admin password en texto plano | `crypto.timingSafeEqual()` con SHA-256 |
| Critical | MIME type spoofing en uploads | Magic bytes detection en `driverController.ts` |
| Critical | Refresh token reuse | Invalida sesión + warn en `authService.ts` |
| Critical | HSTS no configurado | Helmet con `hsts: { maxAge: 31536000 }` |
| Critical | CORS sin logging | Alerta en producción si origen desconocido |
| High | PG error codes expuestos | `DATABASE_CONSTRAINT` genérico en `errorHandler.ts` |
| High | Webhook sin rate limit | `rateLimit(60 req/min)` en `payment.routes.ts` |
| High | Stripe webhook sin validar secret | Rechaza si `whsec_placeholder` en `paymentController.ts` |
| Medium | HTTPS no forzado en mobile | Lanza error en producción si API_URL no es https en `apiClient.ts` |
| Medium | Borrar única tarjeta | Bloquea con código `LAST_PAYMENT_METHOD` |
| Low | UUID vulnerable (GHSA-w5hq-g745-h8pq) | `uuid` actualizado a `^11.1.1` (commit `e62cd2b`) |

### 2. Audit Logging — nuevo sistema (commit `a9878af` + `93243b0`)
- Nuevo archivo: `backend/src/repositories/auditRepository.ts`
- Nuevo archivo: `database/migrations/012_audit_logs.sql` ← **AÚN NO EJECUTADO EN SUPABASE**
- Eventos que se registran: `admin_login`, `driver_approved`, `driver_rejected`, `driver_suspended`, `driver_reactivated`

### 3. Infraestructura Railway — configurada
- Redis real agregado como servicio en Railway (ya no `localhost:6379`)
- `NODE_ENV=production` configurado
- `CORS_ORIGINS` con URL de Railway
- `STRIPE_WEBHOOK_SECRET` real desde Stripe Dashboard
- Stripe webhook URL corregida a: `/api/v1/payment/webhook/stripe`

### 4. CVE Scan
- Backend: 10 moderate (0 critical/high) — uuid fix aplicado
- Mobile: 17 moderate (son devDependencies de expo, requieren `expo upgrade` — aplazado)

### 5. APK rebuild
- Problema: `package.json` raíz tenía dependencias incorrectas (`expo-av ~15`, `react`, `react-dom`, `react-native-worklets`) que conflictuaban con mobile
- Fix: eliminadas esas dependencias del raíz
- Fix: generado `mobile/package-lock.json` (faltaba, EAS no podía instalar determinísticamente)
- eas-cli actualizado de 19.0.1 → 19.1.0
- Build nuevo exitoso: `139a91de-c9e7-43d7-b4f3-1ae0ac1fc511`

---

## Pendientes para mañana (en orden de prioridad)

### 1. URGENTE — Ejecutar migración 012 en Supabase
Ir a Supabase → SQL Editor → ejecutar el contenido de:
```
database/migrations/012_audit_logs.sql
```
Sin esto, el sistema de audit logs falla silenciosamente (los inserts fallan pero no rompen la app).

### 2. Foto de perfil no carga en la app
- El backend sube la foto correctamente
- La imagen no aparece en la UI de la app
- Posibles causas:
  - Helmet bloqueando la ruta `/uploads`
  - URL no accesible desde el teléfono (URL local en dev)
  - Problema con FormData en axios
- Archivos relevantes: `mobile/src/hooks/usePhotoUpload.ts`, `mobile/src/components/common/UserAvatar.tsx`

### 3. Reconexión de viaje activo
- Si el usuario cierra y reabre la app durante un viaje activo, no se ha probado
- Puede quedar en estado inconsistente en el store
- Archivo relevante: `mobile/src/store/rideStore.ts`

### 4. Google Play Console (para lanzar al público)
- Costo: $25 único
- APK ya listo para subir
- Proceso: crear cuenta → crear app → subir APK → track interno → revisar → producción

### 5. Apple Developer Program (iOS)
- Costo: $99/año
- Sin esto no se puede hacer build de iOS ni publicar en App Store
- Comando cuando esté listo: `eas build --platform ios --profile preview`

### 6. Stripe producción
- Cambiar de claves `sk_test_` a `sk_live_` cuando se quiera cobrar dinero real
- Actualizar en Railway: `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`

---

## Arquitectura resumida

```
mobile/          → React Native + Expo 54, EAS Build para APK/IPA
backend/         → Node.js + Express + TypeScript, Railway (Docker)
database/        → Supabase PostgreSQL + PostGIS, 11 migraciones (falta 012)
dashboard/       → Next.js (admin panel)
```

### Variables de entorno en Railway (ya configuradas)
- `DATABASE_URL` → Supabase connection string
- `REDIS_URL` → Redis real (Railway service)
- `JWT_SECRET` → secret para tokens
- `FIREBASE_*` → credenciales Firebase Admin SDK
- `STRIPE_SECRET_KEY` → sk_test_... (cambiar a sk_live_ para producción)
- `STRIPE_WEBHOOK_SECRET` → whsec_... (real, configurado)
- `NODE_ENV` → production
- `CORS_ORIGINS` → https://vridebackend-production-00dd.up.railway.app

### Commits importantes de esta sesión
```
40030e1 fix: remove stray root dependencies (fix EAS build)
a9f3f8f chore: add mobile/package-lock.json
e62cd2b security: update uuid to 11.1.1
93243b0 feat: audit logging + last card protection
a9878af security: fix 11 vulnerabilities
ad6fde4 feat: email verification flow
```
