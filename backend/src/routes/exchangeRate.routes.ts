import { Router, Request, Response } from 'express';
import { getUSDToVES, refreshExchangeRate, setManualRate } from '../services/exchangeRateService';

const router = Router();

// GET /api/v1/exchange-rate — tasa BCV actual USD→VES
router.get('/', async (_req: Request, res: Response) => {
  const rate = await getUSDToVES();
  res.json({ usd_to_ves: rate, source: 'BCV', currency: 'VES' });
});

// POST /api/v1/exchange-rate/refresh — forzar re-scraping del BCV
router.post('/refresh', async (_req: Request, res: Response) => {
  const rate = await refreshExchangeRate();
  res.json({ usd_to_ves: rate, source: 'BCV', refreshed: true });
});

// POST /api/v1/exchange-rate/set — setear tasa manualmente (admin)
// Body: { rate: number }  — vigente 25 horas, luego vuelve al BCV
router.post('/set', async (req: Request, res: Response) => {
  const rate = parseFloat(req.body?.rate);
  if (!rate || rate <= 0 || !isFinite(rate)) {
    res.status(400).json({ error: 'Tasa inválida. Envía { rate: número_positivo }' });
    return;
  }
  await setManualRate(rate);
  res.json({ usd_to_ves: rate, set_manually: true, valid_hours: 25 });
});

export default router;
