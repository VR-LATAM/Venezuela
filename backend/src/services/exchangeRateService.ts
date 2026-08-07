import axios from 'axios';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

const REDIS_KEY = 'ves:bcv_rate';
const CACHE_TTL = 3600; // 1 hora
const BCV_API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';

interface BCVResponse {
  promedio: number;
  fecha: string;
}

// Obtiene el tipo de cambio USD→VES desde Redis o la API del BCV
export async function getUSDToVES(): Promise<number> {
  try {
    const cached = await redis.get(REDIS_KEY);
    if (cached) return parseFloat(cached);
    return await refreshExchangeRate();
  } catch {
    return await refreshExchangeRate();
  }
}

// Llama a la API del BCV, guarda en Redis y retorna la tasa
export async function refreshExchangeRate(): Promise<number> {
  try {
    const { data } = await axios.get<BCVResponse>(BCV_API_URL, { timeout: 8000 });
    const rate = data.promedio;
    if (!rate || rate <= 0) throw new Error('Tasa inválida recibida del BCV');
    await redis.setEx(REDIS_KEY, CACHE_TTL, rate.toString());
    logger.info(`Tipo de cambio BCV actualizado: 1 USD = ${rate} VES`);
    return rate;
  } catch (err) {
    logger.error('Error obteniendo tasa BCV:', err);
    // Retorna última tasa conocida o fallback
    const cached = await redis.get(REDIS_KEY);
    if (cached) return parseFloat(cached);
    return 1; // fallback seguro — no rompe el cálculo
  }
}

// Convierte monto USD a VES
export async function convertToVES(amountUSD: number): Promise<{ ves: number; rate: number }> {
  const rate = await getUSDToVES();
  return { ves: parseFloat((amountUSD * rate).toFixed(2)), rate };
}
