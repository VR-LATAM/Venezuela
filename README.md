# V-Ride Venezuela

🇻🇪 Plataforma de transporte privado para Venezuela · Moto · Sedán · SUV

---

## Resumen

V-Ride Venezuela es una plataforma completa de transporte privado adaptada al mercado venezolano. Incluye app móvil para pasajeros y conductores, panel de administración web y API backend con tiempo real vía Socket.io.

- **Mercado:** Venezuela · 24 estados + Distrito Capital  
- **Moneda:** USD con conversión automática a Bolívares (VES) vía tasa BCV  
- **Pagos:** Efectivo (Stripe no opera en Venezuela)  
- **Comisión:** 0% — el conductor recibe el 100% de la tarifa  
- **Modelo de ingresos:** Membresía semanal por tipo de vehículo (Moto / Sedán / SUV)  
- **Tipos de vehículo:** 🏍️ Moto · 🚗 Sedán · 🚙 SUV  

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Móvil (iOS + Android) | React Native + Expo SDK 54 + TypeScript |
| Panel de administración | Next.js 14 App Router + Tailwind CSS + Recharts |
| API backend | Node.js + Express + Socket.io + TypeScript |
| Base de datos | PostgreSQL 15 + PostGIS (Supabase) |
| Caché / GPS en tiempo real | Redis (Railway) |
| Autenticación | Firebase Auth + JWT custom |
| Mapas | Google Maps Platform |
| Notificaciones push | Firebase Cloud Messaging |
| Almacenamiento de documentos | Supabase Storage — bucket privado `vride-docs` |
| Deploy backend | Railway |
| Deploy dashboard | Vercel |
| Build móvil | Expo EAS Build / Expo Go (desarrollo) |

---

## Estructura del repositorio

```
V-Ride_Venezuela/
├── backend/                    API Node.js + Express
│   ├── src/
│   │   ├── config/             Base de datos, Redis, Firebase, env
│   │   ├── controllers/        Controladores HTTP (25+)
│   │   ├── middleware/         Auth JWT, rate limiting, clinicAuth
│   │   ├── repositories/       Queries SQL directas (sin ORM)
│   │   ├── routes/             Routers Express por dominio
│   │   ├── services/           Lógica de negocio (tarifas, membresía, Socket.io)
│   │   ├── socket/             Servidor Socket.io + emisor
│   │   └── utils/              JWT, logger, PII crypto (AES-256-GCM)
│   ├── Dockerfile
│   └── railway.toml
│
├── dashboard/                  Panel de Administración Next.js 14
│   └── src/app/                Conductores, viajes, finanzas, disputas, SOS
│
├── mobile/                     App React Native + Expo SDK 54
│   ├── app/
│   │   ├── (auth)/             Login, registro pasajero, registro conductor (8 pasos)
│   │   ├── (passenger)/        Pantallas del pasajero (30+)
│   │   ├── (driver)/           Pantallas del conductor (15+)
│   │   └── (info)/             Contacto, privacidad, aviso legal
│   └── src/
│       ├── services/           API client, Socket.io, rides, driver
│       ├── store/              Zustand: authStore, rideStore
│       └── hooks/              usePhotoUpload, useSpeedMonitor
│
├── shared/                     Tipos TypeScript + constantes compartidas
│
└── database/
    ├── migrations/             Migraciones SQL numeradas
    │   └── venezuela/          Migraciones específicas VE (módulos training)
    └── scripts/                Scripts de parche y utilidades
```

---

## Arquitectura

```
App Móvil (Expo)
     │  JWT + Firebase token
     ▼
API Backend (Railway)  ←── Socket.io ──→  Panel Admin (Vercel)
     │                          │
     ├── PostgreSQL + PostGIS   └── Tiempo real: GPS, solicitudes, SOS
     ├── Redis (GPS 10s TTL, sesiones, caché tarifas)
     ├── Supabase Storage (documentos conductores — URLs firmadas 10 años)
     ├── Firebase Auth + FCM
     └── Google Maps (geocodificación, distancia, rutas)
```

**Decisiones de diseño Venezuela:**
- **Sin Stripe** — viajes se completan como pago en efectivo; el backend omite el hold y continúa
- **Comisión 0%** — `commissionRate = 0` en `rideService.ts`; el conductor recibe el 100%
- **Membresía semanal** — modelo de ingresos de la plataforma: conductor paga membresía según tipo de vehículo
- **Tasa de cambio BCV** — `exchangeRateService.ts` convierte tarifas USD → VES en tiempo real
- **Estados venezolanos** — 24 estados + DC (código `DC` = Distrito Capital, usado como fallback)
- **Tipo de vehículo único** — el conductor elige Moto, Sedán o SUV al registrarse; solo recibe solicitudes de ese tipo
- **Búsqueda de conductor** — radio dinámico 10 → 20 → 40 → 80 km (PostGIS `ST_DWithin`)
- **Documentos privados** — URLs firmadas de Supabase Storage, no públicas

---

## Funcionalidades

