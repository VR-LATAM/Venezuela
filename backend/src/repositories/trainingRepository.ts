// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Repository de entrenamiento de conductores
// ═══════════════════════════════════════════════════════════════

import { query, queryOne } from '../config/database';

export type ServiceType = 'motorcycle' | 'sedan' | 'suv' | 'scheduled';

export interface TrainingModule {
  id: number;
  code: string;
  title: string;
  content: Array<{ title: string; body: string }>;
  version: string;
  passing_score: number;
  total_questions: number;
  order_index: number;
  is_required: boolean;
  is_prerequisite: boolean;
  service_type: ServiceType | null;
}

export interface DriverServiceCertification {
  driver_id: string;
  service_type: ServiceType;
  certified_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface TrainingQuestion {
  id: number;
  module_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  order_index: number;
}

export interface DriverTrainingProgress {
  id: number;
  driver_id: string;
  module_id: number;
  status: 'not_started' | 'reading' | 'passed' | 'failed';
  attempts: number;
  last_score: number | null;
  passed_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export const trainingRepository = {

  getAllModules: async (): Promise<TrainingModule[]> => {
    const rows = await query<TrainingModule>(`
      SELECT id, code, title, content, version,
             passing_score, total_questions, order_index,
             is_required, is_prerequisite, service_type
      FROM training_modules
      ORDER BY order_index ASC
    `);
    return rows;
  },

  getModuleById: async (moduleId: number): Promise<TrainingModule | null> => {
    return queryOne<TrainingModule>(`
      SELECT id, code, title, content, version,
             passing_score, total_questions, order_index,
             is_required, is_prerequisite, service_type
      FROM training_modules
      WHERE id = $1
    `, [moduleId]);
  },

  getQuestionsByModule: async (moduleId: number): Promise<TrainingQuestion[]> => {
    return query<TrainingQuestion>(`
      SELECT id, module_id, question_text,
             option_a, option_b, option_c, option_d,
             correct_option, order_index
      FROM training_questions
      WHERE module_id = $1
      ORDER BY order_index ASC
    `, [moduleId]);
  },

  getProgressByDriver: async (driverId: string): Promise<DriverTrainingProgress[]> => {
    return query<DriverTrainingProgress>(`
      SELECT id, driver_id, module_id, status, attempts,
             last_score, passed_at, expires_at, created_at, updated_at
      FROM driver_training_progress
      WHERE driver_id = $1
      ORDER BY module_id ASC
    `, [driverId]);
  },

  getProgressByDriverAndModule: async (
    driverId: string,
    moduleId: number
  ): Promise<DriverTrainingProgress | null> => {
    return queryOne<DriverTrainingProgress>(`
      SELECT id, driver_id, module_id, status, attempts,
             last_score, passed_at, expires_at, created_at, updated_at
      FROM driver_training_progress
      WHERE driver_id = $1 AND module_id = $2
    `, [driverId, moduleId]);
  },

  upsertProgress: async (
    driverId: string,
    moduleId: number,
    status: string,
    score?: number,
    passed?: boolean
  ): Promise<DriverTrainingProgress> => {
    const passedAt    = passed === true ? 'NOW()' : 'NULL';
    const expiresAt   = passed === true ? `NOW() + INTERVAL '1 year'` : 'NULL';

    const result = await queryOne<DriverTrainingProgress>(`
      INSERT INTO driver_training_progress
        (driver_id, module_id, status, attempts, last_score, passed_at, expires_at)
      VALUES ($1, $2, $3, 1, $4, ${passedAt}, ${expiresAt})
      ON CONFLICT (driver_id, module_id) DO UPDATE SET
        status     = EXCLUDED.status,
        attempts   = driver_training_progress.attempts + 1,
        last_score = COALESCE($4, driver_training_progress.last_score),
        passed_at  = CASE WHEN $5 THEN NOW() ELSE driver_training_progress.passed_at END,
        expires_at = CASE WHEN $5 THEN NOW() + INTERVAL '1 year' ELSE driver_training_progress.expires_at END,
        updated_at = NOW()
      RETURNING *
    `, [driverId, moduleId, status, score ?? null, passed ?? false]);

    return result!;
  },

  markAsReading: async (driverId: string, moduleId: number): Promise<void> => {
    await query(`
      INSERT INTO driver_training_progress (driver_id, module_id, status)
      VALUES ($1, $2, 'reading')
      ON CONFLICT (driver_id, module_id) DO UPDATE SET
        status     = CASE
                       WHEN driver_training_progress.status = 'not_started' THEN 'reading'
                       ELSE driver_training_progress.status
                     END,
        updated_at = NOW()
    `, [driverId, moduleId]);
  },

  saveQuizAttempt: async (
    driverId: string,
    moduleId: number,
    answers: Record<number, string>,
    score: number,
    passed: boolean
  ): Promise<void> => {
    await query(`
      INSERT INTO driver_quiz_attempts
        (driver_id, module_id, answers, score, passed)
      VALUES ($1, $2, $3, $4, $5)
    `, [driverId, moduleId, JSON.stringify(answers), score, passed]);
  },

  countPassedModules: async (driverId: string): Promise<number> => {
    const row = await queryOne<{ count: string }>(`
      SELECT COUNT(*) AS count
      FROM driver_training_progress dtp
      JOIN training_modules tm ON tm.id = dtp.module_id
      WHERE dtp.driver_id = $1
        AND dtp.status = 'passed'
        AND tm.is_required = TRUE
        AND (dtp.expires_at IS NULL OR dtp.expires_at > NOW())
    `, [driverId]);
    return parseInt(row?.count ?? '0', 10);
  },

  countRequiredModules: async (): Promise<number> => {
    const row = await queryOne<{ count: string }>(`
      SELECT COUNT(*) AS count FROM training_modules WHERE is_required = TRUE
    `);
    return parseInt(row?.count ?? '0', 10);
  },

  isTrainingComplete: async (driverId: string): Promise<boolean> => {
    const row = await queryOne<{ complete: boolean }>(`
      SELECT NOT EXISTS (
        SELECT 1 FROM training_modules tm
        LEFT JOIN driver_training_progress dtp
          ON dtp.module_id = tm.id AND dtp.driver_id = $1
        WHERE tm.is_required = TRUE
          AND (
            dtp.status IS NULL
            OR dtp.status <> 'passed'
            OR (dtp.expires_at IS NOT NULL AND dtp.expires_at <= NOW())
          )
      ) AS complete
    `, [driverId]);
    return row?.complete ?? false;
  },

  // ── Certificaciones por tipo de servicio ──────────────────────

  upsertServiceCertification: async (
    driverId: string,
    serviceType: ServiceType
  ): Promise<void> => {
    await query(`
      INSERT INTO driver_service_certifications (driver_id, service_type, certified_at, expires_at, is_active)
      VALUES ($1, $2, NOW(), NOW() + INTERVAL '1 year', TRUE)
      ON CONFLICT (driver_id, service_type) DO UPDATE SET
        certified_at = NOW(),
        expires_at   = NOW() + INTERVAL '1 year',
        is_active    = TRUE
    `, [driverId, serviceType]);
  },

  getCertificationsByDriver: async (driverId: string): Promise<DriverServiceCertification[]> => {
    return query<DriverServiceCertification>(`
      SELECT driver_id, service_type, certified_at, expires_at, is_active
      FROM driver_service_certifications
      WHERE driver_id = $1
      ORDER BY service_type ASC
    `, [driverId]);
  },

  getActiveCertificationsByDriver: async (driverId: string): Promise<ServiceType[]> => {
    const rows = await query<{ service_type: ServiceType }>(`
      SELECT service_type
      FROM driver_service_certifications
      WHERE driver_id = $1 AND is_active = TRUE AND expires_at > NOW()
      ORDER BY service_type ASC
    `, [driverId]);
    return rows.map(r => r.service_type);
  },

  isServiceCertified: async (driverId: string, serviceType: ServiceType): Promise<boolean> => {
    const row = await queryOne<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM driver_service_certifications
        WHERE driver_id = $1 AND service_type = $2 AND is_active = TRUE AND expires_at > NOW()
      ) AS exists
    `, [driverId, serviceType]);
    return row?.exists ?? false;
  },

  getPrerequisiteStatus: async (driverId: string): Promise<boolean> => {
    const row = await queryOne<{ passed: boolean }>(`
      SELECT (
        NOT EXISTS (SELECT 1 FROM training_modules WHERE is_prerequisite = TRUE)
        OR EXISTS (
          SELECT 1 FROM driver_training_progress dtp
          JOIN training_modules tm ON tm.id = dtp.module_id
          WHERE dtp.driver_id = $1
            AND tm.is_prerequisite = TRUE
            AND dtp.status = 'passed'
            AND (dtp.expires_at IS NULL OR dtp.expires_at > NOW())
        )
      ) AS passed
    `, [driverId]);
    return row?.passed ?? false;
  },
};
