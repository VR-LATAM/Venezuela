// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Home del conductor — Fase 3 completa
// • Mapa con posición en tiempo real
// • Toggle online/offline + GPS cada 4 segundos via Socket.io
// • Modal de solicitud de viaje con countdown de 30 segundos
// • Panel de viaje activo: llegué → iniciar → finalizar
// • Pantalla de estado para cuentas pending/under_review/rejected
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Alert, ActivityIndicator, ScrollView, RefreshControl,
  Modal, Animated, Platform, Dimensions, StatusBar,
  FlatList, TextInput, KeyboardAvoidingView, AppState, AppStateStatus, Image, Linking,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { useAuthStore, useUser } from '../../src/store/authStore';
import { useRideStore } from '../../src/store/rideStore';
import { useTrainingStore } from '../../src/store/trainingStore';
import { socketService } from '../../src/services/socketService';
import { DRIVER_LOCATION_TASK } from '../../src/tasks/locationTask';
import { driverMobileService } from '../../src/services/driverService';
import { rideMobileService } from '../../src/services/rideService';
import { nokiaToneService } from '../../src/services/nokiaToneService';
import { BRAND_COLORS } from '@vride/shared';
import type { Driver, DriverStatus, Ride } from '@vride/shared';
import { UserAvatar } from '../../src/components/common/UserAvatar';
import { usePhotoUpload } from '../../src/hooks/usePhotoUpload';
import { SOSButton } from '../../src/components/common/SOSButton';
import { NavigationButton } from '../../src/components/common/NavigationButton';
import { useSpeedMonitor } from '../../src/hooks/useSpeedMonitor';
import { useMapZoom } from '../../src/hooks/useMapZoom';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}

function maneuverToArrow(maneuver: string): string {
  if (!maneuver) return '↑';
  if (maneuver.includes('uturn'))                   return '↩';
  if (maneuver.includes('sharp-left'))              return '↰';
  if (maneuver.includes('sharp-right'))             return '↱';
  if (maneuver.includes('left'))                    return '←';
  if (maneuver.includes('right'))                   return '→';
  if (maneuver.includes('roundabout'))              return '↺';
  if (maneuver.includes('merge') || maneuver.includes('ramp')) return '↗';
  return '↑';
}

function haversineDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────
// Configuración visual por estado del conductor
// ─────────────────────────────────────
const STATUS_CONFIG: Record<DriverStatus, {
  emoji: string; title: string; description: string; color: string; bgColor: string;
}> = {
  pending: {
    emoji: '📋', title: 'Complete your registration',
    description: 'Upload your documents and submit your application for review.',
    color: '#F59E0B', bgColor: '#FFFBEB',
  },
  under_review: {
    emoji: '🔍', title: 'Under review',
    description: 'Reviewing your application. We will notify you within 24-48 hours.',
    color: BRAND_COLORS.PRIMARY, bgColor: '#EFF6FF',
  },
  active: {
    emoji: '✅', title: 'Account active',
    description: 'You can go online and receive ride requests.',
    color: BRAND_COLORS.ACCENT, bgColor: '#F0FFF4',
  },
  inactive: {
    emoji: '⏸️', title: 'Account inactive',
    description: 'Contact support to reactivate your account.',
    color: '#888', bgColor: '#F5F5F5',
  },
  suspended: {
    emoji: '🚫', title: 'Account suspended',
    description: 'Your account has been suspended. Contact support.',
    color: BRAND_COLORS.ALERT, bgColor: '#FFF5F5',
  },
  rejected: {
    emoji: '❌', title: 'Application not approved',
    description: 'Review the reason, fix your documents and resubmit.',
    color: BRAND_COLORS.ALERT, bgColor: '#FFF5F5',
  },
};

// Estado del viaje activo del conductor
type ActiveRidePhase = 'picking_up' | 'arrived' | 'in_progress';

interface IncomingRequest {
  rideId: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number;
  pickupLng: number;
  serviceType: string;
  distanceFromDriver: number;
  timeoutSeconds: number;
  estimatedFare: number;
  estimatedDriverEarnings: number;
  tripDistanceMiles: number;
  specialNeeds?: string[];
}


function vehicleColorToHex(color?: string | null): string {
  if (!color) return '#374151';
  const c = color.toLowerCase().trim();
  const map: Record<string, string> = {
    white: '#E0E0E0', black: '#1F2937', silver: '#9CA3AF', gray: '#6B7280',
    grey: '#6B7280', red: '#DC2626', blue: '#2563EB', navy: '#1E3A8A',
    green: '#16A34A', yellow: '#CA8A04', gold: '#D97706', orange: '#EA580C',
    brown: '#92400E', maroon: '#991B1B', purple: '#7C3AED', pink: '#EC4899',
    beige: '#C9A96E', cream: '#D4B896', tan: '#A8834F', champagne: '#D4AC7F',
  };
  for (const [key, hex] of Object.entries(map)) {
    if (c.includes(key)) return hex;
  }
  return '#374151';
}