### Pasajero
- Solicitud de viaje en tiempo real + rastreo GPS del conductor
- Estimación de tarifa por tipo (Moto / Sedán / SUV) en USD y VES
- Precio dinámico (surge 1.5× en horas pico)
- Viajes programados (reserva anticipada)
- Historial de viajes y recibos
- Perfil de accesibilidad (silla de ruedas, oxígeno, etc.)
- Calificación detallada post-viaje (puntualidad, manejo, amabilidad, limpieza)
- Sistema de disputas
- Contacto de emergencia + botón SOS
- Alerta de desviación de ruta
- Chat en tiempo real con el conductor durante el viaje
- Destinos y conductores favoritos
- Foto de perfil (upload a Supabase Storage)

### Conductor
- **Registro en 8 pasos:**
  1. Datos personales (foto, cédula V-/E-, dirección, estado VE)
  2. Licencia de conducir (número + vencimiento + fotos)
  3. Tipo de vehículo (Moto / Sedán / SUV) + datos del vehículo
  4. Seguro del vehículo
  5. Fotos del vehículo (frente, trasera, laterales, interior) + selfie
  6. Certificaciones opcionales (primeros auxilios, manejo defensivo, etc.)
  7. Idiomas, equipamiento y preferencias musicales
  8. Revisión y envío
- Pantalla **Mis documentos** — ver identidad, licencia, vehículo, seguro y certificaciones
- Cambiar tipo de vehículo desde el menú (Moto / Sedán / SUV)
- Solicitudes de viaje en tiempo real con cuenta regresiva de 30 segundos + tono Nokia
- Navegación integrada (Waze / Google Maps)
- Ganancias del día y semana
- Historial de servicios
- Sistema de capacitación con módulos por tipo de vehículo y quiz
- Membresía semanal (ver estado y renovar)
- Reportes de estadísticas y fiscal
- Monitor de velocidad (alerta al superar límite)
- Botón SOS (mantener 2 segundos)
- Chat en tiempo real con el pasajero

### Panel de Administración
- Mapa en vivo de conductores (GPS desde Redis)
- Cola de aprobación de conductores + revisión de documentos
- Suspender / reactivar conductores
- KPIs, ingresos, configuración de tarifas por estado
- Gestión de disputas (resolver con notificación FCM)
- Códigos promocionales (crear / activar / desactivar)
- Feed de alertas SOS (auto-actualización cada 30s)
- Gestión de incidentes

---

## Tipos de servicio y tarifas

| Tipo | Emoji | Campo BD | Descripción |
|------|-------|----------|-------------|
| Moto | 🏍️ | `motorcycle` | Motocicleta |
| Sedán | 🚗 | `sedan` | Sedan / Compacto / Familiar |
| SUV | 🚙 | `suv` | SUV / Camioneta / Minivan |

Las tarifas base se configuran por estado en la tabla `ve_states` (o `us_states` con código VE). La conversión USD → VES se obtiene en tiempo real desde el servicio de tasa BCV.

---

## Membresía semanal (modelo de ingresos Venezuela)

En lugar de comisión por viaje, los conductores pagan una membresía semanal según su tipo de vehículo:

| Tipo | Precio semanal |
|------|---------------|
| Moto | (configurado en tabla `membership_plans`) |
| Sedán | (configurado en tabla `membership_plans`) |
| SUV | (configurado en tabla `membership_plans`) |

La membresía se gestiona en `driver_memberships`. El conductor inicia el trámite desde la pantalla **Mi membresía** en la app.

---

## Registro de conductor — Documentos requeridos

| Documento | Campo BD |
|-----------|---------|
| Foto de la cédula (frente) | `cedula_front` → columna aparte |
| Frente de licencia | `license_front_url` |
| Dorso de licencia | `license_back_url` |
| Frente del vehículo | `vehicle_photo_front_url` |
| Trasera del vehículo | `vehicle_photo_back_url` |
| Lado izquierdo | `vehicle_photo_left_url` |
| Lado derecho | `vehicle_photo_right_url` |
| Interior | `vehicle_interior_url` |
| Póliza de seguro | `insurance_doc_url` |
| Selfie del conductor | `selfie` → `photo_url` en users |

Todos los documentos se almacenan en el bucket privado `vride-docs` de Supabase Storage con URLs firmadas de 10 años. El acceso se hace vía endpoint del backend (nunca credenciales directas en el cliente).

---

## Estados venezolanos

| Código | Estado |
|--------|--------|
| DC | Distrito Capital (Caracas) — **código por defecto** |
| AM | Amazonas |
| AN | Anzoátegui |
| AP | Apure |
| AR | Aragua |
| BA | Barinas |
| BO | Bolívar |
| CA | Carabobo |
| CO | Cojedes |
| DA | Delta Amacuro |
| FA | Falcón |
| GU | Guárico |
| LA | Lara |
| ME | Mérida |
| MI | Miranda |
| MO | Monagas |
| NE | Nueva Esparta |
| PO | Portuguesa |
| SU | Sucre |
| TA | Táchira |
| TR | Trujillo |
| VA | Vargas (La Guaira) |
| YA | Yaracuy |
| ZU | Zulia |

