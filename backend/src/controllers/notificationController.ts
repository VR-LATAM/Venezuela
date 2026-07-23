// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Controlador de notificaciones — registro de tokens FCM
// ═══════════════════════════════════════════════════════════════

import { Request, Response } from 'express';
import { z } from 'zod';
import { notificationRepository } from '../repositories/notificationRepository';
import { fcmService } from '../services/fcmService';

export const notificationController = {

  // POST /notification/token
  // Registra o actualiza el token FCM del dispositivo del usuario
  registerToken: async (req: Request, res: Response): Promise<void> => {
    const schema = z.object({
      token:    z.string().min(10),
      platform: z.enum(['ios', 'android']),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid data.', details: parsed.error.flatten() });
      return;
    }

    await notificationRepository.upsertToken(
      req.user!.userId,
      parsed.data.token,
      parsed.data.platform
    );
    res.json({ success: true });
  },

  // DELETE /notification/token
  // Elimina el token al cerrar sesión (para dejar de recibir notificaciones)
  deleteToken: async (req: Request, res: Response): Promise<void> => {
    const platform = req.query['platform'] as 'ios' | 'android' | undefined;
    await notificationRepository.deleteToken(req.user!.userId, platform);
    res.json({ success: true });
  },

  // POST /notification/campaign (solo admin)
  // Envía una notificación masiva a un segmento de usuarios
  sendCampaign: async (req: Request, res: Response): Promise<void> => {
    const schema = z.object({
      title:      z.string().min(1).max(255),
      body:       z.string().min(1),
      target:     z.string().min(1),  // 'all_drivers', 'state_drivers:TX', etc.
      stateCode:  z.string().length(2).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid data.', details: parsed.error.flatten() });
      return;
    }

    const { title, body, target, stateCode } = parsed.data;
    const adminId = req.user!.userId;

    const campaignId = await notificationRepository.createCampaign({
      createdBy: adminId,
      title,
      body,
      target,
    });

    // Recolectar tokens según el target
    let tokens: string[] = [];
    if (target.startsWith('state_drivers:') && stateCode) {
      tokens = await notificationRepository.getDriverTokensByState(stateCode);
    }

    if (tokens.length === 0) {
      res.json({ campaignId, message: 'No recipients found for the target.', sentCount: 0 });
      return;
    }

    // Actualizar estado a 'sending'
    await notificationRepository.updateCampaignStatus(campaignId, 'sending', 0);

    // Enviar en lotes de 500 (límite de FCM)
    let totalSuccess = 0;
    const allInvalid: string[] = [];
    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);
      const result = await fcmService.sendToTokens(batch, { title, body });
      totalSuccess += result.successCount;
      allInvalid.push(...result.invalidTokens);
    }

    // Limpiar tokens inválidos y actualizar estado de la campaña
    await Promise.all([
      notificationRepository.removeInvalidTokens(allInvalid),
      notificationRepository.updateCampaignStatus(campaignId, 'sent', totalSuccess),
    ]);

    res.json({ campaignId, sentCount: totalSuccess, invalidTokensCleaned: allInvalid.length });
  },
};
