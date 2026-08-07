// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio mobile de entrenamiento — llamadas a la API
// ═══════════════════════════════════════════════════════════════

import { apiClient } from './apiClient';

export interface TrainingSection {
  title: string;
  body: string;
}

export type ServiceType = 'motorcycle' | 'sedan' | 'suv' | 'scheduled';

export interface TrainingModule {
  id: number;
  code: string;
  title: string;
  content: TrainingSection[];
  version: string;
  passing_score: number;
  total_questions: number;
  order_index: number;
  is_required: boolean;
  is_prerequisite: boolean;
  service_type: ServiceType | null;
  progress: TrainingProgress | null;
}

export interface TrainingProgress {
  id: number;
  driver_id: string;
  module_id: number;
  status: 'not_started' | 'reading' | 'passed' | 'failed';
  attempts: number;
  last_score: number | null;
  passed_at: string | null;
  expires_at: string | null;
}

export interface ShuffledOption {
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface QuizQuestion {
  id: number;
  question_text: string;
  options: ShuffledOption[];
}

export interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
  passing_score: number;
  correct_answers: Record<number, string>;
  service_certified?: ServiceType | null;
}

export interface TrainingStatus {
  completed: number;
  total: number;
  isComplete: boolean;
}

export interface ServiceCertification {
  driver_id: string;
  service_type: ServiceType;
  certified_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface CertificationSummary {
  prerequisites_passed: boolean;
  certifications: ServiceCertification[];
  certified_services: ServiceType[];
}

export const trainingMobileService = {

  getModules: async (): Promise<TrainingModule[]> => {
    const res = await apiClient.get<{ success: boolean; data: TrainingModule[] }>('/training/modules');
    return res.data.data;
  },

  getModule: async (moduleId: number): Promise<TrainingModule> => {
    const res = await apiClient.get<{ success: boolean; data: TrainingModule }>(`/training/modules/${moduleId}`);
    return res.data.data;
  },

  startReading: async (moduleId: number): Promise<void> => {
    await apiClient.post(`/training/modules/${moduleId}/start-reading`);
  },

  getQuiz: async (moduleId: number): Promise<{ module_id: number; questions: QuizQuestion[] }> => {
    const res = await apiClient.get<{ success: boolean; data: { module_id: number; questions: QuizQuestion[] } }>(
      `/training/modules/${moduleId}/quiz`
    );
    return res.data.data;
  },

  submitQuiz: async (
    moduleId: number,
    answers: Record<number, string>
  ): Promise<QuizResult> => {
    // Convertir claves a strings para el backend
    const stringAnswers: Record<string, string> = {};
    for (const [k, v] of Object.entries(answers)) {
      stringAnswers[String(k)] = v;
    }
    const res = await apiClient.post<{ success: boolean; data: QuizResult }>(
      `/training/modules/${moduleId}/submit-quiz`,
      { answers: stringAnswers }
    );
    return res.data.data;
  },

  getStatus: async (): Promise<TrainingStatus> => {
    const res = await apiClient.get<{ success: boolean; data: TrainingStatus }>('/training/status');
    return res.data.data;
  },

  getCertifications: async (): Promise<CertificationSummary> => {
    const res = await apiClient.get<{ success: boolean; data: CertificationSummary }>('/training/certifications');
    return res.data.data;
  },
};
