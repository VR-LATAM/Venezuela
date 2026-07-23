// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { queryOne, query as queryMany } from '../config/database';

export const vipRepository = {

  findByPassenger: (passengerId: string) =>
    queryOne<any>(
      `SELECT v.*, d.vehicle_brand, d.vehicle_model, d.vehicle_color,
              u.full_name AS preferred_driver_name, u.phone AS preferred_driver_phone
       FROM vip_passengers v
       LEFT JOIN drivers d ON d.id = v.preferred_driver_id
       LEFT JOIN users u ON u.id = d.id
       WHERE v.passenger_id = $1`,
      [passengerId]
    ),

  findAll: () =>
    queryMany<any>(
      `SELECT v.*, u.full_name AS passenger_name, u.email, u.phone,
              ud.full_name AS preferred_driver_name
       FROM vip_passengers v
       JOIN passengers p ON p.id = v.passenger_id
       JOIN users u ON u.id = p.id
       LEFT JOIN drivers d ON d.id = v.preferred_driver_id
       LEFT JOIN users ud ON ud.id = d.id
       ORDER BY v.vip_since DESC`
    ),

  create: (data: {
    passenger_id: string;
    preferred_driver_id?: string;
    price_multiplier?: number;
    priority_dispatch?: boolean;
    dedicated_support?: boolean;
    preferences?: string;
  }) =>
    queryOne<any>(
      `INSERT INTO vip_passengers
         (passenger_id, preferred_driver_id, price_multiplier,
          priority_dispatch, dedicated_support, preferences)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        data.passenger_id,
        data.preferred_driver_id ?? null,
        data.price_multiplier ?? 1.30,
        data.priority_dispatch ?? true,
        data.dedicated_support ?? true,
        data.preferences ?? null,
      ]
    ),

  update: (passengerId: string, data: Partial<{
    preferred_driver_id: string | null;
    price_multiplier: number;
    priority_dispatch: boolean;
    dedicated_support: boolean;
    preferences: string;
  }>) => {
    const fields = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k], i) => `${k} = $${i + 2}`)
      .join(', ');
    const values = Object.values(data).filter(v => v !== undefined);
    return queryOne<any>(
      `UPDATE vip_passengers SET ${fields} WHERE passenger_id = $1 RETURNING *`,
      [passengerId, ...values]
    );
  },

  remove: (passengerId: string) =>
    queryOne<any>(
      `DELETE FROM vip_passengers WHERE passenger_id = $1 RETURNING id`,
      [passengerId]
    ),

  setPreferredDriver: (passengerId: string, driverId: string | null) =>
    queryOne<any>(
      `UPDATE vip_passengers SET preferred_driver_id = $2 WHERE passenger_id = $1 RETURNING *`,
      [passengerId, driverId]
    ),
};
