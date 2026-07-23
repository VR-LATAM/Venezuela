# Verona Ride — Historial del Proyecto

**Desarrollado por:** Edward Labrador  
**Para:** ELITE GROUP - Integral Services LLC  
**Última actualización:** 10 junio 2026

---

## ¿Qué es Verona Ride?

App de transporte privado especializada en adultos mayores, personas con discapacidad y pasajeros con necesidades especiales. Opera en Texas con arquitectura preparada para expansión nacional sin geofencing.

**Modelo de negocio:** Rideshare con conductores verificados, pagos via Stripe, GPS en tiempo real. Planeado como franquicia por estado ($1M adquisición + $100K/mes).

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express + TypeScript + Socket.io |
| Base de datos | PostgreSQL (Supabase) + PostGIS |
| Cache / GPS | Redis (Upstash) + ioredis |
| Auth | Firebase Auth + JWT (access + refresh tokens) |
| Pagos | Stripe Connect (pasajeros + conductores) |
| Storage | Firebase Storage |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Mobile | React Native + Expo |
| Landing page | Next.js (Vercel) |
| Admin dashboard | Next.js |
| Deploy backend | Railway (Docker, Dockerfile en raíz) |
| Monorepo | npm workspaces (`backend`, `mobile`, `dashboard`, `shared`) |

---

## Infraestructura Desplegada

| Servicio | URL / Detalle | Estado |
|---|---|---|
| Backend | `https://vridebackend-production-00dd.up.railway.app` | ✅ Activo |
| Base de datos | Supabase — project ID: `nkiwlxoedjizniseabga` | ✅ Activo |
| Redis | Upstash — US-East-1 | ✅ Configurado |
| Landing page | Vercel | ✅ Activo |
| APK Android | EAS Build ID: `41b4fe17-c3f9-41a6-b4fe-49751ce65156` | ✅ Generado |
| iOS | — | ⏳ Pendiente (requiere Apple Developer $99/año) |
| Google Play Store | — | ⏳ Pendiente (cuenta $25) |

---

## Historial de Sesiones

### Sesiones 1–7 (antes de mayo 2026)
- Fases 1-7 completadas: auth, perfiles, flujo de viajes, pagos, notificaciones, dashboard admin, configuración de deploy
- App probada end-to-end con teléfonos reales
- Flujo completo: solicitar viaje → buscar conductor → asignar → recoger → completar → pagar → calificar

### Sesión — 17 mayo 2026
**CVE Scan inicial:** 58 vulnerabilidades (2 críticas, 26 high)  
**CVE Scan final:** 17 vulnerabilidades (0 críticas)

Fixes aplicados:
- `firebase-admin` v10 → v13 (fix crítico: ejecución de código arbitrario)
- `axios` actualizado en backend, mobile y dashboard (fix SSRF, auth bypass)
- `next` v14 → v16 en dashboard (fix XSS)
- `firebase` client SDK actualizado en mobile
- `xlsx` eliminado del dashboard (sin fix disponible, no se usaba)

Security Deep Dive — 19 hallazgos corregidos:
- SSL `rejectUnauthorized: true` en conexión a base de datos
- JWT redactado en logs de producción
- Helmet con CSP explícito
- CORS filtra localhost en producción automáticamente
- Idempotencia en webhook de Stripe via Redis (previene pagos dobles)
- JWT mínimo 64 caracteres

**Score:** 420 → 480 / 1000

### Sesión — 19 mayo 2026
- Supabase configurado: 10 migraciones corridas, PostGIS activo
- Firebase Admin SDK configurado con credenciales reales (`vride-production`)
- EAS Build: APK Android generado y disponible
- Railway tuvo outage (Google Cloud bloqueó su cuenta) — deploy pendiente

**Score:** 480 → 545 / 1000

### Sesión — 24 mayo 2026 (primera parte)
Railway finalmente deployado — problemas resueltos:
1. `REDIS_URL` faltaba como variable de entorno
2. `firebase.ts` hacía `throw err` en producción → cambiado a `logger.error()` (no-fatal)
3. `redisSub`/`redisPub` sin error handlers → proceso crasheaba silenciosamente
4. `railway.toml` apuntaba a `Dockerfile` relativo a `backend/` → corregido a `../Dockerfile`
5. `startup.js` agregado para capturar errores antes de que los módulos carguen

URL final: `https://vridebackend-production-00dd.up.railway.app`

