// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// AuthStore — Zustand store para estado de autenticación global
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '@vride/shared';
import { authService } from '../services/authService';

const WIZARD_KEY = 'driverWizardActive';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  emailVerificationPending: boolean;
  pendingEmail: string | null;
  driverWizardActive: boolean; // Bloquea redirect a verify-email mientras el conductor completa el wizard

  // Acciones
  initialize: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  registerPassenger: (params: {
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
  }) => Promise<void>;
  registerDriver: (params: {
    email: string;
    password: string;
    name: string;
    phone: string;
    language?: string;
    stateCode: string;
    referralCode?: string;
  }) => Promise<void>;
  checkEmailVerified: () => Promise<boolean>;
  resendVerificationEmail: () => Promise<void>;
  // Social auth: login with Google or Apple (login only — for login screen)
  socialLogin: (firebaseToken: string) => Promise<void>;
  // Social auth: login or auto-register as passenger (for register-passenger screen)
  socialPassengerAuth: (firebaseToken: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
  setDriverWizardActive: (active: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  driverWizardActive: false,
  emailVerificationPending: false,
  pendingEmail: null,

  // Verificar sesión existente al arrancar la app (splash screen)
  initialize: async () => {
    try {
      set({ isLoading: true, error: null });
      const [user, wizardFlag] = await Promise.all([
        authService.checkSession(),
        AsyncStorage.getItem(WIZARD_KEY),
      ]);
      if (wizardFlag === 'true' && user?.role === 'driver') {
        set({ user: user ?? null, isAuthenticated: false, emailVerificationPending: true, driverWizardActive: true, isLoading: false });
      } else {
        if (wizardFlag === 'true') AsyncStorage.removeItem(WIZARD_KEY).catch(() => {});
        set({ user, isAuthenticated: !!user, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  loginWithEmail: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const result = await authService.loginWithEmail(email, password);
      set({ user: result.user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      // Si el email no está verificado, redirigir a la pantalla de verificación
      if (axios.isAxiosError(err) && err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        try { await authService.resendVerificationEmail(); } catch {}
        set({ emailVerificationPending: true, pendingEmail: email, error: null, isLoading: false });
        return;
      }
      const errorMsg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      set({ error: errorMsg, isLoading: false });
      throw err;
    }
  },

  loginWithGoogle: async (idToken) => {
    try {
      set({ isLoading: true, error: null });
      const result = await authService.loginWithGoogle(idToken);
      set({ user: result.user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error con Google Sign-In';
      set({ error: errorMsg, isLoading: false });
      throw err;
    }
  },

  registerPassenger: async (params) => {
    try {
      set({ isLoading: true, error: null });
      const result = await authService.registerPassenger(params);
      if (result.emailVerificationPending) {
        set({ emailVerificationPending: true, pendingEmail: params.email, user: result.user ?? null, isAuthenticated: false, isLoading: false });
      } else {
        set({ user: result.user, isAuthenticated: true, isLoading: false });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error en el registro';
      set({ error: errorMsg, isLoading: false });
      throw err;
    }
  },

  registerDriver: async (params) => {
    try {
      set({ isLoading: true, error: null });
      const result = await authService.registerDriver(params);
      if (result.emailVerificationPending) {
        // Activar wizard — bloquea el redirect a verify-email hasta que el conductor termine los 8 pasos
        await AsyncStorage.setItem(WIZARD_KEY, 'true');
        set({ emailVerificationPending: true, pendingEmail: params.email, user: result.user ?? null, isAuthenticated: false, isLoading: false, driverWizardActive: true });
      } else {
        set({ user: result.user, isAuthenticated: true, isLoading: false });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error en el registro';
      set({ error: errorMsg, isLoading: false });
      throw err;
    }
  },

  socialLogin: async (firebaseToken) => {
    try {
      set({ isLoading: true, error: null });
      const result = await authService.socialLogin(firebaseToken);
      set({ user: result.user, isAuthenticated: true, emailVerificationPending: false, isLoading: false });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      set({ error: errorMsg, isLoading: false });
      throw err;
    }
  },

  socialPassengerAuth: async (firebaseToken, name) => {
    try {
      set({ isLoading: true, error: null });
      const result = await authService.socialLoginOrRegisterPassenger(firebaseToken, name);
      set({ user: result.user, isAuthenticated: true, emailVerificationPending: false, isLoading: false });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al autenticar';
      set({ error: errorMsg, isLoading: false });
      throw err;
    }
  },

  checkEmailVerified: async () => {
    try {
      const result = await authService.checkEmailVerified();
      if (result) {
        set({ user: result.user, isAuthenticated: true, emailVerificationPending: false, pendingEmail: null });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  resendVerificationEmail: async () => {
    await authService.resendVerificationEmail();
  },

  logout: async () => {
    try {
      await authService.logout();
    } finally {
      set({ user: null, isAuthenticated: false, error: null });
    }
  },

  clearError: () => set({ error: null }),

  setUser: (user) => set({ user }),

  setDriverWizardActive: (active) => {
    if (!active) AsyncStorage.removeItem(WIZARD_KEY).catch(() => {});
    set({ driverWizardActive: active });
  },
}));

// Selector helpers para evitar re-renders innecesarios
export const useUser = () => useAuthStore((s) => s.user);
export const useUserRole = (): UserRole | null => useAuthStore((s) => s.user?.role ?? null);
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated);
