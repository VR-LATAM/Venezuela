// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Pantalla de bienvenida — punto de entrada de auth
// Ofrece "Soy pasajero" y "Soy conductor"
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Dimensions, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BRAND_COLORS } from '@vride/shared';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.82)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Logo */}
      <View style={styles.header}>
        <Animated.Image
          source={require('../../assets/logo.png')}
          style={[styles.logoImage, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
          resizeMode="contain"
          accessibilityLabel="Verona Ride"
        />
      </View>

      {/* Ilustración central — America250 */}
      <View style={styles.illustration}>
        <Animated.Image
          source={require('../../assets/America250.png')}
          style={[styles.worldCupImage, { opacity: fadeAnim }]}
          resizeMode="contain"
          accessibilityLabel="Celebrating America's 250th Anniversary"
        />
      </View>

      {/* Botones de acción */}
      <View style={styles.buttons}>

        {/* Sign In — arriba, botón más corto y diferenciado */}
        <TouchableOpacity
          style={[styles.button, styles.signInButton]}
          onPress={() => router.push('/(auth)/login')}
          accessibilityLabel="Sign In"
          accessibilityRole="button"
        >
          <Text style={styles.signInButtonText} numberOfLines={1} adjustsFontSizeToFit>Sign In</Text>
        </TouchableOpacity>

        {/* Separador con leyenda */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>New User?</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => router.push('/(auth)/register-passenger')}
          accessibilityLabel={t('auth.iAmPassenger')}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText} numberOfLines={1} adjustsFontSizeToFit>I'm a Passenger</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.push('/(auth)/register-driver')}
          accessibilityLabel="I'm a Driver"
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText} numberOfLines={1} adjustsFontSizeToFit>I'm a Driver</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoImage: {
    width: width * 0.75,
    height: 130,
    marginBottom: 8,
  },
  slogan: {
    fontSize: 17,       // Mínimo 17px para legibilidad (nicho adultos mayores)
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  illustration: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 48,
  },
  worldCupImage: {
    width: width * 0.88,
    height: width * 0.88 / 2.26,
    marginVertical: 8,
  },
  illustrationText: {
    fontSize: 17,
    color: BRAND_COLORS.TEXT,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'Inter_500Medium',
  },
  buttons: {
    gap: 12,
    marginBottom: 8,
  },
  button: {
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: BRAND_COLORS.PRIMARY,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: BRAND_COLORS.PRIMARY,
  },
  secondaryButtonText: {
    color: BRAND_COLORS.PRIMARY,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  signInButton: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#2E7D32',
    borderWidth: 0,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerLabel: {
    marginHorizontal: 12,
    fontSize: 14,
    color: '#999',
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
  },
});
