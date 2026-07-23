// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Rutas de autenticación
// POST /auth/register/passenger
// POST /auth/register/driver
// POST /auth/login
// POST /auth/refresh
// POST /auth/logout         (requiere JWT)
// GET  /auth/me             (requiere JWT)
// POST /auth/push-token     (requiere JWT)
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { authController } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { auditLog } from '../middleware/auditMiddleware';

const router = Router();

// Registro y login: rate limiting estricto (anti fuerza bruta)
router.post('/register/passenger', authLimiter, auditLog('passenger_registered'), authController.registerPassenger);
router.post('/register/driver',    authLimiter, auditLog('driver_registered'),    authController.registerDriver);
router.post('/login',              authLimiter, auditLog('passenger_login'),       authController.login);
router.post('/refresh',            authLimiter, authController.refresh);

// Requieren JWT válido
router.post('/logout',      requireAuth, authController.logout);
router.get('/me',           requireAuth, authController.me);
router.post('/push-token',  requireAuth, authController.savePushToken);

// Login del panel de administración — funciona en todos los entornos
router.post('/admin-login', authLimiter, authController.adminLogin);

// 2FA para admin — requiere JWT de admin
router.get('/admin/2fa/setup',    requireAuth, authController.adminSetup2FA);
router.post('/admin/2fa/verify',  requireAuth, authController.adminVerify2FA);
router.delete('/admin/2fa',       requireAuth, authController.adminDisable2FA);

// Solo desarrollo — login y registro sin Firebase
router.post('/dev-login',              authController.devLogin);
router.post('/dev-register/passenger', authController.devRegisterPassenger);
router.post('/dev-register/driver',    authController.devRegisterDriver);

export default router;
