// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Layout del conductor — registra el handler de nuevas solicitudes
// a nivel de layout para que funcione en CUALQUIER pantalla del driver
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useRideStore } from '../../src/store/rideStore';
import { socketService } from '../../src/services/socketService';
import { rideMobileService } from '../../src/services/rideService';
import { nokiaToneService } from '../../src/services/nokiaToneService';
import { BRAND_COLORS } from '@vride/shared';
import { UserAvatar } from '../../src/components/common/UserAvatar';

interface IncomingRequest {
  rideId: string;
  pickupAddress: string;
  dropoffAddress: string;
  distanceFromDriver: number;
  tripDistanceMiles: number;
  serviceType: string;
  timeoutSeconds: number;
  estimatedDriverEarnings: number;
  specialNeeds?: string[];
  passengerName?: string;
  passengerPhotoUrl?: string;
  passengerRating?: number;
}

const SPECIAL_NEEDS_LABELS: Record<string, string> = {
  pregnant:          '🤰 Embarazada',
  wheelchair:        '♿ Usuario de silla de ruedas',
  visual_impairment: '👁️ Discapacidad visual',
  hearing_impairment:'🦻 Discapacidad auditiva',
  elderly:           '👴 Adulto mayor',
  minor:             '🧒 Menor de edad',
  medical:           '🏥 Paciente médico',
};

