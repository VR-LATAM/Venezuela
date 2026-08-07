// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Pantalla de Login — email+password y Google Sign-In
// Fuente mínima 17px, botones 56px altura (accesibilidad)
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView, Image,
} from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';
import { useAuthStore } from '../../src/store/authStore';
import { authService } from '../../src/services/authService';
import { useGoogleAuth } from '../../src/hooks/useGoogleAuth';
import { signInWithApple, isAppleSignInAvailable, getAppleButtonComponent, AppleButtonType, AppleButtonStyle } from '../../src/services/appleAuth';
import { BRAND_COLORS } from '@vride/shared';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const { loginWithEmail, socialLogin, isLoading, clearError } = useAuthStore();
  const [isResetting, setIsResetting] = useState(false);
  const { signIn: googleSignIn, ready: googleReady } = useGoogleAuth();
  const [isSocialLoading, setIsSocialLoading] = useState<'google' | 'apple' | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleLogin = async () => {
    setIsSocialLoading('google');
    clearError();
    try {
      const result = await googleSignIn();
      if (!result) return;
      await socialLogin(result.firebaseToken);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const isNotFound = axios.isAxiosError(err) && err.response?.data?.code === 'USER_NOT_FOUND';
      Alert.alert(
        'Google',
        isNotFound
          ? 'No encontramos una cuenta con este Google. Por favor regístrate primero.'
          : 'No se pudo iniciar sesión con Google. Intenta de nuevo.'
      );
    } finally {
      setIsSocialLoading(null);
    }
  };

  const handleAppleLogin = async () => {
    setIsSocialLoading('apple');
    clearError();
    try {
      const result = await signInWithApple();
      if (!result) return;
      await socialLogin(result.firebaseToken);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const isNotFound = axios.isAxiosError(err) && err.response?.data?.code === 'USER_NOT_FOUND';
      Alert.alert(
        'Apple',
        isNotFound
          ? 'No encontramos una cuenta con este Apple ID. Por favor regístrate primero.'
          : 'No se pudo iniciar sesión con Apple. Intenta de nuevo.'
      );
    } finally {
      setIsSocialLoading(null);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('', 'Ingresa tu correo primero y luego toca ¿Olvidaste tu contraseña?');
      return;
    }
    setIsResetting(true);
    try {
      await authService.sendPasswordReset(email.trim().toLowerCase());
      Alert.alert(
        'Correo enviado',
        `Enviamos un enlace de recuperación a ${email.trim()}. Revisa tu bandeja y carpeta de spam.`,
        [{ text: 'OK' }]
      );
    } catch {
      Alert.alert('Error', 'No se pudo enviar el correo. Verifica la dirección e intenta de nuevo.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('', 'Ingresa tu correo y contraseña.');
      return;
    }

    clearError();
    try {
      await loginWithEmail(email.trim().toLowerCase(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // La redirección ocurre automáticamente en _layout.tsx al cambiar isAuthenticated
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err instanceof Error ? err.message : 'Verifica tu correo y contraseña e intenta de nuevo.';
      Alert.alert('Error al iniciar sesión', msg);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>← Atrás</Text>
          </TouchableOpacity>

          <View style={styles.logoRow}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="Verona Ride"
            />
          </View>

          <Text style={styles.title}>Iniciar sesión</Text>

          {/* Campos */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                placeholder="tu@email.com"
                placeholderTextColor="#aaa"
                accessibilityLabel="Correo electrónico"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  autoCapitalize="none"
                  placeholder="••••••••"
                  placeholderTextColor="#aaa"
                  accessibilityLabel="Contraseña"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
              disabled={isResetting}
            >
              <Text style={styles.forgotText}>
                {isResetting ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Botón principal */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Iniciar sesión"
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>

          {/* Separador */}
          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>o</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Google Sign-In */}
          <TouchableOpacity
            style={[styles.googleButton, (!googleReady || isSocialLoading !== null) && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={!googleReady || isSocialLoading !== null}
            accessibilityRole="button"
            accessibilityLabel="Continuar con Google"
          >
            {isSocialLoading === 'google' ? (
              <ActivityIndicator color={BRAND_COLORS.TEXT} size="small" />
            ) : (
              <Text style={styles.googleText}>🌐 Continuar con Google</Text>
            )}
          </TouchableOpacity>

          {/* Apple Sign-In — solo iOS */}
          {isAppleSignInAvailable && (() => {
            const AppleBtn = getAppleButtonComponent();
            return AppleBtn ? (
              <AppleBtn
                buttonType={AppleButtonType.SIGN_IN}
                buttonStyle={AppleButtonStyle.BLACK}
                cornerRadius={14}
                style={styles.appleButton}
                onPress={handleAppleLogin}
              />
            ) : null;
          })()}

          {/* Link a registro */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/')}>
              <Text style={styles.registerLink}>Crear cuenta</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  scroll: {
    padding: 24,
    paddingBottom: 40,
  },
  backButton: { paddingVertical: 8, marginBottom: 16 },
  backText: {
    fontSize: 17,
    color: BRAND_COLORS.PRIMARY,
    fontFamily: 'Inter_500Medium',
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 240,
    height: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: BRAND_COLORS.TEXT,
    marginBottom: 28,
    fontFamily: 'Inter_700Bold',
  },
  form: { gap: 16, marginBottom: 24 },
  inputGroup: { gap: 6 },
  label: {
    fontSize: 17,
    fontWeight: '500',
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_500Medium',
  },
  input: {
    height: 56,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    color: BRAND_COLORS.TEXT,
    backgroundColor: '#FAFAFA',
    fontFamily: 'Inter_400Regular',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 52,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeText: { fontSize: 20 },
  forgotPassword: { alignSelf: 'flex-end' },
  forgotText: {
    fontSize: 15,
    color: BRAND_COLORS.PRIMARY,
    fontFamily: 'Inter_400Regular',
  },
  loginButton: {
    height: 56,
    backgroundColor: BRAND_COLORS.PRIMARY,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  separatorLine: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  separatorText: {
    fontSize: 15,
    color: '#888',
    fontFamily: 'Inter_400Regular',
  },
  googleButton: {
    height: 56,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  googleText: {
    fontSize: 17,
    fontWeight: '500',
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_500Medium',
  },
  appleButton: {
    height: 56,
    width: '100%',
    marginBottom: 12,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    fontSize: 17,
    color: '#666',
    fontFamily: 'Inter_400Regular',
  },
  registerLink: {
    fontSize: 17,
    color: BRAND_COLORS.PRIMARY,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