### Sesión — 24 mayo 2026 (segunda parte)
Nuevas funcionalidades:
- **Sistema de suspensión de conductores:** 5 cancelaciones en 24h → suspensión de 12h via Redis. Aviso preventivo a la 3ra y 4ta cancelación. Excepción si el pasajero no apareció.
- **Validación de vehículo:** máximo 5 años de antigüedad, rechazo de títulos salvage
- **Rate limiter de auth:** reducido de 10 a 5 intentos/minuto
- **Admin search:** limitado a 100 caracteres para prevenir DoS
- **Traducción completa al inglés:** todos los mensajes visibles por usuarios y conductores

**CVE Scan final:** 37 → 28 vulnerabilidades (todos moderate, 0 high, 0 críticos)  
Las 28 restantes no son explotables en el patrón de uso de V-Ride.

---

## Arquitectura del Monorepo

```
D:/apps/v-ride/
├── backend/          # API REST + Socket.io (Node/Express/TypeScript)
│   ├── src/
│   │   ├── controllers/   # authController, driverController, rideController, etc.
│   │   ├── services/      # rideService, driverService, stripeService, etc.
│   │   ├── repositories/  # driverRepository, rideRepository, etc.
│   │   ├── middleware/    # auth, rateLimiter, errorHandler
│   │   ├── socket/        # Socket.io — GPS y eventos de viaje en tiempo real
│   │   ├── config/        # redis, database, firebase, env
│   │   └── routes/        # rutas Express por dominio
│   └── railway.toml       # configuración de deploy en Railway
├── mobile/           # React Native + Expo (iOS y Android)
│   └── eas.json           # perfiles de build EAS
├── dashboard/        # Panel admin (Next.js)
├── shared/           # Tipos TypeScript compartidos
├── Dockerfile        # Build multi-stage para Railway
├── startup.js        # Wrapper Node.js — captura errores de módulos en arranque
└── package.json      # npm workspaces root
```

---

