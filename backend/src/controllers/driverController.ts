// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Controlador de conductores — perfil, documentos, verificación
// v2 — debug getProfile activo
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { driverService, DocumentField } from '../services/driverService';
import { getDriverCommissionInfo } from '../services/rideService';
import { driverRepository } from '../repositories/driverRepository';
import { rideRepository } from '../repositories/rideRepository';
import { trainingService } from '../services/trainingService';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';
import { redis, REDIS_KEYS, REDIS_TTL } from '../config/redis';
import { emitToUser, emitToAdmins } from '../socket/emitter';
import multer from 'multer';

// Detecta el tipo real del archivo por sus magic bytes (primeros bytes del contenido)
// Previene que alguien suba un archivo malicioso renombrado como .jpg o .pdf
function detectRealMimeType(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg';
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image/png';
  // PDF: %PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return 'application/pdf';
  // WEBP: RIFF....WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return 'image/webp';
  }
  return null;
}

// multer: archivos en memoria (no en disco) — los pasamos directamente a Firebase Storage
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Use JPG, PNG, WEBP, or PDF.'));
    }
  },
});

const certificationEntrySchema = z.object({
  verified: z.boolean(),
  expiry:   z.string().nullable(),
  doc_url:  z.string().nullable(),
});

const updateProfileSchema = z.object({
  // Personal
  dateOfBirth:    z.string().optional(),
  ssnLast4:       z.string().length(4).optional(),
  homeAddress:    z.string().optional(),
  // License
  licenseNumber:  z.string().optional(),
  licenseExpiry:  z.string().optional(),
  // Vehicle
  vehiclePlate:   z.string().optional(),
  vehicleBrand:   z.string().optional(),
  vehicleModel:   z.string().optional(),
  vehicleYear:    z.number().int()
    .min(new Date().getFullYear() - 15, `Vehicle cannot be more than 15 years old`)
    .max(new Date().getFullYear() + 1)
    .optional(),
  vehicleIsSalvage: z.boolean().optional().refine(v => v !== true, {
    message: 'Vehicles with a salvage title are not allowed',
  }),
  vehicleColor:   z.string().optional(),
  vehicleVin:     z.string().max(17).optional(),
  vehicleSeats:   z.number().int().min(2).max(15).optional(),
  // Insurance
  insuranceCompany:       z.string().optional(),
  insurancePolicyNumber:  z.string().optional(),
  insuranceExpiry:        z.string().optional(),
  // Service
  services: z.array(z.enum(['motorcycle', 'sedan', 'suv', 'scheduled', 'hourly'])).optional(),
  // Languages & equipment
  languages:        z.array(z.string()).optional(),
  specialEquipment: z.array(z.string()).optional(),
  // Certifications
  certifications: z.record(certificationEntrySchema).optional(),
  // Preferences
  smokes:                z.boolean().optional(),
  longDistanceAvailable: z.boolean().optional(),
  musicPreference:       z.string().max(50).optional(),
  musicArtist:           z.string().max(100).optional(),
});

