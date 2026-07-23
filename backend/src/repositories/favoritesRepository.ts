// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { query, queryOne } from '../config/database';

export interface FavoriteDestination {
  id: string;
  passenger_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  icon: string;
  use_count: number;
  created_at: string;
}

export interface FavoriteDriver {
  id: string;
  passenger_id: string;
  driver_id: string;
  note: string | null;
  created_at: string;
  driver_name?: string;
  driver_photo?: string;
  driver_rating?: number;
  driver_vehicle?: string;
}

export const favoritesRepository = {

  // ── Destinations ────────────────────────────────────────────
  getDestinations: (passengerId: string) =>
    query<FavoriteDestination>(
      'SELECT * FROM passenger_favorite_destinations WHERE passenger_id = $1 ORDER BY use_count DESC, created_at DESC',
      [passengerId]
    ),

  upsertDestination: async (
    passengerId: string,
    name: string,
    address: string,
    lat: number,
    lng: number,
    icon: string = '📍'
  ): Promise<FavoriteDestination> => {
    const row = await queryOne<FavoriteDestination>(
      `INSERT INTO passenger_favorite_destinations (passenger_id, name, address, lat, lng, icon)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (passenger_id, name) DO UPDATE
         SET address = EXCLUDED.address, lat = EXCLUDED.lat, lng = EXCLUDED.lng, icon = EXCLUDED.icon
       RETURNING *`,
      [passengerId, name, address, lat, lng, icon]
    );
    return row!;
  },

  incrementDestinationUseCount: (passengerId: string, name: string) =>
    query(
      'UPDATE passenger_favorite_destinations SET use_count = use_count + 1 WHERE passenger_id = $1 AND name = $2',
      [passengerId, name]
    ),

  deleteDestination: (passengerId: string, destinationId: string) =>
    query(
      'DELETE FROM passenger_favorite_destinations WHERE id = $1 AND passenger_id = $2',
      [destinationId, passengerId]
    ),

  // ── Favorite Drivers ─────────────────────────────────────────
  getFavoriteDrivers: (passengerId: string) =>
    query<FavoriteDriver>(
      `SELECT fd.*, u.full_name AS driver_name, u.profile_photo_url AS driver_photo,
              d.rating_avg AS driver_rating,
              d.vehicle_brand || ' ' || d.vehicle_model || ' ' || d.vehicle_color AS driver_vehicle
       FROM passenger_favorite_drivers fd
       JOIN users u ON u.id = fd.driver_id
       JOIN drivers d ON d.id = fd.driver_id
       WHERE fd.passenger_id = $1
       ORDER BY fd.created_at DESC`,
      [passengerId]
    ),

  addFavoriteDriver: async (passengerId: string, driverId: string, note?: string): Promise<FavoriteDriver> => {
    const row = await queryOne<FavoriteDriver>(
      `INSERT INTO passenger_favorite_drivers (passenger_id, driver_id, note)
       VALUES ($1, $2, $3)
       ON CONFLICT (passenger_id, driver_id) DO UPDATE SET note = EXCLUDED.note
       RETURNING *`,
      [passengerId, driverId, note ?? null]
    );
    return row!;
  },

  removeFavoriteDriver: (passengerId: string, driverId: string) =>
    query(
      'DELETE FROM passenger_favorite_drivers WHERE passenger_id = $1 AND driver_id = $2',
      [passengerId, driverId]
    ),

  isFavoriteDriver: async (passengerId: string, driverId: string): Promise<boolean> => {
    const row = await queryOne<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM passenger_favorite_drivers WHERE passenger_id = $1 AND driver_id = $2) AS exists',
      [passengerId, driverId]
    );
    return row?.exists ?? false;
  },
};
