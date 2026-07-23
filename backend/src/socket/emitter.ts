// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Socket Emitter — referencia singleton al servidor Socket.io
// Rompe la dependencia circular entre rideService ↔ index.ts
// Permite que cualquier servicio emita eventos sin importar io directamente
// ═══════════════════════════════════════════════════════════════

import { Server as SocketServer } from 'socket.io';
import { logger } from '../utils/logger';

let io: SocketServer | null = null;

// Inicializar con la instancia de Socket.io al arrancar el servidor
export function initSocketEmitter(server: SocketServer): void {
  io = server;
  logger.info('✅ Socket emitter inicializado');
}

// Emitir evento a un usuario específico por su ID
// Usa rooms: cada usuario está en la room "user:{userId}"
export function emitToUser(userId: string, event: string, data: unknown): void {
  if (!io) {
    logger.warn(`Socket emitter no inicializado. No se pudo emitir ${event} a ${userId}`);
    return;
  }
  io.to(`user:${userId}`).emit(event, data);
}

// Emitir evento a todos los admins conectados
export function emitToAdmins(event: string, data: unknown): void {
  if (!io) return;
  io.to('admins').emit(event, data);
}

// Obtener la instancia de io (para el módulo de socket si necesita acceso directo)
export function getIo(): SocketServer | null {
  return io;
}
