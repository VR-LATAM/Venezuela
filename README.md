# V-Ride — National Rideshare Platform

🇺🇸 [English](#english) | 🇪🇸 [Español](#español)

---

<a name="english"></a>

# 🇺🇸 English

Production-grade rideshare platform targeting elderly and disabled users across the United States. Uber/Lyft-style, launching in Wyoming, built for national expansion.

**Platform commission:** 19% standard → 18% (500+ rides/year) → 17% (1,500+ rides/year) · **Driver payout:** 81–83% via Stripe Connect  
**Target market:** 1.5M+ elderly/disabled users · **Launch state:** Wyoming · **Expansion:** Texas + Florida  
**Current score:** ~980 / 1000 · **47+ features** · **33 DB migrations**

---

## Stack

| Layer | Technology |
|-------|-----------|
| Mobile (iOS + Android) | React Native + Expo SDK 54 + TypeScript |
| Admin Dashboard (Web) | Next.js 14 App Router + Tailwind CSS + Recharts |
| Backend API | Node.js + Express + Socket.io + TypeScript |
| Database | PostgreSQL 15 + PostGIS (Supabase) |
| Cache / Real-time GPS | Redis (Railway) |
| Auth | Firebase Auth + JWT (custom) |
| Payments | Stripe + Stripe Connect |
| Maps | Google Maps Platform |
| Push Notifications | Firebase Cloud Messaging (14 notification types) |
| Storage | Supabase Storage (private bucket `vride-docs`) |
| Backend Deploy | Railway (auto-deploy on git push) |
| Dashboard Deploy | Vercel |
| Mobile Build | Expo EAS Build |

---

## Repository Structure

```
vride/
├── backend/          Node.js + Express API
│   ├── src/
│   │   ├── config/         Database, Redis, Firebase, env
│   │   ├── controllers/    HTTP request handlers (25 controllers)
│   │   ├── middleware/     Auth (JWT + Firebase), rate limiting, clinicAuth
│   │   ├── repositories/  All DB queries (no ORM, 25+ repositories)
│   │   ├── routes/         Express routers per domain (22 route files)
│   │   ├── services/       Business logic (fare, payout, FCM, email, referral)
│   │   ├── socket/         Socket.io server + emitter
│   │   ├── types/          TypeScript interfaces
│   │   └── utils/          JWT, logger, response helpers
│   ├── Dockerfile
│   ├── railway.toml
│   └── .env.example
│
├── dashboard/        Next.js 14 Admin Dashboard
│   ├── src/
│   │   ├── app/            Pages: drivers, rides, finance, disputes, promos,
│   │   │                          SOS alerts, clinics, incidents
│   │   ├── components/     AdminShell, Sidebar, Header, UI kit, Charts, Maps
│   │   ├── i18n/           ES/EN translations + I18nProvider
│   │   └── lib/            api.ts, socket.ts, utils.ts
│   └── vercel.json
│
├── mobile/           React Native + Expo SDK 54
│   ├── app/
│   │   ├── (passenger)/   Passenger screens (30+)
│   │   └── (driver)/      Driver screens (15+)
│   ├── src/
│   │   ├── components/    SOSButton, NavigationButton, TipModal
│   │   ├── hooks/         useSpeedMonitor, useRouteDeviation, useOfflineCache
│   │   ├── i18n/          react-i18next + locales/es.json + locales/en.json
│   │   ├── services/      API client, Socket.io, Stripe, notifications, rides
│   │   └── store/         Zustand stores (auth, ride)
│   ├── app.json
│   └── eas.json
│
├── shared/           Shared TypeScript types + constants
└── database/
    ├── migrations/   27 SQL migration files (applied in production)
    └── seeds/        TX drivers + passengers + rides
```

---

## Architecture

```
Mobile App (Expo SDK 54)
     │  JWT + Firebase token
     ▼
Backend API (Express)  ←──── Socket.io ────→  Admin Dashboard (Next.js)
     │                            │
     ├── PostgreSQL + PostGIS      └── Real-time: GPS, SOS, rides, incidents
     ├── Redis (GPS TTL 10s, session, cache)
     ├── Firebase (Auth + FCM + Storage)
     ├── Stripe (payments + Connect)
     └── Google Maps (geocoding, distance matrix, directions)
```

**Key design decisions:**
- **No geofencing** — accepts any US GPS coordinate
- **Driver search:** dynamic radius 10 → 20 → 40 → 80 → 150 km (PostGIS `ST_DWithin`)
- **Admin unit = US State**, not city (50-state config in `us_states` table)
- **Surge pricing:** 1.5× during peak hours (12–2pm, 6–9pm)
- **PDF receipts:** streamed via PDFKit directly to response
- **Share ride:** Redis token (12 chars, TTL 2h) → public `/ride/track/:token`
- **Scheduled rides:** node-cron + optimistic lock prevents double-dispatch in multi-replica
- **Referral program:** $50 for referred on first ride · $600 for referrer at 50 rides
- **Subscription:** $29.99/month → 15% discount on all rides
- **Medical transport:** Clinic API Key auth → ICD-10 codes → Medicare/Medicaid billing
- **Offline cache:** AsyncStorage hook for last known state without internet

---

## Features (47 total)

### Passenger
- Real-time ride request + GPS tracking
- Fare estimate + surge pricing (1.5×)
- Multi-stop rides (up to 5 stops)
- Scheduled rides (advance booking)
- Recurring rides (fixed weekly schedule — dialysis, therapy, etc.)
- **Wait & Return** — driver takes passenger to appointment, waits, returns them (billed per real wait minute: $0.30/min TX · $0.35/min FL)
- **Hourly Ride** — driver available for multiple stops by the hour (2h / 4h / 8h fixed packages)
- Favorite destinations + favorite drivers
- Promo codes with validation
- Subscription $29.99/month (15% off all rides)
- Accessibility profile (9 options: wheelchair, oxygen, etc.)
- Tip modal (10 / 15 / 20% / custom) post-ride
- Detailed rating (punctuality, driving, friendliness, cleanliness)
- Dispute system (8 reasons)
- PDF receipt with driver notes
- Emergency contact notified by email + GPS on SOS
- Route deviation alert (0.5 mi threshold)
- Waitlist — notified when driver becomes available nearby
- Offline mode (last known state without internet)
- Photo verification
- Frequent rider discount (10% at 15/week or 50/month)
- **Corporate accounts** — company billing, employee rides billed to corporate account
- **VIP/Premium tier** — priority dispatch, premium vehicle assignment

### Driver
- 5-step onboarding wizard + document uploads
- Real-time ride requests with 30s countdown
- Navigation integration (Waze / Google Maps)
- Earnings chart (7-day) + daily goal
- 1099 tax report with monthly chart + IRS $600 threshold
- Acceptance rate tracking
- Document expiry alerts (30d / 7d / 1d)
- Speed monitor (alert at +75 mph)
- SOS button (hold 2s) → notifies emergency contact + admin
- Post-ride notes for passenger
- Streak bonus (consecutive active days)
- Incident report during ride (8 types)
- Audio recording (local)
- Inactivity tracking
- Certification system (5 training modules + 50-question quiz, required before activation)
- Arrival notification at destination (haptic + audio + banner, triggers at ≤20 ft)
- Vehicle-colored map marker (dynamic color from vehicle profile)
- Collapsible bottom panel during ride
- **Wait & Return controls** — live wait timer with accrued cost display, "Start Waiting" / "Passenger is Back" buttons
- Map zoom controls (+/− buttons, reset to street level, fit-route) on driver and passenger maps
- **Background location** — continues emitting GPS while app is backgrounded (phone call, multitasking)
- **Real-time chat** — in-ride messaging between driver and passenger via Socket.io

### Admin Dashboard
- Live driver map (GPS from Redis)
- Driver approval queue + document review
- Driver suspend / reactivate
- KPIs, revenue, fare config (all 50 states)
- Disputes management (resolve with FCM notification)
- Promo codes (create / toggle)
- SOS alerts feed (auto-refresh 30s)
- Incidents management (resolve with notes)
- Clinic accounts (create, view pending ride requests)
- Link clinic ride request to created ride

### Platform
- Firebase Auth (Email + Google + Apple)
- 14 FCM notification types
- Email receipts + emergency SOS email
- Referral program ($50 / $600)
- Ride sharing (public tracking link)
- Medical transport (clinic API + ICD-10 + insurance billing)

---

## Database Migrations (33 applied)

| # | File | Content |
|---|------|---------|
| 001 | `001_extensions.sql` | uuid-ossp, PostGIS, pgcrypto |
| 002 | `002_us_states.sql` | 50 states with fare config (default 19% commission) |
| 003 | `003_users_and_auth.sql` | users, refresh_tokens |
| 004 | `004_drivers_and_vehicles.sql` | drivers, vehicles, documents |
| 005 | `005_ratings_earnings.sql` | ratings, driver_earnings |
| 006 | `006_notifications_sos_referrals.sql` | notifications, sos_alerts, referrals |
| 007–013 | Core features | rides, chats, scheduled, promo, disputes, accessibility |
| 014 | `014_new_features.sql` | favorites, tips, multi-stop, promo_codes, disputes, accessibility |
| 015 | `015_driver_notes_notifications.sql` | driver_notes, emergency_contact_email, scheduled_reminders |
| 016 | `016_new_features_batch2.sql` | subscriptions, clinics, recurring rides, incidents, streaks, waitlist, medical invoices |
| 017 | `017_passenger_identity.sql` | passenger identity document verification |
| 018 | `018_rls_policies.sql` | Row Level Security policies (Supabase) |
| 019 | `019_admin_totp.sql` | Admin 2FA via TOTP |
| 020 | `020_passenger_identity_back.sql` | Passenger identity rollback/fix |
| 021 | `021_fix_service_type_constraint.sql` | Add 'family' to service_type CHECK constraint |
| 022 | `022_activate_florida.sql` | Activate Florida with adjusted fares + 19% commission |
| 023 | `023_wait_and_return_hourly.sql` | Wait & Return + Hourly Ride — new columns in rides + us_states, TX/FL rates |
| 024 | `024_performance_indexes.sql` | Composite + partial PostGIS indexes for high-traffic queries (findNearby, dispatch) |
| 025 | `025_encrypted_pii_columns.sql` | AES-256-GCM encrypted PII columns for drivers (date_of_birth, SSN, DL number) |
| 026 | `026_insurance_audit_log.sql` | TNC insurance audit: online_since timestamp + GPS log for accident coverage determination |
| 027 | `027_corporate_vip_passengers.sql` | Passenger tiers (standard/vip/corporate_employee) + corporate_accounts table |
| 028 | `028_premium_fares.sql` | Premium service fares configured for all 50 states |
| 029 | `029_military_all_states.sql` | Military transport service type enabled across all 50 states |
| 030 | `030_military_training_module.sql` | Military certification module VRN-TRN-031 + 10 training questions |
| 031 | `031_adjust_texas_fares.sql` | TX fare realignment: base_fare → $1.55, executive_multiplier → 1.70 |
| 032 | `032_adjust_ny_wy_fares.sql` | NY + WY fare realignment by cost-of-living index (NY +$2.65, WY +$1.95 above Uber) |
| 033 | `033_commission_19_percent.sql` | Platform commission 15%→19% (Silver 14%→18%, Elite 13%→17%), net margin ~6.5%→~10.5% |

---

## API Reference

Base URL: `https://vridebackend-production-00dd.up.railway.app/api/v1`

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register/passenger` | Register passenger (Firebase token) |
| `POST` | `/auth/register/driver` | Register driver |
| `POST` | `/auth/login` | Email + password → JWT |
| `POST` | `/auth/refresh` | Rotate tokens |
| `POST` | `/auth/logout` | Invalidate refresh token |

### Rides
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `POST` | `/ride/estimate` | Passenger | Fare estimate |
| `POST` | `/ride/request` | Passenger | Request ride |
| `POST` | `/ride/:id/cancel` | Passenger | Cancel ride ($3 fee after 2 min) |
| `POST` | `/ride/:id/accept` | Driver | Accept ride |
| `POST` | `/ride/:id/arrived` | Driver | Arrived at pickup |
| `POST` | `/ride/:id/start` | Driver | Start ride |
| `POST` | `/ride/:id/complete` | Driver | Complete ride |
| `POST` | `/ride/:id/rate` | Both | Detailed rating (4 subcategories) |
| `GET`  | `/ride/:id/receipt` | Both | PDF receipt |
| `POST` | `/ride/:id/share` | Passenger | Generate public tracking link |
| `GET`  | `/ride/track/:token` | Public | Live tracking (no auth) |
| `POST` | `/ride/:id/notes` | Driver | Post-ride notes |

### Passenger
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/favorites/destinations` | Favorite destinations |
| `GET/POST` | `/favorites/drivers` | Favorite drivers |
| `GET/POST` | `/accessibility` | Accessibility profile |
| `PATCH` | `/passenger/emergency-contact` | Set emergency contact |
| `GET` | `/passenger/receipts` | Receipt history |
| `POST` | `/ride/:id/tip` | Send tip (10/15/20%/custom) |
| `POST/GET/DELETE` | `/subscription/subscribe\|status\|cancel` | Monthly subscription |
| `GET/POST/PATCH/DELETE` | `/recurring-ride` | Recurring rides |
| `POST/GET/DELETE` | `/waitlist/join\|status\|leave` | Waitlist |

### Driver
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/driver/tax-report?year=` | 1099 report with monthly chart |
| `GET` | `/driver/stats` | Earnings, acceptance rate, streak |
| `GET/POST` | `/driver/training` | Certification modules + quiz |
| `POST` | `/driver/location` | HTTP location update (background mode fallback) |

### Payments & Promo
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/payment/intent` | Create Stripe PaymentIntent |
| `POST` | `/payment/webhook` | Stripe webhook handler |
| `POST` | `/promo/validate` | Validate promo code |

### Scheduled & Referral
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST/GET` | `/scheduled` | Schedule ride in advance |
| `GET` | `/referral/stats` | Referral stats + earnings |

### Incidents & Disputes
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/incident` | Report incident during ride |
| `GET` | `/incident/mine` | My reported incidents |
| `POST` | `/dispute/open` | Open dispute |
| `GET` | `/dispute/mine` | My disputes |

### SOS
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/sos/activate` | Activate SOS (notifies admin + emergency contact) |
| `POST` | `/sos/resolve/:id` | Admin resolves SOS |

### Clinic (X-Clinic-Key header required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/clinic/request` | Request transport for patient (ICD-10) |
| `GET` | `/clinic/requests` | List this clinic's requests |

### Admin (JWT admin role required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/drivers` | List with filters |
| `GET` | `/admin/drivers/pending-review` | Approval queue |
| `POST` | `/admin/drivers/:id/approve` | Approve driver |
| `POST` | `/admin/drivers/:id/reject` | Reject with reason |
| `POST` | `/admin/drivers/:id/suspend` | Suspend |
| `GET` | `/admin/drivers/online-map` | Live GPS from Redis |
| `GET` | `/admin/rides` | All rides (filterable) |
| `GET` | `/admin/finance` | Revenue summary |
| `GET/PUT` | `/admin/fares/:stateCode` | Fare config all 50 states |
| `GET` | `/admin/passengers` | Passenger list |
| `GET/PUT` | `/admin/disputes` | List open + resolve |
| `GET/PUT` | `/admin/incidents` | List open + resolve |
| `GET/POST` | `/admin/promos` | Promo codes |
| `GET/POST` | `/admin/clinics` | Clinic accounts |
| `GET` | `/admin/clinics/pending-requests` | Unassigned clinic ride requests |
| `PATCH` | `/admin/clinics/requests/:id/link` | Link request to ride |

---

## Socket.io Events

### Client → Server
| Event | Description |
|-------|-------------|
| `driver:location_update` | GPS update (every 4s while online) |
| `driver:status_change` | Availability toggle (online/offline) |
| `driver:ride_response` | Accept or reject incoming ride request |
| `driver:start_wait` | Start wait timer at appointment (Wait & Return) |
| `driver:end_wait` | End wait timer, begin return leg (Wait & Return) |
| `admin:join` | Admin joins the operations room |

### Server → Client
| Event | Description |
|-------|-------------|
| `passenger:driver_assigned` | Driver found, ride confirmed |
| `passenger:driver_location` | Live GPS position update |
| `passenger:driver_arrived` | Driver at pickup point |
| `passenger:ride_started` | Ride in progress |
| `passenger:ride_completed` | Ride done + total amount |
| `passenger:driver_waiting` | Driver started waiting at appointment (Wait & Return) |
| `passenger:driver_done_waiting` | Driver finished waiting, starting return (Wait & Return) |
| `driver:new_ride_request` | New ride request with 30s countdown |
| `driver:wait_started` | Confirmation: wait timer started |
| `driver:wait_ended` | Confirmation: wait ended + minutes + fare |
| `admin:sos_activated` | Real-time SOS alert |

---

## FCM Notification Types (14)

| Type | Trigger |
|------|---------|
| `ride_accepted` | Driver accepts ride |
| `driver_arrived` | Driver at pickup |
| `ride_started` | Ride begins |
| `ride_completed` | Ride ends |
| `tip_received` | Passenger sent tip |
| `dispute_resolved` | Admin resolved dispute |
| `scheduled_reminder` | 30 min before scheduled ride |
| `document_expiry` | Document expiring in 30d / 7d / 1d |
| `payment_confirmed` | Stripe payment confirmed |
| `promo_applied` | Promo code applied to ride |
| `driver_no_show` | Driver marked as no-show |
| `ride_cancelled` | Ride cancelled (passenger or driver) |
| `sos_activated` | SOS activated (admin only) |
| `referral_bonus` | Referral bonus earned |

---

## Commission Structure — Progressive by Performance

Commission is calculated from January 1st of the current year. Rating below 4.75 drops the driver to Standard immediately.

| Tier | Commission | Driver keeps | Requirement |
|------|-----------|-------------|-------------|
| **Standard** | 19% | 81% | New driver or rating < 4.75 |
| **Silver** | 18% | 82% | 500+ rides this year + rating ≥ 4.75 |
| **Elite** | 17% | 83% | 1,500+ rides this year + rating ≥ 4.75 |

Counter resets to zero every January 1st.

| Ride fare | Standard (81%) | Silver (82%) | Elite (83%) |
|-----------|---------------|-------------|-------------|
| $10.00 | $8.10 | $8.20 | $8.30 |
| $30.00 | $24.30 | $24.60 | $24.90 |
| $50.00 | $40.50 | $41.00 | $41.50 |
| $100.00 | $81.00 | $82.00 | $83.00 |

---

## Local Development

**Prerequisites:** Node.js 20+, PostgreSQL 15 + PostGIS (or Supabase), Redis, Firebase project, Google Maps API key, Stripe account, Expo CLI + EAS CLI

```bash
# Install CLIs
npm i -g expo-cli eas-cli

# Clone and install
git clone https://github.com/EdwardLabrador/v-ride.git
cd v-ride && npm install

# Environment variables
cp backend/.env.example backend/.env

# Apply all 33 migrations
node database/run-migration.js 001
# ... up to 033

# Run services
npm run dev --workspace=backend    # Terminal 1 — port 4000
npm run dev --workspace=dashboard  # Terminal 2 — port 3000
cd mobile && npx expo start        # Terminal 3 — mobile
```

---

## Deploy

**Backend → Railway:** Push to `master` → auto-deploy via `backend/railway.toml` + `backend/Dockerfile`

**Dashboard → Vercel:** `cd dashboard && vercel --prod`

**Mobile → EAS Build:**
```bash
cd mobile
eas build --platform all --profile production
eas submit --platform android --profile production
eas submit --platform ios     --profile production
```

---

## Roadmap to 1000/1000

| Points | Task |
|--------|------|
| +28 | Stripe live mode (real payments) |
| +20 | Publish on Google Play ($25 one-time) |
| +15 | Real user testing (full ride end-to-end) |
| +10 | TNC Texas registration (TDLR) |
| +10 | Background check integration (Checkr API) |
| +5  | 2FA admin panel (TOTP setup) |
| +5  | iOS App Store ($99/year Apple Developer) |

---

*V-Ride — Reliable transport for seniors and people with disabilities*  
*Coverage: United States · Launch market: Wyoming · Expansion: Texas + Florida*  
*Last updated: June 30, 2026*

[🔝 Back to top](#v-ride--national-rideshare-platform) | [🇪🇸 Ver en Español](#español)

---

---

<a name="español"></a>

# 🇪🇸 Español

Plataforma de transporte de nivel productivo enfocada en adultos mayores y personas con discapacidad en los Estados Unidos. Estilo Uber/Lyft, con lanzamiento en Wyoming y expansión nacional planificada.

**Comisión de plataforma:** 19% estándar → 18% (500+ viajes/año) → 17% (1,500+ viajes/año) · **Pago al conductor:** 81–83% vía Stripe Connect  
**Mercado objetivo:** 1.5M+ adultos mayores/personas con discapacidad · **Estado de lanzamiento:** Wyoming · **Expansión:** Texas + Florida  
**Puntuación actual:** ~980 / 1000 · **47+ funcionalidades** · **33 migraciones de base de datos**

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Móvil (iOS + Android) | React Native + Expo SDK 54 + TypeScript |
| Panel de Administración (Web) | Next.js 14 App Router + Tailwind CSS + Recharts |
| API Backend | Node.js + Express + Socket.io + TypeScript |
| Base de datos | PostgreSQL 15 + PostGIS (Supabase) |
| Caché / GPS en tiempo real | Redis (Railway) |
| Autenticación | Firebase Auth + JWT (custom) |
| Pagos | Stripe + Stripe Connect |
| Mapas | Google Maps Platform |
| Notificaciones push | Firebase Cloud Messaging (14 tipos) |
| Almacenamiento | Supabase Storage (bucket privado `vride-docs`) |
| Deploy Backend | Railway (auto-deploy en cada push) |
| Deploy Dashboard | Vercel |
| Build Móvil | Expo EAS Build |

---

## Estructura del Repositorio

```
vride/
├── backend/          API Node.js + Express
│   ├── src/
│   │   ├── config/         Base de datos, Redis, Firebase, env
│   │   ├── controllers/    Manejadores HTTP (25 controladores)
│   │   ├── middleware/     Auth (JWT + Firebase), rate limiting, clinicAuth
│   │   ├── repositories/  Queries a BD (sin ORM, 25+ repositorios)
│   │   ├── routes/         Routers Express por dominio (22 archivos)
│   │   ├── services/       Lógica de negocio (tarifas, pagos, FCM, email, referidos)
│   │   ├── socket/         Servidor Socket.io + emisor
│   │   ├── types/          Interfaces TypeScript
│   │   └── utils/          JWT, logger, helpers de respuesta
│   ├── Dockerfile
│   ├── railway.toml
│   └── .env.example
│
├── dashboard/        Panel de Administración Next.js 14
│   ├── src/
│   │   ├── app/            Páginas: conductores, viajes, finanzas, disputas,
│   │   │                          alertas SOS, clínicas, incidentes
│   │   ├── components/     AdminShell, Sidebar, Header, UI kit, Gráficas, Mapas
│   │   ├── i18n/           Traducciones ES/EN + I18nProvider
│   │   └── lib/            api.ts, socket.ts, utils.ts
│   └── vercel.json
│
├── mobile/           React Native + Expo SDK 54
│   ├── app/
│   │   ├── (passenger)/   Pantallas del pasajero (30+)
│   │   └── (driver)/      Pantallas del conductor (15+)
│   ├── src/
│   │   ├── components/    SOSButton, NavigationButton, TipModal
│   │   ├── hooks/         useSpeedMonitor, useRouteDeviation, useOfflineCache
│   │   ├── i18n/          react-i18next + locales/es.json + locales/en.json
│   │   ├── services/      Cliente API, Socket.io, Stripe, notificaciones, viajes
│   │   └── store/         Stores Zustand (auth, ride)
│   ├── app.json
│   └── eas.json
│
├── shared/           Tipos TypeScript + constantes compartidas
└── database/
    ├── migrations/   27 archivos SQL (aplicados en producción)
    └── seeds/        Conductores + pasajeros + viajes de Texas
```

---

## Arquitectura

```
App Móvil (Expo SDK 54)
     │  JWT + token Firebase
     ▼
API Backend (Express)  ←──── Socket.io ────→  Panel Admin (Next.js)
     │                            │
     ├── PostgreSQL + PostGIS      └── Tiempo real: GPS, SOS, viajes, incidentes
     ├── Redis (GPS TTL 10s, sesión, caché)
     ├── Firebase (Auth + FCM + Storage)
     ├── Stripe (pagos + Connect)
     └── Google Maps (geocodificación, distancia, rutas)
```

**Decisiones clave de diseño:**
- **Sin geofencing** — acepta cualquier coordenada GPS de EE. UU.
- **Búsqueda de conductor:** radio dinámico 10 → 20 → 40 → 80 → 150 km (PostGIS `ST_DWithin`)
- **Unidad administrativa = Estado de EE. UU.**, no ciudad (configuración de 50 estados en tabla `us_states`)
- **Precio dinámico (surge):** 1.5× en horas pico (12–2pm, 6–9pm)
- **Recibos PDF:** transmitidos vía PDFKit directamente a la respuesta HTTP
- **Compartir viaje:** token Redis (12 caracteres, TTL 2h) → enlace público `/ride/track/:token`
- **Viajes programados:** node-cron + bloqueo optimista previene doble despacho en multi-réplica
- **Programa de referidos:** $50 para el referido en el primer viaje · $600 para quien refiere al llegar a 50 viajes
- **Suscripción:** $29.99/mes → 15% de descuento en todos los viajes
- **Transporte médico:** autenticación con API Key de clínica → códigos ICD-10 → facturación Medicare/Medicaid
- **Caché offline:** hook AsyncStorage para el último estado conocido sin internet

---

## Funcionalidades (47 en total)

### Pasajero
- Solicitud de viaje en tiempo real + rastreo GPS
- Estimación de tarifa + precio dinámico (1.5×)
- Viajes con múltiples paradas (hasta 5)
- Viajes programados (reserva anticipada)
- Viajes recurrentes (horario semanal fijo — diálisis, terapia, etc.)
- **Wait & Return** — el conductor lleva al pasajero a su cita, espera y lo regresa (cobrado por minuto real de espera: $0.30/min TX · $0.35/min FL)
- **Viaje por horas** — conductor disponible para múltiples paradas por hora (paquetes de 2h / 4h / 8h)
- Destinos favoritos + conductores favoritos
- Códigos promocionales con validación
- Suscripción $29.99/mes (15% de descuento en todos los viajes)
- Perfil de accesibilidad (9 opciones: silla de ruedas, oxígeno, etc.)
- Propina post-viaje (10 / 15 / 20% / personalizada)
- Calificación detallada (puntualidad, manejo, amabilidad, limpieza)
- Sistema de disputas (8 razones)
- Recibo PDF con notas del conductor
- Contacto de emergencia notificado por email + GPS al activar SOS
- Alerta de desviación de ruta (umbral de 0.5 millas)
- Lista de espera — notificado cuando hay conductor disponible cerca
- Modo sin conexión (último estado conocido sin internet)
- Verificación de identidad con foto
- Descuento por uso frecuente (10% a partir de 15/semana o 50/mes)
- **Cuentas corporativas** — facturación a empresa, viajes de empleados cargados a la cuenta corporativa
- **Nivel VIP/Premium** — despacho prioritario, asignación de vehículo premium

### Conductor
- Proceso de registro en 5 pasos + carga de documentos
- Solicitudes de viaje en tiempo real con cuenta regresiva de 30 segundos
- Integración con navegación (Waze / Google Maps)
- Gráfica de ganancias (7 días) + meta diaria
- Reporte 1099 con gráfica mensual + umbral IRS $600
- Seguimiento de tasa de aceptación
- Alertas de vencimiento de documentos (30d / 7d / 1d)
- Monitor de velocidad (alerta al superar 75 mph)
- Botón SOS (mantener 2s) → notifica al contacto de emergencia + administrador
- Notas post-viaje para el pasajero
- Bono por racha de días consecutivos activos
- Reporte de incidente durante el viaje (8 tipos)
- Grabación de audio (local)
- Seguimiento de inactividad
- Sistema de certificación (5 módulos de capacitación + quiz de 50 preguntas, requerido antes de activar)
- Notificación de llegada al destino (haptic + audio + banner, se activa a ≤20 pies)
- Marcador en mapa con el color del vehículo del conductor (dinámico)
- Panel inferior colapsable durante el viaje
- **Controles Wait & Return** — temporizador de espera en vivo con costo acumulado, botones "Start Waiting" / "Passenger is Back"
- Controles de zoom en mapa (+/− botones, restablecer a nivel de calle, ajustar ruta) en mapas de conductor y pasajero
- **Ubicación en segundo plano** — continúa enviando GPS mientras la app está minimizada (llamada telefónica, multitarea)
- **Chat en tiempo real** — mensajería durante el viaje entre conductor y pasajero vía Socket.io

### Panel de Administración
- Mapa en vivo de conductores (GPS desde Redis)
- Cola de aprobación de conductores + revisión de documentos
- Suspender / reactivar conductores
- KPIs, ingresos, configuración de tarifas (los 50 estados)
- Gestión de disputas (resolver con notificación FCM)
- Códigos promocionales (crear / activar/desactivar)
- Feed de alertas SOS (auto-actualización cada 30s)
- Gestión de incidentes (resolver con notas)
- Cuentas de clínicas (crear, ver solicitudes pendientes)
- Vincular solicitud de clínica a viaje creado

### Plataforma
- Firebase Auth (Email + Google + Apple)
- 14 tipos de notificaciones FCM
- Recibos por email + email de emergencia SOS
- Programa de referidos ($50 / $600)
- Compartir viaje (enlace público de rastreo)
- Transporte médico (API clínica + ICD-10 + facturación de seguros)

---

## Migraciones de Base de Datos (33 aplicadas)

| # | Archivo | Contenido |
|---|---------|-----------|
| 001 | `001_extensions.sql` | uuid-ossp, PostGIS, pgcrypto |
| 002 | `002_us_states.sql` | 50 estados con configuración de tarifas (19% comisión por defecto) |
| 003 | `003_users_and_auth.sql` | usuarios, refresh_tokens |
| 004 | `004_drivers_and_vehicles.sql` | conductores, vehículos, documentos |
| 005 | `005_ratings_earnings.sql` | calificaciones, ganancias de conductor |
| 006 | `006_notifications_sos_referrals.sql` | notificaciones, alertas SOS, referidos |
| 007–013 | Funcionalidades base | viajes, chats, programados, promos, disputas, accesibilidad |
| 014 | `014_new_features.sql` | favoritos, propinas, múltiples paradas, códigos promo, disputas, accesibilidad |
| 015 | `015_driver_notes_notifications.sql` | notas del conductor, email de emergencia, recordatorios programados |
| 016 | `016_new_features_batch2.sql` | suscripciones, clínicas, viajes recurrentes, incidentes, rachas, lista de espera, facturas médicas |
| 017 | `017_passenger_identity.sql` | verificación de documento de identidad del pasajero |
| 018 | `018_rls_policies.sql` | políticas de Row Level Security (Supabase) |
| 019 | `019_admin_totp.sql` | 2FA para administrador vía TOTP |
| 020 | `020_passenger_identity_back.sql` | corrección/rollback de identidad del pasajero |
| 021 | `021_fix_service_type_constraint.sql` | Agregar 'family' al CHECK constraint de service_type |
| 022 | `022_activate_florida.sql` | Activar Florida con tarifas ajustadas + 19% comisión |
| 023 | `023_wait_and_return_hourly.sql` | Wait & Return + Viaje por Horas — nuevas columnas en rides + us_states, tarifas TX/FL |
| 024 | `024_performance_indexes.sql` | Índices compuestos y parciales PostGIS para queries de alto tráfico (findNearby, despacho) |
| 025 | `025_encrypted_pii_columns.sql` | Columnas PII encriptadas AES-256-GCM para conductores (fecha de nacimiento, SSN, número de licencia) |
| 026 | `026_insurance_audit_log.sql` | Auditoría de seguro TNC: timestamp online_since + log GPS para determinar cobertura en accidentes |
| 027 | `027_corporate_vip_passengers.sql` | Niveles de pasajero (standard/vip/corporate_employee) + tabla corporate_accounts |
| 028 | `028_premium_fares.sql` | Tarifas de servicio premium configuradas para los 50 estados |
| 029 | `029_military_all_states.sql` | Servicio de transporte militar habilitado en los 50 estados |
| 030 | `030_military_training_module.sql` | Módulo de certificación militar VRN-TRN-031 + 10 preguntas de entrenamiento |
| 031 | `031_adjust_texas_fares.sql` | Ajuste tarifas TX: base_fare → $1.55, executive_multiplier → 1.70 |
| 032 | `032_adjust_ny_wy_fares.sql` | Ajuste tarifas NY + WY por índice costo de vida (NY +$2.65, WY +$1.95 sobre Uber) |
| 033 | `033_commission_19_percent.sql` | Comisión plataforma 15%→19% (Silver 14%→18%, Elite 13%→17%), margen neto ~6.5%→~10.5% |

---

## Referencia de API

URL base: `https://vridebackend-production-00dd.up.railway.app/api/v1`

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/auth/register/passenger` | Registrar pasajero (token Firebase) |
| `POST` | `/auth/register/driver` | Registrar conductor |
| `POST` | `/auth/login` | Email + contraseña → JWT |
| `POST` | `/auth/refresh` | Rotar tokens |
| `POST` | `/auth/logout` | Invalidar refresh token |

### Viajes
| Método | Endpoint | Rol | Descripción |
|--------|----------|-----|-------------|
| `POST` | `/ride/estimate` | Pasajero | Estimación de tarifa |
| `POST` | `/ride/request` | Pasajero | Solicitar viaje |
| `POST` | `/ride/:id/cancel` | Pasajero | Cancelar viaje ($3 después de 2 min) |
| `POST` | `/ride/:id/accept` | Conductor | Aceptar viaje |
| `POST` | `/ride/:id/arrived` | Conductor | Llegada al punto de recogida |
| `POST` | `/ride/:id/start` | Conductor | Iniciar viaje |
| `POST` | `/ride/:id/complete` | Conductor | Completar viaje |
| `POST` | `/ride/:id/rate` | Ambos | Calificación detallada (4 subcategorías) |
| `GET`  | `/ride/:id/receipt` | Ambos | Recibo PDF |
| `POST` | `/ride/:id/share` | Pasajero | Generar enlace público de rastreo |
| `GET`  | `/ride/track/:token` | Público | Rastreo en vivo (sin autenticación) |
| `POST` | `/ride/:id/notes` | Conductor | Notas post-viaje |

### Pasajero
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET/POST` | `/favorites/destinations` | Destinos favoritos |
| `GET/POST` | `/favorites/drivers` | Conductores favoritos |
| `GET/POST` | `/accessibility` | Perfil de accesibilidad |
| `PATCH` | `/passenger/emergency-contact` | Configurar contacto de emergencia |
| `GET` | `/passenger/receipts` | Historial de recibos |
| `POST` | `/ride/:id/tip` | Enviar propina (10/15/20%/personalizada) |
| `POST/GET/DELETE` | `/subscription/subscribe\|status\|cancel` | Suscripción mensual |
| `GET/POST/PATCH/DELETE` | `/recurring-ride` | Viajes recurrentes |
| `POST/GET/DELETE` | `/waitlist/join\|status\|leave` | Lista de espera |

### Conductor
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/driver/tax-report?year=` | Reporte 1099 con gráfica mensual |
| `GET` | `/driver/stats` | Ganancias, tasa de aceptación, racha |
| `GET/POST` | `/driver/training` | Módulos de certificación + quiz |
| `POST` | `/driver/location` | Actualización de ubicación HTTP (respaldo modo segundo plano) |

### Pagos y Promociones
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/payment/intent` | Crear PaymentIntent de Stripe |
| `POST` | `/payment/webhook` | Manejador de webhook de Stripe |
| `POST` | `/promo/validate` | Validar código promocional |

### Programados y Referidos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST/GET` | `/scheduled` | Programar viaje con anticipación |
| `GET` | `/referral/stats` | Estadísticas y ganancias de referidos |

### Incidentes y Disputas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/incident` | Reportar incidente durante el viaje |
| `GET` | `/incident/mine` | Mis incidentes reportados |
| `POST` | `/dispute/open` | Abrir disputa |
| `GET` | `/dispute/mine` | Mis disputas |

### SOS
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/sos/activate` | Activar SOS (notifica admin + contacto de emergencia) |
| `POST` | `/sos/resolve/:id` | Admin resuelve alerta SOS |

### Clínica (requiere header X-Clinic-Key)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/clinic/request` | Solicitar transporte para paciente (ICD-10) |
| `GET` | `/clinic/requests` | Listar solicitudes de esta clínica |

### Administrador (requiere JWT con rol admin)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/admin/drivers` | Listar con filtros |
| `GET` | `/admin/drivers/pending-review` | Cola de aprobación |
| `POST` | `/admin/drivers/:id/approve` | Aprobar conductor |
| `POST` | `/admin/drivers/:id/reject` | Rechazar con motivo |
| `POST` | `/admin/drivers/:id/suspend` | Suspender |
| `GET` | `/admin/drivers/online-map` | GPS en vivo desde Redis |
| `GET` | `/admin/rides` | Todos los viajes (filtrable) |
| `GET` | `/admin/finance` | Resumen de ingresos |
| `GET/PUT` | `/admin/fares/:stateCode` | Configuración de tarifas los 50 estados |
| `GET` | `/admin/passengers` | Lista de pasajeros |
| `GET/PUT` | `/admin/disputes` | Listar abiertas + resolver |
| `GET/PUT` | `/admin/incidents` | Listar abiertas + resolver |
| `GET/POST` | `/admin/promos` | Códigos promocionales |
| `GET/POST` | `/admin/clinics` | Cuentas de clínicas |
| `GET` | `/admin/clinics/pending-requests` | Solicitudes de clínica sin asignar |
| `PATCH` | `/admin/clinics/requests/:id/link` | Vincular solicitud a viaje |

---

## Eventos Socket.io

### Cliente → Servidor
| Evento | Descripción |
|--------|-------------|
| `driver:location_update` | Actualización GPS (cada 4s mientras está en línea) |
| `driver:status_change` | Cambio de disponibilidad (en línea/fuera de línea) |
| `driver:ride_response` | Aceptar o rechazar solicitud de viaje |
| `driver:start_wait` | Iniciar temporizador de espera en cita (Wait & Return) |
| `driver:end_wait` | Finalizar espera, iniciar regreso (Wait & Return) |
| `admin:join` | Administrador se une a la sala de operaciones |

### Servidor → Cliente
| Evento | Descripción |
|--------|-------------|
| `passenger:driver_assigned` | Conductor encontrado, viaje confirmado |
| `passenger:driver_location` | Actualización de posición GPS en vivo |
| `passenger:driver_arrived` | Conductor en punto de recogida |
| `passenger:ride_started` | Viaje en progreso |
| `passenger:ride_completed` | Viaje finalizado + monto total |
| `passenger:driver_waiting` | Conductor comenzó espera en cita (Wait & Return) |
| `passenger:driver_done_waiting` | Conductor terminó espera, iniciando regreso (Wait & Return) |
| `driver:new_ride_request` | Nueva solicitud de viaje con cuenta regresiva de 30s |
| `driver:wait_started` | Confirmación: temporizador de espera iniciado |
| `driver:wait_ended` | Confirmación: espera terminada + minutos + tarifa |
| `admin:sos_activated` | Alerta SOS en tiempo real |

---

## Tipos de Notificación FCM (14)

| Tipo | Disparador |
|------|-----------|
| `ride_accepted` | Conductor acepta viaje |
| `driver_arrived` | Conductor en punto de recogida |
| `ride_started` | Viaje comienza |
| `ride_completed` | Viaje finaliza |
| `tip_received` | Pasajero envió propina |
| `dispute_resolved` | Admin resolvió disputa |
| `scheduled_reminder` | 30 min antes del viaje programado |
| `document_expiry` | Documento vence en 30d / 7d / 1d |
| `payment_confirmed` | Pago Stripe confirmado |
| `promo_applied` | Código promo aplicado al viaje |
| `driver_no_show` | Conductor marcado como no presentado |
| `ride_cancelled` | Viaje cancelado (pasajero o conductor) |
| `sos_activated` | SOS activado (solo admin) |
| `referral_bonus` | Bono por referido ganado |

---

## Estructura de Comisiones — Progresiva por Desempeño

La comisión se calcula desde el 1 de enero del año en curso. Una calificación por debajo de 4.75 baja al conductor a Estándar de inmediato.

| Nivel | Comisión | El conductor recibe | Requisito |
|-------|---------|-------------------|-----------|
| **Estándar** | 19% | 81% | Conductor nuevo o calificación < 4.75 |
| **Plata** | 18% | 82% | 500+ viajes este año + calificación ≥ 4.75 |
| **Élite** | 17% | 83% | 1,500+ viajes este año + calificación ≥ 4.75 |

El contador se reinicia el 1 de enero de cada año.

| Tarifa del viaje | Estándar (81%) | Plata (82%) | Élite (83%) |
|-----------------|---------------|------------|------------|
| $10.00 | $8.10 | $8.20 | $8.30 |
| $30.00 | $24.30 | $24.60 | $24.90 |
| $50.00 | $40.50 | $41.00 | $41.50 |
| $100.00 | $81.00 | $82.00 | $83.00 |

---

## Desarrollo Local

**Requisitos previos:** Node.js 20+, PostgreSQL 15 + PostGIS (o Supabase), Redis, proyecto Firebase, API key de Google Maps, cuenta Stripe, Expo CLI + EAS CLI

```bash
# Instalar CLIs
npm i -g expo-cli eas-cli

# Clonar e instalar
git clone https://github.com/EdwardLabrador/v-ride.git
cd v-ride && npm install

# Variables de entorno
cp backend/.env.example backend/.env

# Aplicar las 33 migraciones
node database/run-migration.js 001
# ... hasta 033

# Ejecutar servicios
npm run dev --workspace=backend    # Terminal 1 — puerto 4000
npm run dev --workspace=dashboard  # Terminal 2 — puerto 3000
cd mobile && npx expo start        # Terminal 3 — móvil
```

---

## Deploy

**Backend → Railway:** Push a `master` → auto-deploy vía `backend/railway.toml` + `backend/Dockerfile`

**Dashboard → Vercel:** `cd dashboard && vercel --prod`

**Móvil → EAS Build:**
```bash
cd mobile
eas build --platform all --profile production
eas submit --platform android --profile production
eas submit --platform ios     --profile production
```

---

## Hoja de Ruta hasta 1000/1000

| Puntos | Tarea |
|--------|-------|
| +28 | Stripe en modo real (pagos reales) |
| +20 | Publicar en Google Play ($25 único) |
| +15 | Prueba real con usuarios (viaje completo de extremo a extremo) |
| +10 | Registro TNC en Texas (TDLR) |
| +10 | Integración de verificación de antecedentes (API Checkr) |
| +5  | 2FA panel admin (configuración TOTP) |
| +5  | App Store de iOS ($99/año Apple Developer) |

---

*V-Ride — Transporte confiable para adultos mayores y personas con discapacidad*  
*Cobertura: Estados Unidos · Mercado de lanzamiento: Wyoming · Expansión: Texas + Florida*  
*Última actualización: 30 de junio de 2026*

[🔝 Volver arriba](#v-ride--national-rideshare-platform) | [🇺🇸 Read in English](#english)
