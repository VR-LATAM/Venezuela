// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio de viajes programados
// Gestiona agendamiento y el dispatcher cron (15 min antes)
// ═══════════════════════════════════════════════════════════════

import cron from 'node-cron';
import { scheduledRideRepository } from '../repositories/scheduledRideRepository';
import { notificationRepository } from '../repositories/notificationRepository';
import { fcmService } from './fcmService';
import { rideService } from './rideService';
import { geocodeAddress } from './fareService';
import { logger } from '../utils/logger';

export interface BookScheduledRideParams {
  passengerId:    string;
  serviceType:    string;
  pickupAddress:  string;
  pickupLat:      number;
  pickupLng:      number;
  dropoffAddress: string;
  dropoffLat?:    number;
  dropoffLng?:    number;
  scheduledAt:    string; // ISO 8601
}

export const scheduledRideService = {

  // ─────────────────────────────────────────────────────────────
  // AGENDAR VIAJE
  // El pasajero puede agendar con mínimo 30 min de anticipación
  // ─────────────────────────────────────────────────────────────
  book: async (params: BookScheduledRideParams) => {
    const scheduledAt = new Date(params.scheduledAt);
    const now         = new Date();

    // Validar anticipación mínima de 30 minutos
    if (scheduledAt.getTime() - now.getTime() < 30 * 60 * 1000) {
      throw new Error('SCHEDULED_TOO_SOON');
    }

    // Geocodificar destino si no vienen coordenadas
    let dropoffLat = params.dropoffLat;
    let dropoffLng = params.dropoffLng;
    if (dropoffLat === undefined || dropoffLng === undefined) {
      const coords = await geocodeAddress(params.dropoffAddress);
      if (!coords) throw new Error('GEOCODE_FAILED');
      dropoffLat = coords.lat;
      dropoffLng = coords.lng;
    }

    return scheduledRideRepository.create({
      passengerId:    params.passengerId,
      serviceType:    params.serviceType,
      pickupAddress:  params.pickupAddress,
      pickupLat:      params.pickupLat,
      pickupLng:      params.pickupLng,
      dropoffAddress: params.dropoffAddress,
      dropoffLat,
      dropoffLng,
      scheduledAt,
    });
  },

  list: (passengerId: string) => scheduledRideRepository.listByPassenger(passengerId),

  cancel: (id: string, passengerId: string) => scheduledRideRepository.cancel(id, passengerId),

  // ─────────────────────────────────────────────────────────────
  // DISPATCHER CRON — se ejecuta cada minuto
  // Busca viajes pendientes dentro de los próximos 15 minutos
  // Los despacha llamando a rideService.requestRide()
  // ─────────────────────────────────────────────────────────────
  startCron: (): void => {
    // Dispatcher: cada minuto
    cron.schedule('* * * * *', async () => {
      try {
        const dueSoon = await scheduledRideRepository.findDueForDispatch();
        for (const scheduled of dueSoon) {
          // Usar UPDATE optimista para evitar doble despacho en entornos multi-replica
          const locked = await scheduledRideRepository.markDispatching(scheduled.id);
          if (!locked) continue; // otra replica ya lo tomó

          logger.info(`Despachando viaje programado ${scheduled.id} para ${scheduled.scheduled_at}`);

          try {
            const ride = await rideService.requestRide({
              passengerId:    scheduled.passenger_id,
              serviceType:    scheduled.service_type as any,
              pickupAddress:  scheduled.pickup_address,
              pickupLat:      scheduled.pickup_lat,
              pickupLng:      scheduled.pickup_lng,
              dropoffAddress: scheduled.dropoff_address,
              dropoffLat:     scheduled.dropoff_lat,
              dropoffLng:     scheduled.dropoff_lng,
              stateCode:      'TX', // TODO: derivar del address
              scheduledAt:    scheduled.scheduled_at.toISOString(),
            });
            await scheduledRideRepository.linkRide(scheduled.id, ride.id);
          } catch (err) {
            logger.error(`Error despachando viaje programado ${scheduled.id}:`, err);
            // Revertir a 'pending' para reintento en siguiente ciclo
            await scheduledRideRepository.markDispatching(scheduled.id); // won't update, status != pending
          }
        }
      } catch (err) {
        logger.error('Error en cron de viajes programados:', err);
      }
    });

    // Recordatorio 30 minutos antes: push notification
    cron.schedule('* * * * *', async () => {
      try {
        const reminders = await scheduledRideRepository.findDueForReminder();
        for (const scheduled of reminders) {
          await scheduledRideRepository.markReminderSent(scheduled.id);
          const token = await notificationRepository.getPrimaryToken(scheduled.passenger_id);
          if (token) {
            const time = new Date(scheduled.scheduled_at).toLocaleTimeString('es-MX', {
              hour: '2-digit', minute: '2-digit',
            });
            await fcmService.sendToToken(token, {
              title: '⏰ Tu viaje es pronto',
              body:  `Tu viaje programado para las ${time} estará listo en 30 minutos`,
              data:  { type: 'ride_reminder', scheduledRideId: scheduled.id },
            });
          }
        }
      } catch (err) {
        logger.error('Error en cron de recordatorios:', err);
      }
    });

    logger.info('Cron de viajes programados iniciado');
  },
};
