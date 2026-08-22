import { Request, Response, NextFunction } from 'express';
import { packageSecurityService, PhotoAngle } from '../services/packageSecurityService';
import { sendSuccess, sendError } from '../utils/response';

const VALID_ANGLES: PhotoAngle[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];

export const packageSecurityController = {

  async getCustody(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const custody = await packageSecurityService.getCustody(req.params['rideId']!);
      if (!custody) { sendError(res, 404, 'Registro de custodia no encontrado', 'NOT_FOUND'); return; }
      sendSuccess(res, custody);
    } catch (e) { next(e); }
  },

  /* POST /ride/:rideId/custody/pickup-photo  body: { angle, photo_url } */
  async savePickupPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { angle, photo_url } = req.body as { angle?: PhotoAngle; photo_url?: string };
      if (!photo_url)                           { sendError(res, 422, 'photo_url requerida', 'VALIDATION_ERROR'); return; }
      if (!angle || !VALID_ANGLES.includes(angle)) { sendError(res, 422, 'Ángulo inválido', 'VALIDATION_ERROR'); return; }
      const result = await packageSecurityService.savePickupPhoto(req.params['rideId']!, angle, photo_url);
      sendSuccess(res, { saved: true, missing: result.missing });
    } catch (e) { next(e); }
  },

  /* POST /ride/:rideId/custody/verify-pickup  body: { pin } */
  async verifyPickupPin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pin } = req.body as { pin?: string };
      if (!pin || pin.length !== 4) { sendError(res, 422, 'PIN de 4 dígitos requerido', 'VALIDATION_ERROR'); return; }
      await packageSecurityService.verifyPickupPin(req.params['rideId']!, pin);
      sendSuccess(res, { verified: true, message: 'Paquete recibido. En camino al destino.' });
    } catch (e: any) {
      if (e.message === 'INVALID_PIN')         { sendError(res, 400, 'PIN incorrecto', 'INVALID_PIN'); return; }
      if (e.message?.startsWith('PHOTOS_MISSING:')) {
        const missing = e.message.split(':')[1];
        sendError(res, 422, `Fotos faltantes: ${missing}`, 'PHOTO_REQUIRED'); return;
      }
      if (e.message === 'PIN_ALREADY_USED')    { sendError(res, 409, 'PIN ya verificado', 'PIN_USED'); return; }
      next(e);
    }
  },

  /* POST /ride/:rideId/custody/delivery-photo  body: { angle, photo_url } */
  async saveDeliveryPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { angle, photo_url } = req.body as { angle?: PhotoAngle; photo_url?: string };
      if (!photo_url)                           { sendError(res, 422, 'photo_url requerida', 'VALIDATION_ERROR'); return; }
      if (!angle || !VALID_ANGLES.includes(angle)) { sendError(res, 422, 'Ángulo inválido', 'VALIDATION_ERROR'); return; }
      const result = await packageSecurityService.saveDeliveryPhoto(req.params['rideId']!, angle, photo_url);
      sendSuccess(res, { saved: true, missing: result.missing });
    } catch (e) { next(e); }
  },

  /* POST /ride/:rideId/custody/verify-delivery  body: { pin } */
  async verifyDeliveryPin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pin } = req.body as { pin?: string };
      if (!pin || pin.length !== 4) { sendError(res, 422, 'PIN de 4 dígitos requerido', 'VALIDATION_ERROR'); return; }
      await packageSecurityService.verifyDeliveryPin(req.params['rideId']!, pin);
      sendSuccess(res, { verified: true, message: 'Entrega confirmada. ¡Excelente trabajo!' });
    } catch (e: any) {
      if (e.message === 'INVALID_PIN')             { sendError(res, 400, 'PIN incorrecto. Pídele el código al destinatario.', 'INVALID_PIN'); return; }
      if (e.message?.startsWith('PHOTOS_MISSING:')) {
        const missing = e.message.split(':')[1];
        sendError(res, 422, `Fotos faltantes: ${missing}`, 'PHOTO_REQUIRED'); return;
      }
      if (e.message === 'PICKUP_NOT_CONFIRMED')    { sendError(res, 409, 'La recogida aún no fue confirmada', 'PICKUP_NOT_CONFIRMED'); return; }
      next(e);
    }
  },

  async recipientNotHome(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await packageSecurityService.recipientNotHome(req.params['rideId']!);
      sendSuccess(res, {
        returning: true,
        message:   'El remitente recibió un nuevo código de devolución. Regresa a la dirección de recogida.',
      });
    } catch (e: any) {
      if (e.message === 'PICKUP_NOT_CONFIRMED')    { sendError(res, 409, 'La recogida aún no fue confirmada', 'PICKUP_NOT_CONFIRMED'); return; }
      if (e.message === 'ALREADY_MARKED_NOT_HOME') { sendError(res, 409, 'Ya fue marcado como no disponible', 'ALREADY_MARKED'); return; }
      next(e);
    }
  },

  /* POST /ride/:rideId/custody/return-photo  body: { angle, photo_url } */
  async saveReturnPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { angle, photo_url } = req.body as { angle?: PhotoAngle; photo_url?: string };
      if (!photo_url)                           { sendError(res, 422, 'photo_url requerida', 'VALIDATION_ERROR'); return; }
      if (!angle || !VALID_ANGLES.includes(angle)) { sendError(res, 422, 'Ángulo inválido', 'VALIDATION_ERROR'); return; }
      const result = await packageSecurityService.saveReturnPhoto(req.params['rideId']!, angle, photo_url);
      sendSuccess(res, { saved: true, missing: result.missing });
    } catch (e) { next(e); }
  },

  /* POST /ride/:rideId/custody/verify-return  body: { pin } */
  async verifyReturnPin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pin } = req.body as { pin?: string };
      if (!pin || pin.length !== 4) { sendError(res, 422, 'PIN de 4 dígitos requerido', 'VALIDATION_ERROR'); return; }
      await packageSecurityService.verifyReturnPin(req.params['rideId']!, pin);
      sendSuccess(res, { verified: true, message: 'Devolución confirmada. Servicio completado.' });
    } catch (e: any) {
      if (e.message === 'INVALID_PIN')             { sendError(res, 400, 'PIN incorrecto. Pídele el nuevo código al remitente.', 'INVALID_PIN'); return; }
      if (e.message?.startsWith('PHOTOS_MISSING:')) {
        const missing = e.message.split(':')[1];
        sendError(res, 422, `Fotos faltantes: ${missing}`, 'PHOTO_REQUIRED'); return;
      }
      if (e.message === 'NOT_IN_RETURN_FLOW')      { sendError(res, 409, 'Este viaje no está en modo devolución', 'INVALID_STATE'); return; }
      if (e.message === 'PIN_ALREADY_USED')        { sendError(res, 409, 'PIN ya verificado', 'PIN_USED'); return; }
      next(e);
    }
  },
};
