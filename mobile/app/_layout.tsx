// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Layout raíz — inicializa i18n, fuentes, push notifications y redirige según rol
// ═══════════════════════════════════════════════════════════════

import '../src/i18n';
import '../src/tasks/locationTask'; // registrar background task al arrancar la app
import * as Sentry from '@sentry/react-native';
import { useEffect } from 'react';

Sentry.init({
  dsn: process.env['EXPO_PUBLIC_SENTRY_DSN'],
  enabled: process.env['EXPO_PUBLIC_APP_ENV'] !== 'development',
  tracesSampleRate: 0.2,
});
import { Stack, router } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { StripeProvider } from '@stripe/stripe-react-native';
import { useAuthStore } from '../src/store/authStore';
import { notificationService } from '../src/services/notificationService';

// Mantener el splash screen nativo hasta que todo esté listo
SplashScreen.preventAutoHideAsync();

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export default function RootLayout() {
  const { initialize, isLoading, isAuthenticated, user, emailVerificationPending, driverWizardActive } = useAuthStore();

  const [fontsLoaded, fontsError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Si las fuentes fallan (ej. Expo Go sin conexión a CDN), continuar igual
  const fontsReady = fontsLoaded || !!fontsError;

  // Inicializar sesión al arrancar la app
  useEffect(() => {
    initialize();
  }, []);

  // Registrar notificaciones push cuando el usuario se autentique
  useEffect(() => {
    if (isAuthenticated && user) {
      notificationService.registerForPushNotifications();
      notificationService.handleLastNotificationResponse();
      notificationService.clearBadge();
    }
  }, [isAuthenticated, user?.id]);

  // Configurar handlers de notificación en primer plano
  useEffect(() => {
    const cleanup = notificationService.setupForegroundHandler();
    return cleanup;
  }, []);

  // Cuando todo esté listo, ocultar el splash nativo y redirigir
  useEffect(() => {
    if (!isLoading && fontsReady) {
      SplashScreen.hideAsync();

      if (emailVerificationPending) {
        // No redirigir mientras el conductor está completando el wizard de 8 pasos
        if (!driverWizardActive) {
          router.replace('/(auth)/verify-email');
        }
      } else if (isAuthenticated && user) {
        // Redirigir según el rol del usuario
        if (user.role === 'passenger') {
          router.replace('/(passenger)/home');
        } else if (user.role === 'driver') {
          router.replace('/(driver)/home');
        } else if (user.role === 'admin') {
          // Admin usa el dashboard web, no la app móvil
          router.replace('/(auth)/login');
        }
      } else {
        router.replace('/(auth)/' as any);
      }
    }
  }, [isLoading, fontsReady, isAuthenticated, user, emailVerificationPending, driverWizardActive]);

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} merchantIdentifier="merchant.com.veronaride">
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(passenger)" />
        <Stack.Screen name="(driver)" />
        <Stack.Screen name="(info)" />
      </Stack>
    </StripeProvider>
  );
}
