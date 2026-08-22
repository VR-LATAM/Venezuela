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
  Modal, Animated, Platform, StatusBar,
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
import { InfoModal, InfoPage } from '../../src/components/common/InfoModal';
import { NavigationButton } from '../../src/components/common/NavigationButton';
import { useSpeedMonitor } from '../../src/hooks/useSpeedMonitor';
import { useMapZoom } from '../../src/hooks/useMapZoom';

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

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
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
    emoji: '📋', title: 'Completa tu registro',
    description: 'Sube tus documentos y envía tu solicitud para revisión.',
    color: '#F59E0B', bgColor: '#FFFBEB',
  },
  under_review: {
    emoji: '🔍', title: 'En revisión',
    description: 'Estamos revisando tu solicitud. Te notificaremos en 24-48 horas.',
    color: BRAND_COLORS.PRIMARY, bgColor: '#EFF6FF',
  },
  active: {
    emoji: '✅', title: 'Cuenta activa',
    description: 'Puedes conectarte y recibir solicitudes de viaje.',
    color: BRAND_COLORS.ACCENT, bgColor: '#F0FFF4',
  },
  inactive: {
    emoji: '⏸️', title: 'Cuenta inactiva',
    description: 'Contacta a soporte para reactivar tu cuenta.',
    color: '#888', bgColor: '#F5F5F5',
  },
  suspended: {
    emoji: '🚫', title: 'Cuenta suspendida',
    description: 'Tu cuenta ha sido suspendida. Contacta a soporte.',
    color: BRAND_COLORS.ALERT, bgColor: '#FFF5F5',
  },
  rejected: {
    emoji: '❌', title: 'Solicitud no aprobada',
    description: 'Revisa el motivo, corrige tus documentos y reenvía.',
    color: BRAND_COLORS.ALERT, bgColor: '#FFF5F5',
  },
};

