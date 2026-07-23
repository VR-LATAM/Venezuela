// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Pantalla de viaje activo — seguimiento en tiempo real
// Se muestra cuando el viaje está 'in_progress'
// Conductor y pasajero comparten esta vista (con acciones diferentes)
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Alert, Platform, Share, Linking, Modal, TextInput,
  FlatList, KeyboardAvoidingView,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { Audio } from 'expo-av';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useRideStore } from '../../src/store/rideStore';
import { useUser } from '../../src/store/authStore';
import { socketService } from '../../src/services/socketService';
import { apiClient } from '../../src/services/apiClient';
import { rideMobileService } from '../../src/services/rideService';
import { BRAND_COLORS } from '@vride/shared';
import { UserAvatar } from '../../src/components/common/UserAvatar';
import { getDriverBadge } from '../../src/utils/driverBadge';
import * as Haptics from 'expo-haptics';
import { nokiaToneService } from '../../src/services/nokiaToneService';

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';

export default function RideScreen() {
  const user = useUser();
  const {
    currentRide, assignedDriver, driverLocation,
    cancelCurrentRide, resetPassengerState, setTotalCharged, updateDriverLocation,
  } = useRideStore();

  // El backend devuelve coordenadas como campos planos (dropoff_lat, dropoff_lng)
  const rideAny   = currentRide as any;
  const dropoffLat = rideAny?.dropoff_lat   ?? currentRide?.dropoff_location?.latitude;
  const dropoffLng = rideAny?.dropoff_lng   ?? currentRide?.dropoff_location?.longitude;

  const mapRef = useRef<MapView>(null);
  const [passengerPos, setPassengerPos] = useState<{ latitude: number; longitude: number } | null>(null);
  const passengerLocRef = useRef<Location.LocationSubscription | null>(null);

  // Origen de la ruta — se actualiza cada 20 s para evitar exceso de llamadas a Directions API
  const [routeOrigin, setRouteOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
  const routeOriginUpdateRef = useRef<number>(0);

  // Zoom del mapa — sticky hasta que el pasajero presione 📍
  const mapZoomRef = useRef(19);

  // Tipo de mapa — toggle satélite / básico
  const [mapType, setMapType] = useState<'hybrid' | 'standard'>('hybrid');

  // Al montar: rastrear GPS real del pasajero en tiempo real
  useEffect(() => {
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then(loc => {
        const coord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setPassengerPos(coord);
        // Inicializar routeOrigin con posición del pasajero hasta que llegue la del conductor
        setRouteOrigin(coord);
        routeOriginUpdateRef.current = Date.now();
        mapRef.current?.animateCamera({ center: coord, zoom: 19 }, { duration: 500 });
      })
      .catch(() => {});

    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 5 },
      (loc) => setPassengerPos({ latitude: loc.coords.latitude, longitude: loc.coords.longitude })
    ).then(sub => { passengerLocRef.current = sub; }).catch(() => {});

    return () => { passengerLocRef.current?.remove(); };
  }, []);

  const [isSosActive, setIsSosActive]   = useState(false);
  const [isSharing, setIsSharing]       = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [chatOpen, setChatOpen]         = useState(false);
  const [chatMessage, setChatMessage]   = useState('');
  const [messages, setMessages]         = useState<{ text: string; fromMe: boolean; time: string }[]>([]);
  const rideStartTime = useRef<Date>(new Date());
  const flatListRef   = useRef<FlatList>(null);

  const QUICK_MESSAGES = [
    "I'll be right there",
    "I'm in the lobby",
    "Please come to the entrance",
    "Running 2 minutes late",
  ];

  const nearbyAlertShown  = useRef(false);
  const [isRecording, setIsRecording]     = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [etaMinutes, setEtaMinutes]       = useState<number | null>(null);
  const [distanceMiles, setDistanceMiles] = useState<number | null>(null);

  // Centrar mapa en el PASAJERO cuando su posición cambia y actualizar routeOrigin
  useEffect(() => {
    if (!passengerPos) return;
    mapRef.current?.animateCamera(
      { center: passengerPos, zoom: mapZoomRef.current },
      { duration: 500 }
    );
    // Ruta desde posición del pasajero (no del conductor) hacia el destino
    const now = Date.now();
    if (now - routeOriginUpdateRef.current > 20000) {
      routeOriginUpdateRef.current = now;
      setRouteOrigin({ latitude: passengerPos.latitude, longitude: passengerPos.longitude });
    }
  }, [passengerPos]);

  // Notificación de proximidad del conductor al pickup (sin actualizar routeOrigin)
  useEffect(() => {
    if (!driverLocation) return;
    // Notificar cuando el conductor está a menos de 0.3 millas del pickup
    if (!nearbyAlertShown.current && currentRide) {
      const pickup = currentRide.pickup_location as { latitude?: number; longitude?: number } | null;
      if (pickup?.latitude && pickup?.longitude) {
        const R = 3958.8;
        const dLat = (driverLocation.latitude  - pickup.latitude)  * Math.PI / 180;
        const dLng = (driverLocation.longitude - pickup.longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 +
          Math.cos(pickup.latitude * Math.PI/180) * Math.cos(driverLocation.latitude * Math.PI/180) *
          Math.sin(dLng/2)**2;
        const distanceMiles = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        if (distanceMiles < 0.3) {
          nearbyAlertShown.current = true;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('🚗 Driver nearby', 'Your driver is less than 0.3 miles away. Get ready!');
        }
      }
    }
  }, [driverLocation]);

  // Escuchar eventos de socket durante el viaje en curso
  useEffect(() => {
    const unsubLocation = socketService.on('passenger:driver_location', (data: unknown) => {
      const d = data as { latitude: number; longitude: number; heading?: number; timestamp: number };
      updateDriverLocation(d);
    });

    const rideCompleted = (totalCharged: number, paymentStatus: string) => {
      setTotalCharged(totalCharged);
      void nokiaToneService.play();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 400);
      if (paymentStatus === 'failed') {
        Alert.alert(
          'Payment issue',
          `Your ride ($${(totalCharged ?? 0).toFixed(2)}) could not be charged. Please update your payment method.`,
          [{ text: 'OK', onPress: () => router.replace('/(passenger)/rating') }]
        );
      } else {
        router.replace('/(passenger)/rating');
      }
    };

    const unsubComplete = socketService.on('passenger:ride_completed', (data: unknown) => {
      const d = data as { totalCharged: number; paymentStatus: string };
      rideCompleted(d.totalCharged, d.paymentStatus);
    });

    const unsubCancelled = socketService.on('passenger:ride_cancelled_by_driver', () => {
      Alert.alert('Ride cancelled', 'The driver cancelled the ride.');
      resetPassengerState();
      router.replace('/(passenger)/home');
    });

    const unsubDriverMsg = socketService.on('passenger:driver_message', (data: unknown) => {
      const d = data as { message: string };
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [...prev, { text: d.message, fromMe: false, time }]);
      setChatOpen(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });

    // Polling de respaldo: si el evento socket se pierde, detectar via HTTP cada 8 s
    const pollInterval = setInterval(async () => {
      if (!currentRide?.id) return;
      try {
        const ride = await rideMobileService.getActiveRide();
        if (!ride) {
          // El viaje ya no está activo — probablemente completado o cancelado
          clearInterval(pollInterval);
          resetPassengerState();
          router.replace('/(passenger)/home');
        }
      } catch { /* ignorar errores de red */ }
    }, 8000);

    return () => {
      unsubLocation();
      unsubComplete();
      unsubCancelled();
      unsubDriverMsg();
      clearInterval(pollInterval);
    };
  }, [currentRide?.id]);

  // ─────────────────────────────────────
  // SOS — llama al backend, emite a admins y abre Phone
  // ─────────────────────────────────────
  const handleEmergency = () => {
    Alert.alert(
      '🚨 Activate SOS',
      'Send an emergency alert to the Verona Ride team?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, activate',
          style: 'destructive',
          onPress: async () => {
            setIsSosActive(true);
            try {
              const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null);
              await apiClient.post('/sos', {
                rideId: currentRide?.id,
                lat:    loc?.coords.latitude,
                lng:    loc?.coords.longitude,
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              Alert.alert(
                '🚨 SOS activated',
                'The Verona Ride team has been notified. You can also call 911.',
                [
                  { text: 'Call 911', onPress: () => Linking.openURL('tel:911') },
                  { text: 'OK' },
                ]
              );
            } catch {
              Alert.alert('Error', 'Could not send the alert. Call 911 directly.');
            }
          },
        },
      ]
    );
  };

  // ─────────────────────────────────────
  // COMPARTIR VIAJE — genera token en backend + Share nativo
  // ─────────────────────────────────────
  const handleToggleRecording = async () => {
    if (isRecording) {
      // Detener grabación
      try {
        await recordingRef.current?.stopAndUnloadAsync();
        const uri = recordingRef.current?.getURI();
        recordingRef.current = null;
        setIsRecording(false);
        Alert.alert(
          'Recording saved',
          'The audio recording has been saved to your device for dispute resolution purposes.',
          [{ text: 'OK' }]
        );
        console.log(`Recording saved at: ${uri}`);
      } catch {
        setIsRecording(false);
      }
      return;
    }

    // Solicitar permiso y empezar grabación
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission required', 'Microphone access is needed to record audio.');
      return;
    }

    Alert.alert(
      'Record trip audio',
      'This recording is stored on your device only and can be used as evidence if you need to report an issue.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start recording',
          onPress: async () => {
            try {
              await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
              const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
              );
              recordingRef.current = recording;
              setIsRecording(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch {
              Alert.alert('Error', 'Could not start recording. Please try again.');
            }
          },
        },
      ]
    );
  };

  const sendMessage = (text: string) => {
    if (!text.trim() || !currentRide?.id) return;
    socketService.emit('passenger:message', { rideId: currentRide.id, message: text.trim() });
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { text: text.trim(), fromMe: true, time }]);
    setChatMessage('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCancel = () => {
    const minutesElapsed = (Date.now() - rideStartTime.current.getTime()) / 60000;
    const hasFee = minutesElapsed > 2;
    Alert.alert(
      'Cancel ride',
      hasFee
        ? 'A $3.00 cancellation fee applies since more than 2 minutes have passed. Do you want to cancel?'
        : 'Do you want to cancel this ride?',
      [
        { text: 'Keep ride', style: 'cancel' },
        {
          text: 'Cancel ride',
          style: 'destructive',
          onPress: async () => {
            if (!currentRide?.id) return;
            setIsCancelling(true);
            try {
              await cancelCurrentRide(currentRide.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              router.replace('/(passenger)/home');
            } catch {
              Alert.alert('Error', 'Could not cancel the ride. Please try again.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!currentRide?.id) return;
    setIsSharing(true);
    try {
      const { data } = await apiClient.post<{ shareUrl: string }>(
        `/ride/${currentRide.id}/share`
      );
      await Share.share({
        message: `Track my ride in real time:\n${data.shareUrl}`,
        title:   'Verona Ride trip tracking',
      });
    } catch {
      Alert.alert('Error', 'Could not generate tracking link.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleZoomIn = () => {
    mapZoomRef.current = Math.min(mapZoomRef.current + 2, 21);
    mapRef.current?.animateCamera({ zoom: mapZoomRef.current }, { duration: 300 });
  };
  const handleZoomOut = () => {
    mapZoomRef.current = Math.max(mapZoomRef.current - 2, 10);
    mapRef.current?.animateCamera({ zoom: mapZoomRef.current }, { duration: 300 });
  };
  const handleZoomReset = () => {
    mapZoomRef.current = 19;
    if (passengerPos) mapRef.current?.animateCamera({ center: passengerPos, zoom: 19 }, { duration: 400 });
  };
  const handleFitRoute = () => {
    const origin = driverLocation
      ? { latitude: driverLocation.latitude, longitude: driverLocation.longitude }
      : passengerPos;
    if (!origin || !dropoffLat || !dropoffLng) return;
    mapRef.current?.fitToCoordinates(
      [origin, { latitude: dropoffLat, longitude: dropoffLng }],
      { edgePadding: { top: 120, right: 50, bottom: 300, left: 50 }, animated: true }
    );
  };

  return (
    <View style={styles.container}>
      {/* Mapa con seguimiento del conductor */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        mapType={mapType}
        showsUserLocation={true}
        followsUserLocation={false}
        initialRegion={{
          latitude:      29.7604,
          longitude:     -95.3698,
          latitudeDelta:  0.006,
          longitudeDelta: 0.006,
        }}
      >

        {/* Ruta hacia el destino — origen throttleado cada 20 s para evitar parpadeos */}
        {routeOrigin && dropoffLat && dropoffLng && (
          <MapViewDirections
            origin={routeOrigin}
            destination={{ latitude: dropoffLat, longitude: dropoffLng }}
            apikey={GOOGLE_MAPS_KEY}
            strokeWidth={4}
            strokeColor={BRAND_COLORS.PRIMARY}
            optimizeWaypoints={false}
            onReady={(result) => {
              setEtaMinutes(Math.ceil(result.duration));
              setDistanceMiles(Math.round(result.distance * 0.621371 * 10) / 10);
            }}
          />
        )}

        {/* Marcador del destino */}
        {dropoffLat && dropoffLng && (
          <Marker
            coordinate={{ latitude: dropoffLat, longitude: dropoffLng }}
            title="Destination"
          >
            <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 2, borderWidth: 2, borderColor: BRAND_COLORS.ALERT }}>
              <Text style={{ fontSize: 20 }}>📍</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* ── Controles de zoom ── */}
      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn}>
          <Text style={styles.zoomBtnText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut}>
          <Text style={styles.zoomBtnText}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomReset}>
          <Text style={styles.zoomBtnIcon}>📍</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomBtn} onPress={handleFitRoute}>
          <Text style={styles.zoomBtnIcon}>🗺️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.zoomBtn, mapType === 'hybrid' && styles.zoomBtnActive]}
          onPress={() => setMapType(t => t === 'hybrid' ? 'standard' : 'hybrid')}
        >
          <Text style={styles.zoomBtnIcon}>{mapType === 'hybrid' ? '🛰️' : '🗺️'}</Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Trip in progress</Text>
            {etaMinutes !== null && (
              <Text style={styles.etaText}>  ·  {etaMinutes} min  {distanceMiles !== null ? `· ${distanceMiles} mi` : ''}</Text>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Panel inferior */}
      <View style={styles.bottomPanel}>
        {/* Info del conductor */}
        {assignedDriver && (
          <View style={styles.driverRow}>
            <UserAvatar
              name={assignedDriver.name}
              photoUrl={assignedDriver.photo_url}
              size={48}
            />
            <View style={styles.driverInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.driverName}>{assignedDriver.name ?? 'Driver'}</Text>
                {(() => {
                  const badge = getDriverBadge(assignedDriver.total_rides ?? 0, Number(assignedDriver.rating_avg) || 5);
                  return (
                    <View style={[styles.badgeChip, { backgroundColor: badge.color + '20' }]}>
                      <Text style={{ fontSize: 11 }}>{badge.emoji} </Text>
                      <Text style={[styles.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  );
                })()}
              </View>
              {(assignedDriver.vehicle_brand || assignedDriver.vehicle_model) ? (
                <Text style={styles.driverCar}>
                  {[assignedDriver.vehicle_color, assignedDriver.vehicle_brand, assignedDriver.vehicle_model]
                    .filter(Boolean).join(' ')}
                </Text>
              ) : null}
              {assignedDriver.vehicle_plate ? (
                <Text style={[styles.driverCar, { color: BRAND_COLORS.PRIMARY, fontWeight: '600' }]}>
                  {assignedDriver.vehicle_plate}
                </Text>
              ) : null}
            </View>
            <Text style={styles.driverRating}>
              ⭐ {(Number(assignedDriver.rating_avg) || 5).toFixed(1)}
            </Text>
          </View>
        )}

        {/* Destino */}
        {currentRide && (
          <View style={styles.destinationRow}>
            <Text style={styles.destinationIcon}>📍</Text>
            <View style={styles.destinationInfo}>
              <Text style={styles.destinationLabel}>Destination</Text>
              <Text style={styles.destinationAddress} numberOfLines={2}>
                {currentRide.dropoff_address}
              </Text>
            </View>
          </View>
        )}

        {/* Acciones */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              Alert.alert(
                'Call driver',
                'For your privacy, direct calls are not available. Use the chat to communicate with your driver.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open chat', onPress: () => setChatOpen(true) },
                ]
              );
            }}
          >
            <Text style={styles.actionEmoji}>📞</Text>
            <Text style={styles.actionLabel}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setChatOpen(true)}
          >
            <Text style={styles.actionEmoji}>💬</Text>
            <Text style={styles.actionLabel}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleShare}
            disabled={isSharing}
          >
            <Text style={styles.actionEmoji}>📤</Text>
            <Text style={styles.actionLabel}>{isSharing ? '...' : 'Share'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, isRecording && styles.recordingActive]}
            onPress={handleToggleRecording}
          >
            <Text style={styles.actionEmoji}>{isRecording ? '⏹️' : '🎙️'}</Text>
            <Text style={[styles.actionLabel, isRecording && { color: BRAND_COLORS.ALERT }]}>
              {isRecording ? 'Stop' : 'Record'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { opacity: isCancelling ? 0.5 : 1 }]}
            onPress={handleCancel}
            disabled={isCancelling}
          >
            <Text style={styles.actionEmoji}>✕</Text>
            <Text style={[styles.actionLabel, { color: BRAND_COLORS.ALERT }]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.sosActionBtn, isSosActive && styles.sosActive]}
            onPress={handleEmergency}
          >
            <Text style={styles.actionEmoji}>🚨</Text>
            <Text style={[styles.actionLabel, { color: isSosActive ? '#fff' : BRAND_COLORS.ALERT }]}>SOS</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── MODAL DE CHAT ── */}
      <Modal visible={chatOpen} animationType="slide" transparent onRequestClose={() => setChatOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.chatOverlay}>
            <View style={styles.chatSheet}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatTitle}>Chat with driver</Text>
                <TouchableOpacity onPress={() => setChatOpen(false)}>
                  <Text style={styles.chatClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(_, i) => String(i)}
                style={styles.chatMessages}
                contentContainerStyle={{ padding: 12, gap: 8 }}
                ListEmptyComponent={
                  <Text style={styles.chatEmpty}>No messages yet. Say hello!</Text>
                }
                renderItem={({ item }) => (
                  <View style={[styles.bubble, item.fromMe ? styles.bubbleMe : styles.bubbleThem]}>
                    <Text style={[styles.bubbleText, item.fromMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
                      {item.text}
                    </Text>
                    <Text style={styles.bubbleTime}>{item.time}</Text>
                  </View>
                )}
              />

              <View style={styles.quickMessages}>
                {QUICK_MESSAGES.map(msg => (
                  <TouchableOpacity key={msg} style={styles.quickBtn} onPress={() => sendMessage(msg)}>
                    <Text style={styles.quickBtnText}>{msg}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.chatInputRow}>
                <TextInput
                  style={styles.chatInput}
                  value={chatMessage}
                  onChangeText={setChatMessage}
                  placeholder="Type a message..."
                  placeholderTextColor="#aaa"
                  returnKeyType="send"
                  onSubmitEditing={() => sendMessage(chatMessage)}
                />
                <TouchableOpacity
                  style={[styles.chatSendBtn, !chatMessage.trim() && styles.chatSendDisabled]}
                  onPress={() => sendMessage(chatMessage)}
                  disabled={!chatMessage.trim()}
                >
                  <Text style={styles.chatSendText}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },

  // ── Controles de zoom ──
  zoomControls: {
    position: 'absolute',
    right: 12,
    top: 100,
    gap: 4,
  },
  zoomBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 2,
  },
  zoomBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 26,
  },
  zoomBtnIcon: { fontSize: 18 },
  zoomBtnActive: { backgroundColor: '#1E293B' },

  headerSafe: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: Platform.OS === 'android' ? 32 : 44,
  },
  header: { margin: 16, alignItems: 'center' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND_COLORS.ACCENT,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_600SemiBold',
  },
  etaText: {
    fontSize: 14,
    color: BRAND_COLORS.PRIMARY,
    fontFamily: 'Inter_500Medium',
  },
  badgeChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10,
  },
  badgeLabel: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  driverMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: BRAND_COLORS.PRIMARY,
  },
  passengerMarker: {
    borderRadius: 100,
    borderWidth: 2.5,
    borderColor: BRAND_COLORS.PRIMARY,
    overflow: 'hidden',
  },

  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },

  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BRAND_COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverAvatarText: { fontSize: 20, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 17, fontWeight: '600', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },
  driverCar: { fontSize: 14, color: '#888', marginTop: 2, fontFamily: 'Inter_400Regular' },
  driverRating: { fontSize: 15, fontWeight: '600', color: '#F59E0B', fontFamily: 'Inter_600SemiBold' },

  destinationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  destinationIcon: { fontSize: 20, marginTop: 2 },
  destinationInfo: { flex: 1 },
  destinationLabel: { fontSize: 13, color: '#888', fontFamily: 'Inter_400Regular' },
  destinationAddress: { fontSize: 16, color: BRAND_COLORS.TEXT, fontFamily: 'Inter_500Medium', marginTop: 2 },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionBtn: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    minWidth: 70,
  },
  sosActionBtn:     { backgroundColor: BRAND_COLORS.ALERT + '12' },
  sosActive:        { backgroundColor: BRAND_COLORS.ALERT },
  recordingActive:  { backgroundColor: BRAND_COLORS.ALERT + '20' },
  actionEmoji: { fontSize: 24, marginBottom: 4 },
  actionLabel: { fontSize: 13, color: BRAND_COLORS.TEXT, fontFamily: 'Inter_500Medium' },

  // Chat
  chatOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  chatSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  chatTitle: { fontSize: 18, fontWeight: '600', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },
  chatClose: { fontSize: 20, color: '#888', padding: 4 },
  chatMessages: { maxHeight: 200 },
  chatEmpty: { textAlign: 'center', color: '#aaa', fontSize: 15, marginTop: 20, fontFamily: 'Inter_400Regular' },
  bubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 16,
    marginVertical: 2,
  },
  bubbleMe: { backgroundColor: BRAND_COLORS.PRIMARY, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#F0F0F0', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  bubbleTextMe: { color: '#fff' },
  bubbleTextThem: { color: BRAND_COLORS.TEXT },
  bubbleTime: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2, textAlign: 'right', fontFamily: 'Inter_400Regular' },
  quickMessages: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  quickBtn: {
    backgroundColor: BRAND_COLORS.PRIMARY + '15',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickBtnText: { fontSize: 13, color: BRAND_COLORS.PRIMARY, fontFamily: 'Inter_500Medium' },
  chatInputRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  chatInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F8F9FA',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 16,
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_400Regular',
  },
  chatSendBtn: {
    height: 44,
    paddingHorizontal: 20,
    backgroundColor: BRAND_COLORS.PRIMARY,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatSendDisabled: { opacity: 0.4 },
  chatSendText: { color: '#fff', fontWeight: '600', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
