# Geofencing "I Arrived" — Desactivado para pruebas internas

## Estado actual
El bloque de geofencing en `handleMarkArrived` está **comentado** para permitir pruebas sin moverse físicamente.

## Archivo a modificar
`mobile/app/(driver)/home.tsx` — función `handleMarkArrived`

## Qué hacer antes de producción
Descomentar el siguiente bloque dentro de `handleMarkArrived`:

```typescript
// if (driverPos) {
//   const a = activeRide as any;
//   const pickupLat = a.pickup_lat ?? a.pickup_location?.latitude;
//   const pickupLng = a.pickup_lng ?? a.pickup_location?.longitude;
//   if (pickupLat && pickupLng) {
//     const distMiles = haversineDistanceMiles(driverPos.latitude, driverPos.longitude, pickupLat, pickupLng);
//     if (distMiles > 0.15) {
//       Alert.alert(
//         'Not at pickup yet',
//         `You are ${Math.round(distMiles * 5280)} ft away from the pickup point. Drive closer before marking arrival.`
//       );
//       return;
//     }
//   }
// }
```

## Lógica
- Radio permitido: **0.15 millas (~240 metros)** del punto de recogida
- Si el conductor está más lejos, el botón "I arrived" muestra un Alert con la distancia exacta en pies y bloquea la acción
- El GPS se actualiza cada 4 segundos — en vida real es imposible de evadir

## Por qué está comentado
Durante pruebas internas el conductor y el pasajero están en ubicaciones distintas. El geofencing bloquearía el flujo completo de prueba.
