// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio de entrenamiento — lógica del quiz y progreso
// Las preguntas y opciones se aleatorizan en cada intento
// ═══════════════════════════════════════════════════════════════

import {
  trainingRepository,
  TrainingModule,
  TrainingQuestion,
  DriverTrainingProgress,
  DriverServiceCertification,
  ServiceType,
} from '../repositories/trainingRepository';
import { driverRepository } from '../repositories/driverRepository';

export interface ShuffledOption {
  key: 'A' | 'B' | 'C' | 'D';   // clave estable (para scoring)
  text: string;
}

export interface QuizQuestion {
  id: number;
  question_text: string;
  options: ShuffledOption[];      // opciones en orden aleatorio
}

export interface ModuleWithProgress extends TrainingModule {
  progress: DriverTrainingProgress | null;
}

export interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
  passing_score: number;
  correct_answers: Record<number, string>;
  service_certified?: ServiceType | null;
}

export interface CertificationSummary {
  prerequisites_passed: boolean;
  certifications: DriverServiceCertification[];
  certified_services: ServiceType[];
}

export { ServiceType, DriverServiceCertification };

// Fisher-Yates shuffle genérico
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const trainingService = {

  // Obtener todos los módulos con el progreso del conductor
  getModulesWithProgress: async (driverId: string): Promise<ModuleWithProgress[]> => {
    const [modules, progressList] = await Promise.all([
      trainingRepository.getAllModules(),
      trainingRepository.getProgressByDriver(driverId),
    ]);

    const progressMap = new Map(progressList.map(p => [p.module_id, p]));

    return modules.map(m => ({
      ...m,
      progress: progressMap.get(m.id) ?? null,
    }));
  },

  // Obtener un módulo con su contenido y progreso del conductor
  getModuleWithProgress: async (
    driverId: string,
    moduleId: number
  ): Promise<ModuleWithProgress | null> => {
    const [module, progress] = await Promise.all([
      trainingRepository.getModuleById(moduleId),
      trainingRepository.getProgressByDriverAndModule(driverId, moduleId),
    ]);
    if (!module) return null;
    return { ...module, progress };
  },

  // Marcar que el conductor empezó a leer un módulo
  markAsReading: async (driverId: string, moduleId: number): Promise<void> => {
    await trainingRepository.markAsReading(driverId, moduleId);
  },

  // Construir quiz con preguntas y opciones aleatorizadas
  buildQuiz: async (moduleId: number): Promise<QuizQuestion[]> => {
    const questions = await trainingRepository.getQuestionsByModule(moduleId);

    // Aleatorizar orden de preguntas
    const shuffledQuestions = shuffle(questions);

    return shuffledQuestions.map((q: TrainingQuestion) => {
      const options: ShuffledOption[] = [
        { key: 'A', text: q.option_a },
        { key: 'B', text: q.option_b },
        { key: 'C', text: q.option_c },
        { key: 'D', text: q.option_d },
      ];
      return {
        id: q.id,
        question_text: q.question_text,
        options: shuffle(options),   // aleatorizar opciones
      };
    });
  },

  // Evaluar respuestas y guardar resultado
  submitQuiz: async (
    driverId: string,
    moduleId: number,
    answers: Record<number, string>  // {question_id: selected_key}
  ): Promise<QuizResult> => {
    const [module, questions] = await Promise.all([
      trainingRepository.getModuleById(moduleId),
      trainingRepository.getQuestionsByModule(moduleId),
    ]);

    if (!module) throw new Error('Module not found');

    // Mapear question_id → correct_option
    const correctMap: Record<number, string> = {};
    questions.forEach((q: TrainingQuestion) => {
      correctMap[q.id] = q.correct_option;
    });

    // Contar respuestas correctas
    let score = 0;
    for (const [qIdStr, selectedKey] of Object.entries(answers)) {
      const qId = parseInt(qIdStr, 10);
      if (correctMap[qId] && correctMap[qId] === selectedKey) {
        score++;
      }
    }

    const passed = score >= module.passing_score;
    const status = passed ? 'passed' : 'failed';

    await Promise.all([
      trainingRepository.upsertProgress(driverId, moduleId, status, score, passed),
      trainingRepository.saveQuizAttempt(driverId, moduleId, answers, score, passed),
    ]);

    // Si aprobó y el módulo está vinculado a un tipo de servicio → certificar
    let serviceCertified: ServiceType | null = null;
    if (passed && module.service_type) {
      // Solo certificar si ya aprobó el prerequisito (VRN-TRN-026)
      const prerequisiteOk = module.is_prerequisite
        ? true
        : await trainingRepository.getPrerequisiteStatus(driverId);

      if (prerequisiteOk) {
        await trainingRepository.upsertServiceCertification(driverId, module.service_type);
        // Sincronizar con drivers.services para que findNearby lo detecte en el dispatch
        await driverRepository.addService(driverId, module.service_type);
        serviceCertified = module.service_type;
      }
    }

    return {
      score,
      total: module.total_questions,
      passed,
      passing_score: module.passing_score,
      correct_answers: correctMap,
      service_certified: serviceCertified,
    };
  },

  isTrainingComplete: async (driverId: string): Promise<boolean> => {
    return trainingRepository.isTrainingComplete(driverId);
  },

  getCertificationSummary: async (driverId: string): Promise<CertificationSummary> => {
    const [prerequisites_passed, certifications, certified_services] = await Promise.all([
      trainingRepository.getPrerequisiteStatus(driverId),
      trainingRepository.getCertificationsByDriver(driverId),
      trainingRepository.getActiveCertificationsByDriver(driverId),
    ]);
    return { prerequisites_passed, certifications, certified_services };
  },

  isServiceCertified: async (driverId: string, serviceType: ServiceType): Promise<boolean> => {
    return trainingRepository.isServiceCertified(driverId, serviceType);
  },

  // Obtener resumen de progreso (para el home del conductor)
  getProgressSummary: async (driverId: string): Promise<{
    completed: number;
    total: number;
    isComplete: boolean;
  }> => {
    const [completed, isComplete] = await Promise.all([
      trainingRepository.countPassedModules(driverId),
      trainingRepository.isTrainingComplete(driverId),
    ]);
    return { completed, total: completed || 1, isComplete };
  },
};