## Rutas Clave del Backend

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/auth/register/passenger` | Registro de pasajero |
| POST | `/api/v1/auth/register/driver` | Registro de conductor |
| POST | `/api/v1/auth/login` | Login con Firebase token |
| POST | `/api/v1/auth/refresh` | Renovar tokens JWT |
| GET | `/api/v1/driver/profile` | Perfil del conductor |
| PATCH | `/api/v1/driver/profile` | Actualizar vehículo/licencia |
| POST | `/api/v1/driver/documents/:docType` | Subir documento |
| POST | `/api/v1/driver/submit-review` | Enviar solicitud de verificación |
| PATCH | `/api/v1/driver/online` | Cambiar estado online/offline |
| POST | `/api/v1/ride/estimate` | Estimar tarifa |
| POST | `/api/v1/ride/request` | Solicitar viaje |
| POST | `/api/v1/ride/:id/cancel` | Cancelar viaje |
| POST | `/api/v1/ride/:id/complete` | Completar viaje |
| GET | `/api/v1/ride/:id/receipt` | Recibo PDF |
| POST | `/api/v1/payment/driver/connect` | Onboarding Stripe Connect |
| POST | `/api/v1/payment/driver/withdrawal` | Solicitar retiro |
| POST | `/api/v1/sos` | Activar alerta SOS |
| GET | `/health` | Healthcheck de Railway |

---

## Variables de Entorno Clave (Railway)

```
DATABASE_URL          → Supabase connection string
REDIS_URL             → Upstash rediss:// URL
FIREBASE_PROJECT_ID   → vride-production
FIREBASE_CLIENT_EMAIL → firebase-adminsdk-fbsvc@vride-production.iam.gserviceaccount.com
STRIPE_SECRET_KEY     → sk_live_...
STRIPE_WEBHOOK_SECRET → whsec_... (pendiente configurar en Stripe Dashboard)
JWT_SECRET            → 64+ chars random
JWT_REFRESH_SECRET    → 64+ chars random
CORS_ORIGINS          → https://vridebackend-production-00dd.up.railway.app,...
NODE_ENV              → production
GOOGLE_MAPS_API_KEY   → AIzaSyB3...
```

---

---

### Sesión — 29 mayo 2026
**Sistema de Certificación de Conductores**

- 5 módulos de entrenamiento obligatorios antes de activación
- 50 preguntas distribuidas en los módulos
- Lógica de aprobación en backend (score mínimo por módulo)
- UI mobile completa: módulos, quiz, progreso
- Deploy completado en Railway

**Score:** ~920 / 1000

---

### Sesión — 1 junio 2026 (Bloque 1–4, 40 features)

Sesión masiva de 40 mejoras en 4 bloques:

**Bloque 1 — Pasajero:**
- Multi-stop rides (hasta 5 paradas)
- Promo codes con validación en tiempo real
- Subscription $29.99/mes (15% descuento en todos los viajes)
- Accessibility profile (9 opciones: silla de ruedas, oxígeno, etc.)
- Tip modal (10/15/20%/personalizado) post-viaje
- Rating detallado (4 subcategorías)
- Dispute system (8 razones)
- PDF receipt con notas del conductor
- Emergency contact notificado por email + GPS en SOS
- Route deviation alert (umbral 0.5 mi)
- Waitlist — notificado cuando hay conductor disponible cercano
- Modo offline (estado guardado sin internet)
- Descuento frequent rider (10% a 15/semana o 50/mes)

**Bloque 2 — Conductor:**
- Speed monitor (alerta a +75 mph)
- SOS button (presionar 2s) → notifica contacto de emergencia + admin
- Notas post-viaje al pasajero
- Streak bonus (días activos consecutivos)
- Incident report durante el viaje (8 tipos)
- Grabación de audio (local, para disputas)
- Tracking de inactividad

**Bloque 3 — Admin Dashboard:**
- Mapa en vivo de conductores (GPS desde Redis)
- Cola de aprobación de conductores + revisión de documentos
- Suspender/reactivar conductor
- KPIs, revenue, configuración de tarifas (50 estados)
- Gestión de disputas (resolver con notificación FCM)
- Promo codes (crear/activar/desactivar)
- Feed de alertas SOS (auto-refresh 30s)
- Gestión de incidentes (resolver con notas)
- Cuentas clínicas (crear, ver solicitudes pendientes)
- Vincular solicitud clínica a viaje creado

**Bloque 4 — Plataforma:**
- 14 tipos de notificaciones FCM
- Referral program ($50 al referido en primer viaje / $600 al referidor a 50 viajes)
- Ride sharing (link público de seguimiento)
- Transporte médico (API clínica + códigos ICD-10 + facturación Medicare/Medicaid)

Migraciones aplicadas: 014, 015, 016

**Score:** 935 / 1000

---

### Sesión — 8 junio 2026

**Migración Firebase Storage → Supabase Storage**
- Firebase Storage requería plan Blaze (pago). Proyecto en plan Spark (gratuito).
- Migrado completamente a Supabase Storage (bucket privado `vride-docs`, 1GB gratis)
- URLs firmadas con expiración de 10 años
- Variables nuevas en backend/.env y Railway: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Fix caché Docker en Railway**
- Railway re-usaba capas cacheadas con código viejo de Firebase Storage
- Solución: `railway up` desde CLI fuerza compilación limpia
- Este es el método preferido cuando hay problemas de caché

**Fix TypeScript — conflicto @types/express**
- Monorepo tenía dos versiones simultáneas de `@types/express` (v4 y v5)
- Solución: `devDependencies` + `overrides` en `package.json` root fuerzan v4

**Fix fechas de expiración**
- Backend rechazaba formato `MM/YYYY` en campos `license_expiry` / `insurance_expiry`
- Fix: función `toIsoDate()` convierte a formato ISO antes de insertar

**Primer conductor activado manualmente**
- Email: `elabrador1901@gmail.com` | Driver ID: `f5cbe209-4391-4161-b126-e208e54ca78c`
- Activado via Supabase SQL: status='active', training completo, certificaciones insertadas

**Dashboard Admin traducido al inglés**
- Locale por defecto cambiado de `'es'` → `'en'`
- Todos los textos hardcodeados en español traducidos

**Bug crítico pasajero — ruta invisible**
- `dropoff_lat`/`dropoff_lng` no existían en tipo `Ride`. Campo correcto: `dropoff_location.latitude/longitude`
- No había listener `passenger:driver_location` en `ride.tsx` — al navegar, la ubicación se congelaba
- Fix: corregidos los campos + agregado listener con `updateDriverLocation`

**Bug — servicio Family error al solicitarse**
- CHECK constraint de `service_type` no incluía `'family'`
- Fix: migración `021_fix_service_type_constraint.sql` aplicada

**Dashboard conectado a Railway**
- `dashboard/.env.local` actualizado para apuntar al backend en Railway
- CORS del backend actualizado para permitir `localhost:3000`

**Score:** ~935 / 1000

---

### Sesión — 9 junio 2026

**Bug crítico — conductor perdía coordenadas al cambiar estado**
- `updateStatus` en `rideRepository.ts` usaba `RETURNING *` sin campos PostGIS
- Al presionar "Arrived" o "Start ride", `activeRide` perdía `dropoff_lat`/`dropoff_lng`
- Fix: agregar `ST_Y`/`ST_X` al RETURNING clause

**Mejoras UI conductor (home.tsx)**
- `mergeRideCoords`: preserva coords del ride anterior si el backend no las retorna
- Panel inferior colapsable: botón ▾/▴
- `mapPadding.bottom`: 370px expandido → 150px colapsado
- Notificación llegada: haversine < 0.15 mi → banner verde 5s + haptic x3
- `hasNotifiedArrival` ref evita notificación duplicada

**Fix NavigationButton**
- Valida coords con `isValidCoord()` antes de usar en URL
- Fallback a `address` string si coords son inválidas

**Fix pantalla pasajero (ride.tsx)**
- Eliminado marcador UserAvatar en posición del conductor
- Eliminado `showsUserLocation` nativo
- Agregado `watchPositionAsync` → avatar del pasajero en su GPS real

**Seguridad Supabase**
- Vista `active_driver_certifications` → `security_invoker = true`
- Función `update_updated_at` → `SET search_path = ''`
- Todas las tablas sensibles con RLS + políticas deny confirmadas

---

### Sesión — 10 junio 2026

**Fix ruta destino en pantalla pasajero**
- La ruta solo aparecía si `driverLocation` tenía valor (podía ser null al montar)
- Fix: usar `passengerPos` como origen de respaldo cuando `driverLocation` es null
- Resultado: la ruta siempre es visible desde el primer segundo del viaje

**Fix foto de perfil del pasajero**
- Después de subir foto en registro, el store quedaba con `photo_url: null`
- El endpoint `/user/photo` devolvía `{ photoUrl }` pero se ignoraba
- Fix: actualizar `user.photo_url` con el valor retornado antes de guardar en el store

**Ajuste distancia notificación llegada conductor**
- Reducida de 0.15 millas (792 pies) → 0.004 millas (~21 pies)
- Consistente con el comportamiento de Google Maps

**Pitido de llegada al destino**
- `nokiaToneService.play()` ejecutado junto con haptic al detectar llegada
- `nokiaToneService` ya estaba importado y precargado — solo faltaba la llamada

**Marcador del conductor rediseñado**
- Eliminado círculo blanco con borde (causaba desbordamiento en animación)
- Reemplazado emoji 🚗 por ícono vectorial `MaterialCommunityIcons`
- Color del ícono = color del vehículo registrado (mapping nombre→hex)
- Animación de escala ahora solo afecta al ícono, sin desbordamiento

**Florida activada**
- Migración `022_activate_florida.sql` creada y aplicada en Supabase
- Tarifas FL: base $3.25, $1.35/km, $0.28/min, mínimo $7.00
- Comisión todos los estados corregida a 15% (era 13% por error)

**Score:** ~940 / 1000

---

### Sesión — 11 junio 2026

**Nuevos servicios: Wait & Return y Hourly Ride**

Dos nuevos tipos de servicio sin requerir licencia especial, diseñados para el mercado de adultos mayores y personas con discapacidad.

**Wait & Return (`wait_and_return`)**
- El conductor lleva al pasajero a su cita, espera y lo regresa
- El conductor toca "Start Waiting" al llegar al destino → timer en tiempo real
- Al regresar el pasajero, el conductor toca "Passenger is Back" → timer se detiene
- Tarifa = ida + espera (tiempo real × tarifa/min) + vuelta
- TX: $0.30/min ($18/hr) · FL: $0.35/min ($21/hr)
- Pasajero selecciona tiempo estimado de espera (30min–3hr) para ver estimación de costo
- Costo final usa el tiempo real de espera (no el estimado)

**Hourly Ride (`hourly`)**
- Conductor disponible por horas para múltiples paradas (farmacia, banco, médico, etc.)
- Paquetes fijos: 2h / 4h / 8h
- TX: 2h=$50, 4h=$90, 8h=$160 · FL: 2h=$55, 4h=$100, 8h=$175
- Precio fijo desde el momento de la reserva

**Base de datos — Migración 023**
- `wait_and_return` agregado al CHECK constraint de `service_type`
- Columnas nuevas en `rides`: `estimated_wait_minutes`, `wait_started_at`, `wait_ended_at`, `wait_minutes`, `wait_fare`, `hourly_package_hours`
- Columnas nuevas en `us_states`: `wait_per_minute_rate`, `wait_and_return_enabled`, `hourly_ride_enabled`

**Backend**
- `fareService.ts`: cálculo de estimación para ambos servicios (incluyendo doble trayecto en W&R)
- `rideService.ts`: métodos `startWait()` y `endWait()` con cálculo de tarifa real
- `socket/index.ts`: eventos `driver:start_wait` / `driver:end_wait` / `passenger:driver_waiting` / `passenger:driver_done_waiting`
- `rideRepository.ts`: INSERT incluye `estimated_wait_minutes` y `hourly_package_hours`

**Mobile — Pasajero**
- Grid de servicios ahora incluye "Wait & Return" ⏳ y "Hourly" 🕐
- Al seleccionar W&R: sub-selector de tiempo estimado (30min, 1hr, 1.5hr, 2hr, 3hr)
- Al seleccionar Hourly: sub-selector de paquete 2h / 4h / 8h con precio
- Estimación re-calcula automáticamente al cambiar el tiempo de espera o el paquete

**Mobile — Conductor**
- Nuevo botón "Arrived — Start Waiting" (azul) para viajes W&R al llegar al destino
- Timer en tiempo real visible con formato MM:SS y costo acumulado en vivo
- Botón "Passenger is Back — Start Return" (morado) para terminar la espera
- Botón "Complete ride" aparece después del regreso

**Investigación legal realizada**
- Wait & Return y Hourly Ride no requieren licencia especial en ningún estado
- Curb-to-curb asistencia permitida (abrir puerta, ayudar a sentarse) sin certificación
- Asistencia con silla de ruedas requiere PAT certification (identificado para futura fase)
- Contratos Medicaid/Medicare posibles con WAV + PAT (fase 2)

**Deploy:** `railway up` exitoso — backend actualizado en producción

**Score:** ~945 / 1000

---

### Sesión — 12 junio 2026

**Mejoras del mapa del conductor**

- Zoom por defecto cambiado a nivel 20 (~25 metros) para vista a nivel de calle
- Mapa siempre centrado en el ícono del conductor (no en el pickup)
- Fix: al reiniciar la app, el mapa ya no defaulteaba a Houston sino a la posición real del GPS
- `mapZoomRef` persiste el zoom elegido por el conductor entre rerenders

---

### Sesión — 13 junio 2026

**Fixes críticos del flujo completo**

- **Fix ruta en mapa:** la línea de ruta ahora usa `passengerPos` como origen de respaldo cuando `driverLocation` es null al montar la pantalla — la ruta siempre es visible desde el primer segundo
- **Tono Nokia cada 5s:** `toneIntervalRef` repite el tono cada 5 segundos hasta que el conductor responde o se agota el countdown de 30s
- **Fix servicios no estándar:** se eliminó el filtro excesivo que impedía encontrar conductores con servicios válidos en la BD
- **Botones zoom:** añadidos botones +/− y reset de zoom al mapa del conductor y del pasajero
- **Background location:** `startLocationUpdatesAsync` envuelta en try-catch — no crashea en Expo Go o Android si la tarea background no está disponible
- **Fix offline/online post-viaje:** al completar un viaje, el conductor ya no se queda en estado online inconsistente; se re-emite `driver:status_change` en cada reconexión socket

**Score:** 952 / 1000

---

### Sesión — 14 junio 2026 (mañana)

**Seguridad — Tasks #9–#13**

- **Task #9 — GDPR/CCPA endpoint (`DELETE /api/v1/user/account`):** anonimiza email/nombre/GPS, elimina datos de pago y documentos de Supabase Storage, preserva historial financiero 7 años
- **Task #10 — PII scrubbing en logs:** Winston `piiScrubber()` redacta email/teléfono/nombre/token en todos los logs; IP hasheada con SHA-256 en Morgan (producción)
- **Task #11 — Caché mobile cifrado:** `useOfflineCache.ts` usa AES-256-GCM via Web Crypto API nativa; clave maestra en `expo-secure-store` con `WHEN_UNLOCKED_THIS_DEVICE_ONLY`
- **Task #12 — Account lockout admin:** 5 intentos fallidos → bloqueo 15 min, por IP y por email (Redis con keys SHA-256, sin PII)
- **Task #13 — CloudFlare WAF:** instrucciones dadas (nameservers, proxy naranja, Managed Rules, rate limit `/api/v1/auth`) — requiere dominio propio

**Score:** ~970 / 1000

---

### Sesión — 14 junio 2026 (tarde)

**Dashboard admin en producción**

- Dashboard Next.js deployado en Vercel: `https://vride-dashboard.vercel.app`
- Fix crítico: `BACKEND_URL` en Vercel faltaba `https://` y el sufijo `-00dd`
- Primer login admin exitoso con email `edwardlabrador@yahoo.com`
- 2FA (Google Authenticator) pendiente de configurar en próximo login

