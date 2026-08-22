// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// Login de prestatarios de servicios Comunidad (email + contraseña)

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { BRAND_COLORS } from '@vride/shared';
import { useAuthStore } from '../../src/store/authStore';

const API_BASE = `${Constants.expoConfig?.extra?.apiUrl ?? process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000'}/api/v1`;

export default function LoginProviderScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const { setUser }             = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('', 'Ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/provider-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const json = await res.json() as {
        success: boolean;
        data?: { user: any; tokens: { accessToken: string; refreshToken: string }; provider: any };
        error?: string;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error ?? `Error ${res.status}`);
      }
      const { user, tokens, provider } = json.data;
      await SecureStore.setItemAsync('access_token',  tokens.accessToken);
      await SecureStore.setItemAsync('refresh_token', tokens.refreshToken);
      setUser({ ...user, provider });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(provider)/dashboard');
    } catch (e: any) {
      Alert.alert('Error', e.message === 'INVALID_CREDENTIALS'
        ? 'Correo o contraseña incorrectos.'
        : (e.message ?? 'No se pudo iniciar sesión.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>← Atrás</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Acceso Prestatario</Text>
          <Text style={styles.subtitle}>
            Ingresa con el correo y contraseña que usaste al registrarte.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="correo@email.com"
              placeholderTextColor="#aaa"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Tu contraseña"
              placeholderTextColor="#aaa"
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Ingresar</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push('/(auth)/register-provider-type')}
          >
            <Text style={styles.registerLinkText}>
              ¿No tienes cuenta? Regístrate aquí
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#fff' },
  container: { padding: 24, paddingBottom: 40 },
  back:      { marginBottom: 24 },
  backText:  { color: BRAND_COLORS.PRIMARY, fontSize: 15, fontWeight: '600' },
  title:     { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 8 },
  subtitle:  { fontSize: 14, color: '#666', marginBottom: 28, lineHeight: 20 },
  field:     { marginBottom: 16 },
  label:     { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12,
    padding: 13, fontSize: 15, color: '#111', backgroundColor: '#fafafa',
  },
  btn: {
    backgroundColor: BRAND_COLORS.PRIMARY, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  registerLink:     { marginTop: 20, alignItems: 'center' },
  registerLinkText: { color: BRAND_COLORS.PRIMARY, fontSize: 14, fontWeight: '600' },
});
