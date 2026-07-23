# V-Ride — Memoria del Proyecto
> Última actualización: 2026-05-29

---

## Estado actual

- **Backend:** Deployado en Railway → `https://vridebackend-production-00dd.up.railway.app`
- **Base de datos:** Supabase (PostgreSQL + PostGIS), 11 migraciones aplicadas en producción
- **APK Android:** Build `139a91de-c9e7-43d7-b4f3-1ae0ac1fc511` (pre-certificación — necesita rebuild)
- **iOS:** Sin build — requiere Apple Developer Program ($99/año)

---

## Sesión 2026-05-29 — Sistema de Certificación por Tipo de Servicio

### Qué se implementó
Sistema completo donde el conductor debe leer material instructivo y aprobar un examen para certificarse en cada tipo de servicio. Sin certificación, no puede ir online.

### Flujo
```
Conductor completa registro →
→ Lee módulo Foundation (embarazadas, adultos mayores, post-cirugía, niños) →
→ Aprueba examen Foundation (8/10) →
→ Se desbloquean módulos por tipo de servicio →
→ Lee + aprueba examen de cada servicio →
→ Servicio queda certificado →
→ Puede ir online solo con servicios certificados
```

### Archivos nuevos
| Archivo | Descripción |
|---------|-------------|
| `database/migrations/013_service_certifications.sql` | Tabla `driver_service_certifications`, columnas `service_type` e `is_prerequisite` |
| `database/seeds/003_certification_modules.sql` | 5 módulos + 50 preguntas basadas en VRN-TRN-026 y VRN-TRN-027 |

### Archivos modificados
| Archivo | Cambio |
|---------|--------|
| `backend/src/repositories/trainingRepository.ts` | Funciones de certificación |
| `backend/src/services/trainingService.ts` | Genera certificación al aprobar examen |
| `backend/src/controllers/trainingController.ts` | Endpoint `GET /training/certifications` |
| `backend/src/routes/training.routes.ts` | Ruta `/certifications` |
| `mobile/src/services/trainingService.ts` | Tipos y llamada a API de certificaciones |
| `mobile/src/store/trainingStore.ts` | Estado de certificaciones + helpers |
| `mobile/app/(driver)/training.tsx` | UI agrupada por tipo de servicio con candados |
| `mobile/app/(driver)/home.tsx` | Bloquea ir online sin certificaciones |

### Módulos creados (basados en manuales de D:\APPs\Manuales\Manuales 5\)
| Código | Módulo | Puntaje mínimo | Habilita |
|--------|--------|----------------|----------|
| VRN-TRN-026 | Special Passenger Categories (Foundation) | 8/10 | Todos (prerequisito) |
| VRN-TRN-027-STD | Standard Service | 8/10 | Standard |
| VRN-TRN-027-EXE | Executive Service | 9/10 | Executive |
| VRN-TRN-027-ACC | Accessible Service | 9/10 | Accessible |
| VRN-TRN-027-SCH | Scheduled Service | 8/10 | Scheduled |

---

## Pendientes para activar el sistema de certificación

- [ ] Ejecutar `database/migrations/013_service_certifications.sql` en Supabase SQL Editor
- [ ] Ejecutar `database/seeds/003_certification_modules.sql` en Supabase SQL Editor
- [ ] `git push` → Railway redeploya backend automáticamente
- [ ] `eas build --platform android --profile preview` → nuevo APK

---

## Otros pendientes del proyecto

| Prioridad | Tarea | Archivos relevantes |
|-----------|-------|---------------------|
| URGENTE | Ejecutar migración 012 (audit logs) en Supabase | `database/migrations/012_audit_logs.sql` |
| Media | Foto de perfil no carga en app | `mobile/src/hooks/usePhotoUpload.ts`, `UserAvatar.tsx` |
| Media | Reconexión de viaje activo sin probar | `mobile/src/store/rideStore.ts` |
| Baja | Google Play Console ($25 único) | APK listo para subir |
| Baja | Stripe sk_live_ para cobros reales | Variables en Railway |

---

## Arquitectura

```
mobile/     → React Native + Expo 54, EAS Build
backend/    → Node.js + Express + TypeScript, Railway (Docker)
database/   → Supabase PostgreSQL + PostGIS
dashboard/  → Next.js (admin panel)
```

## Historial de sesiones
- **2026-05-27** — 11 security fixes, audit logging, Redis real, APK rebuild
- **2026-05-29** — Sistema de certificación por tipo de servicio (implementado, pendiente de deploy)
