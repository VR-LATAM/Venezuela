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

interface Props {
  rideId?: string;
  lat?: number;
  lng?: number;
  address?: string;
}

export function SOSButton({ rideId, lat, lng, address }: Props) {
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
        Alert.alert('🚨 SOS Activated', 'The Verona Ride team has been notified and will contact you immediately.');
      } catch {
        Alert.alert('Error', 'Could not send SOS. Call 911 immediately.');
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
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
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
          {activated ? 'Help is coming' : activating ? 'Hold…' : 'Hold for SOS'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper:       { borderRadius: 16, overflow: 'hidden' },
  btn:           { backgroundColor: '#DC2626', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', minWidth: 100, overflow: 'hidden' },
  btnActivated:  { backgroundColor: '#7F1D1D' },
  progress:      { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.3)' },
  icon:          { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 2 },
  label:         { fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
});