---

### Sesión — 15 junio 2026

**Bug dispatch — causas raíz identificadas y corregidas**

Dos bugs independientes que juntos bloqueaban el despacho:

1. **Race condition en disconnect timer:** cuando el socket del conductor se desconectaba y reconectaba rápido (modo tunnel, reconexión), el timer de 5s marcaba al conductor offline aunque ya había reconectado. Fix: `fetchSockets()` verifica si el conductor tiene sockets activos antes de marcarlo offline.

2. **`services IS NULL` en `findNearby`:** conductores sin campo `services` en la BD no eran encontrados. Fix: `OR d.services IS NULL` añadido a la cláusula WHERE de la query PostGIS.

Deploy exitoso en Railway (`commit a6005bd`). Prueba pendiente.

---

### Sesión — 17 junio 2026

**Causa raíz definitiva del bug de despacho — CORREGIDO**

Los logs de Railway mostraron el patrón exacto:
- `[DIAG]` aparecía ✅ — la query DIAG encontraba al conductor correctamente
- `[findNearby]` **nunca aparecía** ❌ — la función crasheaba silenciosamente

**Causa raíz:** `driverRepository.findNearby` contenía `EXISTS (SELECT 1 FROM driver_service_certifications ...)`. Si esta tabla no existe en la BD actual (probable efecto de cambios en `DATABASE_URL` el sábado 14), la query PostgreSQL lanza `relation "driver_service_certifications" does not exist`. El error era capturado por `.catch()` que solo usaba `logger.error` (Winston invisible en Railway) → error completamente silencioso → `passenger:no_driver_found` emitido en segundos.

