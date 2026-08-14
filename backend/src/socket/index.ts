// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Módulo Socket.io — GPS en tiempo real y eventos de viaje
// Autenticación por JWT en el handshake
// Cada usuario se une a la room "user:{userId}" para eventos dirigidos
// El adaptador Redis permite escalar horizontalmente
// ═══════════════════════════════════════════════════════════════

import { Server as SocketServer, Socket } from 'socket.io';
import { z } from 'zod';
import { verifyAccessToken } from '../utils/jwt';
import { driverRepository } from '../repositories/driverRepository';
import { rideService } from '../services/rideService';
import { rideRepository } from '../repositories/rideRepository';
import { redis, REDIS_KEYS, REDIS_TTL } from '../config/redis';
import { emitToUser, emitToAdmins } from './emitter';
import { logger } from '../utils/logger';
import { JwtPayload } from '../utils/jwt';

const locationSchema = z.object({
  latitude:  z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading:   z.number().min(0).max(360).optional(),
  speed:     z.number().min(0).optional(),
  timestamp: z.number(),
});

const statusSchema   = z.object({ isOnline: z.boolean() });
const rideIdSchema   = z.object({ rideId: z.string().uuid() });
const responseSchema = z.object({ rideId: z.string().uuid(), accepted: z.boolean() });
const messageSchema  = z.object({ rideId: z.string().uuid(), message: z.string().min(1).max(500).trim() });

// Extender Socket con datos del usuario autenticado
interface AuthenticatedSocket extends Socket {
  user: JwtPayload;
}

