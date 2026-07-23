// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Zustand store de entrenamiento
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import {
  trainingMobileService,
  TrainingModule,
  TrainingStatus,
  CertificationSummary,
  ServiceType,
} from '../services/trainingService';

interface TrainingState {
  modules: TrainingModule[];
  status: TrainingStatus | null;
  certifications: CertificationSummary | null;
  loading: boolean;
  error: string | null;

  loadModules: () => Promise<void>;
  loadStatus: () => Promise<void>;
  loadCertifications: () => Promise<void>;
  refreshAll: () => Promise<void>;
  clearError: () => void;
  isServiceCertified: (serviceType: ServiceType) => boolean;
  prerequisitesPassed: () => boolean;
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  modules: [],
  status: null,
  certifications: null,
  loading: false,
  error: null,

  loadModules: async () => {
    set({ loading: true, error: null });
    try {
      const modules = await trainingMobileService.getModules();
      set({ modules, loading: false });
    } catch {
      set({ loading: false, error: 'Could not load training modules' });
    }
  },

  loadStatus: async () => {
    try {
      const status = await trainingMobileService.getStatus();
      set({ status });
    } catch {
      // silencioso — status es informativo
    }
  },

  loadCertifications: async () => {
    try {
      const certifications = await trainingMobileService.getCertifications();
      set({ certifications });
    } catch {
      // silencioso
    }
  },

  refreshAll: async () => {
    set({ loading: true, error: null });
    try {
      const [modules, status, certifications] = await Promise.all([
        trainingMobileService.getModules(),
        trainingMobileService.getStatus(),
        trainingMobileService.getCertifications(),
      ]);
      set({ modules, status, certifications, loading: false });
    } catch {
      set({ loading: false, error: 'Could not refresh training data' });
    }
  },

  clearError: () => set({ error: null }),

  isServiceCertified: (serviceType: ServiceType) => {
    const certs = get().certifications;
    return certs?.certified_services.includes(serviceType) ?? false;
  },

  prerequisitesPassed: () => {
    return get().certifications?.prerequisites_passed ?? false;
  },
}));
