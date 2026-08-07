// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// V-RIDE BACKEND — Punto de entrada principal
// Express + Socket.io + Redis Pub/Sub
// ═══════════════════════════════════════════════════════════════

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION — proceso continúa:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION — proceso continúa:', reason);
});

import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { Server as SocketServer } from 'socket.io';
import { env } from './config/env';
import { checkDatabaseConnection } from './config/database';
import { checkRedisConnection } from './config/redis';
import { logger } from './utils/logger';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import router from './routes/index';
import { setupSocketHandlers } from './socket/index';
import { initSocketEmitter } from './socket/emitter';
import { scheduledRideService } from './services/scheduledRideService';
import { referralService } from './services/referralService';
import { payoutService } from './services/payoutService';
import { refreshExchangeRate } from './services/exchangeRateService';

const app = express();
const httpServer = http.createServer(app);

// Railway y otros proxies envían X-Forwarded-For — necesario para rate limiter e IPs reales
app.set('trust proxy', 1);

// ─────────────────────────────────────
// MIDDLEWARE GLOBAL
// ─────────────────────────────────────

// Seguridad HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.stripe.com', 'https://firebaseapp.com'],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: {
    maxAge: 31536000,       // 1 año
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS: dominios autorizados desde variable de entorno
const allowedOrigins = env.CORS_ORIGINS.split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Sin origen: apps móviles nativas (React Native no envía Origin), permitir siempre
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Loguear intentos de CORS no autorizados en producción
      if (env.NODE_ENV === 'production') {
        logger.warn('CORS blocked', { origin });
      }
      callback(new Error('Origen no permitido por CORS'));
    }
  },
  credentials: true,
}));

// Compresión gzip (mejora tiempos de respuesta a escala nacional)
app.use(compression());

// Logging de requests — JWT redactado para no exponer tokens en logs
morgan.token('auth-redacted', (req: express.Request) => {
  const auth = req.headers['authorization'];
  if (!auth) return '-';
  return auth.substring(0, 15) + '...[REDACTED]';
});

// En producción: IP hasheada para no registrar datos personales (GDPR)
morgan.token('ip-hashed', (req: express.Request) => {
  const ip = req.ip ?? req.socket.remoteAddress ?? '';
  const hash = require('crypto').createHash('sha256').update(ip).digest('hex').slice(0, 8);
  return `h:${hash}`;
});

if (env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan(':ip-hashed :method :url :status :res[content-length] - :response-time ms :auth-redacted', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));
}

// Parseo de JSON
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting general
app.use(generalLimiter);

// Estado de conexiones — actualizado durante el arranque
const health = { db: false, redis: false };