export default function DriverLayout() {
  const insets = useSafeAreaInsets();
  const { incomingRequest, setIncomingRequest, setActiveRide, setAssignedPassenger } = useRideStore();
  const [countdown, setCountdown] = useState(30);
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const toneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Registrar handler de nuevas solicitudes a nivel de layout ──
  // Siempre activo, independientemente de la pantalla del conductor
  useEffect(() => {
    const register = async () => {
      await socketService.connect();
      socketService.off('driver:new_ride_request');
      socketService.on('driver:new_ride_request', (data: unknown) => {
        console.log('[Driver] new_ride_request recibido:', JSON.stringify(data).slice(0, 120));
        const req = data as IncomingRequest;
        setIncomingRequest(req as any);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        nokiaToneService.play();
      });
    };
    void register();

    return () => {
      socketService.off('driver:new_ride_request');
    };
  }, []);


  // ── Countdown + tono repetido cada 5 s cuando hay solicitud activa ──
  useEffect(() => {
    if (countdownRef.current)   { clearInterval(countdownRef.current);   countdownRef.current   = null; }
    if (toneIntervalRef.current){ clearInterval(toneIntervalRef.current); toneIntervalRef.current = null; }

    if (!incomingRequest) return;

    setCountdown(incomingRequest.timeoutSeconds ?? 30);

    // Countdown de 1 en 1 segundo
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          if (toneIntervalRef.current) clearInterval(toneIntervalRef.current);
          countdownRef.current   = null;
          toneIntervalRef.current = null;
          setIncomingRequest(null);
          nokiaToneService.stop();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Repetir tono cada 5 segundos hasta que el conductor responda
    toneIntervalRef.current = setInterval(() => {
      nokiaToneService.play();
    }, 5000);

    return () => {
      if (countdownRef.current)   { clearInterval(countdownRef.current);   countdownRef.current   = null; }
      if (toneIntervalRef.current){ clearInterval(toneIntervalRef.current); toneIntervalRef.current = null; }
    };
  }, [incomingRequest?.rideId]);

  const handleRideResponse = async (accepted: boolean) => {
    if (!incomingRequest) return;

    // Detener tono y cancelar intervalo de repetición
    nokiaToneService.stop();
    if (toneIntervalRef.current) { clearInterval(toneIntervalRef.current); toneIntervalRef.current = null; }
    const { rideId } = incomingRequest;
    setIncomingRequest(null);

    socketService.emit('driver:ride_response', { rideId, accepted });

    if (accepted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navegar a home primero, luego cargar el viaje activo
      router.navigate('/(driver)/home');
      const loadRide = async (attempts = 3): Promise<void> => {
        try {
          await new Promise(r => setTimeout(r, 800));
          const ride = await rideMobileService.getActiveRide();
          if (ride) {
            setActiveRide(ride);
            const rideAny = ride as any;
            if (rideAny.passenger_name) {
              setAssignedPassenger({
                id:        rideAny.passenger_id ?? '',
                name:      rideAny.passenger_name,
                photo_url: rideAny.passenger_photo_url ?? undefined,
              });
            }
          } else if (attempts > 1) {
            return loadRide(attempts - 1);
          }
        } catch {
          if (attempts > 1) return loadRide(attempts - 1);
        }
      };
      void loadRide();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="home" />
        <Stack.Screen name="earnings" />
        <Stack.Screen name="history" />
        <Stack.Screen name="service-history" />
        <Stack.Screen name="referrals" />
        <Stack.Screen name="rating" />
        <Stack.Screen name="training" />
        <Stack.Screen name="training-module" />
        <Stack.Screen name="training-quiz" />
        <Stack.Screen name="documents" />
      </Stack>

      {/* Modal de nueva solicitud — visible en cualquier pantalla del driver */}
      <Modal
        visible={!!incomingRequest}
        animationType="slide"
        transparent={false}
        statusBarTranslucent
      >
        {incomingRequest && (
          <View style={styles.requestModal}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={[styles.requestContent, { paddingBottom: insets.bottom + 20 }]}>

                {/* Passenger info + Countdown */}
                <View style={styles.topRow}>
                  {/* Foto / inicial del pasajero */}
                  <View style={styles.passengerBlock}>
                    <View style={{ marginBottom: 8 }}>
                      <UserAvatar
                        name={incomingRequest.passengerName}
                        photoUrl={incomingRequest.passengerPhotoUrl}
                        size={80}
                      />
                    </View>
                    <Text style={styles.passengerName} numberOfLines={1}>
                      {incomingRequest.passengerName ?? 'Pasajero'}
                    </Text>
                    {incomingRequest.passengerRating != null && (
                      <Text style={styles.passengerRating}>
                        ⭐ {Number(incomingRequest.passengerRating).toFixed(1)}
                      </Text>
                    )}
                  </View>

                  {/* Countdown */}
                  <View style={styles.countdownContainer}>
                    <View style={[
                      styles.countdownCircle,
                      { borderColor: countdown > 10 ? BRAND_COLORS.ACCENT : BRAND_COLORS.ALERT },
                    ]}>
                      <Text style={styles.countdownNumber}>{countdown}</Text>
                      <Text style={styles.countdownSec}>seg</Text>
                    </View>
                    <Text style={styles.countdownLabel}>Nueva solicitud</Text>
                  </View>
                </View>

                {/* Detalles */}
                <View style={styles.requestDetails}>
                  <View style={styles.requestDetailRow}>
                    <Text style={styles.requestDetailIcon}>📍</Text>
                    <View style={styles.requestDetailInfo}>
                      <Text style={styles.requestDetailLabel}>Recogida</Text>
                      <Text style={styles.requestDetailValue} numberOfLines={2}>
                        {incomingRequest.pickupAddress}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.requestDetailRow}>
                    <Text style={styles.requestDetailIcon}>🏁</Text>
                    <View style={styles.requestDetailInfo}>
                      <Text style={styles.requestDetailLabel}>Destino</Text>
                      <Text style={styles.requestDetailValue} numberOfLines={2}>
                        {incomingRequest.dropoffAddress}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.requestMetaRow}>
                    <View style={styles.requestMetaChip}>
                      <Text style={styles.requestMetaEmoji}>📍</Text>
                      <Text style={styles.requestMetaText}>
                        {incomingRequest.distanceFromDriver.toFixed(1)} km de distancia
                      </Text>
                    </View>
                    <View style={styles.requestMetaChip}>
                      <Text style={styles.requestMetaEmoji}>🛣️</Text>
                      <Text style={styles.requestMetaText}>
                        {(incomingRequest.tripDistanceMiles ?? 0).toFixed(1)} km de viaje
                      </Text>
                    </View>
                    <View style={styles.requestMetaChip}>
                      <Text style={styles.requestMetaEmoji}>🚗</Text>
                      <Text style={styles.requestMetaText}>
                        {incomingRequest.serviceType === 'standard'   ? 'Estándar'  :
                         incomingRequest.serviceType === 'executive'  ? 'Ejecutivo' :
                         incomingRequest.serviceType === 'accessible' ? 'Accesible' :
                         incomingRequest.serviceType}
                      </Text>
                    </View>
                  </View>

                  {(incomingRequest.specialNeeds ?? []).length > 0 && (
                    <View style={styles.specialNeedsBox}>
                      <Text style={styles.specialNeedsTitle}>⚠️ Necesidades del pasajero</Text>
                      {(incomingRequest.specialNeeds ?? []).map(cat => (
                        <Text key={cat} style={styles.specialNeedsItem}>
                          {SPECIAL_NEEDS_LABELS[cat] ?? cat}
                        </Text>
                      ))}
                    </View>
                  )}

                  {incomingRequest.estimatedDriverEarnings > 0 && (
                    <View style={styles.fareRow}>
                      <View style={[styles.fareBox, styles.fareBoxAccent, { flex: 1 }]}>
                        <Text style={styles.fareLabel}>Tus ganancias</Text>
                        <Text style={styles.fareEarnings}>
                          ${incomingRequest.estimatedDriverEarnings.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Botones */}
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleRideResponse(false)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.rejectButtonText}>✕ Rechazar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleRideResponse(true)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.acceptButtonText}>✓ Aceptar</Text>
                  </TouchableOpacity>
                </View>

              </View>
            </SafeAreaView>
          </View>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  requestModal: {
    flex: 1, backgroundColor: '#fff',
  },
  requestContent: {
    flex: 1, paddingHorizontal: 24, paddingTop: 20,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  passengerBlock: {
    alignItems: 'center', flex: 1,
  },
  passengerName: {
    fontSize: 16, fontWeight: '700', color: BRAND_COLORS.TEXT,
    textAlign: 'center',
  },
  passengerRating: {
    fontSize: 14, color: '#F59E0B', fontWeight: '600', marginTop: 2,
  },
  countdownContainer: {
    alignItems: 'center', flex: 1,
  },
  countdownCircle: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 5, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  countdownNumber: {
    fontSize: 32, fontWeight: '800', color: BRAND_COLORS.TEXT,
  },
  countdownSec: {
    fontSize: 12, color: '#888', marginTop: -4,
  },
  countdownLabel: {
    fontSize: 14, fontWeight: '600', color: '#888',
    marginTop: 6,
  },
  requestDetails: {
    flex: 1, gap: 12, marginVertical: 16,
  },
  requestDetailRow: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: '#F8F9FA', borderRadius: 12, padding: 14,
  },
  requestDetailIcon: { fontSize: 22, marginTop: 2 },
  requestDetailInfo: { flex: 1 },
  requestDetailLabel: {
    fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 2,
  },
  requestDetailValue: {
    fontSize: 15, color: BRAND_COLORS.TEXT, fontWeight: '500', lineHeight: 20,
  },
  requestMetaRow: {
    flexDirection: 'row', gap: 10,
  },
  requestMetaChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F8F9FA', borderRadius: 10, padding: 10,
  },
  requestMetaEmoji: { fontSize: 16 },
  requestMetaText: { fontSize: 13, color: BRAND_COLORS.TEXT, fontWeight: '500' },
  specialNeedsBox: {
    backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12,
    borderLeftWidth: 4, borderLeftColor: '#F59E0B', gap: 4,
  },
  specialNeedsTitle: {
    fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 4,
  },
  specialNeedsItem: { fontSize: 13, color: '#78350F' },
  fareRow: { flexDirection: 'row', gap: 10 },
  fareBox: {
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  fareBoxAccent: {
    backgroundColor: BRAND_COLORS.ACCENT + '20',
    borderWidth: 1, borderColor: BRAND_COLORS.ACCENT + '40',
  },
  fareLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  fareEarnings: {
    fontSize: 28, fontWeight: '800', color: BRAND_COLORS.TEXT,
  },
  requestActions: {
    flexDirection: 'row', gap: 12, paddingBottom: 20,
  },
  rejectButton: {
    flex: 1, height: 60, backgroundColor: '#FEE2E2',
    borderRadius: 16, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#FCA5A5',
  },
  rejectButtonText: {
    fontSize: 17, fontWeight: '700', color: '#DC2626',
  },
  acceptButton: {
    flex: 2, height: 60, backgroundColor: BRAND_COLORS.ACCENT,
    borderRadius: 16, justifyContent: 'center', alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 17, fontWeight: '700', color: '#fff',
  },
});
