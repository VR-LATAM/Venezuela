// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { query, queryOne } from '../config/database';

export interface AccessibilityProfile {
  id: string;
  passenger_id: string;
  wheelchair: boolean;
  walker: boolean;
  white_cane: boolean;
  service_animal: boolean;
  oxygen_support: boolean;
  hearing_impaired: boolean;
  visual_impaired: boolean;
  cognitive_support: boolean;
  extra_time_boarding: boolean;
  notes: string | null;
  updated_at: string;
}

export const accessibilityRepository = {

  get: (passengerId: string) =>
    queryOne<AccessibilityProfile>(
      'SELECT * FROM passenger_accessibility_profiles WHERE passenger_id = $1',
      [passengerId]
    ),

  upsert: async (passengerId: string, data: Partial<Omit<AccessibilityProfile, 'id' | 'passenger_id' | 'updated_at'>>): Promise<AccessibilityProfile> => {
    const row = await queryOne<AccessibilityProfile>(
      `INSERT INTO passenger_accessibility_profiles
         (passenger_id, wheelchair, walker, white_cane, service_animal, oxygen_support,
          hearing_impaired, visual_impaired, cognitive_support, extra_time_boarding, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (passenger_id) DO UPDATE SET
         wheelchair          = EXCLUDED.wheelchair,
         walker              = EXCLUDED.walker,
         white_cane          = EXCLUDED.white_cane,
         service_animal      = EXCLUDED.service_animal,
         oxygen_support      = EXCLUDED.oxygen_support,
         hearing_impaired    = EXCLUDED.hearing_impaired,
         visual_impaired     = EXCLUDED.visual_impaired,
         cognitive_support   = EXCLUDED.cognitive_support,
         extra_time_boarding = EXCLUDED.extra_time_boarding,
         notes               = EXCLUDED.notes,
         updated_at          = NOW()
       RETURNING *`,
      [
        passengerId,
        data.wheelchair          ?? false,
        data.walker              ?? false,
        data.white_cane          ?? false,
        data.service_animal      ?? false,
        data.oxygen_support      ?? false,
        data.hearing_impaired    ?? false,
        data.visual_impaired     ?? false,
        data.cognitive_support   ?? false,
        data.extra_time_boarding ?? false,
        data.notes               ?? null,
      ]
    );
    return row!;
  },
};
