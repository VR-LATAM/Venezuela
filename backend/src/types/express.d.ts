// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Extensión del tipo Request de Express
// Agrega el usuario autenticado a cada request verificado
// ═══════════════════════════════════════════════════════════════

import { UserRole } from '@vride/shared';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: UserRole;
        email: string;
        name?: string;
      };
    }
  }
}
