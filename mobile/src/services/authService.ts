// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio de autenticación — Firebase Auth + llamadas al API
// ═══════════════════════════════════════════════════════════════

import axios from 'axios';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  sendEmailVerification,
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from './apiClient';
import { User } from '@vride/shared';
import { initializeApp, getApps, getApp } from 'firebase/app';
import Constants from 'expo-constants';

export function getFirebaseAuth() {
  if (!getApps().length) {
    const app = initializeApp({
      apiKey:            process.env['EXPO_PUBLIC_FIREBASE_API_KEY']!,
      authDomain:        process.env['EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN']!,
      projectId:         process.env['EXPO_PUBLIC_FIREBASE_PROJECT_ID']!,
      storageBucket:     process.env['EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET']!,
      messagingSenderId: process.env['EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID']!,
      appId:             process.env['EXPO_PUBLIC_FIREBASE_APP_ID']!,
    });
    initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  }
  return getAuth(getApp());
}

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterResult {
  emailVerificationPending: boolean;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

// Guardar tokens de forma segura en el dispositivo
async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync('access_token', accessToken),
    SecureStore.setItemAsync('refresh_token', refreshToken),
  ]);
}

// Limpiar tokens al hacer logout
async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync('access_token'),
    SecureStore.deleteItemAsync('refresh_token'),
  ]);
}

