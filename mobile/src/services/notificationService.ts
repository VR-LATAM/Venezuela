// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Servicio de notificaciones push (mobile)
// Gestiona permisos, token FCM, handlers de primer y segundo plano
// Usar expo-notifications + Firebase Messaging (configurado en app.json)
// ═══════════════════════════════════════════════════════════════

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from './apiClient';
import { router } from 'expo-router';

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:    true,
    shouldPlaySound:    true,
    shouldSetBadge:     true,
    shouldShowBanner:   true,
    shouldShowList:     true,
  }),
});

export const notificationService = {

  // ─────────────────────────────────────────────────────────────
  // REGISTRO — solicitar permisos y registrar token en el backend
  // Llamar en el login del usuario, después de obtener los tokens JWT
  // ─────────────────────────────────────────────────────────────
  registerForPushNotifications: async (): Promise<string | null> => {
    // Solo funciona en dispositivos físicos (no emulador)
    // Constants.isDevice es true en hardware real, false en simulador/emulador
    if (!Constants.isDevice) {
      console.info('[FCM] Push notifications solo funcionan en dispositivos físicos');
      return null;
    }

    // Solicitar permisos
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.info('[FCM] El usuario rechazó los permisos de notificación');
      return null;
    }

    // Configurar canal de Android (requerido para Android 8+)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('vride_default', {
        name:                'V-Ride',
        importance:          Notifications.AndroidImportance.MAX,
        vibrationPattern:    [0, 250, 250, 250],
        lightColor:          '#FF231F7C',
        sound:               'default',
        enableVibrate:       true,
        showBadge:           true,
      });
    }

    // Obtener token de Expo Notifications (wraps FCM token)
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PROJECT_ID,
    });

    const token = tokenData.data;
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';

    // Registrar en el backend
    try {
      await apiClient.post('/notification/token', { token, platform });
    } catch (err) {
      console.warn('[FCM] No se pudo registrar el token en el backend', err);
    }

    return token;
  },

  // ─────────────────────────────────────────────────────────────
  // ELIMINAR TOKEN — llamar al cerrar sesión
  // ─────────────────────────────────────────────────────────────
  unregisterToken: async (): Promise<void> => {
    try {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      await apiClient.delete(`/notification/token?platform=${platform}`);
    } catch {
      // No crítico si falla — expirará solo en el backend
    }
  },

  // ─────────────────────────────────────────────────────────────
  // HANDLER DE PRIMER PLANO — notificaciones cuando la app está abierta
  // Devuelve una función de cleanup (para usar en useEffect)
  // ─────────────────────────────────────────────────────────────
  setupForegroundHandler: (): (() => void) => {
    // Listener para cuando llega la notificación (app en primer plano)
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data as Record<string, string>;
      console.info('[FCM] Notificación en primer plano:', data?.type);
      // La notificación se muestra automáticamente por el handler configurado arriba
    });

    // Listener para cuando el usuario toca la notificación
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, string>;
      handleNotificationTap(data);
    });

    return () => {
      // removeNotificationSubscription no está disponible en Expo Go (SDK 53+)
      // usamos el método .remove() del subscription directamente
      subscription.remove();
      responseSubscription.remove();
    };
  },

  // ─────────────────────────────────────────────────────────────
  // HANDLER DE INICIO — procesar notificación que abrió la app
  // Llamar en el _layout.tsx raíz al montar
  // ─────────────────────────────────────────────────────────────
  handleLastNotificationResponse: async (): Promise<void> => {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) {
      const data = response.notification.request.content.data as Record<string, string>;
      handleNotificationTap(data);
    }
  },

  // Limpiar badge (número en ícono de la app)
  clearBadge: async (): Promise<void> => {
    await Notifications.setBadgeCountAsync(0);
  },
};

// ─────────────────────────────────────
// Navegación basada en el tipo de notificación
// ─────────────────────────────────────
function handleNotificationTap(data: Record<string, string>): void {
  if (!data?.type) return;

  switch (data.type) {
    case 'driver_assigned':
    case 'driver_arrived':
    case 'ride_started':
      router.push('/(passenger)/ride');
      break;

    case 'ride_completed':
      router.push('/(passenger)/rating');
      break;

    case 'new_ride_request':
      // El conductor ya tiene el modal en su home si la app está abierta
      // Si la abre desde la notificación, ir al home del conductor
      router.push('/(driver)/home');
      break;

    case 'earning_received':
      router.push('/(driver)/earnings');
      break;

    default:
      break;
  }
}
