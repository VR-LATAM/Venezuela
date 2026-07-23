// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Controlador SOS — activación de emergencia en tiempo real
// Guarda el evento, emite a admins via Socket.io y envía push
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sosRepository } from '../repositories/sosRepository';
import { passengerRepository } from '../repositories/passengerRepository';
import { emitToAdmins } from '../socket/emitter';
import { fcmService } from '../services/fcmService';
import { notificationRepository } from '../repositories/notificationRepository';
import { emailService } from '../services/emailService';
import { sendSuccess, sendCreated, sendError } from '../utils/response';

export const sosController = {

  // POST /sos — activar SOS durante un viaje
  activate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        rideId:           z.string().uuid().optional(),
        lat:              z.number().min(-90).max(90).optional(),
        lng:              z.number().min(-180).max(180).optional(),
        addressAtTrigger: z.string().max(500).optional(),
      });

      const body = schema.parse(req.body);
      const userId = req.user!.userId;
      const role   = req.user!.role as 'passenger' | 'driver';

      const event = await sosRepository.create({
        rideId:           body.rideId,
        triggeredBy:      userId,
        triggeredByRole:  role,
        lat:              body.lat,
        lng:              body.lng,
        addressAtTrigger: body.addressAtTrigger,
      });

      // Emitir alerta prioritaria al dashboard del admin en tiempo real
      emitToAdmins('admin:sos_activated', {
        eventId:  event.id,
        rideId:   event.ride_id,
        userId,
        role,
        lat:      event.lat,
        lng:      event.lng,
        address:  event.address_at_trigger,
        time:     event.created_at,
      });

      // Push a los admins online
      fcmService.sendToTopic('vride_admins', {
        title: '🚨 SOS ALERT ACTIVATED',
        body:  `${role === 'passenger' ? 'Passenger' : 'Driver'} activated SOS${body.addressAtTrigger ? ` at ${body.addressAtTrigger}` : ''}`,
        data:  { type: 'sos_activated', eventId: event.id, rideId: event.ride_id ?? '' },
      }).catch(() => {});

      // Si es pasajero, notificar al contacto de emergencia por email
      if (role === 'passenger') {
        passengerRepository.findById(userId).then(async passenger => {
          const p = passenger as any;
          const contactEmail = p?.emergency_contact_email;
          const contactName  = p?.emergency_contact_name ?? 'Emergency Contact';
          if (contactEmail) {
            const mapLink = body.lat && body.lng
              ? `https://maps.google.com/?q=${body.lat},${body.lng}`
              : 'Location not available';
            await emailService.sendEmergencyAlert({
              toEmail:      contactEmail,
              toName:       contactName,
              passengerName: p?.name ?? 'A Verona Ride passenger',
              address:      body.addressAtTrigger ?? 'Unknown location',
              mapLink,
              time:         new Date().toLocaleString('en-US'),
            });
          }
        }).catch(() => {});
      }

      sendCreated(res, { sosEventId: event.id, message: 'SOS alert sent. The Verona Ride team has been notified.' });
    } catch (err) {
      next(err);
    }
  },

  // GET /sos/active (admin) — listar SOS activos
  listActive: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const events = await sosRepository.listActive();
      sendSuccess(res, { events });
    } catch (err) {
      next(err);
    }
  },

  // PUT /sos/:id/resolve (admin) — resolver un SOS
  resolve: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        status: z.enum(['resolved', 'false_alarm']),
        notes:  z.string().max(1000).optional(),
      });

      const { status, notes } = schema.parse(req.body);
      const resolved = await sosRepository.resolve(req.params['id']!, req.user!.userId, status, notes);

      if (!resolved) {
        sendError(res, 404, 'SOS event not found or already resolved', 'NOT_FOUND');
        return;
      }
      sendSuccess(res, { resolved: true });
    } catch (err) {
      next(err);
    }
  },
};
