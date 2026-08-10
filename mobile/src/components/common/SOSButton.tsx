// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Botón SOS — activa alerta de emergencia durante un viaje
// Hold 2 segundos para evitar activación accidental
// ═══════════════════════════════════════════════════════════════

import React, { useRef, useState } from 'react';
import {
  TouchableOpacity, Text, StyleSheet, Alert, Animated, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { rideMobileService } from '../../services/rideService';

import { ViewStyle } from 'react-native';

interface Props {
  rideId?: string;
  lat?: number;
  lng?: number;
  address?: string;
  style?: ViewStyle;
}

export function SOSButton({ rideId, lat, lng, address, style }: Props) {
  const [activating, setActivating]  = useState(false);
  const [activated, setActivated]    = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (activated) return;
    setActivating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Animated.timing(progressAnim, { toValue: 1, duration: 2000, useNativeDriver: false }).start();
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.15, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.0, duration: 1800, useNativeDriver: true }),
    ]).start();

    holdTimer.current = setTimeout(async () => {
      setActivating(false);
      setActivated(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      try {
        await rideMobileService.activateSOS({ rideId, lat, lng, addressAtTrigger: address });
        Alert.alert('🚨 SOS Activado', 'El equipo de VERONA Ride fue notificado y te contactará de inmediato.');
      } catch {
        Alert.alert('Error', 'No se pudo enviar el SOS. Llama al 171 de inmediato.');
        setActivated(false);
      }
    }, 2000);
  };

  const handlePressOut = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (!activated) {
      setActivating(false);
      progressAnim.stopAnimation();
      progressAnim.setValue(0);
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
  };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Animated.View style={[styles.wrapper, style, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[styles.btn, activated && styles.btnActivated]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {activating && (
          <Animated.View style={[styles.progress, { width: progressWidth as any }]} />
        )}
        <Text style={styles.icon}>{activated ? '🚨' : 'SOS'}</Text>
        <Text style={styles.label}>
          {activated ? 'En camino' : activating ? 'Espera…' : 'Mantén 2s'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper:       { borderRadius: 10, overflow: 'hidden', flex: 1 },
  btn:           { backgroundColor: '#DC2626', flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  btnActivated:  { backgroundColor: '#7F1D1D' },
  progress:      { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.3)' },
  icon:          { fontSize: 14, fontWeight: '900', color: '#fff' },
  label:         { fontSize: 9, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
});