export const authService = {
  // ─────────────────────────────────────
  // LOGIN con email + password
  // ─────────────────────────────────────
  loginWithEmail: async (email: string, password: string): Promise<AuthResult> => {
    // Modo dev: bypass Firebase, login directo por email
    if (process.env['EXPO_PUBLIC_APP_ENV'] === 'development') {
      const response = await apiClient.post('/auth/dev-login', { email });
      const { user, tokens } = response.data.data;
      await saveTokens(tokens.accessToken, tokens.refreshToken);
      return { user, ...tokens };
    }
    const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    const firebaseToken = await credential.user.getIdToken();
    const response = await apiClient.post('/auth/login', { firebaseToken });
    const { user, tokens } = response.data.data;
    await saveTokens(tokens.accessToken, tokens.refreshToken);
    return { user, ...tokens };
  },

  // ─────────────────────────────────────
  // LOGIN con Google
  // ─────────────────────────────────────
  loginWithGoogle: async (idToken: string): Promise<AuthResult> => {
    const googleCredential = GoogleAuthProvider.credential(idToken);
    const credential = await signInWithCredential(getFirebaseAuth(), googleCredential);
    const firebaseToken = await credential.user.getIdToken();
    const response = await apiClient.post('/auth/login', { firebaseToken });
    const { user, tokens } = response.data.data;
    await saveTokens(tokens.accessToken, tokens.refreshToken);
    return { user, ...tokens };
  },

  // ─────────────────────────────────────
  // REGISTRO de pasajero
  // ─────────────────────────────────────
  registerPassenger: async (params: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    language?: string;
    stateCode?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactEmail?: string;
    passengerCategories?: string[];
    photoUri?: string;
  }): Promise<RegisterResult> => {
    // Modo dev: bypass Firebase, registro directo por email
    if (process.env['EXPO_PUBLIC_APP_ENV'] === 'development') {
      const response = await apiClient.post('/auth/dev-register/passenger', {
        email: params.email,
        name: params.name,
        phone: params.phone,
        stateCode: params.stateCode,
      });
      const { user, tokens } = response.data.data;
      await saveTokens(tokens.accessToken, tokens.refreshToken);
      if (params.photoUri) {
        try {
          const fd = new FormData();
          fd.append('photo', { uri: params.photoUri, name: 'profile.jpg', type: 'image/jpeg' } as any);
          const photoRes = await apiClient.post('/user/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          if (photoRes.data?.photoUrl) user.photo_url = photoRes.data.photoUrl;
        } catch {}
      }
      return { emailVerificationPending: false, user, ...tokens };
    }

    // 1. Crear cuenta en Firebase
    const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), params.email, params.password);

    // 2. Enviar email de verificación (antes de registrar en backend)
    await sendEmailVerification(credential.user);

    // 3. Registrar en nuestro backend (crea el usuario en Supabase)
    const firebaseToken = await credential.user.getIdToken();
    let passengerResponse;
    try {
      passengerResponse = await apiClient.post('/auth/register/passenger', {
        firebaseToken,
        name:                  params.name,
        phone:                 params.phone,
        language:              params.language,
        stateCode:             params.stateCode,
        emergencyContactName:  params.emergencyContactName,
        emergencyContactPhone: params.emergencyContactPhone,
        emergencyContactEmail: params.emergencyContactEmail,
        passengerCategories:   params.passengerCategories,
      });
    } catch (apiErr) {
      // Si el backend falla, borrar la cuenta de Firebase para permitir reintento con el mismo email
      try { await credential.user.delete(); } catch {}
      throw apiErr;
    }

    // 4. Guardar tokens para poder subir la foto de perfil antes de verificar email
    const { user, tokens } = passengerResponse.data.data;
    await saveTokens(tokens.accessToken, tokens.refreshToken);

    // 5. Subir foto de perfil si fue seleccionada (no bloquea el registro si falla)
    if (params.photoUri) {
      try {
        const fd = new FormData();
        fd.append('photo', { uri: params.photoUri, name: 'profile.jpg', type: 'image/jpeg' } as any);
        const photoRes = await apiClient.post('/user/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (photoRes.data?.photoUrl) user.photo_url = photoRes.data.photoUrl;
      } catch {}
    }

    return { emailVerificationPending: true, user, ...tokens };
  },

  // ─────────────────────────────────────
  // REGISTRO de conductor
  // ─────────────────────────────────────
  registerDriver: async (params: {
    email: string;
    password: string;
    name: string;
    phone: string;
    language?: string;
    stateCode: string;
    referralCode?: string;
  }): Promise<RegisterResult> => {
    // Modo dev: bypass Firebase, registro directo
    if (process.env['EXPO_PUBLIC_APP_ENV'] === 'development') {
      const response = await apiClient.post('/auth/dev-register/driver', {
        email: params.email,
        name: params.name,
        phone: params.phone,
        stateCode: params.stateCode,
        referralCode: params.referralCode,
      });
      const { user, tokens } = response.data.data;
      await saveTokens(tokens.accessToken, tokens.refreshToken);
      return { emailVerificationPending: false, user, ...tokens };
    }

    // 1. Crear cuenta en Firebase
    const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), params.email, params.password);

    // 2. Enviar email de verificación
    await sendEmailVerification(credential.user);

    // 3. Registrar en backend
    const firebaseToken = await credential.user.getIdToken();
    let driverResponse;
    try {
      driverResponse = await apiClient.post('/auth/register/driver', {
        firebaseToken,
        name: params.name,
        phone: params.phone,
        language: params.language,
        stateCode: params.stateCode,
        referralCode: params.referralCode,
      });
    } catch (apiErr) {
      // Si el backend falla, borrar la cuenta de Firebase para permitir reintento con el mismo email
      try { await credential.user.delete(); } catch {}
      throw apiErr;
    }

    // 4. Guardar tokens aunque email no esté verificado — permite completar el wizard de 8 pasos
    // El email verification controla el acceso a viajes, no el registro del perfil
    const { user, tokens } = driverResponse.data.data;
    await saveTokens(tokens.accessToken, tokens.refreshToken);

    return { emailVerificationPending: true, user, ...tokens };
  },

  // ─────────────────────────────────────
  // VERIFICAR EMAIL — recarga el estado Firebase y hace login si está verificado
  // ─────────────────────────────────────
  checkEmailVerified: async (): Promise<AuthResult | null> => {
    const auth = getFirebaseAuth();
    if (!auth.currentUser) return null;

    // Recargar el estado del usuario desde los servidores de Firebase
    await auth.currentUser.reload();
    if (!auth.currentUser.emailVerified) return null;

    // Email verificado — obtener token fresco y hacer login en el backend
    const firebaseToken = await auth.currentUser.getIdToken(true);
    const response = await apiClient.post('/auth/login', { firebaseToken });
    const { user, tokens } = response.data.data;
    await saveTokens(tokens.accessToken, tokens.refreshToken);
    return { user, ...tokens };
  },

  // ─────────────────────────────────────
  // REENVIAR EMAIL DE VERIFICACIÓN
  // ─────────────────────────────────────
  resendVerificationEmail: async (): Promise<void> => {
    const auth = getFirebaseAuth();
    if (!auth.currentUser) throw new Error('NO_USER');
    await sendEmailVerification(auth.currentUser);
  },

  // ─────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Continuar con logout local aunque falle el servidor
    }
    if (process.env['EXPO_PUBLIC_APP_ENV'] !== 'development') {
      await signOut(getFirebaseAuth());
    }
    await clearTokens();
  },

  // ─────────────────────────────────────
  // VERIFICAR si hay sesión activa (al abrir la app)
  // ─────────────────────────────────────
  checkSession: async (): Promise<User | null> => {
    const token = await SecureStore.getItemAsync('access_token');
    if (!token) return null;

    try {
      const response = await apiClient.get('/auth/me');
      return response.data.data as User;
    } catch {
      return null;
    }
  },

  // ─────────────────────────────────────
  // SOCIAL LOGIN — solo hace login, lanza USER_NOT_FOUND si no existe la cuenta
  // Usar desde la pantalla de login con Google/Apple
  // ─────────────────────────────────────
  socialLogin: async (firebaseToken: string): Promise<AuthResult> => {
    const response = await apiClient.post('/auth/login', { firebaseToken });
    const { user, tokens } = response.data.data;
    await saveTokens(tokens.accessToken, tokens.refreshToken);
    return { user, ...tokens };
  },

  // ─────────────────────────────────────
  // SOCIAL LOGIN O REGISTRO PASAJERO
  // Si el usuario existe → login. Si no → auto-registro como pasajero + login.
  // Usar desde pantalla de registro de pasajero con Google/Apple.
  // ─────────────────────────────────────
  socialLoginOrRegisterPassenger: async (firebaseToken: string, name: string): Promise<AuthResult> => {
    try {
      const response = await apiClient.post('/auth/login', { firebaseToken });
      const { user, tokens } = response.data.data;
      await saveTokens(tokens.accessToken, tokens.refreshToken);
      return { user, ...tokens };
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.code === 'USER_NOT_FOUND') {
        await apiClient.post('/auth/register/passenger', {
          firebaseToken,
          name: name.trim() || 'User',
          language: 'en',
        });
        const loginRes = await apiClient.post('/auth/login', { firebaseToken });
        const { user, tokens } = loginRes.data.data;
        await saveTokens(tokens.accessToken, tokens.refreshToken);
        return { user, ...tokens };
      }
      throw err;
    }
  },

  // ─────────────────────────────────────
  // PASSWORD RESET — envía email de recuperación via Firebase
  // ─────────────────────────────────────
  sendPasswordReset: async (email: string): Promise<void> => {
    const { sendPasswordResetEmail } = await import('firebase/auth');
    await sendPasswordResetEmail(getFirebaseAuth(), email);
  },

  // Subir token FCM del dispositivo
  registerPushToken: async (token: string, platform: 'ios' | 'android'): Promise<void> => {
    try {
      await apiClient.post('/auth/push-token', { token, platform });
    } catch {
      // No crítico — no interrumpir el flujo si falla
    }
  },
};
