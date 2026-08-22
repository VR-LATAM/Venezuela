import { db }          from '../config/database';
import { fcmService }   from './fcmService';

/* Ángulos de foto requeridos por tipo de servicio */
export type PhotoAngle = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

const SIX_ANGLES: PhotoAngle[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];

const PHOTO_REQUIREMENTS: Record<string, PhotoAngle[]> = {
  encomienda: SIX_ANGLES,
  pickup:     SIX_ANGLES,
  plataforma: SIX_ANGLES,
  '350':      SIX_ANGLES,
  npr:        SIX_ANGLES,
};

export function getRequiredAngles(serviceType: string): PhotoAngle[] {
  return PHOTO_REQUIREMENTS[serviceType] ?? PHOTO_REQUIREMENTS['encomienda'];
}

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export interface CustodyRecord {
  ride_id:                  string;
  service_type:             string;
  pickup_pin:               string;
  delivery_pin:             string;
  return_pin:               string | null;
  pickup_photos:            Record<PhotoAngle, string> | null;
  delivery_photos:          Record<PhotoAngle, string> | null;
  return_photos:            Record<PhotoAngle, string> | null;
  pickup_pin_verified_at:   string | null;
  recipient_not_home_at:    string | null;
  return_pin_verified_at:   string | null;
}

function missingAngles(
  photos: Record<string, string> | null,
  required: PhotoAngle[]
): PhotoAngle[] {
  if (!photos) return required;
  return required.filter(a => !photos[a]);
}

