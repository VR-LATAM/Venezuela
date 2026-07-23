// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Rutas de usuario — operaciones compartidas entre roles
// ═══════════════════════════════════════════════════════════════

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { withTransaction, query, queryOne } from '../config/database';
import { uploadProfilePhoto, uploadDocument, deleteFile } from '../services/storageService';
import { logger } from '../utils/logger';

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máximo
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Solo se permiten imágenes'));
      return;
    }
    cb(null, true);
  },
});

// ─────────────────────────────────────
// POST /user/photo — subir foto de perfil
// ─────────────────────────────────────
router.post('/photo', upload.single('photo'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image was received' });
      return;
    }

    const userId  = req.user!.userId;
    const photoUrl = await uploadProfilePhoto(req.file.buffer, req.file.mimetype, userId);

    await queryOne(
      'UPDATE users SET photo_url = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [photoUrl, userId]
    );

    res.json({ photoUrl });
  } catch (err) {
    logger.error('Error al subir foto de perfil:', err);
    res.status(500).json({ error: 'Could not upload the photo' });
  }
});

// ─────────────────────────────────────
// POST /user/identity-document?side=front|back — subir ID gubernamental del pasajero
// ─────────────────────────────────────
router.post('/identity-document', upload.single('document'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image was received' });
      return;
    }

    const userId = req.user!.userId;
    const side   = req.query['side'] === 'back' ? 'back' : 'front';
    const docType = side === 'front' ? 'license_front' : 'license_back';
    const column  = side === 'front' ? 'identity_doc_url' : 'identity_doc_back_url';

    const docUrl = await uploadDocument(req.file.buffer, req.file.mimetype, userId, docType as any);

    await queryOne(
      `UPDATE passengers SET ${column} = $1 WHERE id = $2 RETURNING id`,
      [docUrl, userId]
    );

    res.json({ docUrl, side });
  } catch (err) {
    logger.error('Error al subir documento de identidad:', err);
    res.status(500).json({ error: 'Could not upload the document' });
  }
});

// ─────────────────────────────────────
// DELETE /user/account — GDPR/CCPA: eliminar cuenta y anonimizar PII
// ─────────────────────────────────────
router.delete('/account', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const role   = req.user!.role;

  try {
    // 1. Recopilar URLs de archivos en Storage para borrar fuera de la transacción
    const storageUrls: string[] = [];

    const userRow = await queryOne<{ photo_url: string | null }>(
      'SELECT photo_url FROM users WHERE id = $1', [userId]
    );
    if (userRow?.photo_url) storageUrls.push(userRow.photo_url);

    if (role === 'driver') {
      const docs = await query<{ url: string | null }>(
        `SELECT license_front_url AS url FROM drivers WHERE id = $1
         UNION ALL SELECT license_back_url  FROM drivers WHERE id = $1
         UNION ALL SELECT vehicle_front_url FROM drivers WHERE id = $1
         UNION ALL SELECT vehicle_back_url  FROM drivers WHERE id = $1
         UNION ALL SELECT insurance_url     FROM drivers WHERE id = $1
         UNION ALL SELECT selfie_url        FROM drivers WHERE id = $1`,
        [userId]
      );
      docs.forEach(d => { if (d.url) storageUrls.push(d.url); });
    }

    if (role === 'passenger') {
      const docs = await query<{ url: string | null }>(
        `SELECT identity_doc_url AS url FROM passengers WHERE id = $1
         UNION ALL SELECT identity_doc_back_url FROM passengers WHERE id = $1`,
        [userId]
      );
      docs.forEach(d => { if (d.url) storageUrls.push(d.url); });
    }

    // 2. Transacción: anonimizar y eliminar datos PII de la BD
    await withTransaction(async (client) => {
      // Anonimizar historial de viajes (conservar para fines contables — 7 años)
      if (role === 'passenger') {
        await client.query(
          `UPDATE rides SET
             passenger_name  = '[Deleted User]',
             pickup_address  = '[Deleted]',
             dropoff_address = '[Deleted]',
             pickup_location  = NULL,
             dropoff_location = NULL
           WHERE passenger_id = $1`,
          [userId]
        );
      }
      if (role === 'driver') {
        await client.query(
          `UPDATE rides SET driver_name = '[Deleted Driver]'
           WHERE driver_id = $1`,
          [userId]
        );
      }

      // Eliminar tokens de push
      await client.query('DELETE FROM push_tokens WHERE user_id = $1', [userId]);

      // Eliminar métodos de pago
      await client.query('DELETE FROM payment_methods WHERE user_id = $1', [userId]);

      // Eliminar registro de rol (driver o passenger)
      if (role === 'driver') {
        await client.query('DELETE FROM drivers WHERE id = $1', [userId]);
      } else if (role === 'passenger') {
        await client.query('DELETE FROM passengers WHERE id = $1', [userId]);
      }

      // Anonimizar registro de usuario (no eliminar — mantener integridad referencial)
      await client.query(
        `UPDATE users SET
           email        = $2,
           name         = '[Deleted User]',
           phone        = NULL,
           photo_url    = NULL,
           firebase_uid = $3,
           is_active    = false,
           updated_at   = NOW()
         WHERE id = $1`,
        [
          userId,
          `deleted-${userId}@deleted.vride`,
          `deleted-${userId}`,
        ]
      );
    });

    // 3. Eliminar archivos del Storage (fuera de transacción — no es rollbackeable)
    await Promise.allSettled(storageUrls.filter(Boolean).map(url => deleteFile(url)));

    logger.info(`Account deleted (GDPR) — userId=${userId} role=${role}`);
    res.status(200).json({ message: 'Your account has been deleted. All personal data has been removed.' });
  } catch (err) {
    logger.error(`Error deleting account userId=${userId}: ${String(err)}`);
    res.status(500).json({ error: 'Could not delete account. Please contact support.' });
  }
});

export default router;
