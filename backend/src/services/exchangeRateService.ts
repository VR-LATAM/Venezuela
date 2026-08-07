import axios from 'axios';
import * as https from 'https';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

const REDIS_KEY = 'ves:bcv_rate';
const CACHE_TTL = 3600; // 1 hora
const BCV_URL = 'https://www.bcv.org.ve';

// El BCV tiene certificado con problemas — agente que lo acepta igual
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Obtiene el tipo de cambio USD→VES desde Redis o raspando el BCV
export async function getUSDToVES(): Promise<number> {
  try {
    const cached = await redis.get(REDIS_KEY);
    if (cached) return parseFloat(cached);
    return await refreshExchangeRate();
  } catch {
    return await refreshExchangeRate();
  }
}

// Raspa la página del BCV y extrae la tasa del dólar
export async function refreshExchangeRate(): Promise<number> {
  try {
    const { data: html } = await axios.get<string>(BCV_URL, {
      httpsAgent,
      timeout: 10_000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VRide/1.0)',
        'Accept': 'text/html',
      },
    });

    // Patrón 1: <div id="dolar">...<strong>756,70830000</strong>
    let rateRaw: string | undefined;
    const pat1 = html.match(/id=["']dolar["'][^>]*>[\s\S]{0,500}?<strong>([\d,\.]+)<\/strong>/i);
    if (pat1) rateRaw = pat1[1];

    // Patrón 2: texto "USD756,70830000" directo en la página
    if (!rateRaw) {
      const pat2 = html.match(/USD\s*([\d]{1,4}[,\.]\d{2,10})/i);
      if (pat2) rateRaw = pat2[1];
    }

    if (!rateRaw) throw new Error('No se encontró la tasa USD en la página del BCV');

    // El BCV usa coma como separador decimal: "756,70830000" → 756.70830000
    const rateStr = rateRaw.replace(/\./g, '').replace(',', '.');
    const rate = parseFloat(rateStr);
    if (!rate || rate <= 0) throw new Error(`Tasa inválida extraída: ${match[1]}`);

    await redis.setEx(REDIS_KEY, CACHE_TTL, rate.toString());
    logger.info(`Tasa BCV actualizada: 1 USD = ${rate} Bs.`);
    return rate;
  } catch (err) {
    logger.error('Error obteniendo tasa del BCV:', err);
    // Retorna última tasa conocida en Redis como fallback
    const cached = await redis.get(REDIS_KEY);
    if (cached) {
      logger.warn(`Usando última tasa conocida en Redis: ${cached} Bs.`);
      return parseFloat(cached);
    }
    throw new Error('No se pudo obtener la tasa BCV y no hay caché disponible');
  }
}

// Convierte monto USD a VES usando la tasa BCV actual
export async function convertToVES(amountUSD: number): Promise<{ ves: number; rate: number }> {
  const rate = await getUSDToVES();
  return { ves: parseFloat((amountUSD * rate).toFixed(2)), rate };
}
