// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Hook de caché offline — cifrado AES-256-GCM con clave por dispositivo
// Clave maestra en SecureStore; datos cifrados en AsyncStorage
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const CACHE_PREFIX  = 'vride_cache_';
const KEY_STORE_ID  = 'vride_cache_key_v1';

// ── Gestión de la clave maestra ───────────────────────────────

async function getMasterKey(): Promise<CryptoKey> {
  let keyB64 = await SecureStore.getItemAsync(KEY_STORE_ID);

  if (!keyB64) {
    // Primera vez: genera clave AES-256 y la persiste en SecureStore
    const raw = crypto.getRandomValues(new Uint8Array(32));
    keyB64 = Buffer.from(raw).toString('base64');
    await SecureStore.setItemAsync(KEY_STORE_ID, keyB64, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  const rawKey = Uint8Array.from(Buffer.from(keyB64, 'base64'));
  return crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

// ── Cifrar / descifrar ────────────────────────────────────────

async function encryptString(key: CryptoKey, plaintext: string): Promise<string> {
  const iv      = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipher  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  // Formato: base64(iv) + '.' + base64(ciphertext)
  return `${Buffer.from(iv).toString('base64')}.${Buffer.from(cipher).toString('base64')}`;
}

async function decryptString(key: CryptoKey, payload: string): Promise<string> {
  const [ivB64, dataB64] = payload.split('.');
  if (!ivB64 || !dataB64) throw new Error('invalid payload');
  const iv      = Uint8Array.from(Buffer.from(ivB64,  'base64'));
  const data    = Uint8Array.from(Buffer.from(dataB64, 'base64'));
  const plain   = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(plain);
}

// ── API pública de caché ──────────────────────────────────────

export const offlineCache = {
  save: async (key: string, data: unknown): Promise<void> => {
    try {
      const masterKey = await getMasterKey();
      const json      = JSON.stringify({ data, savedAt: new Date().toISOString() });
      const encrypted = await encryptString(masterKey, json);
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, encrypted);
    } catch { /* silencioso — el caché es best-effort */ }
  },

  load: async <T>(key: string): Promise<{ data: T; savedAt: string } | null> => {
    try {
      const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!raw) return null;

      // Retrocompatibilidad: si no tiene '.', era texto plano (migrar transparentemente)
      if (!raw.includes('.')) {
        return JSON.parse(raw);
      }

      const masterKey = await getMasterKey();
      const json      = await decryptString(masterKey, raw);
      return JSON.parse(json);
    } catch { return null; }
  },

  clear: async (key: string): Promise<void> => {
    try { await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`); } catch { /* silencioso */ }
  },

  clearAll: async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
      if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys);
    } catch { /* silencioso */ }
  },
};

// ── Hook de estado de conectividad ────────────────────────────

export interface OfflineState {
  isOnline: boolean;
  isChecking: boolean;
}

export function useOfflineCache(): OfflineState {
  const [isOnline,   setIsOnline]   = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setup = async () => {
      setIsChecking(true);
      try {
        // @ts-ignore — optional peer dependency, safe fallback if not installed
        const NetInfoModule = await import('@react-native-community/netinfo').catch(() => null);
        if (NetInfoModule) {
          const state = await NetInfoModule.default.fetch();
          setIsOnline(state.isConnected ?? true);
          unsubscribe = NetInfoModule.default.addEventListener((s: any) => {
            setIsOnline(s.isConnected ?? true);
          });
        }
      } catch {
        setIsOnline(true);
      } finally {
        setIsChecking(false);
      }
    };

    setup();
    return () => { unsubscribe?.(); };
  }, []);

  return { isOnline, isChecking };
}