**Fixes:**
- `driverRepository.ts`: eliminada la cláusula `EXISTS (driver_service_certifications)`. El array `d.services` es suficiente.
- `rideService.ts`: `console.error` añadido al `.catch()` y `console.log` al early-return del while loop para visibilidad futura.
- `socketService.ts`: auth del socket cambiada de token estático a callback dinámico (lee token fresco de SecureStore en cada reconexión, evita `INVALID_TOKEN` cuando el access_token rota cada 15 min).

**Resultado:** ✅ Dispatch funcionando — conductor recibe modal + tono Nokia. Todos los cambios committeados y en Railway.

**Commits:** `5664e64`, `0327017`

**Score:** ~970 / 1000

---

## Pendiente para Lanzamiento

- [ ] Stripe live mode (pagos reales)
- [ ] Publicar en Google Play ($25 one-time)
- [ ] Registro TNC en Texas (TDLR)
- [ ] Integración background check (Checkr API)
- [ ] iOS App Store ($99/año Apple Developer)
- [ ] Cuentas corporativas

---

## Proyectos Futuros

### Verona Express (app de delivery)
- Nombre: Verona Express | Dominio: `veronaexpress.app`
- Directorio: nuevo en `D:/` (separado de V-Ride)
- Iniciar después del lanzamiento estable de Verona Ride
- Estimado de desarrollo: ~3 meses para MVP
- Reutiliza ~60% de la infraestructura de V-Ride (auth, GPS, pagos, notificaciones)

### Modelo de Franquicia
- Costo de adquisición por estado: $1,000,000
- Pago mensual: $100,000
- Lanzar en Texas primero → 6 meses de datos operativos → vender franquicias con historial

---

## Commits Importantes

| Hash | Descripción |
|---|---|
| `eba5565` | Security: architecture deep dive fixes (19 hallazgos) |
| `71b639a` | Security: fix 41 vulnerabilities via dependency updates |
| `b58743d` | Add training module, driver features, project documentation |
| `ac47573` | Add About Us, Privacy Policy, Legal Notice, Contact Us screens |
| `a99d895` | Add Verona Ride landing page (Next.js) |
| `34c8a29` | feat: driver suspension system for excessive cancellations |
| `a086d28` | feat: enforce vehicle age limit (5 years) and reject salvage titles |
| `fc76fe9` | i18n: translate all user-facing messages to English |
| `a848cb5` | security: fix 9 vulnerabilities via npm audit fix |
