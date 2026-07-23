// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio Socket.io — cliente singleton
// Se conecta con el JWT del usuario autenticado
// Auto-reconexión con backoff exponencial
// ═══════════════════════════════════════════════════════════════

import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { refreshAccessToken } from './apiClient';

// Deben coincidir con los errores emitidos en backend/src/socket/index.ts
const SOCKET_AUTH_ERRORS = new Set(['INVALID_TOKEN', 'TOKEN_REQUIRED']);

const API_URL = Constants.expoConfig?.extra?.apiUrl
  ?? process.env['EXPO_PUBLIC_API_URL']
  ?? 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private isConnecting = false;
  private isRefreshingToken = false;

  // ─────────────────────────────────────
  // Conectar con el JWT almacenado
  // ─────────────────────────────────────
  async connect(): Promise<void> {
    if (this.socket?.connected || this.isConnecting) return;

    const hasToken = !!(await SecureStore.getItemAsync('access_token'));
    if (!hasToken) return;

    this.isConnecting = true;

    this.socket = io(API_URL, {
      // Callback en lugar de objeto estático: lee el token fresco en cada intento de conexión.
      // Si el token fue renovado silenciosamente (ver connect_error handler), el siguiente
      // intento de reconexión usará el token nuevo desde SecureStore.
      auth: (cb) => {
        SecureStore.getItemAsync('access_token').then(t => cb({ token: t ?? '' }));
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30_000,
      timeout: 10_000,
    });

    this.socket.on('connect', () => {
      this.isConnecting = false;
      console.log('[Socket] Conectado:', this.socket?.id);
    });

    this.socket.on('connect_error', async (err) => {
      this.isConnecting = false;
      console.warn('[Socket] Error de conexión:', err.message);

      // Token expirado o ausente — renovar silenciosamente.
      // El apiClient HTTP renueva en 401, pero el socket no pasa por axios.
      if (SOCKET_AUTH_ERRORS.has(err.message) && !this.isRefreshingToken) {
        this.isRefreshingToken = true;
        this.isConnecting = true; // bloquear connect() externo durante el refresh
        try {
          const newToken = await refreshAccessToken();
          if (!newToken) {
            // Sin refresh_token no hay forma de renovar — detener reconexión
            this.socket?.disconnect();
            this.isRefreshingToken = false;
            this.isConnecting = false;
            return;
          }
          // No llamar socket.connect() manualmente: el callback auth ya lee el token
          // fresco de SecureStore en el próximo intento automático de socket.io.
          // Mantener los flags bloqueados hasta que el socket conecte efectivamente.
          const resetFlags = () => {
            this.isRefreshingToken = false;
            this.isConnecting = false;
          };
          this.socket?.once('connect', resetFlags);
          setTimeout(resetFlags, 30_000); // failsafe: liberar si connect nunca llega
        } catch {
          console.warn('[Socket] Refresh falló — el usuario debe iniciar sesión de nuevo');
          this.isRefreshingToken = false;
          this.isConnecting = false;
        }
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Desconectado:', reason);
    });
  }

  // ─────────────────────────────────────
  // Desconectar y limpiar
  // ─────────────────────────────────────
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.isConnecting = false;
  }

  // ─────────────────────────────────────
  // Emitir evento al servidor
  // ─────────────────────────────────────
  emit(event: string, data?: unknown): void {
    if (!this.socket?.connected) {
      console.warn(`[Socket] No conectado. Evento ${event} descartado.`);
      return;
    }
    this.socket.emit(event, data);
  }

  // ─────────────────────────────────────
  // Suscribirse a un evento del servidor
  // Devuelve función para desuscribirse (úsala en useEffect cleanup)
  // ─────────────────────────────────────
  on(event: string, handler: (data: unknown) => void): () => void {
    this.socket?.on(event, handler);
    return () => {
      this.socket?.off(event, handler);
    };
  }

  // Remover listener específico
  off(event: string, handler?: (data: unknown) => void): void {
    if (handler) {
      this.socket?.off(event, handler);
    } else {
      this.socket?.removeAllListeners(event);
    }
  }

  // Verificar si está conectado
  get connected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Singleton — una sola conexión por sesión de la app
export const socketService = new SocketService();
