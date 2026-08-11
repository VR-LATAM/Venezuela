---
name: sesion-2026-08-09-parte5
description: Fix completeRide (pago efectivo), Carga unificada (4 sub-tipos), comisión 0% limpieza total, formulario remitente/destinatario, tabla de tarifas
metadata:
  type: project
---

## Sesión 2026-08-09 — Parte 5

### 1. Fix completeRide — constraint payment_status
**Problema:** Al finalizar un viaje el backend lanzaba `rides_payment_status_check` constraint violation.
**Causa raíz:** El bloque de Stripe intentaba cobrar aunque Venezuela es 100% efectivo, y dejaba `paymentStatus = 'pending'` en condiciones de error.
**Fix:** Se eliminó todo el bloque Stripe en `completeRide`. Venezuela = efectivo, al finalizar el viaje se marca directamente `paymentStatus = 'completed'`.
- `backend/src/services/rideService.ts` — línea ~557
- `backend/src/controllers/rideController.ts` — se quitó el `console.error` de debug y el `err.message` expuesto al cliente

**Why:** Venezuela no tiene integración Stripe. El conductor recibe el dinero del pasajero en efectivo.
**How to apply:** Nunca procesar Stripe en Venezuela. Si se agrega otro país con pagos digitales, mantener la lógica por separado.

---

### 2. Reorganización servicio Carga en pasajero
**Antes:** Grid con 8 botones independientes: Moto, Sedán, SUV, Encomienda, Pick-Up, Plataforma, Carga, Programado.
**Después:** Grid con 6 botones. "Carga" actúa como categoría que expande sub-fila con 4 opciones:

```
🛻 Pick-Up  |  🚛 Plataforma  |  🛻 F-350  |  🚚 NPR 400+
```

- `mobile/app/(passenger)/home.tsx`
- `CARGA_SUB_OPTIONS` — array constante con los 4 sub-tipos
- La tarjeta "Carga" se activa cuando `selectedService` es `carga`, `pickup` o `plataforma`
- Al cambiar sub-tipo, `offeredPrice` se resetea a 0 para tomar el estimado del nuevo servicio

---

### 3. Formulario unificado de Carga (todos los 4 sub-tipos)
Todos comparten el mismo formulario completo:
1. **Dirección de recogida** — editable + geocodificación + botón ↺
2. **Tipo de carga** — descripción libre de lo que se transporta
3. **Precio ofrecido** — ajuste ±$1 (era ±$5) con precio base como referencia
4. **Quien entrega** — nombre + teléfono del remitente (campos nuevos)
5. **Quien recibe** — nombre + teléfono del destinatario

**Archivos modificados:**
- `mobile/app/(passenger)/home.tsx` — formulario unificado, estado `cargaSenderName` + `cargaSenderPhone`
- `mobile/src/services/rideService.ts` — `RequestRideParams` incluye `senderName`, `senderPhone`
- `backend/src/controllers/rideController.ts` — schema Zod acepta `senderName`, `senderPhone`
- `backend/src/services/rideService.ts` — `RequestRideParams` incluye `senderName`, `senderPhone`; se pasan al socket del conductor
- `backend/src/repositories/rideRepository.ts` — INSERT incluye `sender_name`, `sender_phone`

**Migración BD requerida (`010_ve_sender_fields.sql`):**
```sql
ALTER TABLE rides
  ADD COLUMN IF NOT EXISTS sender_name  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sender_phone VARCHAR(30);
```

---

### 4. Limpieza total de comisión — 0% en Venezuela
**Antes:** `getDriverCommissionInfo` calculaba tiers 17%/18%/19% (lógica USA). Fallback era `rate: 0.19`. Admin no permitía 0%.

**Después:**
- `getDriverCommissionInfo` siempre devuelve `rate: 0` — `backend/src/services/rideService.ts`
- Fallback en `driverController.ts` → `rate: 0`
- Admin validation → `z.number().min(0)` (antes `min(5)`)
- Tiers `silver`/`elite` eliminados — solo queda `'standard'`

**Migración BD requerida (`011_ve_zero_commission.sql`):**
```sql
UPDATE us_states SET platform_commission_percent = 0
WHERE code IN ('DC','AM','AN','AP','AR','BA','BO','CA','CO','DE','FA','GU','LG','LA','ME','MI','MO','NE','PO','SU','TA','TR','YA','ZU');
```

---

### 5. Tabla de tarifas actuales (Venezuela — todos los estados)

| Parámetro | Valor actual |
|---|---|
| Tarifa base | $1.00 |
| Por kilómetro | $0.40/km ($0.64/milla) |
| Por minuto | $0.10/min |
| Tarifa mínima | $2.50 |
| Surge hora pico | ×1.3 |
| Comisión plataforma | **0%** |

**Multiplicadores por servicio:**

| Servicio | Multiplicador |
|---|---|
| Moto | ×0.75 |
| Sedán | ×1.0 |
| SUV | ×1.30 |
| Pick-Up | ×1.20 |
| Plataforma | ×1.60 |
| Encomienda (moto) | ×0.45 |
| Encomienda (sedán) | ×0.60 |
| Encomienda (SUV) | ×0.78 |
| Carga F-350 | ×2.0 (referencia negociación) |
| Carga NPR 400+ | ×2.5 (referencia negociación) |

**Servicios por horas:**

| Paquete | Precio fijo |
|---|---|
| 2 horas | $20.00 |
| 4 horas | $35.00 |
| 8 horas | $60.00 |
| Espera/min (Wait & Return) | $0.10/min |

### 6. Tarifas propuestas (pendiente de aplicar)

| Parámetro | Actual | Propuesto |
|---|---|---|
| Tarifa base | $1.00 | $1.25 |
| Por kilómetro | $0.40/km | $0.50/km |
| Por minuto | $0.10/min | $0.13/min |
| Tarifa mínima | $2.50 | $3.50 |

**Why:** Con 0% de comisión, subir ~25% las tarifas sigue siendo más barato para el pasajero que la competencia (que cobra 20% de comisión), y el conductor gana significativamente más.
**How to apply:** Actualizar en panel admin por estado, o via SQL UPDATE en `us_states`.
