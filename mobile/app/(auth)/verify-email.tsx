// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Pantalla de verificación de email
// Aparece después del registro — el usuario debe verificar su correo
// antes de acceder a la app
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { BRAND_COLORS } from '@vride/shared';
import * as Haptics from 'expo-haptics';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const { pendingEmail, checkEmailVerified, resendVerificationEmail, logout } = useAuthStore();

  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Temporizador de cooldown para reenvío
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerified = useCallback(async () => {
    setIsChecking(true);
    try {
      const verified = await checkEmailVerified();
      if (verified) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // _layout.tsx redirigirá automáticamente al rol correspondiente
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          'Correo no verificado aún',
          'No pudimos confirmar tu verificación. Haz clic en el enlace del correo que te enviamos e intenta de nuevo.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsChecking(false);
    }
  }, [checkEmailVerified]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      await resendVerificationEmail();
      setCooldown(RESEND_COOLDOWN_SECONDS);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert('Correo enviado', 'Enviamos un nuevo correo de verificación. Revisa tu bandeja y carpeta de spam.', [{ text: 'OK' }]);
    } catch {
      Alert.alert('Error', 'No se pudo reenviar el correo. Intenta de nuevo en un momento.', [{ text: 'OK' }]);
    } finally {
      setIsResending(false);
    }
  }, [cooldown, isResending, resendVerificationEmail]);

  const handleBack = useCallback(async () => {
    await logout();
    router.replace('/(auth)/');
  }, [logout]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Ícono */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✉️</Text>
        </View>

        {/* Título */}
        <Text style={styles.title}>Verifica tu correo</Text>
        <Text style={styles.subtitle}>
          Enviamos un enlace de verificación a:
        </Text>
        <Text style={styles.email}>{pendingEmail ?? 'tu dirección de correo'}</Text>

        <Text style={styles.instructions}>
          Abre tu correo, haz clic en el enlace de verificación y luego regresa aquí y toca el botón de abajo.
        </Text>

        {/* Botón principal */}
        <TouchableOpacity
          style={[styles.button, isChecking && styles.buttonDisabled]}
          onPress={handleVerified}
          disabled={isChecking}
          accessibilityRole="button"
          accessibilityLabel="Ya verifiqué mi correo"
        >
          {isChecking ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Ya verifiqué mi correo</Text>
          )}
        </TouchableOpacity>

        {/* Reenviar */}
        <TouchableOpacity
          style={[styles.resendButton, (cooldown > 0 || isResending) && styles.resendDisabled]}
          onPress={handleResend}
          disabled={cooldown > 0 || isResending}
          accessibilityRole="button"
        >
          {isResending ? (
            <ActivityIndicator color={BRAND_COLORS.PRIMARY} size="small" />
          ) : (
            <Text style={[styles.resendText, cooldown > 0 && styles.resendTextDisabled]}>
              {cooldown > 0
                ? `Reenviar correo (${cooldown}s)`
                : 'Reenviar correo de verificación'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Volver al inicio */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityRole="button"
        >
          <Text style={styles.backText}>Usar otro correo</Text>
        </TouchableOpacity>

        {/* Nota sobre spam */}
        <View style={styles.spamNote}>
          <Text style={styles.spamText}>
            ¿No ves el correo? Revisa tu carpeta de spam o correo no deseado.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },

  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: BRAND_COLORS.PRIMARY + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  icon: { fontSize: 48 },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: BRAND_COLORS.TEXT,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  email: {
    fontSize: 17,
    fontWeight: '600',
    color: BRAND_COLORS.PRIMARY,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    fontFamily: 'Inter_600SemiBold',
  },
  instructions: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    fontFamily: 'Inter_400Regular',
  },

  button: {
    height: 56,
    width: '100%',
    backgroundColor: BRAND_COLORS.PRIMARY,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },

  resendButton: {
    height: 48,
    width: '100%',
    borderWidth: 1.5,
    borderColor: BRAND_COLORS.PRIMARY,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  resendDisabled: { borderColor: '#ccc' },
  resendText: {
    fontSize: 17,
    color: BRAND_COLORS.PRIMARY,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  resendTextDisabled: { color: '#aaa' },

  backButton: {
    paddingVertical: 12,
    marginBottom: 24,
  },
  backText: {
    fontSize: 15,
    color: '#888',
    textDecorationLine: 'underline',
    fontFamily: 'Inter_400Regular',
  },

  spamNote: {
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 16,
    width: '100%',
  },
  spamText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
});