---

## Migraciones de base de datos

### Migraciones base (heredadas de V-Ride USA — aplicadas)
| # | Contenido |
|---|-----------|
| 001 | Extensiones: uuid-ossp, PostGIS, pgcrypto |
| 002 | us_states: configuración de tarifas por estado |
| 003 | users, refresh_tokens |
| 004 | drivers, documentos, vehículos |
| 005 | ratings, driver_earnings |
| 006 | notifications, sos_alerts, referrals |
| 007–013 | rides, chats, scheduled, promos, disputes, accessibility |
| 014 | favorites, tips, multi-stop, promo_codes |
| 015 | driver_notes, emergency_contact, scheduled_reminders |
| 016 | subscriptions, clinics, incidents, streaks, waitlist |
| 017 | passenger identity verification |
| 018 | Row Level Security (Supabase) |
| 019 | Admin 2FA TOTP |
| 020–033 | Ajustes tarifas, PII encriptado, corporativo, comisiones |

### Migraciones Venezuela (específicas)
| Archivo | Contenido |
|---------|-----------|
| `venezuela/004_ve_training_modules.sql` | Módulos de capacitación Venezuela |
| `venezuela/005_ve_adapt_training_modules.sql` | Adaptación módulos al sistema VE |
| `venezuela/006_ve_sedan_suv_modules.sql` | Módulos específicos Sedán y SUV |

### Scripts de utilidad
| Archivo | Uso |
|---------|-----|
| `scripts/patch_missing_columns.sql` | Parche para columnas faltantes en BD de producción |

---

## Variables de entorno (backend)

```env
# Base de datos
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Firebase
FIREBASE_SERVICE_ACCOUNT_JSON=...

# Supabase Storage (documentos conductores)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

# JWT
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# Google Maps
GOOGLE_MAPS_API_KEY=...

# Rate limiting
RATE_LIMIT_AUTH_MAX=120
```

> **Nota:** Stripe no está configurado para Venezuela. El backend maneja el fallo del hold de Stripe como pago en efectivo y continúa el viaje normalmente.

---

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Variables de entorno
cp backend/.env.example backend/.env
# Completar con credenciales reales

# Backend (puerto 4000)
npm run dev --workspace=backend

# Dashboard (puerto 3000)
npm run dev --workspace=dashboard

# App móvil (con túnel para dispositivo físico)
cd mobile && npx expo start --tunnel --clear
```

---

## Deploy

**Backend → Railway:**
```bash
# Railway no auto-despliega de GitHub en este proyecto
# Usar el botón "Redeploy" en Railway o:
railway up --detach
```

El `Dockerfile` usa multi-stage build. La versión de build se controla con el echo al final del paso de compilación (ej. `echo "v2.0"`) para forzar invalidación de caché.

**Dashboard → Vercel:**
```bash
cd dashboard && vercel --prod
```

**App móvil → EAS Build:**
```bash
cd mobile
eas build --platform all --profile production
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

---

## Eventos Socket.io

### Cliente → Servidor
| Evento | Descripción |
|--------|-------------|
| `driver:location_update` | GPS cada 4s mientras está en línea |
| `driver:status_change` | Toggle online/offline |
| `driver:ride_response` | Aceptar o rechazar solicitud |

### Servidor → Cliente
| Evento | Descripción |
|--------|-------------|
| `passenger:driver_assigned` | Conductor encontrado |
| `passenger:driver_location` | GPS del conductor en vivo |
| `passenger:driver_arrived` | Conductor en punto de recogida |
| `passenger:ride_started` | Viaje en progreso |
| `passenger:ride_completed` | Viaje finalizado + monto |
| `driver:new_ride_request` | Nueva solicitud con countdown 30s |
| `driver:ride_cancelled` | Pasajero canceló (durante búsqueda o en curso) |

---

## Notas de producción Venezuela

- **Pago en efectivo:** El backend intenta el hold de Stripe, falla silenciosamente y continúa el viaje como pago en efectivo. No hay cargo automático.
- **Comisión 0%:** `commissionRate = 0` — el conductor recibe el 100% de la tarifa mostrada.
- **Tasa BCV:** `exchangeRateService.ts` obtiene la tasa oficial y la cachea en Redis. Si falla, usa la última tasa guardada.
- **Fotos de perfil:** Se usan URLs firmadas de Supabase con `x-upsert: true` para permitir reemplazo. El upload usa `fetch` nativo (no axios) para manejar correctamente el boundary del multipart.
- **Tipo de vehículo del conductor:** Se guarda en `drivers.services[]` (ej. `{sedan}`). La búsqueda de conductores filtra por este campo. Si es NULL, el conductor recibe todos los tipos (comportamiento legado).
- **Cédula venezolana:** Solo se sube el frente (el dorso no tiene información adicional útil).

---

*V-Ride Venezuela · Verona Group Venezuela*  
*Última actualización: agosto 2026*