// Estado del viaje activo del conductor
type ActiveRidePhase = 'picking_up' | 'arrived' | 'in_progress';

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
  const [infoExpanded, setInfoExpanded]         = useState(false);
  const [menuSubPage, setMenuSubPage]           = useState<InfoPage | null>(null);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [savingVehicleType, setSavingVehicleType]     = useState(false);
  const [panelExpanded, setPanelExpanded]       = useState(true);
  const [arrivalBanner, setArrivalBanner]       = useState(false);
  const hasNotifiedArrival                      = useRef(false);
  const hasNotifiedPickupArrival                = useRef(false);
  const [docAlerts, setDocAlerts]               = useState<Array<{ document_type: string; days_left: number; is_expired: boolean; urgent: boolean }>>([]);
  const { pickAndUpload, uploading: uploadingPhoto } = usePhotoUpload();

  // Banner de recordatorio de pago de membresía
  const [showPaymentBanner,  setShowPaymentBanner]  = useState(false);
  const [showDeadlineBanner, setShowDeadlineBanner] = useState(false);

  useEffect(() => {
    function checkPaymentWindow() {
      const nowVE = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Caracas' }));
      const day   = nowVE.getDay();
      const hour  = nowVE.getHours();
      const inWindow      = (day === 4 && hour >= 12) || (day === 5 && hour < 14);
      const deadlinePassed = day === 5 && hour >= 14;
      setShowPaymentBanner(inWindow);
      setShowDeadlineBanner(deadlinePassed);
    }
    checkPaymentWindow();
    const timer = setInterval(checkPaymentWindow, 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // Chat con el pasajero
  const [chatOpen, setChatOpen]       = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<{ text: string; fromMe: boolean; time: string }[]>([]);
  const chatListRef = useRef<FlatList>(null);

  // Mensaje de agradecimiento del pasajero (post-viaje)
  const [thankyouMsg, setThankyouMsg] = useState<string | null>(null);

  // Speed monitoring — activo solo cuando el viaje está en progreso
  const { speedKmh, isOverLimit } = useSpeedMonitor(activePhase === 'in_progress');


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
    const dist = haversineDistanceKm(driverPos.latitude, driverPos.longitude, pickupLat, pickupLng);
    if (dist < 0.006) {
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
    const dist = haversineDistanceKm(driverPos.latitude, driverPos.longitude, destLat, destLng);
    if (dist < 0.006) {
      hasNotifiedArrival.current = true;
      setArrivalBanner(true);
      void nokiaToneService.play();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 400);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 800);
      setTimeout(() => setArrivalBanner(false), 5000);
    }
  }, [driverPos, activePhase]);

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
      const locationPromise = Location.requestForegroundPermissionsAsync().then(async ({ status }) => {
        if (status !== 'granted') return null;
        try {
          const last = await Location.getLastKnownPositionAsync({});
          if (last) return last;
          return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        } catch { return null; }
      });

      const [profile, alerts, loc] = await Promise.all([
        driverMobileService.getProfile(),
        driverMobileService.getDocumentExpiry().catch(() => []),
        locationPromise,
      ]);
      if (loc) setDriverPos({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setDriver(profile);
      setDocAlerts(alerts.filter(a => a.is_expired || a.urgent));

      // Si no tiene tipo de vehículo configurado, abrir selector automáticamente
      const validTypes = ['motorcycle', 'sedan', 'suv', 'pickup', 'plataforma'];
      const hasVehicleType = (profile.services ?? []).some(s => validTypes.includes(s));
      if (!hasVehicleType && profile.status !== 'active') {
        setTimeout(() => setVehicleModalVisible(true), 800);
      }

      // Si tiene viaje activo en la BD, restaurar estado y reiniciar GPS
      if (profile.status === 'active') {
        const active = await rideMobileService.getActiveRide();
        if (active) {
          setActiveRide(active);
          const rideAny = active as any;
          if (rideAny.passenger_name) {
            setAssignedPassenger({
              id:        rideAny.passenger_id ?? '',
              name:      rideAny.passenger_operative_code ?? rideAny.passenger_name,
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
    } catch (err: any) {
      console.error('[loadProfile] ERROR:', err?.response?.data ?? err?.message ?? err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const initSocket = async () => {
    await socketService.connect();

    // El pasajero canceló antes de que el conductor llegara
    socketService.on('driver:ride_cancelled', (data: any) => {
      const { incomingRequest: req, activeRide: ar } = useRideStore.getState();
      const isRelevant = !data?.rideId || req?.rideId === data.rideId || ar?.id === data.rideId;
      setIncomingRequest(null);
      setActiveRide(null);
      setActivePhase(null);
      setAssignedPassenger(null);
      if (isRelevant) Alert.alert('Viaje cancelado', 'El pasajero canceló el viaje.');
    });

    // El viaje fue tomado por otro conductor
    socketService.on('driver:ride_already_taken', () => {
      Alert.alert('', 'Este viaje ya fue tomado por otro conductor.');
    });

    // Info del pasajero al aceptar el viaje
    socketService.on('driver:passenger_assigned', (data: unknown) => {
      const d = data as { passenger: { id: string; name: string; operative_code?: string; photo_url?: string; patient_phone?: string | null } };
      if (d?.passenger) setAssignedPassenger({
        ...d.passenger,
        name: d.passenger.operative_code ?? d.passenger.name,
      });
    });

    // Mensajes del pasajero durante el viaje
    socketService.on('driver:passenger_message', (data: unknown) => {
      const d = data as { message: string };
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatMessages(prev => [...prev, { text: d.message, fromMe: false, time }]);
      setChatOpen(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });

    // Mensaje de agradecimiento del pasajero (post-calificación)
    socketService.on('driver:passenger_thankyou', (data: unknown) => {
      const d = data as { messages: string };
      if (d?.messages) {
        setThankyouMsg(d.messages);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    });
  };

  // ─────────────────────────────────────
  // GPS — enviar posición cada 4 segundos cuando está online
  // ─────────────────────────────────────
  const startGPS = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso de ubicación', 'Necesitamos tu ubicación para mostrarte en el mapa.');
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
            notificationTitle: 'VERONA Ride',
            notificationBody:  'Compartiendo tu ubicación con pasajeros.',
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
      if (haversineDistanceKm(lat, lng, endLat, endLng) < 0.05) {
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
    setNavTotalDist(`${result.distance.toFixed(1)} km`);
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
      Alert.alert('', 'No puedes desconectarte durante un viaje activo.');
      return;
    }

    const newOnline = !isOnline;

    console.log('[TOGGLE] Going online=', newOnline,
      '| certs:', certifications === null ? 'loading...' : `${certifications?.certified_services?.length ?? 0} services`,
      '| driver.status:', driver?.status);

    // Verificar membresía activa antes de ir online
    if (newOnline) {
      try {
        const { data: memRes } = await import('../../src/services/apiClient').then(m =>
          m.apiClient.get<{ success: boolean; data: { status: string } }>('/membership/status')
        );
        const memStatus = memRes.data.status;
        if (memStatus !== 'active') {
          Alert.alert(
            'Membresía requerida',
            memStatus === 'pending_approval'
              ? 'Tu comprobante de pago está siendo revisado. Espera la aprobación del administrador.'
              : 'Debes renovar tu membresía semanal para poder recibir viajes.',
            [
              { text: 'Ver membresía', onPress: () => router.push('/(driver)/membership') },
              { text: 'Cerrar', style: 'cancel' },
            ]
          );
          return;
        }
      } catch {
        /* Si falla la consulta, dejar pasar y que el backend valide */
      }
    }

    // Verificar que tenga al menos un servicio certificado antes de ir online.
    // Si certifications === null, aún están cargando — dejar pasar y dejar que el backend valide.
    if (newOnline && certifications !== null) {
      const certifiedServices = certifications.certified_services ?? [];
      if (certifiedServices.length === 0) {
        Alert.alert(
          'Certificación requerida',
          'Debes aprobar al menos un examen de certificación de servicio antes de conectarte.',
          [
            { text: 'Ir a Certificaciones', onPress: () => router.push('/(driver)/training') },
            { text: 'Después', style: 'cancel' },
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
          'Capacitación requerida',
          'Debes completar todos los módulos de capacitación antes de conectarte.',
          [
            { text: 'Ir a Capacitación', onPress: () => router.push('/(driver)/training') },
            { text: 'Después', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('', 'No se pudo cambiar tu estado. Verifica tu conexión.');
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
    //     const distMiles = haversineDistanceKm(driverPos.latitude, driverPos.longitude, pickupLat, pickupLng);
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
      Alert.alert('', 'No se pudo marcar la llegada. Intenta de nuevo.');
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
      Alert.alert('', 'No se pudo iniciar el viaje. Intenta de nuevo.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCompleteRide = () => {
    Alert.alert(
      'Finalizar viaje',
      '¿Confirmas que el pasajero llegó a su destino?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, finalizar',
          onPress: async () => {
            if (!activeRide) return;
            setIsActionLoading(true);
            try {
              const completed = await rideMobileService.completeRide(activeRide.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              const earnings    = Number((completed as any).driver_earnings     ?? 0);
              const earningsVes = Number((completed as any).driver_earnings_ves ?? 0);
              const rate        = Number((completed as any).exchange_rate_ves   ?? 0);
              setCompletedRide(activeRide.id, earnings, earningsVes || undefined, rate || undefined);
              const completedRideId = activeRide.id;
              setActiveRide(null);
              setActivePhase(null);
              setChatMessages([]);
              setChatOpen(false);

              // Preguntar al conductor si quiere dejar una nota al pasajero
              Alert.alert(
                '¿Dejar una nota? (opcional)',
                'Puedes dejar una nota breve para el pasajero — ej. "Dejé su bastón en el asiento trasero".',
                [
                  { text: 'Omitir', onPress: () => router.push('/(driver)/rating') },
                  {
                    text: 'Agregar nota',
                    onPress: () => {
                      Alert.prompt?.(
                        'Nota para el pasajero',
                        'Máximo 500 caracteres',
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
            } catch (err: any) {
              const msg = err?.response?.data?.error ?? err?.message ?? 'Error desconocido';
              Alert.alert('No se pudo finalizar', msg);
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
      Alert.alert('', 'Desconéctate antes de cerrar sesión.');
      return;
    }
    socketService.disconnect();
    await logout();
    router.replace('/(auth)/' as any);
  };

  const handleDeleteAccount = () => {
    if (isOnline) {
      Alert.alert('', 'Desconéctate antes de eliminar tu cuenta.');
      return;
    }
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción es permanente e irreversible. Se eliminarán todos tus datos personales.\n\n¿Estás seguro de que deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, eliminar mi cuenta',
          style: 'destructive',
          onPress: async () => {
            try {
              const { apiClient } = await import('../../src/services/apiClient');
              await apiClient.delete('/user/account');
              socketService.disconnect();
              await logout();
              router.replace('/(auth)/' as any);
            } catch {
              Alert.alert('Error', 'No se pudo eliminar la cuenta. Contáctanos en soporte@veronaride.com');
            }
          },
        },
      ]
    );
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
          <Text style={styles.loadingText}>Cargando perfil...</Text>
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
          <Text style={styles.inactiveHeaderTitle}>VERONA Ride Conductor</Text>
          <TouchableOpacity onPress={handleLogout}><Text style={styles.logoutText}>Cerrar sesión</Text></TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.inactiveScroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_COLORS.PRIMARY} />}
        >
          <View style={[styles.statusCard, { backgroundColor: config.bgColor, borderColor: config.color + '30' }]}>
            <Text style={styles.statusEmoji}>{config.emoji}</Text>
            <Text style={[styles.statusTitle, { color: config.color }]}>{config.title}</Text>
            <Text style={styles.statusDesc}>{config.description}</Text>

            {status === 'rejected' && (driver as any)?.rejection_reason && (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Motivo:</Text>
                <Text style={styles.reasonText}>{(driver as any).rejection_reason}</Text>
              </View>
            )}
            {status === 'suspended' && (driver as any)?.suspension_reason && (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Motivo:</Text>
                <Text style={styles.reasonText}>{(driver as any).suspension_reason}</Text>
              </View>
            )}
          </View>

          {status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
              onPress={() => router.push('/(auth)/register-driver')}
            >
              <Text style={styles.actionButtonText}>Completar registro</Text>
            </TouchableOpacity>
          )}

          {status === 'rejected' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: BRAND_COLORS.ALERT }]}
              onPress={() => router.push('/(auth)/register-driver')}
            >
              <Text style={styles.actionButtonText}>Corregir y reenviar</Text>
            </TouchableOpacity>
          )}

          <View style={styles.profileCard}>
            <Text style={styles.profileCardTitle}>Perfil</Text>
            <ProfileRow label="Correo" value={user?.email ?? ''} />
            <ProfileRow label="Teléfono" value={user?.phone ?? '—'} />
            <ProfileRow label="Estado" value={user?.state_code ?? 'DC'} />
            {driver?.referral_code && (
              <ProfileRow label="Código de referido" value={driver.referral_code} />
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
        mapPadding={{ top: 80, right: 20, bottom: activeRide ? (panelExpanded ? 370 : 150) : 200, left: 20 }}
        initialRegion={{
          latitude:      driverPos?.latitude  ?? 10.4806,
          longitude:     driverPos?.longitude ?? -66.9036,
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
                <Text style={styles.onlineBadgeText}>{isOnline ? 'En línea' : 'Desconectado'}</Text>
              </View>
            </View>
          </View>

          {/* Ganancias de hoy */}
          <View style={styles.earningsChip}>
            <Text style={styles.earningsLabel}>Hoy</Text>
            <Text style={styles.earningsAmount}>
              ${(Number(driver?.available_balance) || 0).toFixed(2)}
            </Text>
          </View>

          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.logoutBtn}>
            <Text style={styles.logoutIcon}>☰</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── BANNER RECORDATORIO PAGO MEMBRESÍA ── */}
      {showPaymentBanner && (
        <TouchableOpacity
          style={styles.paymentReminderBanner}
          onPress={() => router.push('/(driver)/membership')}
          activeOpacity={0.85}
        >
          <Text style={styles.paymentReminderText}>
            ⚠️  Renueva tu membresía antes del viernes 2:00 PM — Toca para pagar
          </Text>
        </TouchableOpacity>
      )}

      {/* ── BANNER PLAZO VENCIDO ── */}
      {showDeadlineBanner && (
        <View style={styles.deadlineBanner}>
          <Text style={styles.deadlineBannerTitle}>🚫 Plazo de pago vencido</Text>
          <Text style={styles.deadlineBannerText}>
            El horario límite de pago (viernes 2:00 PM) ya pasó. Tu membresía no estará vigente mañana y tu cuenta será suspendida automáticamente a las 12:00 AM.
          </Text>
        </View>
      )}

      {/* ── BANNER DE LLEGADA ── */}
      {arrivalBanner && (
        <View style={styles.arrivalBanner}>
          <Text style={styles.arrivalBannerText}>🏁 ¡Estás llegando al destino!</Text>
        </View>
      )}

      {/* ── MENSAJE DE AGRADECIMIENTO DEL PASAJERO ── */}
      {thankyouMsg && (
        <View style={styles.thankyouBanner}>
          <Text style={styles.thankyouTitle}>💌 Tu pasajero te agradeció</Text>
          <Text style={styles.thankyouMsg}>{thankyouMsg}</Text>
          <TouchableOpacity onPress={() => setThankyouMsg(null)} style={styles.thankyouClose}>
            <Text style={styles.thankyouCloseText}>Cerrar</Text>
          </TouchableOpacity>
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
                  <Text style={styles.trainingBannerTitle}>Certificación requerida para conectarte</Text>
                  <Text style={styles.trainingBannerSub}>
                    Aprueba al menos un examen de servicio para recibir viajes · Toca para comenzar
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
                    {certifications!.certified_services.length} servicio{certifications!.certified_services.length !== 1 ? 's' : ''} certificado{certifications!.certified_services.length !== 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.trainingBannerSub}>
                    Completa más exámenes para desbloquear servicios adicionales · Toca para continuar
                  </Text>
                </View>
                <Text style={styles.trainingBannerArrow}>›</Text>
              </TouchableOpacity>
            )}

            {/* Insignia del conductor */}
            {driver && (() => {
              const { getDriverBadge } = require('../../src/utils/driverBadge');
              const badge = getDriverBadge(driver.total_rides ?? 0, Number(driver.rating_avg) || 5);
              return (
                <View style={[styles.badgeRow, { backgroundColor: badge.color + '18' }]}>
                  <Text style={{ fontSize: 20 }}>{badge.emoji}</Text>
                  <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                  <Text style={styles.badgeHint}> · {driver.total_rides ?? 0} viajes</Text>
                </View>
              );
            })()}

            {/* Banner tipo de vehículo no configurado */}
            {(() => {
              const validTypes = ['motorcycle', 'sedan', 'suv', 'pickup', 'plataforma'];
              const hasType = (driver?.services ?? []).some(s => validTypes.includes(s));
              if (hasType) return null;
              return (
                <TouchableOpacity
                  style={styles.vehicleTypeBanner}
                  onPress={() => setVehicleModalVisible(true)}
                >
                  <Text style={styles.vehicleTypeBannerText}>
                    🚗 Elige tu tipo de vehículo para recibir solicitudes
                  </Text>
                  <Text style={styles.vehicleTypeBannerCta}>Configurar →</Text>
                </TouchableOpacity>
              );
            })()}

            {/* Document expiry alerts */}
            {docAlerts.map(alert => (
              <View
                key={alert.document_type}
                style={[styles.docAlertBanner, alert.is_expired ? styles.docAlertExpired : styles.docAlertUrgent]}
              >
                <Text style={styles.docAlertText}>
                  {alert.is_expired ? '🚫' : '⚠️'}{' '}
                  {alert.document_type === 'license' ? 'Licencia' : 'Seguro'}{' '}
                  {alert.is_expired ? 'VENCIDA' : `vence en ${alert.days_left} día${alert.days_left !== 1 ? 's' : ''}`}
                  {' — '}
                  <Text style={{ textDecorationLine: 'underline' }}
                    onPress={() => router.push('/(driver)/stats')}>
                    Ver detalles
                  </Text>
                </Text>
              </View>
            ))}

            <View style={styles.statsRow}>
              <StatCard label="Viajes" value={String(driver?.total_rides ?? 0)} />
              <StatCard label="Este mes" value={String(driver?.rides_this_month ?? 0)} />
              <StatCard label="Calificación" value={`${(Number(driver?.rating_avg) || 5).toFixed(1)} ⭐`} />
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
              accessibilityLabel={isOnline ? 'Desconectarte' : 'Conectarte para recibir viajes'}
            >
              {isTogglingOnline ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.onlineToggleEmoji}>{isOnline ? '🟢' : '⚫'}</Text>
                  <Text style={styles.onlineToggleText}>
                    {isOnline ? 'En línea — Toca para desconectarte' : 'Toca para conectarte'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {isOnline && (
              <Text style={styles.onlineHint}>
                Eres visible para pasajeros cercanos. Espera una solicitud.
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
                <Text style={styles.panelToggleLabel}>{panelExpanded ? 'Ocultar' : 'Mostrar'}</Text>
              </View>
            </TouchableOpacity>

            {/* Info del pasajero — siempre visible en viaje activo */}
            {assignedPassenger && (
              <View style={styles.passengerRow}>
                <UserAvatar
                  name={assignedPassenger.name}
                  photoUrl={assignedPassenger.photo_url}
                  size={44}
                />
                <View style={styles.passengerInfo}>
                  <Text style={styles.passengerName}>{assignedPassenger.name}</Text>
                  <Text style={styles.passengerLabel}>Pasajero</Text>
                </View>
                {assignedPassenger.patient_phone && (
                  <TouchableOpacity
                    style={styles.callPatientBtn}
                    onPress={() => Linking.openURL(`tel:${assignedPassenger.patient_phone}`)}
                  >
                    <Text style={styles.callPatientIcon}>📞</Text>
                    <Text style={styles.callPatientText}>Llamar</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ── Contenido expandible ── */}
            {panelExpanded && (
              <>

                {/* Dirección de recogida / destino */}
                <View style={styles.rideAddresses}>
                  <View style={styles.rideAddressRow}>
                    <View style={[styles.addrDot, { backgroundColor: BRAND_COLORS.ACCENT }]} />
                    <View style={styles.addrInfo}>
                      <Text style={styles.addrLabel}>Recogida</Text>
                      <Text style={styles.addrText} numberOfLines={1}>
                        {activeRide.pickup_address}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.rideAddressRow}>
                    <View style={[styles.addrDot, { backgroundColor: BRAND_COLORS.ALERT }]} />
                    <View style={styles.addrInfo}>
                      <Text style={styles.addrLabel}>Destino</Text>
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
                  : <Text style={styles.rideActionText}>📍 Llegué al punto de recogida</Text>
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
                  : <Text style={styles.rideActionText}>🚀 Iniciar viaje</Text>
                }
              </TouchableOpacity>
            )}

            {activePhase === 'in_progress' && (
              <TouchableOpacity
                style={[styles.rideActionButton, { backgroundColor: BRAND_COLORS.ACCENT }]}
                onPress={handleCompleteRide}
                disabled={isActionLoading}
              >
                {isActionLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.rideActionText}>✅ Completar viaje</Text>
                }
              </TouchableOpacity>
            )}

            {/* ── Fila de acciones unificada ── */}
            {activeRide && (
              <View style={styles.actionRow}>
                {activePhase === 'in_progress' && (
                  <NavigationButton
                    lat={(activeRide as any).dropoff_lat}
                    lng={(activeRide as any).dropoff_lng}
                    address={activeRide.dropoff_address}
                    label="Navegar"
                    style={styles.actionItem}
                  />
                )}
                <TouchableOpacity
                  style={[styles.actionItem, styles.actionCancel]}
                  onPress={() => Alert.alert(
                    'Cancelar viaje',
                    '¿Estás seguro?',
                    [
                      { text: 'No', style: 'cancel' },
                      {
                        text: 'Sí, cancelar',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            if (activeRide) await rideMobileService.cancelRide(activeRide.id, 'Cancelado por el conductor');
                          } catch (err: any) {
                            const msg = err?.response?.data?.error ?? err?.message ?? 'Error desconocido';
                            Alert.alert('No se pudo cancelar', msg);
                            return;
                          }
                          setActiveRide(null);
                          setActivePhase(null);
                        },
                      },
                    ]
                  )}
                >
                  <Text style={[styles.actionItemText, { color: BRAND_COLORS.ALERT }]}>✕ Cancelar</Text>
                </TouchableOpacity>

                <SOSButton
                  rideId={activeRide?.id}
                  lat={driverPos?.latitude}
                  lng={driverPos?.longitude}
                  style={styles.actionItem}
                />

                <TouchableOpacity style={[styles.actionItem, styles.actionChat]} onPress={() => setChatOpen(true)}>
                  <Text style={[styles.actionItemText, { color: '#fff' }]}>💬 Chat</Text>
                  {chatMessages.filter(m => !m.fromMe).length > 0 && (
                    <View style={styles.chatBadge}>
                      <Text style={styles.chatBadgeText}>{chatMessages.filter(m => !m.fromMe).length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ── Velocímetro (solo en_route) ── */}
            {activePhase === 'in_progress' && speedKmh > 0 && (
              <View style={[styles.speedBadge, isOverLimit && styles.speedBadgeAlert, { alignSelf: 'flex-start', marginTop: 6 }]}>
                <Text style={[styles.speedValue, isOverLimit && { color: '#fff' }]}>{speedKmh}</Text>
                <Text style={[styles.speedUnit, isOverLimit && { color: 'rgba(255,255,255,0.8)' }]}>km/h</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ══ MODAL DE CHAT CON PASAJERO ══ */}
      <Modal visible={chatOpen} animationType="slide" transparent onRequestClose={() => setChatOpen(false)}>
        <View style={styles.chatOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.chatSheet}
          >
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>Chat con pasajero</Text>
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
              ListEmptyComponent={<Text style={styles.chatEmpty}>Sin mensajes aún.</Text>}
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
                placeholder="Escribe un mensaje..."
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
                <Text style={styles.chatSendText}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
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
              <UserAvatar name={user?.name} photoUrl={user?.photo_url} size={48} />
              <View style={styles.menuAvatarInfo}>
                <Text style={styles.menuAvatarName}>{user?.name ?? 'Driver'}</Text>
                <Text style={styles.menuAvatarHint}>
                  {uploadingPhoto ? 'Subiendo...' : 'Toca para cambiar foto'}
                </Text>
              </View>
            </TouchableOpacity>
            {/* Tipo de vehículo */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenuVisible(false); setVehicleModalVisible(true); }}
            >
              <Text style={styles.menuItemIcon}>🚗</Text>
              <Text style={[styles.menuItemText, { flex: 1 }]}>Tipo de vehículo</Text>
              <Text style={{ fontSize: 13, color: '#888' }}>
                {driver?.services?.[0] === 'motorcycle' ? 'Moto'  :
                 driver?.services?.[0] === 'suv'        ? 'SUV'   :
                 driver?.services?.[0] === 'sedan'      ? 'Sedán' : 'Sin configurar'} ›
              </Text>
            </TouchableOpacity>
            {[
              { icon: '📄', label: 'Mis documentos',         route: '/(driver)/documents'       as const },
              { icon: '📋', label: 'Mi contrato',            route: '/(driver)/contract'        as const },
              { icon: '💳', label: 'Mi membresía',           route: '/(driver)/membership'      as const },
              { icon: '🗂️', label: 'Historial de servicio', route: '/(driver)/service-history' as const },
              { icon: '💰', label: 'Ganancias',             route: '/(driver)/earnings'        as const },
              { icon: '📊', label: 'Mis estadísticas',      route: '/(driver)/stats'           as const },
              { icon: '🧾', label: 'Informe fiscal',        route: '/(driver)/tax-report'      as const },
              { icon: '🎁', label: 'Referidos',             route: '/(driver)/referrals'       as const },
              { icon: '📚', label: 'Capacitación',          route: '/(driver)/training'        as const },
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
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setInfoExpanded(e => !e)}
            >
              <Text style={styles.menuItemIcon}>ℹ️</Text>
              <Text style={[styles.menuItemText, { flex: 1 }]}>Acerca de VERONA Ride</Text>
              <Text style={{ fontSize: 12, color: '#aaa' }}>{infoExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {infoExpanded && [
              { icon: '👥', label: 'Nosotros',              page: 'about'   as InfoPage },
              { icon: '🔒', label: 'Política de privacidad', page: 'privacy' as InfoPage },
              { icon: '📋', label: 'Aviso legal',           page: 'legal'   as InfoPage },
              { icon: '✉️', label: 'Contáctanos',           page: 'contact' as InfoPage },
            ].map(item => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuItem, { paddingLeft: 32, backgroundColor: '#FAFAFA' }]}
                onPress={() => setMenuSubPage(item.page)}
              >
                <Text style={styles.menuItemIcon}>{item.icon}</Text>
                <Text style={styles.menuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={{ height: 8 }} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); handleDeleteAccount(); }}>
              <Text style={styles.menuItemIcon}>🗑️</Text>
              <Text style={[styles.menuItemText, { color: '#DC2626' }]}>Eliminar cuenta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); void handleLogout(); }}>
              <Text style={styles.menuItemIcon}>🚪</Text>
              <Text style={[styles.menuItemText, { color: BRAND_COLORS.ALERT }]}>Cerrar sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuCloseBtn} onPress={() => setMenuVisible(false)}>
              <Text style={styles.menuCloseBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ══ MODAL TIPO DE VEHÍCULO ══ */}
      <Modal visible={vehicleModalVisible} transparent animationType="slide" onRequestClose={() => setVehicleModalVisible(false)}>
        <View style={styles.menuOverlay}>
          <View style={[styles.menuSheet, { padding: 20 }]}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: BRAND_COLORS.TEXT, marginBottom: 6, fontFamily: 'Inter_700Bold' }}>
              Tipo de vehículo
            </Text>
            <Text style={{ fontSize: 14, color: '#888', marginBottom: 20, fontFamily: 'Inter_400Regular' }}>
              Solo recibirás solicitudes del tipo que elijas.
            </Text>
            {([
              { key: 'motorcycle', label: 'Moto',       emoji: '🏍️', desc: 'Motocicleta' },
              { key: 'sedan',      label: 'Sedán',      emoji: '🚗', desc: 'Sedan / Compacto / Familiar' },
              { key: 'suv',        label: 'SUV',        emoji: '🚙', desc: 'SUV / Camioneta / Minivan' },
              { key: 'pickup',     label: 'Pick-Up',    emoji: '🛻', desc: 'Camioneta Pick-Up / Carga mediana' },
              { key: 'plataforma', label: 'Plataforma', emoji: '🚛', desc: 'Camión plataforma / Materiales de construcción' },
            ] as const).map(opt => {
              const current = (driver?.services ?? [])[0];
              const selected = current === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.vehicleTypeCard, selected && styles.vehicleTypeCardSelected, { flexDirection: 'row', marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16 }]}
                  disabled={savingVehicleType}
                  onPress={async () => {
                    if (selected) { setVehicleModalVisible(false); return; }
                    setSavingVehicleType(true);
                    try {
                      await driverMobileService.updateProfile({ services: [opt.key] });
                      setDriver(prev => prev ? { ...prev, services: [opt.key] } : prev);
                      setVehicleModalVisible(false);
                    } catch (err: any) {
                      Alert.alert('Error', err?.message ?? 'No se pudo actualizar');
                    } finally {
                      setSavingVehicleType(false);
                    }
                  }}
                >
                  <Text style={{ fontSize: 28, marginRight: 14 }}>{opt.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.vehicleTypeLabel, selected && styles.vehicleTypeLabelSelected]}>{opt.label}</Text>
                    <Text style={styles.vehicleTypeDesc}>{opt.desc}</Text>
                  </View>
                  {selected && <Text style={{ fontSize: 20, color: BRAND_COLORS.PRIMARY }}>✓</Text>}
                  {savingVehicleType && selected && <ActivityIndicator size="small" color={BRAND_COLORS.PRIMARY} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.menuCloseBtn} onPress={() => setVehicleModalVisible(false)}>
              <Text style={styles.menuCloseBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <InfoModal page={menuSubPage} onClose={() => setMenuSubPage(null)} />
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
  safe: { flex: 1, backgroundColor: '#fff', paddingTop: 24 },
  container: { flex: 1 },
  map:       { ...StyleSheet.absoluteFillObject },

  // ── Controles de zoom ──
  zoomControls: {
    position: 'absolute',
    right: 12,
    top: 162,
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 5 : 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginHorizontal: 12,
    marginBottom: 12,
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
  idlePanel: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10 },
  statsRow:  { flexDirection: 'row', gap: 6, marginBottom: 8 },
  badgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, marginBottom: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  badgeHint: { fontSize: 11, color: '#888', fontFamily: 'Inter_400Regular' },
  statCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  statValue: { fontSize: 13, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 1, fontFamily: 'Inter_400Regular' },

  onlineToggle: {
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 6,
  },
  onlineToggleActive:   { backgroundColor: BRAND_COLORS.ACCENT },
  onlineToggleInactive: { backgroundColor: '#555' },
  onlineToggleEmoji: { fontSize: 16 },
  onlineToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  onlineHint: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },

  trainingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF9E6', borderRadius: 8, padding: 8, marginBottom: 6,
    borderWidth: 1, borderColor: '#F59E0B40',
  },
  trainingBannerEmoji: { fontSize: 16 },
  trainingBannerTitle: { fontSize: 11, fontWeight: '700', color: '#92400E', marginBottom: 1 },
  trainingBannerSub: { fontSize: 10, color: '#B45309' },
  trainingBannerArrow: { fontSize: 14, color: '#F59E0B', fontWeight: '700' },

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
  actionRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 8,
  },
  actionItem: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  actionCancel: {
    borderWidth: 1,
    borderColor: BRAND_COLORS.ALERT,
    backgroundColor: '#FEF2F2',
  },
  actionChat: {
    backgroundColor: BRAND_COLORS.PRIMARY,
  },
  actionItemText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    fontFamily: 'Inter_700Bold',
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
  chatSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', minHeight: 300 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  chatTitle: { fontSize: 17, fontWeight: '600', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },
  chatClose: { fontSize: 20, color: '#888', padding: 4 },
  chatMessages: { flex: 1 },
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
  vehicleTypeBanner: { backgroundColor: '#FFF7ED', borderRadius: 10, padding: 12, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#F59E0B', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vehicleTypeBannerText: { fontSize: 13, color: '#92400E', fontWeight: '500', fontFamily: 'Inter_500Medium', flex: 1 },
  vehicleTypeBannerCta: { fontSize: 13, color: '#D97706', fontWeight: '700', fontFamily: 'Inter_700Bold', marginLeft: 8 },
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
  paymentReminderBanner: {
    position: 'absolute',
    top: 100,
    left: 16, right: 16,
    backgroundColor: '#7c2d12',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    zIndex: 50,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, elevation: 6,
  },
  paymentReminderText: {
    color: '#fed7aa',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
  },
  deadlineBanner: {
    position: 'absolute',
    top: 100,
    left: 16, right: 16,
    backgroundColor: '#450a0a',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    zIndex: 50,
    gap: 6,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, elevation: 8,
    borderWidth: 1, borderColor: '#dc2626',
  },
  deadlineBannerTitle: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
  },
  deadlineBannerText: {
    color: '#fecaca',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
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

  // Thank-you banner
  thankyouBanner: {
    position: 'absolute',
    top: 100,
    left: 20, right: 20,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    zIndex: 100,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 12,
    borderWidth: 1,
    borderColor: BRAND_COLORS.ACCENT + '60',
  },
  thankyouTitle: {
    color: BRAND_COLORS.ACCENT,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  thankyouMsg: {
    color: '#E2E8F0',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    marginBottom: 12,
  },
  thankyouClose: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: BRAND_COLORS.ACCENT + '20',
    borderRadius: 8,
  },
  thankyouCloseText: {
    color: BRAND_COLORS.ACCENT,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
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
    paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingHorizontal: 20,
  },
  menuTitle: { fontSize: 16, fontWeight: '700', color: '#888', fontFamily: 'Inter_700Bold', marginBottom: 8, textAlign: 'center' },
  menuAvatarRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingBottom: 10, marginBottom: 4,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  menuAvatarInfo: { flex: 1 },
  menuAvatarName: { fontSize: 15, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  menuAvatarHint: { fontSize: 11, color: '#888', marginTop: 2, fontFamily: 'Inter_400Regular' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  menuItemIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  menuItemText: { fontSize: 14, color: BRAND_COLORS.TEXT, fontFamily: 'Inter_500Medium' },
  menuCloseBtn: { marginTop: 8, height: 42, borderRadius: 12, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  menuCloseBtnText: { fontSize: 14, fontWeight: '600', color: '#555', fontFamily: 'Inter_600SemiBold' },

  vehicleTypeCard: { borderRadius: 12, borderWidth: 2, borderColor: '#E0E0E0', backgroundColor: '#FAFAFA', alignItems: 'center' },
  vehicleTypeCardSelected: { borderColor: BRAND_COLORS.PRIMARY, backgroundColor: BRAND_COLORS.PRIMARY + '12' },
  vehicleTypeLabel: { fontSize: 16, fontWeight: '700', color: '#555', fontFamily: 'Inter_700Bold' },
  vehicleTypeLabelSelected: { color: BRAND_COLORS.PRIMARY },
  vehicleTypeDesc: { fontSize: 12, color: '#aaa', marginTop: 2, fontFamily: 'Inter_400Regular' },

  // ── Vista inactiva (pending, under_review, etc.) ──
  inactiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 44,
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
  // ── Navegación turn-by-turn banner ──
  navTurnBanner: {
    position: 'absolute',
    top: 119,
    left: '32%',
    right: '32%',
    height: 76,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
    zIndex: 90,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  navTurnArrowBox: {
    alignItems: 'center',
    minWidth: 32,
  },
  navTurnArrow: {
    fontSize: 30,
    color: '#FACC15',
  },
  navTurnDist: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  navTurnInstruction: {
    flex: 1,
    fontSize: 16,
    color: '#F1F5F9',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    lineHeight: 20,
  },
  navTurnEtaBox: {
    alignItems: 'center',
    minWidth: 36,
  },
  navTurnEtaVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FACC15',
    fontFamily: 'Inter_700Bold',
  },
  navTurnEtaDist: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
});