export const driverController = {
  // GET /driver/profile
  getProfile: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let driver;
      try {
        driver = await driverRepository.findById(req.user!.userId);
      } catch (dbErr: any) {
        logger.error('[getProfile] findById FAILED:', { msg: dbErr?.message, code: dbErr?.code, detail: dbErr?.detail });
        sendError(res, 500, `DB Error: ${dbErr?.message}`, 'DB_ERROR');
        return;
      }

      let commissionInfo;
      try {
        commissionInfo = await getDriverCommissionInfo(req.user!.userId);
      } catch (commErr: any) {
        logger.error('[getProfile] getDriverCommissionInfo FAILED:', { msg: commErr?.message });
        commissionInfo = { rate: 0, tier: 'standard', ridesThisYear: 0, ratingAvg: 5, nextTierRides: null, nextTierRate: null };
      }

      if (!driver) {
        sendError(res, 404, 'Driver profile not found', 'NOT_FOUND');
        return;
      }
      sendSuccess(res, { ...driver, commission: commissionInfo });
    } catch (err) {
      next(err);
    }
  },

  // PATCH /driver/profile — actualizar datos del vehículo y licencia
  updateProfile: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = updateProfileSchema.parse(req.body);
      await driverRepository.updateDocuments(req.user!.userId, body);
      const updated = await driverRepository.findById(req.user!.userId);
      sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  },

  // POST /driver/documents/:docType — subir un documento (multipart/form-data)
  uploadDocument: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validDocTypes: DocumentField[] = [
        'license_front', 'license_back',
        'vehicle_front', 'vehicle_back', 'vehicle_left', 'vehicle_right', 'vehicle_interior',
        'insurance', 'accessible_cert', 'selfie',
        'cert_defensive_driving', 'cert_first_aid', 'cert_senior_transport',
        'cert_pregnant_transport', 'cert_disability_transport', 'cert_visual_impairment',
        'cert_hearing_impairment', 'cert_wheelchair_vehicle', 'cert_cpr', 'cert_medical_exam',
      ];

      const docType = req.params['docType'] as DocumentField;
      if (!validDocTypes.includes(docType)) {
        sendError(res, 400, 'Invalid document type', 'INVALID_DOC_TYPE');
        return;
      }

      if (!req.file) {
        sendError(res, 400, 'No file was received', 'NO_FILE');
        return;
      }

      // Verificar tipo real del archivo por magic bytes (previene archivos maliciosos disfrazados)
      const realMime = detectRealMimeType(req.file.buffer);
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!realMime || !allowedMimes.includes(realMime)) {
        sendError(res, 400, 'File content does not match allowed types (JPG, PNG, WEBP, PDF)', 'INVALID_FILE_CONTENT');
        return;
      }

      const fileUrl = await driverService.uploadDocument(
        req.user!.userId,
        docType,
        req.file.buffer,
        realMime // Usar el MIME detectado, no el declarado por el cliente
      );

      sendSuccess(res, { url: fileUrl, docType });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'INVALID_FILE_TYPE') {
          sendError(res, 400, 'File type not allowed', 'INVALID_FILE_TYPE');
          return;
        }
        if (err.message === 'FILE_TOO_LARGE') {
          sendError(res, 400, 'File exceeds the maximum size of 10MB', 'FILE_TOO_LARGE');
          return;
        }
      }
      next(err);
    }
  },

  // POST /driver/save-contract — guardar firma del contrato
  saveContractSignature: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { signature } = req.body;
      if (!signature) { sendError(res, 400, 'Firma requerida', 'MISSING_SIGNATURE'); return; }
      await driverService.saveContractSignature(req.user!.userId, signature);
      sendSuccess(res, { message: 'Contrato firmado correctamente.' });
    } catch (err) {
      next(err);
    }
  },

  // POST /driver/submit-review — enviar solicitud de verificación
  submitForReview: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driver = await driverService.submitForReview(req.user!.userId);
      sendSuccess(res, {
        message: 'Documents submitted for review. We will notify you within 24-48 hours.',
        driver,
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'INVALID_STATUS_FOR_REVIEW') {
          sendError(res, 409, 'Your application has already been submitted or your account is in another state', 'INVALID_STATUS');
          return;
        }
        if (err.message.startsWith('MISSING_DOCUMENTS:')) {
          const missing = err.message.split(':')[1];
          sendError(res, 422, `Missing required documents: ${missing}`, 'MISSING_DOCUMENTS');
          return;
        }
      }
      next(err);
    }
  },

  // GET /driver/public/:driverId — perfil público (para pasajeros)
  getPublicProfile: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await driverService.getPublicProfile(req.params['driverId'] ?? '');
      sendSuccess(res, profile);
    } catch (err) {
      if (err instanceof Error && err.message === 'DRIVER_NOT_FOUND') {
        sendError(res, 404, 'Driver not found', 'NOT_FOUND');
        return;
      }
      next(err);
    }
  },

  // PATCH /driver/online — cambiar disponibilidad online/offline
  updateOnlineStatus: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({ isOnline: z.boolean() });
      const { isOnline } = schema.parse(req.body);

      // Solo conductores activos pueden ponerse en línea
      const driver = await driverRepository.findById(req.user!.userId);
      if (!driver) {
        sendError(res, 404, 'Driver not found', 'NOT_FOUND');
        return;
      }
      if (isOnline && driver.status !== 'active') {
        sendError(res, 403, 'You can only go online when your account is active and verified', 'ACCOUNT_NOT_ACTIVE');
        return;
      }

      // Bloquear go-online si el entrenamiento obligatorio no está completo
      if (isOnline) {
        const trainingDone = await trainingService.isTrainingComplete(req.user!.userId);
        if (!trainingDone) {
          sendError(res, 403, 'You must complete all required training modules before going online', 'TRAINING_INCOMPLETE');
          return;
        }
      }

      await driverRepository.updateOnlineStatus(req.user!.userId, isOnline);
      // Leer el estado guardado en BD para confirmar que se aplicó correctamente
      const saved = await driverRepository.findById(req.user!.userId);
      const dbInfo = {
        isOnline,
        db_is_online:  saved?.is_online,
        db_has_location: (saved as any)?.current_latitude != null,
        db_lat:  (saved as any)?.current_latitude,
        db_lng:  (saved as any)?.current_longitude,
        db_status: saved?.status,
      };
      console.log('[ONLINE] Estado en BD tras toggle:', JSON.stringify(dbInfo));
      sendSuccess(res, dbInfo);
    } catch (err) {
      next(err);
    }
  },

  // GET /driver/acceptance-rate — tasa de aceptación y estadísticas
  getAcceptanceRate: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driver = await driverRepository.findById(req.user!.userId);
      if (!driver) { sendError(res, 404, 'Driver not found', 'NOT_FOUND'); return; }

      const offered  = Number(driver.rides_offered  ?? 0);
      const accepted = Number(driver.rides_accepted ?? 0);
      const rate     = offered > 0 ? Math.round((accepted / offered) * 100) : 100;

      sendSuccess(res, {
        rides_offered:  offered,
        rides_accepted: accepted,
        acceptance_rate_pct: rate,
      });
    } catch (err) { next(err); }
  },

  // PATCH /driver/daily-goal — establecer meta de ganancias diaria
  setDailyGoal: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { goal } = z.object({ goal: z.number().positive().max(9999).nullable() }).parse(req.body);
      await driverRepository.updateField(req.user!.userId, 'daily_earnings_goal', goal);
      sendSuccess(res, { daily_earnings_goal: goal });
    } catch (err) { next(err); }
  },

  // GET /driver/tax-report?year=2026 — resumen anual de ganancias (1099)
  getTaxReport: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const year = parseInt(req.query['year'] as string || String(new Date().getFullYear()));
      const { db } = await import('../config/database');
      const { rows } = await db.query<{
        total_earned: string;
        platform_commission: string;
        net_earnings: string;
        total_rides: string;
        total_tips: string;
        months: Array<{ month: number; earned: string; rides: string }>;
      }>(
        `WITH monthly AS (
           SELECT
             EXTRACT(MONTH FROM completed_at)::int AS month,
             SUM(driver_earnings)::text AS earned,
             COUNT(*)::text AS rides
           FROM rides
           WHERE driver_id = $1
             AND status = 'completed'
             AND EXTRACT(YEAR FROM completed_at) = $2
           GROUP BY month
           ORDER BY month
         ),
         tips AS (
           SELECT COALESCE(SUM(amount), 0)::text AS total_tips
           FROM ride_tips rt
           JOIN rides r ON r.id = rt.ride_id
           WHERE rt.driver_id = $1
             AND EXTRACT(YEAR FROM rt.created_at) = $2
         ),
         totals AS (
           SELECT
             COALESCE(SUM(driver_earnings), 0)::text AS net_earnings,
             COALESCE(SUM(platform_commission), 0)::text AS platform_commission,
             COALESCE(SUM(driver_earnings) + SUM(platform_commission), 0)::text AS total_earned,
             COUNT(*)::text AS total_rides
           FROM rides
           WHERE driver_id = $1
             AND status = 'completed'
             AND EXTRACT(YEAR FROM completed_at) = $2
         )
         SELECT t.*, tips.total_tips,
                json_agg(m ORDER BY m.month) AS months
         FROM totals t, tips, monthly m
         GROUP BY t.net_earnings, t.platform_commission, t.total_earned, t.total_rides, tips.total_tips`,
        [req.user!.userId, year]
      );

      const data = rows[0] ?? { total_earned: '0', platform_commission: '0', net_earnings: '0', total_rides: '0', total_tips: '0', months: [] };
      sendSuccess(res, {
        year,
        driver_id: req.user!.userId,
        total_gross_earnings: parseFloat(data.total_earned),
        platform_commission:  parseFloat(data.platform_commission),
        net_earnings:         parseFloat(data.net_earnings),
        total_tips:           parseFloat(data.total_tips),
        total_rides:          parseInt(data.total_rides),
        monthly_breakdown:    data.months ?? [],
        form_1099_threshold:  600,
        requires_1099:        parseFloat(data.net_earnings) >= 600,
      });
    } catch (err) { next(err); }
  },

  // GET /driver/document-expiry — alertas de vencimiento de licencia e insurance
  getDocumentExpiry: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driver = await driverRepository.findById(req.user!.userId);
      if (!driver) { sendError(res, 404, 'Driver not found', 'NOT_FOUND'); return; }

      const now = new Date();
      const buildAlert = (docType: string, expiryDate: string | null) => {
        if (!expiryDate) return null;
        const expiry  = new Date(expiryDate);
        const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          document_type: docType,
          expires_at:    expiryDate,
          days_left:     daysLeft,
          is_expired:    daysLeft <= 0,
          urgent:        daysLeft <= 7 && daysLeft > 0,
          warning:       daysLeft <= 30 && daysLeft > 7,
        };
      };

      const alerts = [
        buildAlert('license',   driver.license_expiry   ?? null),
        buildAlert('insurance', driver.insurance_expiry ?? null),
      ].filter(Boolean);

      sendSuccess(res, { alerts });
    } catch (err) { next(err); }
  },

  // Recibe posición del conductor via HTTP — usado por la tarea de background del móvil
  // cuando la app está minimizada y los sockets no operan.
  updateLocationHTTP: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { latitude, longitude, heading, speed, timestamp } = z.object({
        latitude:  z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        heading:   z.number().min(0).max(360).optional(),
        speed:     z.number().min(0).optional(),
        timestamp: z.number(),
      }).parse(req.body);

      await driverRepository.updateLocation(userId, longitude, latitude);

      await redis.setex(
        REDIS_KEYS.driverLocation(userId),
        REDIS_TTL.DRIVER_LOCATION,
        JSON.stringify({ lat: latitude, lng: longitude, heading })
      );

      const rideId = await redis.get(REDIS_KEYS.driverActiveRide(userId));
      if (rideId) {
        const ride = await rideRepository.findById(rideId);
        if (ride?.passenger_id) {
          emitToUser(ride.passenger_id, 'passenger:driver_location', {
            rideId,
            latitude,
            longitude,
            heading,
            speed,
            timestamp,
          });
        }
      }

      emitToAdmins('admin:driver_location', { driverId: userId, latitude, longitude, timestamp });

      res.status(204).end();
    } catch (err) { next(err); }
  },
};
