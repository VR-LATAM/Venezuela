// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Controlador de viajes — endpoints REST del ciclo de vida del viaje
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { rideService } from '../services/rideService';
import { rideRepository } from '../repositories/rideRepository';
import { receiptService } from '../services/receiptService';
import { promoRepository } from '../repositories/promoRepository';
import { tipRepository } from '../repositories/tipRepository';
import { geocodeAddress } from '../services/fareService';
import { fcmService } from '../services/fcmService';
import { notificationRepository } from '../repositories/notificationRepository';
import { userRepository } from '../repositories/userRepository';
import { redis } from '../config/redis';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { ServiceType } from '@vride/shared';

const SERVICE_TYPES = ['standard', 'family', 'executive', 'accessible', 'scheduled', 'hourly', 'wait_and_return'] as const;

export const rideController = {
  // POST /ride/estimate — estimar tarifa antes de confirmar
  estimate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        pickupLat:             z.number().min(-90).max(90),
        pickupLng:             z.number().min(-180).max(180),
        dropoffLat:            z.number().min(-90).max(90).optional(),
        dropoffLng:            z.number().min(-180).max(180).optional(),
        dropoffAddress:        z.string().min(3).optional(),
        serviceType:           z.enum(SERVICE_TYPES).default('standard'),
        stateCode:             z.string().length(2).default('TX'),
        estimatedWaitMinutes:  z.number().int().min(1).max(480).optional(),
        hourlyPackageHours:    z.number().int().min(1).max(12).optional(),
      });
      const body = schema.parse(req.body);

      let dropoffLat = body.dropoffLat;
      let dropoffLng = body.dropoffLng;

      // Si no vienen coordenadas de destino, geocodificar la dirección
      if ((dropoffLat === undefined || dropoffLng === undefined) && body.dropoffAddress) {
        const coords = await geocodeAddress(body.dropoffAddress);
        if (!coords) {
          sendError(res, 422, 'Could not geocode the destination address', 'GEOCODE_FAILED');
          return;
        }
        dropoffLat = coords.lat;
        dropoffLng = coords.lng;
      }

      if (dropoffLat === undefined || dropoffLng === undefined) {
        sendError(res, 422, 'Destination coordinates or address are required', 'MISSING_DROPOFF');
        return;
      }

      const estimate = await rideService.estimateFare({
        pickupLat:            body.pickupLat,
        pickupLng:            body.pickupLng,
        dropoffLat,
        dropoffLng,
        serviceType:          body.serviceType as ServiceType,
        stateCode:            body.stateCode,
        estimatedWaitMinutes: body.estimatedWaitMinutes,
        hourlyPackageHours:   body.hourlyPackageHours,
      });

      sendSuccess(res, estimate);
    } catch (err) {
      next(err);
    }
  },

  // POST /ride/request — solicitar viaje
  requestRide: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        pickupAddress:  z.string().min(3),
        pickupLat:      z.number().min(-90).max(90),
        pickupLng:      z.number().min(-180).max(180),
        dropoffAddress: z.string().min(3),
        dropoffLat:     z.number().min(-90).max(90).optional(),
        dropoffLng:     z.number().min(-180).max(180).optional(),
        serviceType:    z.enum(SERVICE_TYPES).default('standard'),
        stateCode:      z.string().length(2).default('TX'),
        scheduledAt:    z.string().datetime().optional(),
        promoCode:      z.string().max(30).optional(),
        stops:                z.array(z.object({
          address: z.string().min(3),
          lat:     z.number().min(-90).max(90),
          lng:     z.number().min(-180).max(180),
        })).max(5).optional(),
        estimatedWaitMinutes: z.number().int().min(1).max(480).optional(),
        hourlyPackageHours:   z.number().int().min(1).max(12).optional(),
      });
      const body = schema.parse(req.body);

      let dropoffLat = body.dropoffLat;
      let dropoffLng = body.dropoffLng;

      // Geocodificar destino si no vienen coordenadas
      if (dropoffLat === undefined || dropoffLng === undefined) {
        const coords = await geocodeAddress(body.dropoffAddress);
        if (!coords) {
          sendError(res, 422, 'Could not geocode the destination address', 'GEOCODE_FAILED');
          return;
        }
        dropoffLat = coords.lat;
        dropoffLng = coords.lng;
      }

      // Validar promo code si viene
      let promoDiscount = 0;
      let validatedPromoCode: string | undefined;
      if (body.promoCode) {
        const promoResult = await promoRepository.validateForPassenger(body.promoCode, req.user!.userId);
        if (!promoResult.valid) {
          sendError(res, 422, promoResult.reason ?? 'Invalid promo code', 'INVALID_PROMO');
          return;
        }
        validatedPromoCode = promoResult.promo!.code;
        promoDiscount = promoResult.promo!.discount_percent;
      }

      const ride = await rideService.requestRide({
        passengerId:    req.user!.userId,
        serviceType:    body.serviceType as ServiceType,
        pickupAddress:  body.pickupAddress,
        pickupLat:      body.pickupLat,
        pickupLng:      body.pickupLng,
        dropoffAddress: body.dropoffAddress,
        dropoffLat,
        dropoffLng,
        stateCode:            body.stateCode,
        scheduledAt:          body.scheduledAt,
        promoCode:            validatedPromoCode,
        promoDiscount,
        estimatedWaitMinutes: body.estimatedWaitMinutes,
        hourlyPackageHours:   body.hourlyPackageHours,
      });

      // Guardar paradas intermedias si las hay
      if (body.stops?.length) {
        for (let i = 0; i < body.stops.length; i++) {
          const stop = body.stops[i]!;
          await rideRepository.addStop(ride.id, i + 1, stop.address, stop.lat, stop.lng);
        }
      }

      // Registrar uso del promo code
      if (validatedPromoCode && promoDiscount > 0) {
        const promo = await promoRepository.findByCode(validatedPromoCode);
        if (promo) {
          promoRepository.recordUse(promo.id, req.user!.userId, ride.id).catch(() => {});
          promoRepository.incrementUseCount(promo.id).catch(() => {});
        }
      }

      sendCreated(res, ride);
    } catch (err) {
      if (err instanceof Error && err.message === 'PASSENGER_HAS_ACTIVE_RIDE') {
        sendError(res, 409, 'You already have an active ride', 'ACTIVE_RIDE_EXISTS');
        return;
      }
      if (err instanceof Error && err.message === 'PAYMENT_METHOD_DECLINED') {
        sendError(res, 402, 'Payment method could not be processed', 'PAYMENT_METHOD_DECLINED');
        return;
      }
      next(err);
    }
  },

  // GET /ride/active — viaje activo del usuario autenticado
  getActive: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = req.user!.role;
      const userId = req.user!.userId;

      const ride = role === 'passenger'
        ? await rideRepository.findActiveByPassenger(userId)
        : await rideRepository.findActiveByDriver(userId);

      sendSuccess(res, ride ?? null);
    } catch (err) {
      next(err);
    }
  },

  // GET /ride/:rideId — detalle de un viaje
  getById: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ride = await rideRepository.findById(req.params['rideId'] ?? '');
      if (!ride) {
        sendError(res, 404, 'Ride not found', 'NOT_FOUND');
        return;
      }
      // Verificar que el usuario tiene acceso a este viaje
      const userId = req.user!.userId;
      if (ride.passenger_id !== userId && ride.driver_id !== userId && req.user!.role !== 'admin') {
        sendError(res, 403, 'You do not have access to this ride', 'FORBIDDEN');
        return;
      }
      sendSuccess(res, ride);
    } catch (err) {
      next(err);
    }
  },

  // POST /ride/:rideId/cancel — cancelar viaje
  cancelRide: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        reason: z.string().optional(),
      });
      const { reason } = schema.parse(req.body);

      const ride = await rideService.cancelRide(
        req.params['rideId'] ?? '',
        req.user!.userId,
        req.user!.role as 'passenger' | 'driver',
        reason
      );
      sendSuccess(res, ride);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'RIDE_NOT_FOUND') { sendError(res, 404, 'Ride not found', 'NOT_FOUND'); return; }
        if (err.message === 'NOT_YOUR_RIDE')  { sendError(res, 403, 'This is not your ride', 'FORBIDDEN'); return; }
        if (err.message === 'CANNOT_CANCEL_IN_STATUS') {
          sendError(res, 409, 'Ride cannot be cancelled in its current status', 'INVALID_STATUS'); return;
        }
      }
      next(err);
    }
  },

  // POST /ride/:rideId/arrived — conductor llegó al punto de recogida
  driverArrived: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ride = await rideService.driverArrived(
        req.params['rideId'] ?? '',
        req.user!.userId
      );
      sendSuccess(res, ride);
    } catch (err) {
      handleRideError(err, res, next);
    }
  },

  // POST /ride/:rideId/start — iniciar viaje (pasajero a bordo)
  startRide: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ride = await rideService.startRide(
        req.params['rideId'] ?? '',
        req.user!.userId
      );
      sendSuccess(res, ride);
    } catch (err) {
      handleRideError(err, res, next);
    }
  },

  // POST /ride/:rideId/complete — finalizar viaje
  completeRide: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ride = await rideService.completeRide(
        req.params['rideId'] ?? '',
        req.user!.userId
      );
      sendSuccess(res, ride);
    } catch (err) {
      handleRideError(err, res, next);
    }
  },

  // POST /ride/:rideId/rate — calificar el viaje
  rateRide: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        score:   z.number().int().min(1).max(5),
        comment: z.string().max(500).optional(),
      });
      const { score, comment } = schema.parse(req.body);

      await rideService.submitRating({
        rideId:    req.params['rideId'] ?? '',
        raterId:   req.user!.userId,
        raterRole: req.user!.role as 'passenger' | 'driver',
        score,
        comment,
      });

      sendSuccess(res, { rated: true });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'RIDE_NOT_COMPLETED') {
          sendError(res, 409, 'You can only rate completed rides', 'RIDE_NOT_COMPLETED'); return;
        }
      }
      next(err);
    }
  },

  // GET /ride/history — historial de viajes del usuario
  getHistory: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit  = parseInt(req.query['limit']  as string || '20');
      const offset = parseInt(req.query['offset'] as string || '0');
      const role = req.user!.role;

      if (role === 'admin') {
        sendError(res, 403, 'Admins use the web dashboard', 'FORBIDDEN');
        return;
      }

      const rides = await rideRepository.findHistory(req.user!.userId, role as 'passenger' | 'driver', limit, offset);
      sendSuccess(res, rides);
    } catch (err) {
      next(err);
    }
  },

  // GET /ride/:rideId/receipt — descargar recibo PDF del viaje
  getReceipt: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rideId = req.params['rideId']!;
      const userId = req.user!.userId;
      const role   = req.user!.role as 'passenger' | 'driver' | 'admin';

      // Obtener viaje con datos de pasajero y conductor para el recibo
      const { rows } = await (await import('../config/database')).db.query<any>(
        `SELECT r.*,
                ST_Y(r.pickup_location::geometry)  AS pickup_lat,
                ST_X(r.pickup_location::geometry)  AS pickup_lng,
                ST_Y(r.dropoff_location::geometry) AS dropoff_lat,
                ST_X(r.dropoff_location::geometry) AS dropoff_lng,
                u_p.name  AS passenger_name,
                u_p.email AS passenger_email,
                u_d.name  AS driver_name,
                CONCAT(d.vehicle_color, ' ', d.vehicle_brand, ' ', d.vehicle_model) AS driver_vehicle
         FROM rides r
         JOIN users u_p ON u_p.id = r.passenger_id
         LEFT JOIN users u_d ON u_d.id = r.driver_id
         LEFT JOIN drivers d ON d.id = r.driver_id
         WHERE r.id = $1`,
        [rideId]
      );

      if (!rows[0]) { sendError(res, 404, 'Ride not found', 'NOT_FOUND'); return; }

      const ride = rows[0];

      // Solo el pasajero, conductor o admin pueden descargar el recibo
      if (role !== 'admin' && ride.passenger_id !== userId && ride.driver_id !== userId) {
        sendError(res, 403, 'Unauthorized', 'FORBIDDEN'); return;
      }

      if (ride.status !== 'completed') {
        sendError(res, 422, 'Receipt is only available for completed rides', 'NOT_COMPLETED'); return;
      }

      const doc = receiptService.generatePDF({ ride });
      const filename = `recibo-veronaride-${rideId.slice(0, 8)}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      doc.pipe(res);
    } catch (err) {
      next(err);
    }
  },

  // POST /ride/:rideId/share — generar token de seguimiento público (TTL 2h)
  // Devuelve una URL que cualquier persona puede usar para ver la ubicación del conductor
  createShareToken: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rideId = req.params['rideId']!;
      const userId = req.user!.userId;

      const ride = await rideRepository.findById(rideId);
      if (!ride) { sendError(res, 404, 'Viaje no encontrado', 'NOT_FOUND'); return; }
      if (ride.passenger_id !== userId) { sendError(res, 403, 'Unauthorized', 'FORBIDDEN'); return; }
      if (!['driver_assigned', 'driver_arriving', 'driver_arrived', 'in_progress'].includes(ride.status)) {
        sendError(res, 422, 'Ride is not currently active', 'INVALID_STATUS'); return;
      }

      // Generar token corto único con TTL de 2 horas
      const token = uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase();
      await redis.setex(`share:${token}`, 7200, JSON.stringify({ rideId, passengerId: userId }));

      const shareUrl = `${process.env.APP_BASE_URL ?? 'https://vride.com'}/track/${token}`;
      sendSuccess(res, { token, shareUrl, expiresInSeconds: 7200 });
    } catch (err) {
      next(err);
    }
  },

  // POST /ride/:rideId/tip — propina al conductor
  addTip: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { amount } = z.object({ amount: z.number().positive().max(100) }).parse(req.body);
      const rideId = req.params['rideId']!;
      const passengerId = req.user!.userId;

      const ride = await rideRepository.findById(rideId);
      if (!ride) { sendError(res, 404, 'Ride not found', 'NOT_FOUND'); return; }
      if (ride.passenger_id !== passengerId) { sendError(res, 403, 'Not your ride', 'FORBIDDEN'); return; }
      if (ride.status !== 'completed') { sendError(res, 422, 'Can only tip on completed rides', 'INVALID_STATUS'); return; }
      if (!ride.driver_id) { sendError(res, 422, 'No driver assigned', 'NO_DRIVER'); return; }

      const existing = await tipRepository.getByRide(rideId);
      if (existing) { sendError(res, 409, 'Tip already sent for this ride', 'TIP_ALREADY_SENT'); return; }

      const tip = await tipRepository.create({
        rideId, passengerId, driverId: ride.driver_id, amount,
      });

      // Notificar al conductor que recibió una propina
      const [driverToken, passenger] = await Promise.all([
        notificationRepository.getPrimaryToken(ride.driver_id),
        userRepository.findById(passengerId),
      ]);
      if (driverToken) {
        fcmService.notifyTipReceived(driverToken, amount, passenger?.name ?? 'A passenger').catch(() => {});
      }

      sendCreated(res, { tip });
    } catch (err) { next(err); }
  },

  // POST /ride/:rideId/notes — conductor agrega notas al finalizar
  addDriverNotes: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { notes } = z.object({ notes: z.string().max(500) }).parse(req.body);
      const rideId = req.params['rideId']!;
      const ride = await rideRepository.findById(rideId);
      if (!ride) { sendError(res, 404, 'Ride not found', 'NOT_FOUND'); return; }
      if (ride.driver_id !== req.user!.userId) { sendError(res, 403, 'Not your ride', 'FORBIDDEN'); return; }
      await rideRepository.setDriverNotes(rideId, notes);
      sendSuccess(res, { saved: true });
    } catch (err) { next(err); }
  },

  // GET /ride/:rideId/stops — paradas intermedias del viaje
  getStops: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stops = await rideRepository.getStops(req.params['rideId']!);
      sendSuccess(res, { stops });
    } catch (err) { next(err); }
  },

  // POST /ride/:rideId/stops/:stopId/arrive — conductor llegó a una parada
  markStopArrived: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await rideRepository.markStopArrived(req.params['stopId']!);
      sendSuccess(res, { arrived: true });
    } catch (err) { next(err); }
  },

  // GET /ride/track/:token — seguimiento público por token (no requiere auth)
  trackByToken: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.params['token']!;
      const raw   = await redis.get(`share:${token}`);
      if (!raw) { sendError(res, 404, 'Tracking link is invalid or has expired', 'NOT_FOUND'); return; }

      const { rideId } = JSON.parse(raw) as { rideId: string };
      const ride = await rideRepository.findById(rideId);
      if (!ride) { sendError(res, 404, 'Viaje no encontrado', 'NOT_FOUND'); return; }

      // Devolver info pública mínima — sin datos personales
      const driverLoc = await redis.get(`driver:location:${ride.driver_id}`);
      sendSuccess(res, {
        status:         ride.status,
        pickupAddress:  ride.pickup_address,
        dropoffAddress: ride.dropoff_address,
        driverLocation: driverLoc ? JSON.parse(driverLoc) : null,
      });
    } catch (err) {
      next(err);
    }
  },
};

function handleRideError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof Error) {
    switch (err.message) {
      case 'RIDE_NOT_FOUND':    sendError(res, 404, 'Ride not found', 'NOT_FOUND'); return;
      case 'NOT_YOUR_RIDE':     sendError(res, 403, 'This is not your ride', 'FORBIDDEN'); return;
      case 'INVALID_RIDE_STATUS':
        sendError(res, 409, 'Ride is not in the correct status for this action', 'INVALID_STATUS'); return;
    }
  }
  next(err);
}
