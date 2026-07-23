// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Controlador de entrenamiento de conductores
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { trainingService } from '../services/trainingService';
import { sendSuccess, sendError } from '../utils/response';

export const trainingController = {

  // GET /training/modules
  getModules: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const modules = await trainingService.getModulesWithProgress(req.user!.userId);
      sendSuccess(res, modules);
    } catch (err) {
      next(err);
    }
  },

  // GET /training/modules/:id
  getModule: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const moduleId = parseInt(req.params.id, 10);
      if (isNaN(moduleId)) {
        sendError(res, 422, 'Invalid module ID', 'VALIDATION_ERROR');
        return;
      }
      const module = await trainingService.getModuleWithProgress(req.user!.userId, moduleId);
      if (!module) {
        sendError(res, 404, 'Module not found', 'NOT_FOUND');
        return;
      }
      sendSuccess(res, module);
    } catch (err) {
      next(err);
    }
  },

  // POST /training/modules/:id/start-reading
  startReading: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const moduleId = parseInt(req.params.id, 10);
      if (isNaN(moduleId)) {
        sendError(res, 422, 'Invalid module ID', 'VALIDATION_ERROR');
        return;
      }
      await trainingService.markAsReading(req.user!.userId, moduleId);
      sendSuccess(res, { ok: true });
    } catch (err) {
      next(err);
    }
  },

  // GET /training/modules/:id/quiz
  getQuiz: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const moduleId = parseInt(req.params.id, 10);
      if (isNaN(moduleId)) {
        sendError(res, 422, 'Invalid module ID', 'VALIDATION_ERROR');
        return;
      }
      const questions = await trainingService.buildQuiz(moduleId);
      sendSuccess(res, { module_id: moduleId, questions });
    } catch (err) {
      next(err);
    }
  },

  // POST /training/modules/:id/submit-quiz
  submitQuiz: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const moduleId = parseInt(req.params.id, 10);
      if (isNaN(moduleId)) {
        sendError(res, 422, 'Invalid module ID', 'VALIDATION_ERROR');
        return;
      }

      const schema = z.object({
        answers: z.record(z.string(), z.enum(['A', 'B', 'C', 'D'])),
      });
      const { answers } = schema.parse(req.body);

      // Convertir claves a números
      const parsedAnswers: Record<number, string> = {};
      for (const [k, v] of Object.entries(answers)) {
        parsedAnswers[parseInt(k, 10)] = v;
      }

      const result = await trainingService.submitQuiz(req.user!.userId, moduleId, parsedAnswers);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },

  // GET /training/status
  getStatus: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await trainingService.getProgressSummary(req.user!.userId);
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  },

  // GET /training/certifications
  getCertifications: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await trainingService.getCertificationSummary(req.user!.userId);
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  },
};
