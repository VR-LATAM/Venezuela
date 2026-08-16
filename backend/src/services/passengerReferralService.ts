import { passengerReferralRepository } from '../repositories/passengerReferralRepository';
import { notificationRepository }     from '../repositories/notificationRepository';
import { fcmService }                  from './fcmService';
import { logger }                      from '../utils/logger';

const notify = (userId: string, title: string, body: string, type: string) => {
  notificationRepository.getPrimaryToken(userId).then(token => {
    if (token) fcmService.sendToToken(token, { title, body, data: { type } });
  }).catch(() => {});
};

export const passengerReferralService = {

  /* Llamado al registrar un nuevo pasajero con código de referido */
  onPassengerRegistered: async (newPassengerId: string, referralCode: string | undefined): Promise<void> => {
    if (!referralCode?.trim()) return;

    try {
      const referrer = await passengerReferralRepository.findReferrerByCode(referralCode.trim());
      if (!referrer || referrer.id === newPassengerId) return;

      if (await passengerReferralRepository.isAlreadyReferred(newPassengerId)) return;

      let group = await passengerReferralRepository.findActiveGroupWithSpace(referrer.id);

      if (!group) {
        if (!await passengerReferralRepository.canStartNewGroup(referrer.id)) return;
        const groupId = await passengerReferralRepository.createGroup(referrer.id);
        group = { id: groupId };
      }

      await passengerReferralRepository.addMember(group.id, newPassengerId);

      notify(referrer.id, '🎉 Nuevo referido se unió',
        'Un pasajero usó tu código. Lleva 0/10 viajes. ¡Anímalos a usar V-Ride!',
        'referral_joined'
      );

      logger.info(`Pasajero ${newPassengerId} referido por ${referrer.id} en grupo ${group.id}`);
    } catch (err) {
      logger.error('Error procesando referido al registrar pasajero:', err);
    }
  },

  /* Llamado al completar un viaje — verifica si el pasajero es un referido activo */
  onRideCompleted: async (passengerId: string): Promise<void> => {
    try {
      const result = await passengerReferralRepository.incrementMemberRides(passengerId);
      if (!result.groupId || !result.referrerId) return;
      if (result.groupExpired) return;

      if (result.justCompleted) {
        notify(result.referrerId, '✅ ¡Referido completó 10 viajes!',
          `Uno de tus referidos completó sus ${passengerReferralRepository.RIDES_TO_QUALIFY} viajes. ¡Sigue así!`,
          'referral_member_done'
        );

        const allDone = await passengerReferralRepository.isGroupComplete(result.groupId);
        if (allDone) {
          await passengerReferralRepository.markGroupCompleted(result.groupId, result.referrerId);
          notify(result.referrerId, '🎁 ¡Ganaste $5 de crédito!',
            `¡Tus ${passengerReferralRepository.MAX_PER_GROUP} referidos completaron sus 10 viajes! ` +
            `Tienes $${passengerReferralRepository.REWARD_AMOUNT.toFixed(2)} de crédito para tus próximos viajes.`,
            'referral_group_completed'
          );
          logger.info(`Grupo de referidos ${result.groupId} completado — $${passengerReferralRepository.REWARD_AMOUNT} otorgados a ${result.referrerId}`);
        }
      } else if (result.ridesNow === 5 || result.ridesNow === 8) {
        notify(result.referrerId, '📊 Progreso de tu referido',
          `Uno de tus referidos lleva ${result.ridesNow}/${passengerReferralRepository.RIDES_TO_QUALIFY} viajes. ¡Motívalo!`,
          'referral_progress'
        );
      }
    } catch (err) {
      logger.error('Error procesando viaje completado para referidos:', err);
    }
  },
};