// Timers de desconexión pendientes por conductor — permite cancelar si se reconecta en < 5 s
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function setupSocketHandlers(io: SocketServer): void {
  // ─────────────────────────────────────
  // MIDDLEWARE DE AUTENTICACIÓN
  // Verifica el JWT en el handshake antes de aceptar la conexión
  // ─────────────────────────────────────
  io.use((socket: Socket, next) => {
    try {
      const token = (socket.handshake.auth as Record<string, string>)['token']
        ?? (socket.handshake.query as Record<string, string>)['token'];

      if (!token) {
        return next(new Error('TOKEN_REQUIRED'));
      }

      const payload = verifyAccessToken(token);
      (socket as AuthenticatedSocket).user = payload;
      next();
    } catch {
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const { userId, role } = socket.user;

    // Unir al usuario a su room personal (para eventos dirigidos)
    void socket.join(`user:${userId}`);

    // Los admins se unen a la room de admin para recibir eventos globales
    if (role === 'admin') {
      void socket.join('admins');
    }

    logger.info(`Socket conectado: ${userId} (${role}) [${socket.id}]`);

    // ─────────────────────────────────────
    // EVENTOS DEL CONDUCTOR
    // ─────────────────────────────────────

    if (role === 'driver') {
      // GPS: conductor envía posición cada 4 segundos
      socket.on('driver:location_update', async (raw: unknown) => {
        try {
          const data = locationSchema.parse(raw);
          // Actualizar posición en BD (PostGIS)
          await driverRepository.updateLocation(
            userId,
            data.longitude,
            data.latitude
          );
          logger.debug(`[GPS] conductor=${userId.slice(0,8)} lat=${data.latitude.toFixed(5)} lng=${data.longitude.toFixed(5)}`);

          // Cachear última posición en Redis (TTL: 10 segundos)
          await redis.setex(
            REDIS_KEYS.driverLocation(userId),
            REDIS_TTL.DRIVER_LOCATION,
            JSON.stringify({ lat: data.latitude, lng: data.longitude, heading: data.heading })
          );

          // Si el conductor tiene un viaje activo: reenviar posición al pasajero
          // y guardar en log GPS (requerido por aseguradora TNC)
          const rideId = await redis.get(REDIS_KEYS.driverActiveRide(userId));
          if (rideId) {
            const ride = await rideRepository.findById(rideId);
            if (ride?.passenger_id) {
              emitToUser(ride.passenger_id, 'passenger:driver_location', {
                rideId,
                latitude:  data.latitude,
                longitude: data.longitude,
                heading:   data.heading,
                speed:     data.speed,
                timestamp: data.timestamp,
              });
            }
            // Log GPS para auditoría de seguro (no bloquea — fire and forget)
            driverRepository.logLocation(userId, rideId, data.latitude, data.longitude, data.heading, data.speed)
              .catch((err: unknown) => console.error('[GPS LOG]', err));
          }

          // Admin: monitoreo global de conductores en tiempo real
          emitToAdmins('admin:driver_location', {
            driverId: userId,
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: data.timestamp,
          });
        } catch (err) {
          logger.error(`Error en location_update de ${userId}:`, err);
        }
      });

      // Cambio de disponibilidad (online/offline)
      socket.on('driver:status_change', async (raw: unknown) => {
        try {
          const data = statusSchema.parse(raw);
          // Si hay un timer de desconexión pendiente (reconexión rápida), cancelarlo
          if (data.isOnline && disconnectTimers.has(userId)) {
            clearTimeout(disconnectTimers.get(userId)!);
            disconnectTimers.delete(userId);
            logger.info(`Conductor ${userId} reconectado — timer de offline cancelado`);
          }
          await driverRepository.updateOnlineStatus(userId, data.isOnline);

          if (data.isOnline) {
            await redis.sadd(REDIS_KEYS.driversOnline, userId);
            emitToAdmins('admin:driver_online', { driverId: userId });
            logger.info(`Conductor ${userId} se conectó`);
          } else {
            await redis.srem(REDIS_KEYS.driversOnline, userId);
            emitToAdmins('admin:driver_offline', { driverId: userId });
            logger.info(`Conductor ${userId} se desconectó`);
          }
        } catch (err) {
          logger.error(`Error en status_change de ${userId}:`, err);
        }
      });

      // Mensajes del conductor al pasajero durante el viaje
      socket.on('driver:message', async (raw: unknown) => {
        try {
          const data = messageSchema.parse(raw);
          const ride = await rideRepository.findById(data.rideId);
          if (!ride || ride.driver_id !== userId || !ride.passenger_id) return;
          emitToUser(ride.passenger_id, 'passenger:driver_message', {
            rideId:    data.rideId,
            message:   data.message,
            timestamp: Date.now(),
          });
        } catch (err) {
          logger.error(`Error en driver:message de ${userId}:`, err);
        }
      });

      // Respuesta a solicitud de viaje (aceptar/rechazar)
      socket.on('driver:ride_response', async (raw: unknown) => {
        try {
          const data = responseSchema.parse(raw);
          await rideService.handleDriverResponse(data.rideId, userId, data.accepted);
        } catch (err) {
          logger.error(`Error en ride_response de ${userId}:`, err);
          socket.emit('error', { message: 'Error al procesar la respuesta' });
        }
      });

      // Respuesta a descuento voluntario (conductor decide si acepta aunque ya cumplió su límite)
      socket.on('driver:voluntary_discount_response', async (raw: unknown) => {
        try {
          const data = responseSchema.parse(raw);
          await rideService.handleVoluntaryDiscountResponse(data.rideId, userId, data.accepted);
        } catch (err) {
          logger.error(`Error en voluntary_discount_response de ${userId}:`, err);
        }
      });

      // Wait & Return — conductor inicia espera en el lugar de la cita
      socket.on('driver:start_wait', async (raw: unknown) => {
        try {
          const data = rideIdSchema.parse(raw);
          await rideService.startWait(data.rideId, userId);
          socket.emit('driver:wait_started', { rideId: data.rideId, startedAt: new Date().toISOString() });
        } catch (err) {
          logger.error(`Error en driver:start_wait de ${userId}:`, err);
          socket.emit('error', { message: 'Could not start wait timer' });
        }
      });

      // Wait & Return — conductor termina espera e inicia regreso
      socket.on('driver:end_wait', async (raw: unknown) => {
        try {
          const data = rideIdSchema.parse(raw);
          const result = await rideService.endWait(data.rideId, userId);
          socket.emit('driver:wait_ended', {
            rideId:      data.rideId,
            waitMinutes: result.waitMinutes,
            waitFare:    result.waitFare,
          });
        } catch (err) {
          logger.error(`Error en driver:end_wait de ${userId}:`, err);
          socket.emit('error', { message: 'Could not end wait timer' });
        }
      });
    }

    // ─────────────────────────────────────
    // EVENTOS DEL PASAJERO
    // ─────────────────────────────────────

    if (role === 'passenger') {
      // El pasajero puede enviar mensajes al conductor durante el viaje
      socket.on('passenger:message', async (raw: unknown) => {
        try {
          const data = messageSchema.parse(raw);
          const ride = await rideRepository.findById(data.rideId);
          if (!ride || ride.passenger_id !== userId || !ride.driver_id) return;

          emitToUser(ride.driver_id, 'driver:passenger_message', {
            rideId: data.rideId,
            message: data.message,
            timestamp: Date.now(),
          });
        } catch (err) {
          logger.error(`Error en passenger:message de ${userId}:`, err);
        }
      });
    }

    // ─────────────────────────────────────
    // DESCONEXIÓN
    // ─────────────────────────────────────
    socket.on('disconnect', (reason) => {
      logger.info(`Socket desconectado: ${userId} (${role}) — ${reason}`);

      if (role === 'driver') {
        // Delay de 5 s antes de marcar offline — permite reconexiones rápidas (modo tunnel, red)
        // sin que el conductor desaparezca del pool durante una búsqueda activa.
        //
        // Con múltiples sockets (Expo StrictMode / reconexiones rápidas), pueden existir varios
        // timers activos para el mismo userId. El Map solo guarda el último, por lo que los
        // anteriores no se cancelan en el reconnect handler. La guardia fetchSockets() resuelve
        // esto: verifica si el conductor tiene sockets activos antes de marcarlo offline.
        const timer = setTimeout(async () => {
          disconnectTimers.delete(userId);
          try {
            const activeSockets = await io.in(`user:${userId}`).fetchSockets();
            if (activeSockets.length > 0) {
              logger.info(`Conductor ${userId}: ${activeSockets.length} socket(s) activo(s) — skip offline`);
              return;
            }
            await driverRepository.updateOnlineStatus(userId, false);
            await redis.srem(REDIS_KEYS.driversOnline, userId);
            emitToAdmins('admin:driver_offline', { driverId: userId });
            logger.info(`Conductor ${userId} marcado offline tras desconexión`);
          } catch (err) {
            logger.error(`Error al desconectar conductor ${userId}:`, err);
          }
        }, 5000);
        disconnectTimers.set(userId, timer);
      }
    });
  });
}
