// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
// Singleton Socket.io client para el dashboard admin
// Recibe eventos en tiempo real: GPS, SOS, viajes nuevos

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth:            { token },
    transports:      ['websocket'],
    reconnection:    true,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Admin conectado:', socket?.id);
    // Unirse a la sala de admins para recibir SOS y otros eventos
    socket?.emit('admin:join');
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Desconectado:', reason);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export type { Socket };