export default function DriverHomeScreen() {
  const user                     = useUser();
  const { logout }               = useAuthStore();
  const { isOnline, setOnline, setIncomingRequest, activeRide, setActiveRide, setCompletedRide, assignedPassenger, setAssignedPassenger } = useRideStore();

  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const { status: trainingStatus, certifications, loadStatus: loadTrainingStatus, loadCertifications } = useTrainingStore();

  // Estado local
  const [driver, setDriver]         = useState<Driver | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverPos, setDriverPos]   = useState<{ latitude: number; longitude: number } | null>(null);
  const [activePhase, setActivePhase] = useState<ActiveRidePhase | null>(null);
  const [isTogglingOnline, setIsTogglingOnline] = useState(false);
  const [isActionLoading, setIsActionLoading]   = useState(false);
  const [menuVisible, setMenuVisible]           = useState(false);
  const [panelExpanded, setPanelExpanded]       = useState(true);
  const [arrivalBanner, setArrivalBanner]       = useState(false);
  const hasNotifiedArrival                      = useRef(false);
  const hasNotifiedPickupArrival                = useRef(false);
  const [docAlerts, setDocAlerts]               = useState<Array<{ document_type: string; days_left: number; is_expired: boolean; urgent: boolean }>>([]);
  const { pickAndUpload, uploading: uploadingPhoto } = usePhotoUpload();

  // Chat con el pasajero
  const [chatOpen, setChatOpen]       = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<{ text: string; fromMe: boolean; time: string }[]>([]);
  const chatListRef = useRef<FlatList>(null);

  // Wait & Return — timer de espera
  const [waitStartedAt, setWaitStartedAt]         = useState<Date | null>(null);
  const [waitElapsedSec, setWaitElapsedSec]       = useState(0);
  const [waitFareAccrued, setWaitFareAccrued]     = useState(0);
  const waitIntervalRef                            = useRef<ReturnType<typeof setInterval> | null>(null);
  const WAIT_RATE_PER_SEC                          = 0.30 / 60; // default $0.30/min

  // Speed monitoring — activo solo cuando el viaje está en progreso
  const { speedMph, isOverLimit } = useSpeedMonitor(activePhase === 'in_progress');


  // Animación del toggle online
  const onlinePulse = useRef(new Animated.Value(1)).current;

  // Referencia al subscription de GPS para poder cancelarlo
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  // Origen de la ruta — se actualiza cada 20 s para evitar exceso de llamadas a Directions API
  const [routeOrigin, setRouteOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
  const routeOriginUpdateRef = useRef<number>(0);

  // Zoom del mapa — gestionado por useMapZoom (getCamera() + fallback ref)
  const { mapZoomRef, handleZoomIn, handleZoomOut, handleZoomReset } = useMapZoom(mapRef);

  // Tipo de mapa — toggle satélite / básico
  const [mapType, setMapType] = useState<'hybrid' | 'standard'>('hybrid');

  // Navegación turn-by-turn
  const navStepsRef       = useRef<any[]>([]);
  const currentStepIdxRef = useRef(0);
  const [currentNavStep, setCurrentNavStep] = useState<any | null>(null);
  const [navEta, setNavEta]                 = useState<number | null>(null);
  const [navTotalDist, setNavTotalDist]     = useState<string>('');

  // Ref con la última posición conocida del conductor (accesible sin stale closure)
  const lastPosRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // ─────────────────────────────────────
  // Inicializar al montar
  // ─────────────────────────────────────
  useEffect(() => {
    void loadProfile();
    void initSocket();
    void nokiaToneService.preload();
    void loadTrainingStatus();
    void loadCertifications();

    // Obtener posición real inmediatamente al montar para evitar mostrar Houston por defecto
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          .then(loc => setDriverPos({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }))
          .catch(() => {});
      }
    });

    // Si el conductor ya estaba online (ej. regresó de la pantalla de calificación),
    // reiniciar el GPS para que el marcador del vehículo vuelva al mapa
    if (isOnline) {
      void startGPS();
    }

    return () => {
      locationSubRef.current?.remove();
      Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK)
        .then(running => { if (running) Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK).catch(() => {}); })
        .catch(() => {});
      socketService.off('driver:ride_cancelled');
      socketService.off('driver:ride_already_taken');
      socketService.off('driver:passenger_message');
    };
  }, []);

  // AppState — reconectar socket y reiniciar GPS al volver al foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void socketService.connect();
        if (isOnline) {
          socketService.emit('driver:status_change', { isOnline: true });
          const pos = lastPosRef.current;
          if (pos) {
            socketService.emit('driver:location_update', {
              latitude: pos.latitude, longitude: pos.longitude, timestamp: Date.now(),
            });
          }
          if (!locationSubRef.current) void startGPS();
        }
      }
    });
    return () => subscription.remove();
  }, [isOnline]);

  // Reset de navegación al salir de in_progress
  useEffect(() => {
    if (activePhase !== 'in_progress') {
      navStepsRef.current = [];
      currentStepIdxRef.current = 0;
      setCurrentNavStep(null);
      setNavEta(null);
      setNavTotalDist('');
    }
  }, [activePhase]);

  // Listener de mensajes del pasajero
  useEffect(() => {
    const unsub = socketService.on('driver:passenger_message', (data: unknown) => {
      const d = data as { message: string };
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatMessages(prev => [...prev, { text: d.message, fromMe: false, time }]);
      setChatOpen(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });
    return () => unsub();
  }, []);

  // Auto-redirect a training cuando la cuenta está activa pero el entrenamiento no está completo.
  // Solo ocurre una vez por sesión (al montar) — el banner se encarga del resto.
  const trainingRedirectDone = useRef(false);
  useEffect(() => {
    if (
      !loading &&
      !trainingRedirectDone.current &&
      driver?.status === 'active' &&
      trainingStatus !== null &&
      !trainingStatus.isComplete &&
      !isOnline
    ) {
      trainingRedirectDone.current = true;
      router.push('/(driver)/training');
    }
  }, [loading, trainingStatus?.isComplete, driver?.status]);

  // Cuando el layout acepta un viaje y setea activeRide, mostrar fase picking_up
  useEffect(() => {
    if (activeRide && !activePhase) {
      setActivePhase('picking_up');
    }
    if (!activeRide) {
      setActivePhase(null);
    }
    // Reset panel and arrival notification on new ride
    setPanelExpanded(true);
    hasNotifiedArrival.current = false;
    hasNotifiedPickupArrival.current = false;
  }, [activeRide?.id]);

  // Reset arrival notification when phase changes
  useEffect(() => {
    hasNotifiedArrival.current = false;
    hasNotifiedPickupArrival.current = false;
  }, [activePhase]);

  // Detección de llegada al pickup (para recoger al pasajero)
  useEffect(() => {
    if (activePhase !== 'picking_up' || !driverPos || !activeRide) return;
    if (hasNotifiedPickupArrival.current) return;
    const a = activeRide as any;
    const pickupLat = a.pickup_lat ?? a.pickup_location?.latitude;
    const pickupLng = a.pickup_lng ?? a.pickup_location?.longitude;
    if (!pickupLat || !pickupLng) return;
    const dist = haversineDistanceMiles(driverPos.latitude, driverPos.longitude, pickupLat, pickupLng);
    if (dist < 0.004) {
      hasNotifiedPickupArrival.current = true;
      void nokiaToneService.play();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 400);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 800);
    }
  }, [driverPos, activePhase]);

  // Detección de llegada al destino
  useEffect(() => {
    if (activePhase !== 'in_progress' || !driverPos || !activeRide) return;
    if (hasNotifiedArrival.current) return;
    const a = activeRide as any;
    const destLat = a.dropoff_lat ?? a.dropoff_location?.latitude;
    const destLng = a.dropoff_lng ?? a.dropoff_location?.longitude;
    if (!destLat || !destLng) return;
    const dist = haversineDistanceMiles(driverPos.latitude, driverPos.longitude, destLat, destLng);
    if (dist < 0.004) {
      hasNotifiedArrival.current = true;
      setArrivalBanner(true);
      void nokiaToneService.play();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 400);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 800);
      setTimeout(() => setArrivalBanner(false), 5000);
    }
  }, [driverPos, activePhase]);

  // Wait & Return — correr el timer cuando waitStartedAt está activo
  useEffect(() => {
    if (!waitStartedAt) {
      if (waitIntervalRef.current) { clearInterval(waitIntervalRef.current); waitIntervalRef.current = null; }
      setWaitElapsedSec(0);
      setWaitFareAccrued(0);
      return;
    }
    waitIntervalRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - waitStartedAt.getTime()) / 1000);
      setWaitElapsedSec(secs);
      setWaitFareAccrued(Math.round(secs * WAIT_RATE_PER_SEC * 100) / 100);
    }, 1000);
    return () => { if (waitIntervalRef.current) clearInterval(waitIntervalRef.current); };
  }, [waitStartedAt]);

  // Re-emitir estado online + ubicación en cada reconexión.
  // El backend resetea is_online=false ante cualquier desconexión, y PostGIS pierde la posición si
  // el socket se reconecta antes de que watchPositionAsync emita el próximo ciclo de 4s.
  useEffect(() => {
    const unsub = socketService.on('connect', () => {
      if (isOnline) {
        socketService.emit('driver:status_change', { isOnline: true });
        const pos = lastPosRef.current;
        if (pos) {
          console.log('[GPS] Re-emitiendo posición tras reconexión:', pos.latitude, pos.longitude);
          socketService.emit('driver:location_update', {
            latitude:  pos.latitude,
            longitude: pos.longitude,
            timestamp: Date.now(),
          });
        }
      }
    });
    return unsub;
  }, [isOnline]);

  // Auto-centrar cámara — mantiene el zoom que el conductor eligió (mapZoomRef)
  useEffect(() => {
    if (!driverPos || !mapRef.current) return;
    mapRef.current.animateCamera(
      { center: driverPos, zoom: mapZoomRef.current },
      { duration: 500 }
    );
  }, [driverPos]);

  // Animación pulsante cuando está online
  useEffect(() => {
    if (isOnline) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(onlinePulse, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
          Animated.timing(onlinePulse, { toValue: 1.00, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      onlinePulse.stopAnimation();
      onlinePulse.setValue(1);
    }
  }, [isOnline]);

  const loadProfile = async () => {
    try {
      const [profile, alerts] = await Promise.all([
        driverMobileService.getProfile(),
        driverMobileService.getDocumentExpiry().catch(() => []),
      ]);
      setDriver(profile);
      setDocAlerts(alerts.filter(a => a.is_expired || a.urgent));

      // Si tiene viaje activo en la BD, restaurar estado y reiniciar GPS
      if (profile.status === 'active') {
        const active = await rideMobileService.getActiveRide();
        if (active) {
          setActiveRide(active);
          const rideAny = active as any;
          if (rideAny.passenger_name) {
            setAssignedPassenger({
              id:        rideAny.passenger_id ?? '',
              name:      rideAny.passenger_name,
              photo_url: rideAny.passenger_photo_url ?? undefined,
            });
          }
          const phaseMap: Record<string, ActiveRidePhase> = {
            driver_assigned:  'picking_up',
            driver_arriving:  'picking_up',
            driver_arrived:   'arrived',
            in_progress:      'in_progress',
          };
          setActivePhase(phaseMap[active.status] ?? null);
          // Hay viaje activo → reiniciar GPS y marcar online (cubre el caso de reinicio tras crash)
          setOnline(true);
          void startGPS();
        }
      }
    } catch {
      // Sin red — mostrar perfil básico del authStore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const initSocket = async () => {
    await socketService.connect();

    // El pasajero canceló antes de que el conductor llegara
    socketService.on('driver:ride_cancelled', () => {
      setActiveRide(null);
      setActivePhase(null);
      setAssignedPassenger(null);
      Alert.alert('Ride cancelled', 'The passenger cancelled the ride.');
    });

    // El viaje fue tomado por otro conductor
    socketService.on('driver:ride_already_taken', () => {
      Alert.alert('', 'This ride was already taken by another driver.');
    });

    // Info del pasajero al aceptar el viaje
    socketService.on('driver:passenger_assigned', (data: unknown) => {
      const d = data as { passenger: { id: string; name: string; photo_url?: string; patient_phone?: string | null } };
      if (d?.passenger) setAssignedPassenger(d.passenger);
    });
  };

  // ─────────────────────────────────────
  // GPS — enviar posición cada 4 segundos cuando está online
  // ─────────────────────────────────────
  const startGPS = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location permission', 'We need your location to show you on the map.');
      return;
    }

    // Pedir permiso de background para seguir enviando cuando el conductor minimiza la app
    await Location.requestBackgroundPermissionsAsync();

    // Posición inmediata para centrar el mapa y registrar en PostGIS de inmediato
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const { latitude: initLat, longitude: initLng } = current.coords;
    setDriverPos({ latitude: initLat, longitude: initLng });
    lastPosRef.current = { latitude: initLat, longitude: initLng };
    setRouteOrigin({ latitude: initLat, longitude: initLng });
    routeOriginUpdateRef.current = Date.now();
    // Emitir la posición inicial al backend para que PostGIS tenga datos antes del primer ciclo de 4s
    // heading -1 = no disponible en Android → omitir para que pase la validación zod del backend
    const initHeading = (current.coords.heading != null && current.coords.heading >= 0 && current.coords.heading <= 360)
      ? current.coords.heading : undefined;
    const initSpeed   = (current.coords.speed   != null && current.coords.speed   >= 0)
      ? current.coords.speed   : undefined;
    console.log('[GPS] Emitiendo posición inicial:', initLat, initLng, '| socket:', socketService.connected);
    socketService.emit('driver:location_update', {
      latitude:  initLat,
      longitude: initLng,
      heading:   initHeading,
      speed:     initSpeed,
      timestamp: Date.now(),
    });
    // Respaldo HTTP: garantiza que current_location quede en PostGIS aunque el socket
    // no esté conectado aún (el emit de arriba se descarta si socket.connected = false)
    driverMobileService.updateLocationHTTP(initLat, initLng).catch(() => {});

    // Tarea de background — envía posición al backend via HTTP en foreground Y en background.
    // El backend retransmite al pasajero via socket (los sockets no operan en background).
    // Background task — falla silenciosamente en Expo Go / Android (no disponible)
    // El try-catch evita que un error aquí cancele el watchPositionAsync de abajo
    try {
      const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK).catch(() => false);
      if (!alreadyRunning) {
        await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
          accuracy:         Location.Accuracy.High,
          timeInterval:     4000,
          distanceInterval: 5,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Verona Ride',
            notificationBody:  'Sending your location to passengers.',
            notificationColor: '#1A73E8',
          },
        });
      }
    } catch {
      console.log('[GPS] Background task no disponible (Expo Go / Android) — usando solo socket foreground');
    }

    // watchPositionAsync — actualiza el mapa local Y emite posición al backend via socket
    locationSubRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 5 },
      (loc) => {
        const { latitude, longitude } = loc.coords;
        setDriverPos({ latitude, longitude });
        lastPosRef.current = { latitude, longitude };

        // Socket emit: asegura que el backend actualice PostGIS en tiempo real
        // heading -1 = "not available" en Android → omitir para pasar la validación zod
        const hdg = (loc.coords.heading != null && loc.coords.heading >= 0 && loc.coords.heading <= 360)
          ? loc.coords.heading : undefined;
        const spd = (loc.coords.speed   != null && loc.coords.speed   >= 0)
          ? loc.coords.speed   : undefined;
        socketService.emit('driver:location_update', {
          latitude,
          longitude,
          heading:   hdg,
          speed:     spd,
          timestamp: Date.now(),
        });

        const now = Date.now();
        if (now - routeOriginUpdateRef.current > 20000) {
          routeOriginUpdateRef.current = now;
          setRouteOrigin({ latitude, longitude });
        }

        updateNavStep(latitude, longitude);
      }
    );
  }, []);

  const stopGPS = useCallback(async () => {
    locationSubRef.current?.remove();
    locationSubRef.current = null;
    const running = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK).catch(() => false);
    if (running) await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK).catch(() => {});
  }, []);

  // Avanzar al siguiente step de navegación según posición del conductor
  const updateNavStep = (lat: number, lng: number) => {
    const steps = navStepsRef.current;
    if (steps.length === 0) return;
    let idx = currentStepIdxRef.current;
    while (idx < steps.length - 1) {
      const endLat = steps[idx].end_location?.lat;
      const endLng = steps[idx].end_location?.lng;
      if (!endLat) break;
      if (haversineDistanceMiles(lat, lng, endLat, endLng) < 0.03) {
        idx++;
      } else break;
    }
    if (idx !== currentStepIdxRef.current) {
      currentStepIdxRef.current = idx;
      setCurrentNavStep(steps[idx]);
    }
  };

  // Callback onReady de MapViewDirections — captura steps del paso a paso
  const handleDirectionsReady = useCallback((result: any) => {
    const steps = result.legs?.[0]?.steps ?? [];
    navStepsRef.current = steps;
    currentStepIdxRef.current = 0;
    setCurrentNavStep(steps[0] ?? null);
    setNavEta(Math.ceil(result.duration));
    setNavTotalDist(`${(result.distance * 0.621371).toFixed(1)} mi`);
  }, []);

  // ─────────────────────────────────────
  // Enviar mensaje al pasajero
  const sendDriverMessage = (text: string) => {
    if (!text.trim() || !activeRide?.id) return;
    socketService.emit('driver:message', { rideId: activeRide.id, message: text.trim() });
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { text: text.trim(), fromMe: true, time }]);
    setChatMessage('');
    setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Toggle Online / Offline
  // ─────────────────────────────────────
  const handleToggleOnline = async () => {
    if (driver?.status !== 'active') return;
    if (activeRide) {
      Alert.alert('', 'You cannot go offline during an active ride.');
      return;
    }

    const newOnline = !isOnline;

    console.log('[TOGGLE] Going online=', newOnline,
      '| certs:', certifications === null ? 'loading...' : `${certifications?.certified_services?.length ?? 0} services`,
      '| driver.status:', driver?.status);

    // Verificar que tenga al menos un servicio certificado antes de ir online.
    // Si certifications === null, aún están cargando — dejar pasar y dejar que el backend valide.
    if (newOnline && certifications !== null) {
      const certifiedServices = certifications.certified_services ?? [];
      if (certifiedServices.length === 0) {
        Alert.alert(
          'Certification required',
          'You must pass at least one service certification exam before going online.',
          [
            { text: 'Go to Certifications', onPress: () => router.push('/(driver)/training') },
            { text: 'Later', style: 'cancel' },
          ]
        );
        return;
      }
    }
    setIsTogglingOnline(true);

    try {
      const onlineResult = await driverMobileService.setOnlineStatus(newOnline);
      console.log('[ONLINE] Respuesta BD:', JSON.stringify(onlineResult));
      socketService.emit('driver:status_change', { isOnline: newOnline });
      setOnline(newOnline);

      if (newOnline) {
        await startGPS();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        void stopGPS();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'TRAINING_INCOMPLETE') {
        Alert.alert(
          'Training required',
          'You must complete all required training modules before going online.',
          [
            { text: 'Go to Training', onPress: () => router.push('/(driver)/training') },
            { text: 'Later', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('', 'Could not change your status. Check your connection.');
      }
    } finally {
      setIsTogglingOnline(false);
    }
  };


  // ─────────────────────────────────────
  // Acciones del viaje activo
  // ─────────────────────────────────────
  const mergeRideCoords = (updated: Ride, prev: Ride) => {
    const u = updated as any;
    const p = prev as any;
    // Copiar coords del viaje anterior si el backend no las devuelve en el objeto actualizado
    // (el backend puede devolverlas como campo plano o anidado en pickup_location/dropoff_location)
    const hasDropoff = u.dropoff_lat || u.dropoff_location?.latitude;
    if (!hasDropoff) {
      u.pickup_lat  = p.pickup_lat  ?? p.pickup_location?.latitude;
      u.pickup_lng  = p.pickup_lng  ?? p.pickup_location?.longitude;
      u.dropoff_lat = p.dropoff_lat ?? p.dropoff_location?.latitude;
      u.dropoff_lng = p.dropoff_lng ?? p.dropoff_location?.longitude;
      if (!u.pickup_location  && p.pickup_location)  u.pickup_location  = p.pickup_location;
      if (!u.dropoff_location && p.dropoff_location) u.dropoff_location = p.dropoff_location;
    }
    return updated;
  };

  const handleMarkArrived = async () => {
    if (!activeRide) return;

    // GEOFENCING — desactivado temporalmente para pruebas internas
    // Activar antes del lanzamiento en producción (descomentar bloque)
    // if (driverPos) {
    //   const a = activeRide as any;
    //   const pickupLat = a.pickup_lat ?? a.pickup_location?.latitude;
    //   const pickupLng = a.pickup_lng ?? a.pickup_location?.longitude;
    //   if (pickupLat && pickupLng) {
    //     const distMiles = haversineDistanceMiles(driverPos.latitude, driverPos.longitude, pickupLat, pickupLng);
    //     if (distMiles > 0.15) {
    //       Alert.alert(
    //         'Not at pickup yet',
    //         `You are ${Math.round(distMiles * 5280)} ft away from the pickup point. Drive closer before marking arrival.`
    //       );
    //       return;
    //     }
    //   }
    // }

    setIsActionLoading(true);
    try {
      const updated = await rideMobileService.markArrived(activeRide.id);
      setActiveRide(mergeRideCoords(updated, activeRide));
      setActivePhase('arrived');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert('', 'Could not mark arrival. Try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStartRide = async () => {
    if (!activeRide) return;
    setIsActionLoading(true);
    try {
      const updated = await rideMobileService.startRide(activeRide.id);
      setActiveRide(mergeRideCoords(updated, activeRide));
      setActivePhase('in_progress');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert('', 'Could not start the ride. Try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStartWait = async () => {
    if (!activeRide) return;
    setIsActionLoading(true);
    try {
      socketService.emit('driver:start_wait', { rideId: activeRide.id });
      setWaitStartedAt(new Date());
      void nokiaToneService.play();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEndWait = () => {
    Alert.alert(
      'Passenger is back?',
      'End the wait and start the return trip?',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Yes, start return',
          onPress: async () => {
            if (!activeRide) return;
            setIsActionLoading(true);
            try {
              socketService.emit('driver:end_wait', { rideId: activeRide.id });
              setWaitStartedAt(null);
              void nokiaToneService.play();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCompleteRide = () => {
    Alert.alert(
      'Finish ride',
      'Confirm the passenger has reached their destination?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, finish',
          onPress: async () => {
            if (!activeRide) return;
            setIsActionLoading(true);
            try {
              const completed = await rideMobileService.completeRide(activeRide.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              const earnings = Number((completed as any).driver_earnings ?? 0);
              setCompletedRide(activeRide.id, earnings);
              const completedRideId = activeRide.id;
              setActiveRide(null);
              setActivePhase(null);
              setChatMessages([]);
              setChatOpen(false);

              // Preguntar al conductor si quiere dejar una nota al pasajero
              Alert.alert(
                'Leave a note? (optional)',
                'You can leave a short note for the passenger — e.g. "Left your cane on the back seat".',
                [
                  { text: 'Skip', onPress: () => router.push('/(driver)/rating') },
                  {
                    text: 'Add note',
                    onPress: () => {
                      Alert.prompt?.(
                        'Note for passenger',
                        'Max 500 characters',
                        async (note) => {
                          if (note?.trim()) {
                            rideMobileService.addDriverNotes(completedRideId, note.trim()).catch(() => {});
                          }
                          router.push('/(driver)/rating');
                        },
                        'plain-text',
                        '',
                      ) ?? router.push('/(driver)/rating');
                    },
                  },
                ]
              );
            } catch (err) {
              Alert.alert('', 'Could not finish the ride. Please try again.');
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    if (isOnline) {
      Alert.alert('', 'Please go offline before signing out.');
      return;
    }
    socketService.disconnect();
    await logout();
    router.replace('/(auth)/');
  };

  const onRefresh = () => {
    setRefreshing(true);
    void loadProfile();
  };

  // ─────────────────────────────────────
  // Controles de zoom del mapa
  // ─────────────────────────────────────
  const handleFitRoute = () => {
    if (!driverPos || !activeRide) return;
    const a = activeRide as any;
    const destLat = activePhase === 'picking_up'
      ? (a.pickup_lat  ?? a.pickup_location?.latitude)
      : (a.dropoff_lat ?? a.dropoff_location?.latitude);
    const destLng = activePhase === 'picking_up'
      ? (a.pickup_lng  ?? a.pickup_location?.longitude)
      : (a.dropoff_lng ?? a.dropoff_location?.longitude);
    if (!destLat) return;
    mapRef.current?.fitToCoordinates(
      [driverPos, { latitude: destLat, longitude: destLng }],
      { edgePadding: { top: 120, right: 50, bottom: 380, left: 50 }, animated: true }
    );
  };

  // ─────────────────────────────────────
  // Loading inicial
  // ─────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const status = driver?.status ?? 'pending';

  // ─────────────────────────────────────
  // CUENTA NO ACTIVA — vista de estado (igual que Fase 2)
  // ─────────────────────────────────────
  if (status !== 'active') {
    const config = STATUS_CONFIG[status];
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.inactiveHeader}>
          <View style={styles.logo}><Image source={require('../../assets/logo.png')} style={{ width: 28, height: 28 }} resizeMode="contain" /></View>
          <Text style={styles.inactiveHeaderTitle}>Verona Ride Driver</Text>
          <TouchableOpacity onPress={handleLogout}><Text style={styles.logoutText}>Sign out</Text></TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.inactiveScroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_COLORS.PRIMARY} />}
        >
          <View style={[styles.statusCard, { backgroundColor: config.bgColor, borderColor: config.color + '30' }]}>
            <Text style={styles.statusEmoji}>{config.emoji}</Text>
            <Text style={[styles.statusTitle, { color: config.color }]}>{config.title}</Text>
            <Text style={styles.statusDesc}>{config.description}</Text>

            {status === 'rejected' && driver?.rejection_reason && (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Reason:</Text>
                <Text style={styles.reasonText}>{driver.rejection_reason}</Text>
              </View>
            )}
            {status === 'suspended' && driver?.suspension_reason && (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Reason:</Text>
                <Text style={styles.reasonText}>{driver.suspension_reason}</Text>
              </View>
            )}
          </View>

          {status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
              onPress={() => router.push('/(auth)/register-driver')}
            >
              <Text style={styles.actionButtonText}>Complete registration</Text>
            </TouchableOpacity>
          )}

          {status === 'rejected' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: BRAND_COLORS.ALERT }]}
              onPress={() => router.push('/(auth)/register-driver')}
            >
              <Text style={styles.actionButtonText}>Fix and resubmit</Text>
            </TouchableOpacity>
          )}

          <View style={styles.profileCard}>
            <Text style={styles.profileCardTitle}>Profile</Text>
            <ProfileRow label="Email" value={user?.email ?? ''} />
            <ProfileRow label="Phone" value={user?.phone ?? '—'} />
            <ProfileRow label="State" value={user?.state_code ?? 'TX'} />
            {driver?.referral_code && (
              <ProfileRow label="Referral code" value={driver.referral_code} />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────
  // CUENTA ACTIVA — Vista completa del conductor
  // ─────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── MAPA ── */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        mapType={mapType}
        showsUserLocation={false}
        mapPadding={{ top: 80, right: 20, bottom: activeRide ? (panelExpanded ? 370 : 150) : 280, left: 20 }}
        initialRegion={{
          latitude:      driverPos?.latitude  ?? 29.7604,
          longitude:     driverPos?.longitude ?? -95.3698,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        {/* Marcador del conductor */}
        {driverPos && (
          <Marker coordinate={driverPos} anchor={{ x: 0.5, y: 0.5 }}>
            <Animated.View style={{ transform: [{ scale: onlinePulse }] }}>
              <Text style={styles.driverMarker}>🚗</Text>
            </Animated.View>
          </Marker>
        )}

        {/* Marcador del pickup cuando hay viaje activo */}
        {activeRide && activePhase === 'picking_up' && (() => {
          const a = activeRide as any;
          const lat = a.pickup_lat ?? a.pickup_location?.latitude;
          const lng = a.pickup_lng ?? a.pickup_location?.longitude;
          if (!lat) return null;
          return (
            <Marker coordinate={{ latitude: lat, longitude: lng }} title="Pickup point">
              <View style={styles.pickupMarker}><Text style={{ fontSize: 24 }}>📍</Text></View>
            </Marker>
          );
        })()}

        {/* Marcador del destino desde que el conductor llega al pickup */}
        {activeRide && (activePhase === 'arrived' || activePhase === 'in_progress') && (() => {
          const a = activeRide as any;
          const lat = a.dropoff_lat ?? a.dropoff_location?.latitude;
          const lng = a.dropoff_lng ?? a.dropoff_location?.longitude;
          if (!lat) return null;
          return (
            <Marker coordinate={{ latitude: lat, longitude: lng }} title="Destination">
              <View style={styles.pickupMarker}><Text style={{ fontSize: 24 }}>🏁</Text></View>
            </Marker>
          );
        })()}

        {/* Ruta: conductor → punto de recogida */}
        {routeOrigin && activeRide && activePhase === 'picking_up' && (() => {
          const a = activeRide as any;
          const lat = a.pickup_lat ?? a.pickup_location?.latitude;
          const lng = a.pickup_lng ?? a.pickup_location?.longitude;
          if (!lat) return null;
          return (
            <MapViewDirections
              origin={routeOrigin}
              destination={{ latitude: lat, longitude: lng }}
              apikey={GOOGLE_MAPS_KEY}
              strokeWidth={4}
              strokeColor={BRAND_COLORS.PRIMARY}
              optimizeWaypoints={false}
              onReady={handleDirectionsReady}
            />
          );
        })()}

        {/* Ruta: conductor → destino */}
        {routeOrigin && activeRide && (activePhase === 'arrived' || activePhase === 'in_progress') && (() => {
          const a = activeRide as any;
          const lat = a.dropoff_lat ?? a.dropoff_location?.latitude;
          const lng = a.dropoff_lng ?? a.dropoff_location?.longitude;
          if (!lat) return null;
          return (
            <MapViewDirections
              origin={routeOrigin}
              destination={{ latitude: lat, longitude: lng }}
              apikey={GOOGLE_MAPS_KEY}
              strokeWidth={4}
              strokeColor={BRAND_COLORS.ACCENT}
              optimizeWaypoints={false}
              onReady={handleDirectionsReady}
            />
          );
        })()}
      </MapView>

      {/* ── CONTROLES DE ZOOM ── */}
      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn}>
          <Text style={styles.zoomBtnText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut}>
          <Text style={styles.zoomBtnText}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoomReset(driverPos)}>
          <Text style={styles.zoomBtnIcon}>📍</Text>
        </TouchableOpacity>
        {activeRide && (
          <TouchableOpacity style={styles.zoomBtn} onPress={handleFitRoute}>
            <Text style={styles.zoomBtnIcon}>🗺️</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.zoomBtn, mapType === 'hybrid' && styles.zoomBtnActive]}
          onPress={() => setMapType(t => t === 'hybrid' ? 'standard' : 'hybrid')}
        >
          <Text style={styles.zoomBtnIcon}>{mapType === 'hybrid' ? '🏙️' : '🛰️'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── HEADER FLOTANTE ── */}
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logo}><Image source={require('../../assets/logo.png')} style={{ width: 28, height: 28 }} resizeMode="contain" /></View>
            <View>
              <Text style={styles.headerName}>{user?.name?.split(' ')[0]}</Text>
              <View style={styles.onlineBadge}>
                <View style={[styles.onlineDot, { backgroundColor: isOnline ? BRAND_COLORS.ACCENT : '#ccc' }]} />
                <Text style={styles.onlineBadgeText}>{isOnline ? 'Online' : 'Offline'}</Text>
              </View>
            </View>
          </View>

          {/* Ganancias de hoy */}
          <View style={styles.earningsChip}>
            <Text style={styles.earningsLabel}>Today</Text>
            <Text style={styles.earningsAmount}>
              ${(Number(driver?.available_balance) || 0).toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.logoutBtn}>
            <Text style={styles.logoutIcon}>☰</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── BANNER DE LLEGADA ── */}
      {arrivalBanner && (
        <View style={styles.arrivalBanner}>
          <Text style={styles.arrivalBannerText}>🏁 You are arriving at the destination!</Text>
        </View>
      )}

      {/* ── NAVEGACIÓN TURN-BY-TURN ── */}
      {activePhase === 'in_progress' && currentNavStep && !arrivalBanner && (
        <View style={styles.navTurnBanner}>
          <View style={styles.navTurnArrowBox}>
            <Text style={styles.navTurnArrow}>{maneuverToArrow(currentNavStep.maneuver ?? '')}</Text>
            <Text style={styles.navTurnDist}>{currentNavStep.distance?.text ?? ''}</Text>
          </View>
          <Text style={styles.navTurnInstruction} numberOfLines={2}>
            {stripHtml(currentNavStep.html_instructions ?? '')}
          </Text>
          {(navEta !== null || navTotalDist) && (
            <View style={styles.navTurnEtaBox}>
              {navEta !== null && <Text style={styles.navTurnEtaVal}>{navEta}m</Text>}
              {navTotalDist ? <Text style={styles.navTurnEtaDist}>{navTotalDist}</Text> : null}
            </View>
          )}
        </View>
      )}

      {/* ── PANEL INFERIOR ── */}
      <View style={[styles.bottomPanel, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>

        {/* Sin viaje activo — toggle online/offline */}
        {!activeRide && (
          <View style={styles.idlePanel}>

            {/* Banner de certificación pendiente */}
            {(certifications?.certified_services.length ?? 0) === 0 && (
              <TouchableOpacity
                style={styles.trainingBanner}
                onPress={() => router.push('/(driver)/training')}
                activeOpacity={0.8}
              >
                <Text style={styles.trainingBannerEmoji}>🎓</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trainingBannerTitle}>Certification required to go online</Text>
                  <Text style={styles.trainingBannerSub}>
                    Pass at least one service exam to start receiving rides · Tap to begin
                  </Text>
                </View>
                <Text style={styles.trainingBannerArrow}>›</Text>
              </TouchableOpacity>
            )}

            {/* Banner de módulos base pendientes */}
            {(certifications?.certified_services.length ?? 0) > 0 && trainingStatus && !trainingStatus.isComplete && (
              <TouchableOpacity
                style={[styles.trainingBanner, { backgroundColor: '#F0FFF4', borderColor: BRAND_COLORS.ACCENT + '40' }]}
                onPress={() => router.push('/(driver)/training')}
                activeOpacity={0.8}
              >
                <Text style={styles.trainingBannerEmoji}>✅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.trainingBannerTitle, { color: BRAND_COLORS.ACCENT }]}>
                    {certifications!.certified_services.length} service{certifications!.certified_services.length !== 1 ? 's' : ''} certified
                  </Text>
                  <Text style={styles.trainingBannerSub}>
                    Complete more exams to unlock additional services · Tap to continue
                  </Text>
                </View>
                <Text style={styles.trainingBannerArrow}>›</Text>
              </TouchableOpacity>
            )}

            {/* Insignia del conductor + nivel de comisión */}
            {driver && (() => {
              const { getDriverBadge } = require('../../src/utils/driverBadge');
              const badge      = getDriverBadge(driver.total_rides ?? 0, Number(driver.rating_avg) || 5);
              const commission = (driver as any).commission;
              const tierColors: Record<string, string> = {
                standard: '#94A3B8',
                silver:   '#0EA5E9',
                elite:    '#22C55E',
              };
              const tierLabels: Record<string, string> = {
                standard: '15% commission',
                silver:   '14% commission',
                elite:    '13% commission',
              };
              return (
                <>
                  <View style={[styles.badgeRow, { backgroundColor: badge.color + '18' }]}>
                    <Text style={{ fontSize: 20 }}>{badge.emoji}</Text>
                    <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                    <Text style={styles.badgeHint}> · {driver.total_rides ?? 0} trips</Text>
                  </View>
                  {commission && (
                    <View style={[styles.commissionCard, { borderLeftColor: tierColors[commission.tier] ?? '#94A3B8' }]}>
                      <View style={styles.commissionRow}>
                        <Text style={styles.commissionLabel}>Your commission rate</Text>
                        <Text style={[styles.commissionRate, { color: tierColors[commission.tier] }]}>
                          {tierLabels[commission.tier]}
                        </Text>
                      </View>
                      {commission.nextTierRides !== null && commission.ratingAvg >= 4.75 ? (
                        <Text style={styles.commissionHint}>
                          {commission.nextTierRides} more rides this year → {Math.round(commission.nextTierRate * 100)}%
                        </Text>
                      ) : commission.ratingAvg < 4.75 ? (
                        <Text style={[styles.commissionHint, { color: '#EF4444' }]}>
                          ⚠️ Rating below 4.75 — maintain rating to unlock lower rates
                        </Text>
                      ) : (
                        <Text style={styles.commissionHint}>
                          🏆 Elite rate — best commission! Resets January 1st.
                        </Text>
                      )}
                      <Text style={styles.commissionProgress}>
                        {commission.ridesThisYear} rides this year
                      </Text>
                    </View>
                  )}
                </>
              );
            })()}

            {/* Estadísticas */}
            {/* Document expiry alerts */}
            {docAlerts.map(alert => (
              <View
                key={alert.document_type}
                style={[styles.docAlertBanner, alert.is_expired ? styles.docAlertExpired : styles.docAlertUrgent]}
              >
                <Text style={styles.docAlertText}>
                  {alert.is_expired ? '🚫' : '⚠️'}{' '}
                  {alert.document_type === 'license' ? "Driver's license" : 'Insurance'}{' '}
                  {alert.is_expired ? 'EXPIRED' : `expires in ${alert.days_left} day${alert.days_left !== 1 ? 's' : ''}`}
                  {' — '}
                  <Text style={{ textDecorationLine: 'underline' }}
                    onPress={() => router.push('/(driver)/stats')}>
                    View details
                  </Text>
                </Text>
              </View>
            ))}

            <View style={styles.statsRow}>
              <StatCard label="Rides" value={String(driver?.total_rides ?? 0)} />
              <StatCard label="This month" value={String(driver?.rides_this_month ?? 0)} />
              <StatCard label="Rating" value={`${(Number(driver?.rating_avg) || 5).toFixed(1)} ⭐`} />
            </View>

            {/* Botón toggle — grande para accesibilidad */}
            <TouchableOpacity
              style={[
                styles.onlineToggle,
                isOnline ? styles.onlineToggleActive : styles.onlineToggleInactive,
              ]}
              onPress={handleToggleOnline}
              disabled={isTogglingOnline}
              accessibilityRole="switch"
              accessibilityState={{ checked: isOnline }}
              accessibilityLabel={isOnline ? 'Go offline' : 'Go online to receive rides'}
            >
              {isTogglingOnline ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.onlineToggleEmoji}>{isOnline ? '🟢' : '⚫'}</Text>
                  <Text style={styles.onlineToggleText}>
                    {isOnline ? 'Online — Tap to go offline' : 'Tap to go online'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {isOnline && (
              <Text style={styles.onlineHint}>
                You are visible to nearby passengers. Wait for a request.
              </Text>
            )}
          </View>
        )}

        {/* Viaje activo — panel de acciones */}
        {activeRide && (
          <View style={styles.activeRidePanel}>

            {/* ── Botón de colapsar/expandir ── */}
            <TouchableOpacity
              style={styles.panelToggleRow}
              onPress={() => setPanelExpanded(e => !e)}
              activeOpacity={0.7}
            >
              <View style={styles.panelHandle} />
              <View style={styles.panelToggleBtn}>
                <Text style={styles.panelToggleArrow}>{panelExpanded ? '▼' : '▲'}</Text>
                <Text style={styles.panelToggleLabel}>{panelExpanded ? 'Hide' : 'Show'}</Text>
              </View>
            </TouchableOpacity>

            {/* ── Contenido expandible ── */}
            {panelExpanded && (
              <>
                {/* Info del pasajero */}
                {assignedPassenger && (
                  <View style={styles.passengerRow}>
                    <UserAvatar
                      name={assignedPassenger.name}
                      photoUrl={assignedPassenger.photo_url}
                      size={44}
                    />
                    <View style={styles.passengerInfo}>
                      <Text style={styles.passengerName}>{assignedPassenger.name}</Text>
                      <Text style={styles.passengerLabel}>Passenger</Text>
                    </View>
                    {assignedPassenger.patient_phone && (
                      <TouchableOpacity
                        style={styles.callPatientBtn}
                        onPress={() => Linking.openURL(`tel:${assignedPassenger.patient_phone}`)}
                      >
                        <Text style={styles.callPatientIcon}>📞</Text>
                        <Text style={styles.callPatientText}>Call</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Dirección de recogida / destino */}
                <View style={styles.rideAddresses}>
                  <View style={styles.rideAddressRow}>
                    <View style={[styles.addrDot, { backgroundColor: BRAND_COLORS.ACCENT }]} />
                    <View style={styles.addrInfo}>
                      <Text style={styles.addrLabel}>Pickup</Text>
                      <Text style={styles.addrText} numberOfLines={1}>
                        {activeRide.pickup_address}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.rideAddressRow}>
                    <View style={[styles.addrDot, { backgroundColor: BRAND_COLORS.ALERT }]} />
                    <View style={styles.addrInfo}>
                      <Text style={styles.addrLabel}>Destination</Text>
                      <Text style={styles.addrText} numberOfLines={1}>
                        {activeRide.dropoff_address}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* ── Acción principal según la fase (siempre visible) ── */}
            {activePhase === 'picking_up' && (
              <TouchableOpacity
                style={[styles.rideActionButton, { backgroundColor: BRAND_COLORS.PRIMARY }]}
                onPress={handleMarkArrived}
                disabled={isActionLoading}
              >
                {isActionLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.rideActionText}>📍 I arrived at the pickup point</Text>
                }
              </TouchableOpacity>
            )}

            {activePhase === 'arrived' && (
              <TouchableOpacity
                style={[styles.rideActionButton, { backgroundColor: '#7B2FBE' }]}
                onPress={handleStartRide}
                disabled={isActionLoading}
              >
                {isActionLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.rideActionText}>🚀 Start ride</Text>
                }
              </TouchableOpacity>
            )}

            {activePhase === 'in_progress' && (activeRide as any)?.service_type !== 'wait_and_return' && (
              <TouchableOpacity
                style={[styles.rideActionButton, { backgroundColor: BRAND_COLORS.ACCENT }]}
                onPress={handleCompleteRide}
                disabled={isActionLoading}
              >
                {isActionLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.rideActionText}>✅ Complete ride</Text>
                }
              </TouchableOpacity>
            )}

            {/* ── Wait & Return: controles de espera ── */}
            {activePhase === 'in_progress' && (activeRide as any)?.service_type === 'wait_and_return' && !waitStartedAt && (
              <TouchableOpacity
                style={[styles.rideActionButton, { backgroundColor: '#0EA5E9' }]}
                onPress={handleStartWait}
                disabled={isActionLoading}
              >
                {isActionLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.rideActionText}>⏳ Arrived — Start Waiting</Text>
                }
              </TouchableOpacity>
            )}

            {activePhase === 'in_progress' && (activeRide as any)?.service_type === 'wait_and_return' && waitStartedAt && (
              <View style={styles.waitTimerBox}>
                <Text style={styles.waitTimerLabel}>⏱ Waiting at appointment</Text>
                <Text style={styles.waitTimerValue}>
                  {String(Math.floor(waitElapsedSec / 60)).padStart(2, '0')}:{String(waitElapsedSec % 60).padStart(2, '0')}
                </Text>
                <Text style={styles.waitFareAccrued}>+${waitFareAccrued.toFixed(2)}</Text>
                <TouchableOpacity
                  style={[styles.rideActionButton, { backgroundColor: '#7B2FBE', marginTop: 10 }]}
                  onPress={handleEndWait}
                  disabled={isActionLoading}
                >
                  <Text style={styles.rideActionText}>🚗 Passenger is back — Start Return</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Wait & Return — Complete después del regreso */}
            {activePhase === 'in_progress' && (activeRide as any)?.service_type === 'wait_and_return' && !waitStartedAt && (activeRide as any)?.wait_ended_at && (
              <TouchableOpacity
                style={[styles.rideActionButton, { backgroundColor: BRAND_COLORS.ACCENT }]}
                onPress={handleCompleteRide}
                disabled={isActionLoading}
              >
                {isActionLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.rideActionText}>✅ Complete ride</Text>
                }
              </TouchableOpacity>
            )}

            {/* ── Navegación + velocidad (siempre visible en in_progress) ── */}
            {activePhase === 'in_progress' && activeRide && (
              <View style={styles.navSpeedRow}>
                <NavigationButton
                  lat={(activeRide as any).dropoff_lat}
                  lng={(activeRide as any).dropoff_lng}
                  address={activeRide.dropoff_address}
                  label="Navigate"
                />
                {speedMph > 0 && (
                  <View style={[styles.speedBadge, isOverLimit && styles.speedBadgeAlert]}>
                    <Text style={[styles.speedValue, isOverLimit && { color: '#fff' }]}>{speedMph}</Text>
                    <Text style={[styles.speedUnit, isOverLimit && { color: 'rgba(255,255,255,0.8)' }]}>mph</Text>
                  </View>
                )}
              </View>
            )}

            {/* ── Cancelar y SOS (visibles al expandir) ── */}
            {panelExpanded && (
              <View style={styles.rideBottomRow}>
                <TouchableOpacity
                  style={styles.cancelRideBtn}
                  onPress={() => Alert.alert(
                    'Cancel ride',
                    'Are you sure you want to cancel this ride?',
                    [
                      { text: 'No', style: 'cancel' },
                      {
                        text: 'Yes, cancel',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            if (activeRide) await rideMobileService.cancelRide(activeRide.id, 'Cancelled by driver');
                            setActiveRide(null);
                            setActivePhase(null);
                          } catch {
                            Alert.alert('Error', 'Could not cancel the ride. Try again.');
                          }
                        },
                      },
                    ]
                  )}
                >
                  <Text style={styles.cancelRideBtnText}>✕ Cancel ride</Text>
                </TouchableOpacity>

                <SOSButton
                  rideId={activeRide?.id}
                  lat={driverPos?.latitude}
                  lng={driverPos?.longitude}
                />

                <TouchableOpacity style={styles.chatBtn} onPress={() => setChatOpen(true)}>
                  <Text style={styles.chatBtnText}>💬 Chat</Text>
                  {chatMessages.filter(m => !m.fromMe).length > 0 && (
                    <View style={styles.chatBadge}>
                      <Text style={styles.chatBadgeText}>{chatMessages.filter(m => !m.fromMe).length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ══ MODAL DE CHAT CON PASAJERO ══ */}
      <Modal visible={chatOpen} animationType="slide" transparent onRequestClose={() => setChatOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.chatOverlay}>
            <View style={styles.chatSheet}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatTitle}>Chat with passenger</Text>
                <TouchableOpacity onPress={() => setChatOpen(false)}>
                  <Text style={styles.chatClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                ref={chatListRef}
                data={chatMessages}
                keyExtractor={(_, i) => String(i)}
                style={styles.chatMessages}
                contentContainerStyle={{ padding: 12, gap: 8 }}
                ListEmptyComponent={<Text style={styles.chatEmpty}>No messages yet.</Text>}
                renderItem={({ item }) => (
                  <View style={[styles.bubble, item.fromMe ? styles.bubbleMe : styles.bubbleThem]}>
                    <Text style={[styles.bubbleText, item.fromMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
                      {item.text}
                    </Text>
                    <Text style={styles.bubbleTime}>{item.time}</Text>
                  </View>
                )}
              />
              <View style={styles.chatInputRow}>
                <TextInput
                  style={styles.chatInput}
                  value={chatMessage}
                  onChangeText={setChatMessage}
                  placeholder="Type a message..."
                  placeholderTextColor="#aaa"
                  autoCapitalize="none"
                  returnKeyType="send"
                  onSubmitEditing={() => sendDriverMessage(chatMessage)}
                />
                <TouchableOpacity
                  style={[styles.chatSendBtn, !chatMessage.trim() && styles.chatSendDisabled]}
                  onPress={() => sendDriverMessage(chatMessage)}
                  disabled={!chatMessage.trim()}
                >
                  <Text style={styles.chatSendText}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══ MENÚ DEL CONDUCTOR ══ */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuSheet}>
            {/* Avatar tappable para cambiar foto */}
            <TouchableOpacity
              style={styles.menuAvatarRow}
              onPress={async () => { await pickAndUpload(); }}
              disabled={uploadingPhoto}
            >
              <UserAvatar name={user?.name} photoUrl={user?.photo_url} size={64} />
              <View style={styles.menuAvatarInfo}>
                <Text style={styles.menuAvatarName}>{user?.name ?? 'Driver'}</Text>
                <Text style={styles.menuAvatarHint}>
                  {uploadingPhoto ? 'Uploading...' : 'Tap to change photo'}
                </Text>
              </View>
            </TouchableOpacity>
            {[
              { icon: '🗂️', label: 'Service history', route: '/(driver)/service-history' as const },
              { icon: '💰', label: 'Earnings',         route: '/(driver)/earnings'        as const },
              { icon: '📊', label: 'My Stats',          route: '/(driver)/stats'           as const },
              { icon: '🧾', label: 'Tax Report (1099)', route: '/(driver)/tax-report'      as const },
              { icon: '🎁', label: 'Referrals',        route: '/(driver)/referrals'       as const },
              { icon: '📚', label: 'Training',          route: '/(driver)/training'        as const },
            ].map(item => (
              <TouchableOpacity
                key={item.label}
                style={styles.menuItem}
                onPress={() => { setMenuVisible(false); router.push(item.route); }}
              >
                <Text style={styles.menuItemIcon}>{item.icon}</Text>
                <Text style={styles.menuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={{ height: 8 }} />
            {[
              { icon: 'ℹ️', label: 'About Us',       route: '/(info)/about'   as const },
              { icon: '🔒', label: 'Privacy Policy', route: '/(info)/privacy' as const },
              { icon: '📋', label: 'Legal Notice',   route: '/(info)/legal'   as const },
              { icon: '✉️', label: 'Contact Us',     route: '/(info)/contact' as const },
            ].map(item => (
              <TouchableOpacity
                key={item.label}
                style={styles.menuItem}
                onPress={() => { setMenuVisible(false); router.push(item.route); }}
              >
                <Text style={styles.menuItemIcon}>{item.icon}</Text>
                <Text style={styles.menuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={{ height: 8 }} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); void handleLogout(); }}>
              <Text style={styles.menuItemIcon}>🚪</Text>
              <Text style={[styles.menuItemText, { color: BRAND_COLORS.ALERT }]}>Log out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCloseBtn} onPress={() => setMenuVisible(false)}>
              <Text style={styles.menuCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

// ─────────────────────────────────────
// Componentes helpers
// ─────────────────────────────────────
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileRow}>
      <Text style={styles.profileLabel}>{label}</Text>
      <Text style={styles.profileValue}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────
// Estilos
// ─────────────────────────────────────
const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  map:       { ...StyleSheet.absoluteFillObject },

  // ── Controles de zoom ──
  zoomControls: {
    position: 'absolute',
    right: 12,
    top: 140,
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
    color: BRAND_COLORS.TEXT,
    lineHeight: 26,
  },
  zoomBtnIcon: { fontSize: 18 },
  zoomBtnActive: { backgroundColor: '#1E293B' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 17, color: '#888', fontFamily: 'Inter_400Regular' },

  // ── Header flotante ──
  headerSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    gap: 10,
  },
  headerLeft:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerName:   { fontSize: 16, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  logo: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  logoText: { fontSize: 18, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },
  onlineBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot:       { width: 7, height: 7, borderRadius: 4 },
  onlineBadgeText: { fontSize: 12, color: '#888', fontFamily: 'Inter_400Regular' },
  earningsChip: {
    backgroundColor: BRAND_COLORS.ACCENT + '15',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  earningsLabel:  { fontSize: 11, color: '#888', fontFamily: 'Inter_400Regular' },
  earningsAmount: { fontSize: 15, fontWeight: '700', color: BRAND_COLORS.ACCENT, fontFamily: 'Inter_700Bold' },
  logoutBtn: { padding: 6 },
  logoutIcon: { fontSize: 18, color: '#aaa' },

  // ── Marcadores del mapa ──
  driverMarker: {
    fontSize: 30,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  pickupMarker: { alignItems: 'center' },

  // ── Panel inferior ──
  bottomPanel: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },

  // ── Idle panel (sin viaje) ──
  idlePanel: { padding: 20 },
  statsRow:  { flexDirection: 'row', gap: 10, marginBottom: 20 },
  badgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, marginBottom: 8,
  },
  badgeText: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  badgeHint: { fontSize: 13, color: '#888', fontFamily: 'Inter_400Regular' },
  commissionCard: {
    backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14,
    marginBottom: 14, borderLeftWidth: 4,
  },
  commissionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  commissionLabel: { fontSize: 13, color: '#888', fontFamily: 'Inter_400Regular' },
  commissionRate: { fontSize: 15, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  commissionHint: { fontSize: 13, color: '#666', fontFamily: 'Inter_400Regular', marginBottom: 2 },
  commissionProgress: { fontSize: 12, color: '#aaa', fontFamily: 'Inter_400Regular' },
  statCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  statValue: { fontSize: 18, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 3, fontFamily: 'Inter_400Regular' },

  onlineToggle: {
    height: 64,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  onlineToggleActive:   { backgroundColor: BRAND_COLORS.ACCENT },
  onlineToggleInactive: { backgroundColor: '#555' },
  onlineToggleEmoji: { fontSize: 22 },
  onlineToggleText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  onlineHint: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },

  trainingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF9E6', borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#F59E0B40',
  },
  trainingBannerEmoji: { fontSize: 22 },
  trainingBannerTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 1 },
  trainingBannerSub: { fontSize: 12, color: '#B45309' },
  trainingBannerArrow: { fontSize: 20, color: '#F59E0B', fontWeight: '700' },

  // ── Active ride panel ──
  activeRidePanel: { padding: 20 },
  passengerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F8F9FA', borderRadius: 12, padding: 14,
    marginBottom: 12,
  },
  passengerInfo: { flex: 1 },
  passengerName: { fontSize: 16, fontWeight: '600', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },
  passengerLabel: { fontSize: 12, color: '#888', marginTop: 2, fontFamily: 'Inter_400Regular' },
  callPatientBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E8F5E9', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, gap: 2,
  },
  callPatientIcon: { fontSize: 18 },
  callPatientText: { fontSize: 11, color: '#2E7D32', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  rideAddresses:  { marginBottom: 16, gap: 12 },
  rideAddressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  addrDot:  { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  addrInfo: { flex: 1 },
  addrLabel:  { fontSize: 12, color: '#888', fontFamily: 'Inter_400Regular' },
  addrText:   { fontSize: 15, color: BRAND_COLORS.TEXT, fontFamily: 'Inter_500Medium', marginTop: 2 },
  rideActionButton: {
    height: 60,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  rideActionText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  rideBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  cancelRideBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: BRAND_COLORS.ALERT,
    alignItems: 'center',
  },
  cancelRideBtnText: {
    color: BRAND_COLORS.ALERT,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  // Chat
  chatBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND_COLORS.PRIMARY, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  chatBtnText: { color: '#fff', fontWeight: '600', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  chatBadge: { backgroundColor: BRAND_COLORS.ALERT, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  chatBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  chatOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  chatSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  chatTitle: { fontSize: 18, fontWeight: '600', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },
  chatClose: { fontSize: 20, color: '#888', padding: 4 },
  chatMessages: { maxHeight: 220 },
  chatEmpty: { textAlign: 'center', color: '#aaa', fontSize: 15, marginTop: 20, fontFamily: 'Inter_400Regular' },
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 16, marginVertical: 2 },
  bubbleMe: { backgroundColor: BRAND_COLORS.PRIMARY, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#F0F0F0', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  bubbleTextMe: { color: '#fff' },
  bubbleTextThem: { color: BRAND_COLORS.TEXT },
  bubbleTime: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2, textAlign: 'right', fontFamily: 'Inter_400Regular' },
  chatInputRow: { flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  chatInput: { flex: 1, height: 44, backgroundColor: '#F8F9FA', borderRadius: 22, paddingHorizontal: 16, fontSize: 16, color: BRAND_COLORS.TEXT, fontFamily: 'Inter_400Regular' },
  chatSendBtn: { height: 44, paddingHorizontal: 20, backgroundColor: BRAND_COLORS.PRIMARY, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  chatSendDisabled: { opacity: 0.4 },
  chatSendText: { color: '#fff', fontWeight: '600', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  // Document expiry banners
  docAlertBanner:  { borderRadius: 10, padding: 10, marginBottom: 6 },
  docAlertExpired: { backgroundColor: '#FEE2E2' },
  docAlertUrgent:  { backgroundColor: '#FFF7ED' },
  docAlertText:    { fontSize: 13, color: '#1E293B', fontWeight: '500' },

  // Panel toggle
  panelToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, marginBottom: 4,
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  panelHandle: {
    width: 40, height: 5, borderRadius: 3, backgroundColor: '#9CA3AF',
  },
  panelToggleBtn: {
    position: 'absolute', right: 12,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1F2937', borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 5,
    gap: 4,
  },
  panelToggleArrow: {
    fontSize: 13, color: '#FFFFFF', fontWeight: '700',
  },
  panelToggleLabel: {
    fontSize: 13, color: '#FFFFFF', fontWeight: '600',
  },

  // Arrival banner
  arrivalBanner: {
    position: 'absolute',
    top: 100,
    left: 20, right: 20,
    backgroundColor: BRAND_COLORS.ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    zIndex: 99,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  arrivalBannerText: {
    color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold',
  },

  // Wait & Return timer
  waitTimerBox: {
    backgroundColor: '#EFF6FF', borderRadius: 14, padding: 16,
    alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#BFDBFE',
  },
  waitTimerLabel: { fontSize: 13, color: '#1D4ED8', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  waitTimerValue: { fontSize: 42, fontWeight: '800', color: '#1E40AF', fontFamily: 'Inter_700Bold', marginTop: 4 },
  waitFareAccrued: { fontSize: 20, color: '#0EA5E9', fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 2 },

  // Navigation + speed row
  navSpeedRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  speedBadge:      { backgroundColor: '#1E293B', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 60 },
  speedBadgeAlert: { backgroundColor: '#DC2626' },
  speedValue:      { fontSize: 20, fontWeight: '800', color: '#fff' },
  speedUnit:       { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  sosMiniBtn: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BRAND_COLORS.ALERT,
  },
  sosMiniText: { fontSize: 14, color: BRAND_COLORS.ALERT, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  // ── Menú del conductor ──
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  menuSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    paddingHorizontal: 20,
  },
  menuTitle: { fontSize: 16, fontWeight: '700', color: '#888', fontFamily: 'Inter_700Bold', marginBottom: 16, textAlign: 'center' },
  menuAvatarRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingBottom: 16, marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  menuAvatarInfo: { flex: 1 },
  menuAvatarName: { fontSize: 17, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  menuAvatarHint: { fontSize: 13, color: '#888', marginTop: 2, fontFamily: 'Inter_400Regular' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  menuItemIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  menuItemText: { fontSize: 17, color: BRAND_COLORS.TEXT, fontFamily: 'Inter_500Medium' },
  menuCloseBtn: { marginTop: 12, height: 52, borderRadius: 14, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  menuCloseBtnText: { fontSize: 16, fontWeight: '600', color: '#555', fontFamily: 'Inter_600SemiBold' },

  // ── Vista inactiva (pending, under_review, etc.) ──
  inactiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 10,
  },
  inactiveHeaderTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_700Bold',
  },
  logoutText: { fontSize: 15, color: '#888', fontFamily: 'Inter_400Regular' },
  inactiveScroll: { padding: 20, paddingBottom: 48 },

  statusCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  statusEmoji: { fontSize: 48, marginBottom: 12 },
  statusTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8, fontFamily: 'Inter_700Bold' },
  statusDesc:  { fontSize: 16, color: '#555', textAlign: 'center', lineHeight: 24, fontFamily: 'Inter_400Regular' },
  reasonBox: {
    marginTop: 16,
    backgroundColor: 'rgba(234,67,53,0.08)',
    borderRadius: 10,
    padding: 14,
    width: '100%',
  },
  reasonLabel: { fontSize: 13, fontWeight: '600', color: BRAND_COLORS.ALERT, marginBottom: 4, fontFamily: 'Inter_600SemiBold' },
  reasonText:  { fontSize: 15, color: '#444', lineHeight: 22, fontFamily: 'Inter_400Regular' },

  actionButton: {
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionButtonText: { color: '#fff', fontSize: 17, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  profileCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  profileCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileLabel: { fontSize: 15, color: '#888', fontFamily: 'Inter_400Regular' },
  profileValue: {
    fontSize: 15,
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_500Medium',
    maxWidth: '60%',
    textAlign: 'right',
  },

  // ══ MODAL SOLICITUD DE VIAJE ══
  requestModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  requestContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },

  // Countdown
  countdownContainer: { alignItems: 'center', paddingTop: 16, marginBottom: 8 },
  countdownCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  countdownNumber: {
    fontSize: 44,
    fontWeight: '700',
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_700Bold',
    lineHeight: 48,
  },
  countdownSec: { fontSize: 14, color: '#888', fontFamily: 'Inter_400Regular' },
  countdownLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_700Bold',
  },

  // Detalles del viaje
  requestDetails: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
    gap: 16,
  },
  requestDetailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  requestDetailIcon: { fontSize: 22, marginTop: 2 },
  requestDetailInfo: { flex: 1 },
  requestDetailLabel: { fontSize: 13, color: '#888', fontFamily: 'Inter_400Regular' },
  requestDetailValue: {
    fontSize: 16,
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_500Medium',
    marginTop: 4,
    lineHeight: 22,
  },
  requestMetaRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  requestMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  requestMetaEmoji: { fontSize: 16 },
  requestMetaText: { fontSize: 14, color: '#555', fontFamily: 'Inter_400Regular' },

  specialNeedsBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F59E0B40',
    gap: 4,
  },
  specialNeedsTitle: {
    fontSize: 13, fontWeight: '700', color: '#B45309', fontFamily: 'Inter_700Bold', marginBottom: 4,
  },
  specialNeedsItem: {
    fontSize: 14, color: '#78350F', fontFamily: 'Inter_500Medium',
  },

  fareRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  fareBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  fareBoxAccent: {
    backgroundColor: BRAND_COLORS.ACCENT + '12',
    borderColor: BRAND_COLORS.ACCENT + '40',
  },
  fareLabel: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
  fareTotal: {
    fontSize: 22,
    fontWeight: '700',
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_700Bold',
  },
  fareEarnings: {
    fontSize: 22,
    fontWeight: '700',
    color: BRAND_COLORS.ACCENT,
    fontFamily: 'Inter_700Bold',
  },

  // Botones aceptar/rechazar
  requestActions: { flexDirection: 'row', gap: 12 },
  rejectButton: {
    flex: 1,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  rejectButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
    fontFamily: 'Inter_600SemiBold',
  },
  acceptButton: {
    flex: 2,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.ACCENT,
    shadowColor: BRAND_COLORS.ACCENT,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  acceptButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },

  // ── Navegación turn-by-turn banner ──
  navTurnBanner: {
    position: 'absolute',
    top: 100,
    left: 12, right: 12,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    zIndex: 90,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  navTurnArrowBox: {
    alignItems: 'center',
    minWidth: 44,
  },
  navTurnArrow: {
    fontSize: 28,
    color: '#FACC15',
  },
  navTurnDist: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  navTurnInstruction: {
    flex: 1,
    fontSize: 14,
    color: '#F1F5F9',
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 20,
  },
  navTurnEtaBox: {
    alignItems: 'center',
    minWidth: 48,
  },
  navTurnEtaVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FACC15',
    fontFamily: 'Inter_700Bold',
  },
  navTurnEtaDist: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
});
