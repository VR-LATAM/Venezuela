import { Router, Request, Response } from 'express';
import { getUSDToVES, refreshExchangeRate } from '../services/exchangeRateService';

const router = Router();

// GET /api/v1/exchange-rate — tasa BCV actual USD→VES
router.get('/', async (_req: Request, res: Response) => {
  const rate = await getUSDToVES();
  res.json({ usd_to_ves: rate, source: 'BCV', currency: 'VES' });
});

// POST /api/v1/exchange-rate/refresh — forzar actualización (solo admin)
router.post('/refresh', async (_req: Request, res: Response) => {
  const rate = await refreshExchangeRate();
  res.json({ usd_to_ves: rate, source: 'BCV', refreshed: true });
});

export default router;
