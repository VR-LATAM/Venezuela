// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Controlador de administración — gestión de conductores y pasajeros
// Solo accesible con rol 'admin'
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { driverService } from '../services/driverService';
import { driverRepository } from '../repositories/driverRepository';
import { trainingRepository } from '../repositories/trainingRepository';
import { auditRepository } from '../repositories/auditRepository';
import { redis, REDIS_KEYS } from '../config/redis';
import { db } from '../config/database';
import { sendSuccess, sendError } from '../utils/response';

export const adminController = {
  // GET /admin/drivers?status=under_review&stateCode=TX&limit=50&offset=0
  listDrivers: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        status: z.enum(['pending', 'under_review', 'active', 'inactive', 'suspended', 'rejected']).optional(),
        stateCode: z.string().length(2).optional(),
        limit: z.string().default('50').transform(Number),
        offset: z.string().default('0').transform(Number),
      });
      const filters = schema.parse(req.query);
      const drivers = await driverRepository.findAll(filters);

      // Enriquecer con progreso de entrenamiento (un solo query extra)
      if (drivers.length > 0) {
        const driverIds = drivers.map(d => d.id);
        const totalRequired = await trainingRepository.countRequiredModules();
        const progressRows = await db.query<{ driver_id: string; passed: string }>(
          `SELECT driver_id, COUNT(*) AS passed
           FROM driver_training_progress
           WHERE driver_id = ANY($1) AND status = 'passed'
             AND (expires_at IS NULL OR expires_at > NOW())
           GROUP BY driver_id`,
          [driverIds]
        );
        const passedMap = new Map(progressRows.rows.map(r => [r.driver_id, parseInt(r.passed)]));
        const enriched = drivers.map(d => ({
          ...d,
          training_completed: passedMap.get(d.id) ?? 0,
          training_total: totalRequired,
        }));
        sendSuccess(res, enriched);
        return;
      }

      sendSuccess(res, drivers);
    } catch (err) {
      next(err);
    }
  },

  // GET /admin/drivers/pending-review — cola de aprobación
  pendingReview: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query['limit'] as string || '50');
      const offset = parseInt(req.query['offset'] as string || '0');
      const drivers = await driverRepository.findPendingReview(limit, offset);
      sendSuccess(res, drivers);
    } catch (err) {
      next(err);
    }
  },

  // GET /admin/drivers/:driverId
  getDriver: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driver = await driverRepository.findById(req.params['driverId'] ?? '');
      if (!driver) {
        sendError(res, 404, 'Driver not found', 'NOT_FOUND');
        return;
      }
      sendSuccess(res, driver);
    } catch (err) {
      next(err);
    }
  },

  // POST /admin/drivers/:driverId/approve
  approveDriver: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driverId = req.params['driverId'] ?? '';
      const driver = await driverService.approveDriver(driverId, req.user!.userId);
      await auditRepository.log({
        event: 'driver_approved',
        actorId: req.user!.userId,
        targetId: driverId,
        targetType: 'driver',
        ipAddress: req.ip,
      });
      sendSuccess(res, { message: 'Driver approved successfully', driver });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'NOT_UNDER_REVIEW') {
          sendError(res, 409, 'Driver is not in review status', 'INVALID_STATUS');
          return;
        }
        if (err.message === 'DRIVER_NOT_FOUND') {
          sendError(res, 404, 'Driver not found', 'NOT_FOUND');
          return;
        }
      }
      next(err);
    }
  },

  // POST /admin/drivers/:driverId/reject
  rejectDriver: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        reason: z.string().min(10, 'Please provide a clear rejection reason'),
      });
      const { reason } = schema.parse(req.body);

      const driverId = req.params['driverId'] ?? '';
      const driver = await driverService.rejectDriver(driverId, reason, req.user!.userId);
      await auditRepository.log({
        event: 'driver_rejected',
        actorId: req.user!.userId,
        targetId: driverId,
        targetType: 'driver',
        metadata: { reason },
        ipAddress: req.ip,
      });
      sendSuccess(res, { message: 'Driver rejected', driver });
    } catch (err) {
      next(err);
    }
  },

  // POST /admin/drivers/:driverId/suspend
  suspendDriver: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        reason: z.string().min(10, 'Please provide a suspension reason'),
      });
      const { reason } = schema.parse(req.body);

      const driverId = req.params['driverId'] ?? '';
      const driver = await driverService.suspendDriver(driverId, reason);
      await auditRepository.log({
        event: 'driver_suspended',
        actorId: req.user!.userId,
        targetId: driverId,
        targetType: 'driver',
        metadata: { reason },
        ipAddress: req.ip,
      });
      sendSuccess(res, { message: 'Driver suspended', driver });
    } catch (err) {
      next(err);
    }
  },

  // POST /admin/drivers/:driverId/reactivate
  reactivateDriver: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driverId = req.params['driverId'] ?? '';
      await driverRepository.updateStatus(driverId, 'active');
      const driver = await driverRepository.findById(driverId);
      await auditRepository.log({
        event: 'driver_reactivated',
        actorId: req.user!.userId,
        targetId: driverId,
        targetType: 'driver',
        ipAddress: req.ip,
      });
      sendSuccess(res, { message: 'Driver reactivated', driver });
    } catch (err) {
      next(err);
    }
  },

  // ─────────────────────────────────────────────────────────────
  // GET /admin/drivers/online-map
  // Posiciones GPS en tiempo real de todos los conductores online
  // Fuente: Redis (TTL 10s por conductor)
  // ─────────────────────────────────────────────────────────────
  onlineDriversMap: async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Obtener IDs del set de conductores online
      const driverIds = await redis.smembers(REDIS_KEYS.driversOnline);
      if (driverIds.length === 0) { sendSuccess(res, { drivers: [] }); return; }

      // Leer posición de cada conductor en paralelo
      const locations = await Promise.all(
        driverIds.map(async (id) => {
          const raw = await redis.get(REDIS_KEYS.driverLocation(id));
          if (!raw) return null;
          const loc = JSON.parse(raw) as {
            latitude: number; longitude: number; heading?: number; speed?: number;
          };
          return { driverId: id, ...loc };
        })
      );

      // Enriquecer con datos básicos del conductor desde DB (en lote)
      const validIds = locations.filter(Boolean).map(l => l!.driverId);
      let driverNames: Record<string, { name: string; vehicle: string; rating: number }> = {};

      if (validIds.length > 0) {
        const { rows } = await db.query<{
          id: string; name: string;
          vehicle_color: string; vehicle_brand: string; vehicle_model: string;
          rating_avg: number;
        }>(
          `SELECT d.id, u.name,
                  d.vehicle_color, d.vehicle_brand, d.vehicle_model, d.rating_avg
           FROM drivers d JOIN users u ON u.id = d.id
           WHERE d.id = ANY($1::uuid[])`,
          [validIds]
        );
        driverNames = Object.fromEntries(rows.map(r => [r.id, {
          name:    r.name,
          vehicle: `${r.vehicle_color} ${r.vehicle_brand} ${r.vehicle_model}`,
          rating:  r.rating_avg,
        }]));
      }

      const drivers = locations
        .filter(Boolean)
        .map(l => ({ ...l, ...driverNames[l!.driverId] }));

      sendSuccess(res, { drivers, count: drivers.length });
    } catch (err) { next(err); }
  },

  // ─────────────────────────────────────────────────────────────
  // GET /admin/rides — todos los viajes con filtros para el dashboard
  // ─────────────────────────────────────────────────────────────
  listRides: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        status:    z.string().optional(),
        stateCode: z.string().length(2).optional(),
        dateFrom:  z.string().optional(),
        dateTo:    z.string().optional(),
        limit:     z.coerce.number().default(50),
        offset:    z.coerce.number().default(0),
      });
      const { status, stateCode, dateFrom, dateTo, limit, offset } = schema.parse(req.query);

      const conditions: string[] = [];
      const params: unknown[] = [];
      let p = 1;

      if (status)    { conditions.push(`r.status = $${p++}`);     params.push(status); }
      if (stateCode) { conditions.push(`r.state_code = $${p++}`); params.push(stateCode); }
      if (dateFrom)  { conditions.push(`r.created_at >= $${p++}`); params.push(dateFrom); }
      if (dateTo)    { conditions.push(`r.created_at <= $${p++}`); params.push(dateTo); }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const { rows } = await db.query(
        `SELECT r.id, r.status, r.service_type, r.state_code,
                r.pickup_address, r.dropoff_address,
                r.total_charged, r.driver_earnings, r.platform_commission,
                r.distance_km, r.duration_minutes, r.payment_status,
                r.created_at, r.completed_at,
                u_p.name AS passenger_name,
                u_d.name AS driver_name
         FROM rides r
         JOIN users u_p ON u_p.id = r.passenger_id
         LEFT JOIN users u_d ON u_d.id = r.driver_id
         ${where}
         ORDER BY r.created_at DESC
         LIMIT $${p} OFFSET $${p + 1}`,
        [...params, limit, offset]
      );

      const { rows: countRows } = await db.query(
        `SELECT COUNT(*) AS total FROM rides r ${where}`, params
      );

      sendSuccess(res, { rides: rows, total: parseInt(countRows[0].total), limit, offset });
    } catch (err) { next(err); }
  },

  // ─────────────────────────────────────────────────────────────
  // GET /admin/finance — resumen financiero por período
  // ─────────────────────────────────────────────────────────────
  financeSummary: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const days = parseInt(req.query['days'] as string || '30');

      // Revenue diario de los últimos N días
      const { rows: dailyRevenue } = await db.query<{
        day: string; revenue: string; rides: string; commission: string;
      }>(
        `SELECT
           DATE(created_at)          AS day,
           COALESCE(SUM(total_charged), 0)::text       AS revenue,
           COUNT(*)::text            AS rides,
           COALESCE(SUM(platform_commission), 0)::text AS commission
         FROM rides
         WHERE status = 'completed'
           AND created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY DATE(created_at)
         ORDER BY day ASC`
      );

      // Totales del período
      const { rows: totals } = await db.query<{
        total_revenue: string; total_commission: string;
        total_rides: string; failed_payments: string;
      }>(
        `SELECT
           COALESCE(SUM(total_charged), 0)::text        AS total_revenue,
           COALESCE(SUM(platform_commission), 0)::text  AS total_commission,
           COUNT(*) FILTER (WHERE status = 'completed')::text AS total_rides,
           COUNT(*) FILTER (WHERE payment_status = 'failed')::text AS failed_payments
         FROM rides
         WHERE created_at >= NOW() - INTERVAL '${days} days'`
      );

      // Top 10 conductores por ganancias en el período
      const { rows: topDrivers } = await db.query(
        `SELECT u.name, SUM(de.net_amount)::float AS earned, COUNT(de.id) AS trips
         FROM driver_earnings de
         JOIN users u ON u.id = de.driver_id
         WHERE de.type = 'ride' AND de.created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY u.name
         ORDER BY earned DESC LIMIT 10`
      );

      // Retiros pendientes
      const { rows: pendingPayouts } = await db.query(
        `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::float AS total
         FROM driver_withdrawals WHERE status IN ('pending', 'processing')`
      );

      sendSuccess(res, {
        dailyRevenue: dailyRevenue.map(r => ({
          day:        r.day,
          revenue:    parseFloat(r.revenue),
          rides:      parseInt(r.rides),
          commission: parseFloat(r.commission),
        })),
        totals: {
          revenue:       parseFloat(totals[0]?.total_revenue ?? '0'),
          commission:    parseFloat(totals[0]?.total_commission ?? '0'),
          rides:         parseInt(totals[0]?.total_rides ?? '0'),
          failedPayments: parseInt(totals[0]?.failed_payments ?? '0'),
        },
        topDrivers,
        pendingPayouts: pendingPayouts[0],
        days,
      });
    } catch (err) { next(err); }
  },

  // ─────────────────────────────────────────────────────────────
  // GET /admin/fares — configuración de tarifas por estado
  // PUT /admin/fares/:stateCode — actualizar config de un estado
  // ─────────────────────────────────────────────────────────────
  listFares: async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { rows } = await db.query(
        `SELECT code, name, base_fare::float, price_per_km::float, price_per_minute::float,
                min_fare::float, surge_multiplier::float, platform_commission_percent::float,
                motorcycle_multiplier::float, suv_multiplier::float,
                hourly_rate::float, scheduled_surcharge::float
         FROM us_states ORDER BY name ASC`
      );
      sendSuccess(res, { fares: rows });
    } catch (err) { next(err); }
  },

  updateFare: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        base_fare:                   z.number().positive().optional(),
        price_per_km:                z.number().positive().optional(),
        price_per_minute:            z.number().positive().optional(),
        min_fare:                    z.number().positive().optional(),
        surge_multiplier:            z.number().min(1).max(5).optional(),
        platform_commission_percent: z.number().min(5).max(30).optional(),
        motorcycle_multiplier:       z.number().min(0.1).max(5).optional(),
        suv_multiplier:              z.number().min(1).max(5).optional(),
        hourly_rate:                 z.number().positive().optional(),
        scheduled_surcharge:         z.number().min(1).max(3).optional(),
      });

      const updates = schema.parse(req.body);
      const stateCode = req.params['stateCode']!.toUpperCase();

      if (Object.keys(updates).length === 0) {
        sendError(res, 400, 'No fields to update', 'NO_FIELDS'); return;
      }

      const sets: string[] = [];
      const vals: unknown[] = [];
      let i = 1;
      for (const [col, val] of Object.entries(updates)) {
        sets.push(`${col} = $${i++}`);
        vals.push(val);
      }
      vals.push(stateCode);

      const { rows } = await db.query(
        `UPDATE us_states SET ${sets.join(', ')} WHERE code = $${i} RETURNING *`,
        vals
      );
      if (!rows[0]) { sendError(res, 404, 'State not found', 'NOT_FOUND'); return; }

      // Invalidar caché de Redis para este estado
      await redis.del(REDIS_KEYS.stateConfig(stateCode));

      sendSuccess(res, { updated: true, state: rows[0] });
    } catch (err) { next(err); }
  },

  // GET /admin/passengers
  listPassengers: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit  = parseInt(req.query['limit']  as string || '50');
      const offset = parseInt(req.query['offset'] as string || '0');
      const rawSearch = req.query['search'] as string | undefined;
      const search = rawSearch ? rawSearch.slice(0, 100) : undefined;

      const queryParams: unknown[] = [limit, offset];
      const searchCondition = search
        ? (queryParams.push(`%${search}%`), `AND (u.name ILIKE $3 OR u.email ILIKE $3)`)
        : '';

      const { rows } = await db.query(
        `SELECT u.id, u.name, u.email, u.phone, u.state_code, u.is_active, u.created_at,
                p.rating_avg, p.total_rides, p.stripe_customer_id
         FROM users u JOIN passengers p ON p.id = u.id
         WHERE u.role = 'passenger'
           ${searchCondition}
         ORDER BY u.created_at DESC
         LIMIT $1 OFFSET $2`,
        queryParams
      );
      sendSuccess(res, { passengers: rows });
    } catch (err) { next(err); }
  },

  // GET /admin/drivers/:driverId/training
  getDriverTraining: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driverId = req.params['driverId'] ?? '';
      const driver = await driverRepository.findById(driverId);
      if (!driver) {
        sendError(res, 404, 'Driver not found', 'NOT_FOUND');
        return;
      }

      const [modules, progress] = await Promise.all([
        trainingRepository.getAllModules(),
        trainingRepository.getProgressByDriver(driverId),
      ]);

      const progressMap = new Map(progress.map(p => [p.module_id, p]));
      const result = modules.map(m => ({
        module_id:    m.id,
        code:         m.code,
        title:        m.title,
        passing_score: m.passing_score,
        total_questions: m.total_questions,
        order_index:  m.order_index,
        is_required:  m.is_required,
        progress:     progressMap.get(m.id) ?? null,
      }));

      const completed = result.filter(r => r.progress?.status === 'passed' && r.is_required).length;
      const total     = result.filter(r => r.is_required).length;

      sendSuccess(res, { modules: result, completed, total, isComplete: completed >= total });
    } catch (err) { next(err); }
  },
};
