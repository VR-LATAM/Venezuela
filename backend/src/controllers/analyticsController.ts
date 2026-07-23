// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Controlador de analítica — heatmap de demanda y surge pricing
// Provee datos geoespaciales para el dashboard admin
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../config/database';
import { isSurgeHour } from '../services/fareService';
import { sendSuccess } from '../utils/response';

export const analyticsController = {

  // GET /analytics/demand
  // Devuelve densidad de solicitudes de viaje agrupadas en celdas de ~1km²
  // Para renderizar el heatmap en el admin dashboard (deck.gl HeatmapLayer)
  demandHeatmap: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = z.object({
        hours:     z.coerce.number().min(1).max(168).default(24), // últimas N horas (máx 7 días)
        stateCode: z.string().length(2).optional(),
      });

      const { hours, stateCode } = schema.parse(req.query);

      // Agrupa los pickups en una grilla de ~1km² usando ST_SnapToGrid
      // Cada punto se redondea al 0.01° más cercano (≈1.1km en Texas)
      const params: unknown[] = [hours];
      const stateFilter = stateCode ? `AND state_code = $2` : '';
      if (stateCode) params.push(stateCode.toUpperCase());

      const { rows } = await db.query<{
        lat:    number;
        lng:    number;
        count:  string;
      }>(
        `SELECT
           ROUND(ST_Y(pickup_location::geometry)::numeric, 2) AS lat,
           ROUND(ST_X(pickup_location::geometry)::numeric, 2) AS lng,
           COUNT(*)::text AS count
         FROM rides
         WHERE created_at >= NOW() - ($1 * INTERVAL '1 hour')
           ${stateFilter}
           AND status NOT IN ('cancelled_passenger', 'cancelled_driver')
         GROUP BY
           ROUND(ST_Y(pickup_location::geometry)::numeric, 2),
           ROUND(ST_X(pickup_location::geometry)::numeric, 2)
         ORDER BY count DESC
         LIMIT 5000`,
        params
      );

      const points = rows.map(r => ({
        lat:    Number(r.lat),
        lng:    Number(r.lng),
        weight: parseInt(r.count, 10),
      }));

      sendSuccess(res, {
        points,
        isSurgeActive: isSurgeHour(),
        generatedAt:   new Date().toISOString(),
        hours,
        totalRequests: points.reduce((sum, p) => sum + p.weight, 0),
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /analytics/surge-status
  // Estado actual del surge pricing + próximos períodos
  surgeStatus: async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const now = new Date();
      const hour = now.getHours();
      const isActive = isSurgeHour();

      // Calcular minutos hasta el próximo período surge o fin del actual
      let minutesUntilChange = 0;
      if (isActive) {
        // En hora pico — calcular cuánto falta para que termine
        if (hour >= 12 && hour < 14) {
          minutesUntilChange = (14 - hour) * 60 - now.getMinutes();
        } else {
          minutesUntilChange = (21 - hour) * 60 - now.getMinutes();
        }
      } else {
        // Fuera de hora pico — calcular cuánto falta para el próximo surge
        if (hour < 12) {
          minutesUntilChange = (12 - hour) * 60 - now.getMinutes();
        } else if (hour >= 14 && hour < 18) {
          minutesUntilChange = (18 - hour) * 60 - now.getMinutes();
        } else {
          minutesUntilChange = (36 - hour) * 60 - now.getMinutes(); // próximo día 12pm
        }
      }

      sendSuccess(res, {
        isActive,
        multiplier:        isActive ? 1.5 : 1.0,
        periods: [
          { label: 'Mediodía',     start: '12:00', end: '14:00', active: hour >= 12 && hour < 14 },
          { label: 'Tarde/Noche',  start: '18:00', end: '21:00', active: hour >= 18 && hour < 21 },
        ],
        minutesUntilChange: Math.max(0, minutesUntilChange),
        currentHour: hour,
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /analytics/kpis — métricas clave para el dashboard del admin
  kpis: async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { rows } = await db.query<{
        rides_today:      string;
        rides_this_week:  string;
        rides_this_month: string;
        revenue_today:    string;
        revenue_month:    string;
        active_drivers:   string;
        avg_rating:       string;
        cancel_rate:      string;
      }>(`
        SELECT
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::text                              AS rides_today,
          COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('week',  NOW()))::text                AS rides_this_week,
          COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW()))::text                AS rides_this_month,
          COALESCE(SUM(total_charged) FILTER (WHERE created_at >= CURRENT_DATE), 0)::text       AS revenue_today,
          COALESCE(SUM(total_charged) FILTER (
            WHERE created_at >= DATE_TRUNC('month', NOW())
          ), 0)::text                                                                           AS revenue_month,
          (SELECT COUNT(*) FROM drivers WHERE is_online = true AND status = 'active')::text     AS active_drivers,
          (SELECT ROUND(AVG(score)::numeric, 2) FROM ratings WHERE rater_role = 'passenger')::text AS avg_rating,
          (ROUND(
            COUNT(*) FILTER (WHERE status IN ('cancelled_passenger','cancelled_driver'))::numeric
            / NULLIF(COUNT(*), 0) * 100, 1
          ))::text                                                                              AS cancel_rate
        FROM rides
      `);

      const r = rows[0];
      sendSuccess(res, {
        ridesTotal: {
          today:     parseInt(r.rides_today),
          thisWeek:  parseInt(r.rides_this_week),
          thisMonth: parseInt(r.rides_this_month),
        },
        revenue: {
          today:     parseFloat(r.revenue_today),
          thisMonth: parseFloat(r.revenue_month),
        },
        activeDrivers: parseInt(r.active_drivers),
        avgPassengerRating: parseFloat(r.avg_rating ?? '0'),
        cancellationRate:   parseFloat(r.cancel_rate ?? '0'),
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
};
