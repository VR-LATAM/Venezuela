// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Cliente HTTP Axios — interceptores de autenticación automática
// Todos los requests incluyen el JWT. Si expira, renueva silenciosamente.
// ═══════════════════════════════════════════════════════════════

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const _rawApiUrl = Constants.expoConfig?.extra?.apiUrl
  ?? process.env['EXPO_PUBLIC_API_URL']
  ?? 'http://localhost:3000';

// En producción, forzar HTTPS — nunca conectar con HTTP en producción
if (!__DEV__ && !_rawApiUrl.startsWith('https://')) {
  throw new Error(`[Security] API_URL must use HTTPS in production. Got: ${_rawApiUrl.slice(0, 30)}`);
}
const API_URL = _rawApiUrl;

export const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─────────────────────────────────────
// INTERCEPTOR DE REQUEST — agrega JWT a cada llamada
// ─────────────────────────────────────
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─────────────────────────────────────
// INTERCEPTOR DE RESPONSE — renueva JWT si expiró (401)
// ─────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Encolar el request mientras se renueva el token
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const accessToken = await refreshAccessToken();
        if (!accessToken) throw new Error('No refresh token');

        // Resolver todos los requests en cola con el nuevo token
        failedQueue.forEach(({ resolve }) => resolve(accessToken));
        failedQueue = [];

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch {
        failedQueue.forEach(({ reject }) => reject(error));
        failedQueue = [];
        // Token de refresh inválido — forzar logout
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        // El AuthStore se encargará de redirigir al login
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Renueva el access_token usando el refresh_token guardado en SecureStore.
// Usado tanto por el interceptor HTTP como por el socket service.
// Retorna el nuevo accessToken, o null si no hay refresh_token disponible.
export async function refreshAccessToken(): Promise<string | null> {
  const storedRefresh = await SecureStore.getItemAsync('refresh_token');
  if (!storedRefresh) return null;
  const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken: storedRefresh });
  const { accessToken, refreshToken: newRefresh } = response.data.data as {
    accessToken: string; refreshToken: string;
  };
  await SecureStore.setItemAsync('access_token', accessToken);
  await SecureStore.setItemAsync('refresh_token', newRefresh);
  return accessToken;
}

// Helper para extraer el mensaje de error del response
export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error ?? error.message ?? 'Unknown error';
  }
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}
