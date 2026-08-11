// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Pantalla de calificación del conductor — califica al pasajero
// Estrellas + mensajes de agradecimiento preescritos (selección hasta 5)
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useRideStore } from '../../src/store/rideStore';
import { rideMobileService } from '../../src/services/rideService';
import { BRAND_COLORS } from '@vride/shared';

const MAX_SELECTED = 5;

const THANK_YOU_MESSAGES = [
  "¡Gracias por estar listo a tiempo! Excelente pasajero. 🙏",
  "Muy respetuoso y amable. ¡Un verdadero placer atenderte!",
  "¡Tu buena actitud hizo el viaje muy agradable. Gracias!",
  "Puntual, respetuoso y fácil de comunicar. ¡Hasta la próxima!",
  "Fue un placer llevarte hoy. ¡Gracias por tu amabilidad!",
  "Muy considerado y mantuvo el auto limpio. ¡Muchas gracias!",
  "¡Gracias por tu paciencia en el tráfico! Eres genial.",
  "Excelente comunicación y recogida sencilla. ¡Vuelve cuando quieras!",
  "Tu trato amigable hizo del viaje una gran experiencia. ¡Gracias!",
  "Eres el pasajero perfecto. ¡Gracias por elegir VERONA Ride!",
];

export default function DriverRatingScreen() {
  const { completedRideId, driverEarnings, driverEarningsVes, resetDriverRatingState } = useRideStore();

  const [score, setScore]                   = useState(5);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [submitted, setSubmitted]           = useState(false);

  const toggleMessage = (msg: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMessages(prev => {
      if (prev.includes(msg)) return prev.filter(m => m !== msg);
      if (prev.length >= MAX_SELECTED) return prev;
      return [...prev, msg];
    });
  };

  const handleRate = async () => {
    if (!completedRideId) {
      handleSkip();
      return;
    }

    const comment = selectedMessages.join(' · ') || undefined;

    setIsSubmitting(true);
    try {
      await rideMobileService.rateRide(completedRideId, score, comment);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
      setTimeout(() => {
        resetDriverRatingState();
        router.replace('/(driver)/home');
      }, 1500);
    } catch {
      Alert.alert('', 'No se pudo enviar la calificación. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    resetDriverRatingState();
    router.replace('/(driver)/home');
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={styles.successTitle}>¡Gracias por tu calificación!</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Resumen de ganancias */}
        <View style={styles.summary}>
          <Text style={styles.summaryEmoji}>💰</Text>
          <Text style={styles.summaryTitle}>¡Viaje completado!</Text>
          {driverEarnings !== null && driverEarnings > 0 && (
            <View style={styles.earningsCard}>
              <Text style={styles.earningsTitle}>Tus ganancias</Text>
              <Text style={styles.earningsUsd}>${driverEarnings.toFixed(2)}</Text>
              {driverEarningsVes != null && driverEarningsVes > 0 && (
                <Text style={styles.earningsVes}>
                  Bs. {driverEarningsVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Calificar pasajero */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingTitle}>Califica a tu pasajero</Text>
          <Text style={styles.ratingSubtitle}>
            ¿Cómo fue tu experiencia con este pasajero?
          </Text>

          {/* Estrellas */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity
                key={star}
                onPress={() => {
                  setScore(star);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: score === star }}
                accessibilityLabel={`${star} estrella${star > 1 ? 's' : ''}`}
              >
                <Text style={[styles.star, star <= score && styles.starActive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.scoreLabel}>
            {score === 5 ? 'Excelente' :
             score === 4 ? 'Muy bueno' :
             score === 3 ? 'Regular'   :
             score === 2 ? 'Malo'      : 'Muy malo'}
          </Text>
        </View>

        {/* Mensajes de agradecimiento */}
        <View style={styles.messagesSection}>
          <Text style={styles.messagesTitle}>
            Envía un mensaje de agradecimiento
          </Text>
          <Text style={styles.messagesSubtitle}>
            Selecciona hasta {MAX_SELECTED} · {selectedMessages.length}/{MAX_SELECTED} elegidos
          </Text>

          <View style={styles.chipsWrap}>
            {THANK_YOU_MESSAGES.map(msg => {
              const selected = selectedMessages.includes(msg);
              const disabled = !selected && selectedMessages.length >= MAX_SELECTED;
              return (
                <TouchableOpacity
                  key={msg}
                  style={[
                    styles.chip,
                    selected && styles.chipSelected,
                    disabled && styles.chipDisabled,
                  ]}
                  onPress={() => toggleMessage(msg)}
                  disabled={disabled}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                >
                  {selected && <Text style={styles.chipCheck}>✓ </Text>}
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {msg}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Botones */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleRate}
          disabled={isSubmitting}
          accessibilityRole="button"
        >
          {isSubmitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.submitButtonText}>Enviar calificación</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Omitir</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff', paddingTop: 24 },
  scroll:    { flex: 1 },
  container: { padding: 24, paddingBottom: 40 },

  // Success
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  successEmoji: { fontSize: 64 },
  successTitle: {
    fontSize: 22, fontWeight: '700', color: BRAND_COLORS.ACCENT,
    textAlign: 'center', fontFamily: 'Inter_700Bold',
  },

  // Summary
  summary: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  summaryEmoji: { fontSize: 52, marginBottom: 10 },
  summaryTitle: {
    fontSize: 26, fontWeight: '700', color: BRAND_COLORS.TEXT,
    marginBottom: 12, fontFamily: 'Inter_700Bold',
  },
  earningsCard: {
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.ACCENT + '10',
    borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14,
    minWidth: 180,
  },
  earningsTitle: {
    fontSize: 13, color: '#888', fontFamily: 'Inter_400Regular', marginBottom: 4,
  },
  earningsUsd: {
    fontSize: 28, fontWeight: '700', color: BRAND_COLORS.ACCENT,
    fontFamily: 'Inter_700Bold', lineHeight: 32,
  },
  earningsVes: {
    fontSize: 22, fontWeight: '700', color: '#1D4ED8',
    fontFamily: 'Inter_700Bold', marginTop: 4,
  },

  // Rating
  ratingSection: { alignItems: 'center', marginBottom: 28 },
  ratingTitle: {
    fontSize: 20, fontWeight: '700', color: BRAND_COLORS.TEXT,
    marginBottom: 4, fontFamily: 'Inter_700Bold',
  },
  ratingSubtitle: {
    fontSize: 15, color: '#888', marginBottom: 18,
    textAlign: 'center', fontFamily: 'Inter_400Regular',
  },
  starsRow:   { flexDirection: 'row', gap: 8, marginBottom: 10 },
  star:       { fontSize: 44, color: '#E0E0E0' },
  starActive: { color: '#F59E0B' },
  scoreLabel: {
    fontSize: 17, fontWeight: '600', color: '#F59E0B',
    fontFamily: 'Inter_600SemiBold',
  },

  // Messages
  messagesSection: { marginBottom: 28 },
  messagesTitle: {
    fontSize: 17, fontWeight: '700', color: BRAND_COLORS.TEXT,
    marginBottom: 4, fontFamily: 'Inter_700Bold',
  },
  messagesSubtitle: {
    fontSize: 13, color: '#888', marginBottom: 14, fontFamily: 'Inter_400Regular',
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E0E0E0',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: '#FAFAFA',
  },
  chipSelected: {
    borderColor: BRAND_COLORS.ACCENT,
    backgroundColor: BRAND_COLORS.ACCENT + '15',
  },
  chipDisabled: { opacity: 0.35 },
  chipCheck: {
    fontSize: 13, fontWeight: '700', color: BRAND_COLORS.ACCENT,
  },
  chipText: {
    fontSize: 13, color: '#555', fontFamily: 'Inter_400Regular', flexShrink: 1,
  },
  chipTextSelected: {
    color: BRAND_COLORS.ACCENT, fontFamily: 'Inter_600SemiBold',
  },

  // Buttons
  submitButton: {
    height: 56, backgroundColor: BRAND_COLORS.PRIMARY,
    borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  buttonDisabled:   { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  skipButton:       { alignItems: 'center', paddingVertical: 12 },
  skipText:         { fontSize: 16, color: '#888', fontFamily: 'Inter_400Regular' },
});
