import { db, queryOne, query } from '../config/database';

const MAX_PER_GROUP           = 3;
const RIDES_TO_QUALIFY        = 10;
const GROUP_DAYS              = 30;
const REWARD_AMOUNT           = 5.00;
const MAX_GROUPS_PER_MONTH    = 2;
export const CREDIT_PER_RIDE  = 1.00;
export const MIN_FARE_CREDIT  = 3.00;

export const passengerReferralRepository = {

  findReferrerByCode: async (code: string): Promise<{ id: string } | null> =>
    queryOne<{ id: string }>(
      `SELECT id FROM passengers WHERE UPPER(operative_code) = UPPER($1)`,
      [code]
    ),

  isAlreadyReferred: async (passengerId: string): Promise<boolean> => {
    const row = await queryOne<{ id: string }>(
      `SELECT id FROM passenger_referral_members WHERE passenger_id = $1 LIMIT 1`,
      [passengerId]
    );
    return !!row;
  },

  /* Busca grupo activo con espacio (< 3 miembros y no expirado) */
  findActiveGroupWithSpace: async (referrerId: string): Promise<{ id: string } | null> =>
    queryOne<{ id: string }>(
      `SELECT g.id FROM passenger_referral_groups g
       WHERE g.referrer_id = $1 AND g.status = 'active' AND g.expires_at > NOW()
         AND (SELECT COUNT(*) FROM passenger_referral_members WHERE group_id = g.id) < $2
       ORDER BY g.created_at DESC LIMIT 1`,
      [referrerId, MAX_PER_GROUP]
    ),

  canStartNewGroup: async (referrerId: string): Promise<boolean> => {
    const row = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM passenger_referral_groups
       WHERE referrer_id = $1 AND status = 'completed'
         AND completed_at >= date_trunc('month', NOW())`,
      [referrerId]
    );
    return parseInt(row?.count ?? '0') < MAX_GROUPS_PER_MONTH;
  },

  createGroup: async (referrerId: string): Promise<string> => {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO passenger_referral_groups (referrer_id, expires_at)
       VALUES ($1, NOW() + INTERVAL '${GROUP_DAYS} days')
       RETURNING id`,
      [referrerId]
    );
    return rows[0]!.id;
  },

  addMember: async (groupId: string, passengerId: string): Promise<void> => {
    await query(
      `INSERT INTO passenger_referral_members (group_id, passenger_id) VALUES ($1, $2)`,
      [groupId, passengerId]
    );
  },

  /* Incrementa viajes del miembro referido y devuelve el resultado */
  incrementMemberRides: async (passengerId: string): Promise<{
    groupId:       string | null;
    referrerId:    string | null;
    ridesNow:      number;
    justCompleted: boolean;
    groupExpired:  boolean;
  }> => {
    const row = await queryOne<{
      group_id:   string;
      referrer_id: string;
      rides_completed: number;
      expires_at: string;
      m_status:   string;
    }>(
      `SELECT m.group_id, g.referrer_id, m.rides_completed,
              g.expires_at::text, m.status AS m_status
       FROM passenger_referral_members m
       JOIN passenger_referral_groups  g ON g.id = m.group_id
       WHERE m.passenger_id = $1 AND m.status = 'active' AND g.status = 'active'
       LIMIT 1`,
      [passengerId]
    );

    if (!row) return { groupId: null, referrerId: null, ridesNow: 0, justCompleted: false, groupExpired: false };

    if (new Date() > new Date(row.expires_at)) {
      await query(`UPDATE passenger_referral_members SET status = 'abandoned' WHERE passenger_id = $1 AND group_id = $2`, [passengerId, row.group_id]);
      await query(`UPDATE passenger_referral_groups  SET status = 'expired'   WHERE id = $1`, [row.group_id]);
      return { groupId: row.group_id, referrerId: row.referrer_id, ridesNow: row.rides_completed, justCompleted: false, groupExpired: true };
    }

    const ridesNow = row.rides_completed + 1;
    const justCompleted = ridesNow >= RIDES_TO_QUALIFY;

    if (justCompleted) {
      await query(
        `UPDATE passenger_referral_members SET rides_completed = $1, status = 'completed', completed_at = NOW()
         WHERE passenger_id = $2 AND group_id = $3`,
        [ridesNow, passengerId, row.group_id]
      );
    } else {
      await query(
        `UPDATE passenger_referral_members SET rides_completed = $1 WHERE passenger_id = $2 AND group_id = $3`,
        [ridesNow, passengerId, row.group_id]
      );
    }

    return { groupId: row.group_id, referrerId: row.referrer_id, ridesNow, justCompleted, groupExpired: false };
  },

  /* Verifica si todos los miembros del grupo completaron sus 10 viajes */
  isGroupComplete: async (groupId: string): Promise<boolean> => {
    const row = await queryOne<{ total: string; completed: string }>(
      `SELECT COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE status = 'completed')::text AS completed
       FROM passenger_referral_members WHERE group_id = $1`,
      [groupId]
    );
    const total     = parseInt(row?.total     ?? '0');
    const completed = parseInt(row?.completed ?? '0');
    return total === MAX_PER_GROUP && completed === MAX_PER_GROUP;
  },

  markGroupCompleted: async (groupId: string, referrerId: string): Promise<void> => {
    await query(
      `UPDATE passenger_referral_groups SET status = 'completed', completed_at = NOW() WHERE id = $1`,
      [groupId]
    );
    await query(
      `UPDATE passengers SET referral_credit = COALESCE(referral_credit, 0) + $1 WHERE id = $2`,
      [REWARD_AMOUNT, referrerId]
    );
  },

  /* Progreso para mostrar al pasajero referidor */
  getProgress: async (referrerId: string): Promise<{
    activeGroup: {
      id: string; daysLeft: number; memberCount: number;
      members: Array<{ code: string; rides: number; status: string }>;
    } | null;
    completedThisMonth: number;
    credit: number;
  }> => {
    const group = await queryOne<{ id: string; expires_at: string }>(
      `SELECT id, expires_at::text FROM passenger_referral_groups
       WHERE referrer_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      [referrerId]
    );

    let activeGroup = null;
    if (group) {
      const { rows: members } = await db.query<{ code: string; rides: number; status: string }>(
        `SELECT p.operative_code AS code, m.rides_completed AS rides, m.status
         FROM passenger_referral_members m
         JOIN passengers p ON p.id = m.passenger_id
         WHERE m.group_id = $1 ORDER BY m.joined_at ASC`,
        [group.id]
      );
      const daysLeft = Math.max(0, Math.ceil(
        (new Date(group.expires_at).getTime() - Date.now()) / 86400000
      ));
      activeGroup = { id: group.id, daysLeft, memberCount: members.length, members };
    }

    const countRow = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM passenger_referral_groups
       WHERE referrer_id = $1 AND status = 'completed' AND completed_at >= date_trunc('month', NOW())`,
      [referrerId]
    );
    const creditRow = await queryOne<{ referral_credit: number }>(
      `SELECT referral_credit FROM passengers WHERE id = $1`, [referrerId]
    );

    return {
      activeGroup,
      completedThisMonth: parseInt(countRow?.count ?? '0'),
      credit: creditRow?.referral_credit ?? 0,
    };
  },

  deductCredit: async (passengerId: string): Promise<void> => {
    await query(
      `UPDATE passengers SET referral_credit = GREATEST(0, referral_credit - $1) WHERE id = $2`,
      [CREDIT_PER_RIDE, passengerId]
    );
  },

  getCredit: async (passengerId: string): Promise<number> => {
    const row = await queryOne<{ referral_credit: number }>(
      `SELECT referral_credit FROM passengers WHERE id = $1`, [passengerId]
    );
    return row?.referral_credit ?? 0;
  },

  RIDES_TO_QUALIFY,
  REWARD_AMOUNT,
  MAX_PER_GROUP,
  GROUP_DAYS,
};