export const packageSecurityService = {

  /* Crear registro de custodia al crear la encomienda/carga */
  async createCustody(rideId: string, serviceType: string): Promise<CustodyRecord> {
    const pickup_pin   = generatePin();
    const delivery_pin = generatePin();

    const { rows } = await db.query<CustodyRecord>(
      `INSERT INTO ve_encomienda_custody
         (ride_id, service_type, pickup_pin, delivery_pin)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (ride_id) DO NOTHING
       RETURNING *`,
      [rideId, serviceType, pickup_pin, delivery_pin]
    );

    /* Notificar al remitente con ambos PINs */
    const { rows: rideRows } = await db.query<{
      fcm_token:      string | null;
      recipient_name: string | null;
    }>(
      `SELECT u.fcm_token, r.recipient_name
       FROM rides r JOIN users u ON u.id = r.passenger_id
       WHERE r.id = $1`,
      [rideId]
    );

    const required = getRequiredAngles(serviceType);
    const photoDesc = required.length === 2
      ? 'frente y superior'
      : '5 ángulos (superior, frente, posterior, lado izquierdo, lado derecho)';

    if (rideRows[0]?.fcm_token) {
      await fcmService.sendToToken(rideRows[0].fcm_token, {
        title: '🔐 Códigos de seguridad de tu envío',
        body:  `PIN de recogida: ${pickup_pin} (dáselo al conductor)\n` +
               `PIN de entrega: ${delivery_pin} (dáselo a ${rideRows[0].recipient_name ?? 'el destinatario'})\n` +
               `El conductor tomará fotos del ${photoDesc} de tu carga.`,
        data:  { type: 'custody_pins', ride_id: rideId, pickup_pin, delivery_pin },
      });
    }

    return rows[0];
  },

  async getCustody(rideId: string): Promise<CustodyRecord | null> {
    const { rows } = await db.query<CustodyRecord>(
      'SELECT * FROM ve_encomienda_custody WHERE ride_id = $1',
      [rideId]
    );
    return rows[0] ?? null;
  },

  /* Conductor sube UNA foto en un ángulo específico (recogida) */
  async savePickupPhoto(
    rideId: string, angle: PhotoAngle, photoUrl: string
  ): Promise<{ missing: PhotoAngle[] }> {
    const custody = await this.getCustody(rideId);
    if (!custody) throw new Error('CUSTODY_NOT_FOUND');

    const current  = (custody.pickup_photos ?? {}) as Record<string, string>;
    current[angle] = photoUrl;

    await db.query(
      `UPDATE ve_encomienda_custody
       SET pickup_photos = $1 WHERE ride_id = $2`,
      [JSON.stringify(current), rideId]
    );

    const required = getRequiredAngles(custody.service_type);
    const missing  = missingAngles(current as any, required);
    return { missing };
  },

  /* Conductor verifica PIN de recogida (solo cuando TODAS las fotos están) */
  async verifyPickupPin(rideId: string, pin: string): Promise<void> {
    const custody = await this.getCustody(rideId);
    if (!custody)                           throw new Error('CUSTODY_NOT_FOUND');
    if (custody.pickup_pin_verified_at)     throw new Error('PIN_ALREADY_USED');

    const required = getRequiredAngles(custody.service_type);
    const missing  = missingAngles(custody.pickup_photos as any, required);
    if (missing.length > 0)                 throw new Error(`PHOTOS_MISSING:${missing.join(',')}`);
    if (custody.pickup_pin !== pin)         throw new Error('INVALID_PIN');

    await db.query(
      `UPDATE ve_encomienda_custody
       SET pickup_pin_verified_at = now() WHERE ride_id = $1`,
      [rideId]
    );
    await db.query(
      `UPDATE rides SET status = 'in_progress' WHERE id = $1`,
      [rideId]
    );

    const { rows } = await db.query<{ fcm_token: string | null }>(
      `SELECT u.fcm_token FROM rides r
       JOIN users u ON u.id = r.passenger_id WHERE r.id = $1`,
      [rideId]
    );
    if (rows[0]?.fcm_token) {
      await fcmService.sendToToken(rows[0].fcm_token, {
        title: '📦 Tu envío fue recogido',
        body:  'El conductor tiene tu carga y está en camino al destino.',
        data:  { type: 'package_picked_up', ride_id: rideId },
      });
    }
  },

  /* Conductor sube UNA foto en un ángulo específico (entrega) */
  async saveDeliveryPhoto(
    rideId: string, angle: PhotoAngle, photoUrl: string
  ): Promise<{ missing: PhotoAngle[] }> {
    const custody = await this.getCustody(rideId);
    if (!custody) throw new Error('CUSTODY_NOT_FOUND');

    const current  = (custody.delivery_photos ?? {}) as Record<string, string>;
    current[angle] = photoUrl;

    await db.query(
      `UPDATE ve_encomienda_custody
       SET delivery_photos = $1 WHERE ride_id = $2`,
      [JSON.stringify(current), rideId]
    );

    const required = getRequiredAngles(custody.service_type);
    return { missing: missingAngles(current as any, required) };
  },

  /* Conductor verifica PIN de entrega */
  async verifyDeliveryPin(rideId: string, pin: string): Promise<void> {
    const custody = await this.getCustody(rideId);
    if (!custody)                           throw new Error('CUSTODY_NOT_FOUND');
    if (!custody.pickup_pin_verified_at)    throw new Error('PICKUP_NOT_CONFIRMED');

    const required = getRequiredAngles(custody.service_type);
    const missing  = missingAngles(custody.delivery_photos as any, required);
    if (missing.length > 0)                 throw new Error(`PHOTOS_MISSING:${missing.join(',')}`);
    if (custody.delivery_pin !== pin)       throw new Error('INVALID_PIN');

    await db.query(
      `UPDATE rides SET status = 'completed', completed_at = now() WHERE id = $1`,
      [rideId]
    );

    const { rows } = await db.query<{ fcm_token: string | null }>(
      `SELECT u.fcm_token FROM rides r
       JOIN users u ON u.id = r.passenger_id WHERE r.id = $1`,
      [rideId]
    );
    if (rows[0]?.fcm_token) {
      await fcmService.sendToToken(rows[0].fcm_token, {
        title: '✅ Envío entregado',
        body:  'Tu carga fue entregada exitosamente al destinatario.',
        data:  { type: 'package_delivered', ride_id: rideId },
      });
    }
  },

  /* Conductor pulsa "El destinatario no estaba" */
  async recipientNotHome(rideId: string): Promise<{ return_pin: string }> {
    const custody = await this.getCustody(rideId);
    if (!custody)                        throw new Error('CUSTODY_NOT_FOUND');
    if (!custody.pickup_pin_verified_at) throw new Error('PICKUP_NOT_CONFIRMED');
    if (custody.recipient_not_home_at)   throw new Error('ALREADY_MARKED_NOT_HOME');

    const return_pin = generatePin();

    await db.query(
      `UPDATE ve_encomienda_custody
       SET return_pin = $1, recipient_not_home_at = now()
       WHERE ride_id = $2`,
      [return_pin, rideId]
    );
    await db.query(
      `UPDATE rides SET status = 'returning_to_sender' WHERE id = $1`,
      [rideId]
    );

    const { rows } = await db.query<{
      fcm_token: string | null; recipient_name: string | null;
    }>(
      `SELECT u.fcm_token, r.recipient_name
       FROM rides r JOIN users u ON u.id = r.passenger_id WHERE r.id = $1`,
      [rideId]
    );
    if (rows[0]?.fcm_token) {
      await fcmService.sendToToken(rows[0].fcm_token, {
        title: '⚠️ El destinatario no estaba',
        body:  `Tu carga está siendo devuelta. Nuevo código de devolución: ${return_pin} — dáselo al conductor cuando llegue.`,
        data:  { type: 'recipient_not_home', ride_id: rideId, return_pin },
      });
    }

    return { return_pin };
  },

  /* Conductor sube UNA foto en un ángulo específico (devolución) */
  async saveReturnPhoto(
    rideId: string, angle: PhotoAngle, photoUrl: string
  ): Promise<{ missing: PhotoAngle[] }> {
    const custody = await this.getCustody(rideId);
    if (!custody) throw new Error('CUSTODY_NOT_FOUND');

    const current  = (custody.return_photos ?? {}) as Record<string, string>;
    current[angle] = photoUrl;

    await db.query(
      `UPDATE ve_encomienda_custody
       SET return_photos = $1 WHERE ride_id = $2`,
      [JSON.stringify(current), rideId]
    );

    const required = getRequiredAngles(custody.service_type);
    return { missing: missingAngles(current as any, required) };
  },

  /* Conductor verifica PIN de devolución */
  async verifyReturnPin(rideId: string, pin: string): Promise<void> {
    const custody = await this.getCustody(rideId);
    if (!custody)                        throw new Error('CUSTODY_NOT_FOUND');
    if (!custody.return_pin)             throw new Error('NOT_IN_RETURN_FLOW');
    if (custody.return_pin !== pin)      throw new Error('INVALID_PIN');
    if (custody.return_pin_verified_at)  throw new Error('PIN_ALREADY_USED');

    const required = getRequiredAngles(custody.service_type);
    const missing  = missingAngles(custody.return_photos as any, required);
    if (missing.length > 0)              throw new Error(`PHOTOS_MISSING:${missing.join(',')}`);

    await db.query(
      `UPDATE ve_encomienda_custody
       SET return_pin_verified_at = now() WHERE ride_id = $1`,
      [rideId]
    );
    await db.query(
      `UPDATE rides SET status = 'returned_to_sender', completed_at = now()
       WHERE id = $1`,
      [rideId]
    );

    const { rows } = await db.query<{ fcm_token: string | null }>(
      `SELECT u.fcm_token FROM rides r
       JOIN users u ON u.id = r.passenger_id WHERE r.id = $1`,
      [rideId]
    );
    if (rows[0]?.fcm_token) {
      await fcmService.sendToToken(rows[0].fcm_token, {
        title: '📦 Carga devuelta',
        body:  'Tu carga fue devuelta. Se cobró la tarifa completa del servicio.',
        data:  { type: 'package_returned', ride_id: rideId },
      });
    }
  },
};