// ─────────────────────────────────────
// HEALTHCHECK — refleja estado real de conexiones
// ─────────────────────────────────────
app.get('/health', (_req, res) => {
  const ready = health.db && health.redis;
  res.status(200).json({
    status:    ready ? 'ok' : 'starting',
    db:        health.db,
    redis:     health.redis,
    service:   'veronaride-api',
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────
// ARCHIVOS ESTÁTICOS (fotos de perfil en desarrollo)
// ─────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ─────────────────────────────────────
// RUTAS API
// ─────────────────────────────────────
app.use('/api/v1', router);

// ─────────────────────────────────────
// MANEJADORES DE ERROR
// ─────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─────────────────────────────────────
// SOCKET.IO — GPS en tiempo real a escala nacional
// Redis Adapter permite escalar horizontalmente:
// múltiples instancias del backend comparten eventos via Redis Pub/Sub
// ─────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  // Heartbeat explícito — mantiene la conexión viva a través del proxy de Railway.
  // Sin esto, conexiones idle (pasajero esperando) pueden ser cerradas por el proxy.
  pingInterval: 25_000,   // enviar ping cada 25 s
  pingTimeout:  60_000,   // esperar pong hasta 60 s antes de desconectar
});

// Inicializar el emitter singleton (permite que los servicios emitan sin importar io)
initSocketEmitter(io);

// Configurar todos los handlers de Socket.io (GPS, viajes, mensajes)
setupSocketHandlers(io);

// Exportar io para que los servicios puedan emitir eventos
export { io };

// ─────────────────────────────────────
// ARRANQUE DEL SERVIDOR
// ─────────────────────────────────────
async function startServer(): Promise<void> {
  // Diagnóstico de arranque — visible en Railway Deploy Logs
  console.log('[STARTUP] Iniciando servidor...');
  console.log(`[STARTUP] NODE_ENV=${env.NODE_ENV} PORT=${env.PORT}`);
  console.log(`[STARTUP] DATABASE_URL configurado: ${!!process.env['DATABASE_URL']}`);
  console.log(`[STARTUP] REDIS_URL configurado: ${!!process.env['REDIS_URL']}`);
  console.log(`[STARTUP] FIREBASE_PROJECT_ID=${env.FIREBASE_PROJECT_ID ?? 'NO CONFIGURADO'}`);

  // Advertencias de seguridad en producción
  if (env.NODE_ENV === 'production') {
    if (env.STRIPE_WEBHOOK_SECRET === 'whsec_placeholder_not_configured') {
      logger.warn('⚠️  STRIPE_WEBHOOK_SECRET no configurado — webhooks de Stripe desactivados');
    }
    if (!env.FIREBASE_SERVICE_ACCOUNT_BASE64 && env.FIREBASE_PRIVATE_KEY) {
      logger.warn('⚠️  Usando FIREBASE_PRIVATE_KEY individual — se recomienda usar FIREBASE_SERVICE_ACCOUNT_BASE64');
    }
  }

  console.log('[STARTUP] Paso 6 — iniciando httpServer.listen en puerto', env.PORT);
  await new Promise<void>((resolve) => {
    httpServer.listen(env.PORT, () => {
      console.log('[STARTUP] Puerto', env.PORT, 'escuchando OK');
      logger.info(`Verona Ride API corriendo en puerto ${env.PORT} [${env.NODE_ENV}]`);
      resolve();
    });
  });

  console.log('[STARTUP] Paso 7 — verificando PostgreSQL');
  try {
    await checkDatabaseConnection();
    health.db = true;
    console.log('[STARTUP] PostgreSQL OK');
  } catch (err) {
    console.error('[STARTUP] PostgreSQL FALLO:', err);
  }

  console.log('[STARTUP] Paso 8 — verificando Redis');
  try {
    await checkRedisConnection();
    health.redis = true;
    console.log('[STARTUP] Redis OK');
  } catch (err) {
    console.error('[STARTUP] Redis FALLO:', err);
  }

  if (health.db && health.redis) {
    payoutService.startCron();
    // Cargar tasa BCV al arrancar y refrescar cada hora
    refreshExchangeRate().catch(() => {});
    setInterval(() => refreshExchangeRate().catch(() => {}), 3_600_000);
    logger.info(`📡 Socket.io listo para GPS en tiempo real`);
    logger.info(`🗺️  Cobertura: Texas activo, expansión nacional lista`);
  } else {
    logger.warn('⚠️  Servicios iniciados en modo degradado — DB o Redis no disponibles');
  }

  // Heartbeat cada 60s — mantiene el event loop vivo y confirma que el proceso sigue corriendo
  setInterval(() => {
    logger.info('[HEARTBEAT] Servidor activo');
  }, 60_000);
}

// Diagnóstico de salida — detecta si el proceso termina inesperadamente
process.on('exit', (code) => {
  console.log(`[EXIT] Proceso terminando con código ${code} — ${new Date().toISOString()}`);
});
process.on('beforeExit', (code) => {
  console.log(`[BEFORE-EXIT] Event loop vacío, código ${code} — ${new Date().toISOString()}`);
});

// Cierre graceful al recibir señales del sistema (para Railway y Docker)
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recibido — cerrando servidor...');
  httpServer.close(() => {
    logger.info('Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT recibido — cerrando servidor...');
  httpServer.close(() => process.exit(0));
});

startServer();
