// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Home del pasajero — Mapa + solicitud de viaje en tiempo real
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  SafeAreaView, Alert, ActivityIndicator, Modal, Image,
  Animated, Platform, Dimensions, StatusBar, Keyboard,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';


import { useAuthStore, useUser } from '../../src/store/authStore';
import { useRideStore } from '../../src/store/rideStore';
import { socketService } from '../../src/services/socketService';
import { rideMobileService } from '../../src/services/rideService';
import { promoService } from '../../src/services/promoService';
import { BRAND_COLORS } from '@vride/shared';
import type { ServiceType, FareEstimate } from '@vride/shared';
import { UserAvatar } from '../../src/components/common/UserAvatar';
import { usePhotoUpload } from '../../src/hooks/usePhotoUpload';
import { apiClient } from '../../src/services/apiClient';
import { TipModal } from '../../src/components/payments/TipModal';
import { SOSButton } from '../../src/components/common/SOSButton';
import { InfoModal, InfoPage } from '../../src/components/common/InfoModal';
import { nokiaToneService } from '../../src/services/nokiaToneService';
import { useRouteDeviation } from '../../src/hooks/useRouteDeviation';
import { useMapZoom } from '../../src/hooks/useMapZoom';

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Coords = { latitude: number; longitude: number };

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

const SERVICE_OPTIONS: { key: ServiceType; label: string; emoji: string }[] = [
  { key: 'motorcycle', label: 'Moto',       emoji: '🏍️' },
  { key: 'sedan',      label: 'Sedán',      emoji: '🚗' },
  { key: 'suv',        label: 'SUV',        emoji: '🚙' },
  { key: 'scheduled',  label: 'Programado', emoji: '📅' },
];

export default function PassengerHomeScreen() {
  const user = useUser();
  const { logout } = useAuthStore();

  const {
    searchStatus, selectedService, assignedDriver, driverLocation,
    searchRadiusKm, currentRide,
    setSelectedService, setFareEstimate, setSearchStatus, setCurrentRide,
    setAssignedDriver, updateDriverLocation, setSearchRadius, setTotalCharged,
    resetPassengerState, cancelCurrentRide, loadActiveRide,
  } = useRideStore();

  const mapRef       = useRef<MapView>(null);
  const searchRef    = useRef<TextInput>(null);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mapZoomRef, handleZoomIn, handleZoomOut, handleZoomReset } = useMapZoom(mapRef);

  const [menuVisible, setMenuVisible]       = useState(false);
  const [infoExpanded, setInfoExpanded]     = useState(false);
  const [menuSubPage, setMenuSubPage]       = useState<InfoPage | null>(null);
  const [mapType, setMapType]               = useState<'hybrid' | 'standard'>('hybrid');
  const { pickAndUpload, uploading: uploadingPhoto } = usePhotoUpload();
  const [userLocation, setUserLocation]     = useState<Coords | null>(null);
  const [pickupAddress, setPickupAddress]   = useState('Mi ubicación actual');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [dropoffCoords, setDropoffCoords]   = useState<Coords | null>(null);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [panelVisible, setPanelVisible]         = useState(true);
  const [driverWaitMinutes, setDriverWaitMinutes]   = useState(0);
  const [driverEtaMinutes, setDriverEtaMinutes]     = useState<number | null>(null);
  const [passengerRidesWeek, setPassengerRidesWeek]   = useState(0);
  const [passengerRidesMonth, setPassengerRidesMonth] = useState(0);
  const [isFrequentPassenger, setIsFrequentPassenger] = useState(false);
  const driverAssignedAt    = useRef<Date | null>(null);
  const waitTimerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const rideStatusPollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchTimeoutRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Autocomplete personalizado
  const [searchQuery, setSearchQuery]               = useState('');
  const [predictions, setPredictions]               = useState<Prediction[]>([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [isResolvingPlace, setIsResolvingPlace]     = useState(false);

  // Estimaciones
  const [allEstimates, setAllEstimates]             = useState<Partial<Record<ServiceType, FareEstimate>>>({});
  const [isLoadingEstimates, setIsLoadingEstimates] = useState(false);
  const [estimateError, setEstimateError]           = useState<string | null>(null);


  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Promo code
  const [promoCode, setPromoCode]           = useState('');
  const [promoDiscount, setPromoDiscount]   = useState(0);
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoApplied, setPromoApplied]     = useState(false);

  // Tip modal (post-ride)
  const [tipModalVisible, setTipModalVisible] = useState(false);
  const [completedRideForTip, setCompletedRideForTip] = useState<{
    rideId: string; driverName: string; total: number;
  } | null>(null);

  // Route deviation (during ride)
  const rideInProgress = searchStatus === 'in_progress';
  const { deviated } = useRouteDeviation(
    rideInProgress,
    userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : null,
    dropoffCoords ? { lat: dropoffCoords.latitude, lng: dropoffCoords.longitude } : null,
    userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : null,
  );

  // ─────────────────────────────────────
  // Keyboard height tracking
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, e => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // ─────────────────────────────────────
  // Init
  // Refs para almacenar los handlers y poder remover solo los propios en el cleanup
  const socketUnsubsRef = useRef<Array<() => void>>([]);

  // ─────────────────────────────────────
  useEffect(() => {
    void initLocation();
    void initSocket();
    void loadActiveRide();
    void nokiaToneService.preload();
    // Cargar viajes semanales/mensuales para descuento de pasajero frecuente
    apiClient.get('/passenger/profile').then(res => {
      const d = res.data?.data;
      setPassengerRidesWeek(d?.rides_this_week ?? 0);
      setPassengerRidesMonth(d?.rides_this_month ?? 0);
      setIsFrequentPassenger(d?.is_frequent_passenger ?? false);
    }).catch(() => {});
    return () => {
      socketUnsubsRef.current.forEach(unsub => unsub());
      socketUnsubsRef.current = [];
    };
  }, []);

  // Navegar a ride screen si el viaje ya está in_progress (reconexión o carga inicial)
  useEffect(() => {
    if (searchStatus === 'in_progress') {
      const timer = setTimeout(() => router.replace('/(passenger)/ride'), 300);
      return () => clearTimeout(timer);
    }
  }, [searchStatus]);

  // Polling de respaldo mientras se busca conductor.
  // Si el evento socket se pierde (reconexión breve), el pasajero nunca saldría de "Searching".
  // Este polling detecta cambios de estado vía HTTP cada 5 s.
  useEffect(() => {
    if (searchStatus !== 'searching') {
      if (rideStatusPollRef.current) {
        clearInterval(rideStatusPollRef.current);
        rideStatusPollRef.current = null;
      }
      return;
    }
    rideStatusPollRef.current = setInterval(async () => {
      try {
        const ride = await rideMobileService.getActiveRide();
        if (!ride) {
          // Ride pasó a no_driver_found / cancelled → la query excluye esos estados
          console.log('[Poll] Viaje ya no activo → no_driver_found');
          setSearchStatus('no_driver_found');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
        if (ride.status === 'driver_assigned' || ride.status === 'driver_arriving') {
          // Socket event llegó tarde → state ya fue seteado por el listener; no hacer nada
          // Si no llegó, sincronizar (el socket listener pondrá el driver info cuando llegue)
          if (searchStatus === 'searching') {
            console.log('[Poll] Conductor asignado detectado via polling');
            setCurrentRide(ride);
            setSearchStatus('driver_assigned');
          }
        }
      } catch {
        // Error de red en el poll — ignorar silenciosamente
      }
    }, 5000);
    return () => {
      if (rideStatusPollRef.current) {
        clearInterval(rideStatusPollRef.current);
        rideStatusPollRef.current = null;
      }
    };
  }, [searchStatus]);

  // Timeout absoluto: último recurso si el socket se pierde Y el polling falla.
  // No debe dispararse en condiciones normales — el backend siempre responde antes (safety timer = 3 min).
  // Si dispara, cancela el viaje en la BD para que el usuario pueda volver a pedir.
  useEffect(() => {
    if (searchStatus === 'searching') {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const ride = await rideMobileService.getActiveRide();
          if (ride && ride.status === 'searching') {
            console.log('[Timeout] 4min sin respuesta — cancelando y forzando no_driver_found');
            try { await cancelCurrentRide('Tiempo de búsqueda agotado'); } catch { /* ignorar */ }
            setSearchStatus('no_driver_found');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        } catch {
          setSearchStatus('no_driver_found');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }, 20_000);
    } else {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [searchStatus]);

  useEffect(() => {
    if (searchStatus === 'searching') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [searchStatus]);

  const initLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a tu ubicación para solicitar un viaje.');
      return;
    }
    // Posición desde caché del SO (instantánea) — evita que el mapa abra en coordenadas incorrectas
    try {
      const last = await Location.getLastKnownPositionAsync({});
      if (last) {
        const cached = { latitude: last.coords.latitude, longitude: last.coords.longitude };
        setUserLocation(cached);
      }
    } catch {}
    // Posición GPS precisa — actualiza el mapa cuando está lista
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setUserLocation(coords);
    mapZoomRef.current = 15;
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 600);
    try {
      const [addr] = await Location.reverseGeocodeAsync(coords);
      if (addr) {
        const readable = [addr.street, addr.city, addr.region].filter(Boolean).join(', ');
        setPickupAddress(readable || 'Mi ubicación actual');
      }
    } catch { /* mantener default */ }
  };

  const initSocket = async () => {
    await socketService.connect();
    registerSocketListeners();
  };

  const registerSocketListeners = () => {
    const unsubs = [
      socketService.on('passenger:driver_assigned', (data: unknown) => {
        const d = data as { driver: typeof assignedDriver };
        setSearchStatus('driver_assigned');
        setAssignedDriver(d.driver);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Iniciar timer de espera del conductor
        driverAssignedAt.current = new Date();
        setDriverWaitMinutes(0);
        if (waitTimerRef.current) clearInterval(waitTimerRef.current);
        waitTimerRef.current = setInterval(() => {
          const mins = Math.floor((Date.now() - driverAssignedAt.current!.getTime()) / 60000);
          setDriverWaitMinutes(mins);
        }, 30000); // actualizar cada 30 segundos
      }),
      socketService.on('passenger:driver_location', (data: unknown) => {
        const d = data as { latitude: number; longitude: number; heading?: number; timestamp: number };
        updateDriverLocation(d);
        // Calcular ETA aproximado al pickup usando Haversine + 20mph
        if (userLocation) {
          const R = 3958.8;
          const dLat = (d.latitude - userLocation.latitude) * Math.PI / 180;
          const dLng = (d.longitude - userLocation.longitude) * Math.PI / 180;
          const a = Math.sin(dLat/2)**2 +
            Math.cos(userLocation.latitude * Math.PI/180) * Math.cos(d.latitude * Math.PI/180) *
            Math.sin(dLng/2)**2;
          const distMiles = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const eta = Math.max(1, Math.ceil((distMiles / 20) * 60));
          setDriverEtaMinutes(eta);
        }
      }),
      socketService.on('passenger:driver_arrived', () => {
        setSearchStatus('driver_arrived');
        void nokiaToneService.play();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 400);
        setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 800);
        if (waitTimerRef.current) { clearInterval(waitTimerRef.current); waitTimerRef.current = null; }
      }),
      socketService.on('passenger:ride_started', () => {
        setSearchStatus('in_progress');
      }),
      socketService.on('passenger:ride_completed', (data: unknown) => {
        const d = data as { totalCharged: number; paymentStatus: string; driverName?: string; rideId?: string };
        setTotalCharged(d.totalCharged);
        setSearchStatus('completed');
        if (d.paymentStatus === 'failed') {
          Alert.alert(
            'Payment issue',
            `Your ride ($${(d.totalCharged ?? 0).toFixed(2)}) could not be charged. Please update your payment method.`,
            [{ text: 'OK', onPress: () => router.push('/(passenger)/rating') }]
          );
        } else {
          // Show tip modal before going to rating
          if (d.rideId && d.driverName && d.totalCharged > 0) {
            setCompletedRideForTip({ rideId: d.rideId, driverName: d.driverName, total: d.totalCharged });
            setTipModalVisible(true);
          } else {
            router.push('/(passenger)/rating');
          }
        }
      }),
      socketService.on('passenger:search_radius', (data: unknown) => {
        const d = data as { radiusKm: number };
        setSearchRadius(d.radiusKm);
      }),
      socketService.on('passenger:no_driver_found', () => {
        setSearchStatus('no_driver_found');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }),
      socketService.on('passenger:ride_cancelled_by_driver', () => {
        setSearchStatus('cancelled');
        Alert.alert('Viaje cancelado', 'El conductor canceló. Buscaremos otro conductor.');
        resetPassengerState();
      }),
    ];
    socketUnsubsRef.current = unsubs;
  };

  // ─────────────────────────────────────
  // Autocomplete: buscar sugerencias en Google Places
  // ─────────────────────────────────────
  const fetchPredictions = useCallback(async (text: string) => {
    if (text.trim().length < 2) {
      setPredictions([]);
      return;
    }
    setIsLoadingPredictions(true);
    try {
      const locationBias = userLocation
        ? `&location=${userLocation.latitude},${userLocation.longitude}&radius=50000`
        : '';
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_MAPS_KEY}&language=es&types=establishment|geocode${locationBias}`;
      const res  = await fetch(url);
      const data = await res.json() as { status: string; predictions: Prediction[] };
      if (data.status === 'OK') setPredictions(data.predictions.slice(0, 5));
      else setPredictions([]);
    } catch {
      setPredictions([]);
    } finally {
      setIsLoadingPredictions(false);
    }
  }, [userLocation]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void fetchPredictions(text), 400);
  };

  // ─────────────────────────────────────
  // Seleccionar sugerencia → obtener coords exactas
  // ─────────────────────────────────────
  const selectPrediction = async (prediction: Prediction) => {
    setIsResolvingPlace(true);
    setPredictions([]);
    try {
      const url  = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&key=${GOOGLE_MAPS_KEY}&fields=geometry,formatted_address`;
      const res  = await fetch(url);
      const data = await res.json() as {
        status: string;
        result: { formatted_address: string; geometry: { location: { lat: number; lng: number } } };
      };
      if (data.status === 'OK') {
        const { lat, lng } = data.result.geometry.location;
        confirmDestination(data.result.formatted_address, { latitude: lat, longitude: lng });
      }
    } catch {
      Alert.alert('Error', 'No se pudieron obtener los detalles de la ubicación. Intenta escribir la dirección completa.');
    } finally {
      setIsResolvingPlace(false);
    }
  };

  // ─────────────────────────────────────
  // Enter/Search: geocodificar el texto escrito directamente
  // ─────────────────────────────────────
  const searchByText = async () => {
    const text = searchQuery.trim();
    if (!text) return;
    setIsResolvingPlace(true);
    setPredictions([]);
    try {
      const url  = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(text)}&key=${GOOGLE_MAPS_KEY}`;
      const res  = await fetch(url);
      const data = await res.json() as {
        status: string;
        results: Array<{ formatted_address: string; geometry: { location: { lat: number; lng: number } } }>;
      };
      if (data.status === 'OK' && data.results[0]) {
        const { lat, lng } = data.results[0].geometry.location;
        confirmDestination(data.results[0].formatted_address, { latitude: lat, longitude: lng });
      } else {
        Alert.alert('No encontrada', 'Dirección no encontrada. Intenta agregar la ciudad (ej. "Av. Libertador, Caracas").');
      }
    } catch {
      Alert.alert('Error', 'No se pudo buscar esa dirección. Verifica tu conexión.');
    } finally {
      setIsResolvingPlace(false);
    }
  };

  // ─────────────────────────────────────
  // Confirmar destino (desde sugerencia o desde Enter)
  // ─────────────────────────────────────
  const confirmDestination = (address: string, coords: Coords) => {
    setDropoffAddress(address);
    setDropoffCoords(coords);
    setSearchQuery('');
    setIsSearchingDest(false);
    setTimeout(fitMapToRoute, 400);
  };

  const clearDestination = () => {
    setDropoffAddress('');
    setDropoffCoords(null);
    setSearchQuery('');
    setPredictions([]);
    setAllEstimates({});
    setFareEstimate(null);
    setEstimateError(null);
    if (userLocation) {
      mapZoomRef.current = 15;
      mapRef.current?.animateToRegion(
        { ...userLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 600
      );
    }
  };

  const openSearch = () => {
    setPanelVisible(true);
    setIsSearchingDest(true);
    if (dropoffAddress) setSearchQuery(dropoffAddress);
    setTimeout(() => searchRef.current?.focus(), 150);
  };

  const closeSearch = () => {
    Keyboard.dismiss();
    setIsSearchingDest(false);
    setSearchQuery('');
    setPredictions([]);
    setPanelVisible(false);
  };

  // ─────────────────────────────────────
  // Estimaciones en paralelo al confirmar destino
  // ─────────────────────────────────────
  useEffect(() => {
    if (!userLocation || !dropoffCoords) {
      setAllEstimates({});
      setFareEstimate(null);
      setEstimateError(null);
      return;
    }
    const fetchAll = async () => {
      setIsLoadingEstimates(true);
      setEstimateError(null);

      try {
        const services: ServiceType[] = ['motorcycle', 'sedan', 'suv', 'scheduled'];
        const results = await Promise.allSettled(
          services.map(svc =>
            rideMobileService.estimateFare({
              pickupLat:            userLocation.latitude,
              pickupLng:            userLocation.longitude,
              dropoffLat:           dropoffCoords.latitude,
              dropoffLng:           dropoffCoords.longitude,
              serviceType:          svc,
              stateCode:            user?.state_code ?? 'DC',
            })
          )
        );

        const estimates: Partial<Record<ServiceType, FareEstimate>> = {};
        services.forEach((svc, i) => {
          const r = results[i];
          if (r.status === 'fulfilled' && r.value) {
            estimates[svc] = r.value;
          }
        });

        if (Object.keys(estimates).length === 0) {
          const failed = results[0] as PromiseRejectedResult;
          const err    = failed?.reason as { response?: { status?: number; data?: { error?: string } }; message?: string };
          const status = err?.response?.status;
          const detail = err?.response?.data?.error ?? err?.message ?? 'Network error';
          setEstimateError(`No se pudo obtener tarifas${status ? ` (${status})` : ''}: ${detail}`);
        } else {
          setAllEstimates(estimates);
          const active = estimates[selectedService] ?? estimates['sedan'];
          if (active) setFareEstimate(active);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setEstimateError(`Error inesperado: ${msg}`);
      } finally {
        setIsLoadingEstimates(false);
      }
    };
    void fetchAll();
  }, [userLocation, dropoffCoords, user?.state_code]);

  useEffect(() => {
    const est = allEstimates[selectedService];
    if (est) setFareEstimate(est);
  }, [selectedService, allEstimates]);

  // ─────────────────────────────────────
  // Ajustar mapa para mostrar ruta completa
  // ─────────────────────────────────────
  const fitMapToRoute = useCallback(() => {
    if (!userLocation || !dropoffCoords) return;
    mapZoomRef.current = 12; // aproximación al zoom de overview — getCamera() lo corregirá en el próximo press
    mapRef.current?.fitToCoordinates(
      [userLocation, dropoffCoords],
      { edgePadding: { top: 100, right: 60, bottom: 340, left: 60 }, animated: true }
    );
  }, [userLocation, dropoffCoords]);

  // ─────────────────────────────────────
  // Solicitar viaje
  // ─────────────────────────────────────
  const handleRequestRide = async () => {
    if (!userLocation || !dropoffCoords) return;
    if (selectedService === 'scheduled') {
      router.push('/(passenger)/schedule');
      return;
    }

    // Feature 13: foto de perfil requerida para pedir viaje
    if (!user?.photo_url) {
      Alert.alert(
        'Profile photo required',
        'Por favor agrega una foto de perfil antes de solicitar un viaje. Esto ayuda a tu conductor a identificarte.',
        [
          { text: 'Después', style: 'cancel' },
          {
            text: 'Agregar foto',
            onPress: async () => {
              const url = await pickAndUpload();
              if (url) Alert.alert('¡Foto guardada!', 'Ya puedes solicitar un viaje.');
            },
          },
        ]
      );
      return;
    }

    setSearchStatus('requesting');
    console.log('[REQUEST] Pickup coords:', userLocation.latitude, userLocation.longitude, '| service:', selectedService);
    try {
      const ride = await rideMobileService.requestRide({
        pickupAddress,
        pickupLat:            userLocation.latitude,
        pickupLng:            userLocation.longitude,
        dropoffAddress:       dropoffAddress.trim(),
        dropoffLat:           dropoffCoords.latitude,
        dropoffLng:           dropoffCoords.longitude,
        serviceType:          selectedService,
        stateCode:            user?.state_code ?? 'DC',
        promoCode:            promoApplied ? promoCode : undefined,
      });
      setCurrentRide(ride);
      setSearchStatus('searching');
      setSearchRadius(10);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err: unknown) {
      setSearchStatus('idle');
      const axiosCode = (err as any)?.response?.data?.code as string | undefined;
      const msg = err instanceof Error ? err.message : '';
      const code = axiosCode ?? msg;
      Alert.alert('Error',
        code.includes('PAYMENT_METHOD_DECLINED') ? 'No se pudo procesar tu método de pago. Verifica y vuelve a intentarlo.'
        : code === 'ACTIVE_RIDE_EXISTS'           ? 'Ya tienes un viaje activo.'
        : code === 'NO_DRIVER_FOUND'              ? 'No hay conductores disponibles cerca. Intenta de nuevo.'
        : code === 'INVALID_STATE'                ? 'Servicio no disponible en tu área.'
        : 'No se pudo solicitar el viaje. Intenta de nuevo.'
      );
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancelar viaje', '¿Estás seguro?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar', style: 'destructive',
        onPress: async () => {
          const fee = await cancelCurrentRide('Cancelado por el pasajero');
          if (fee > 0) {
            Alert.alert(
              'Cargo por cancelación',
              `Se cobró $${fee.toFixed(2)} por cancelación porque el conductor ya estaba en camino.`,
              [{ text: 'OK', onPress: () => resetPassengerState() }]
            );
          } else {
            resetPassengerState();
          }
        },
      },
    ]);
  };

  const handleLogout = async () => {
    socketService.disconnect();
    await logout();
    router.replace('/(auth)/');
  };

  const handleProfileMenu = () => setMenuVisible(true);

  const handleValidatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoValidating(true);
    try {
      const result = await promoService.validate(promoCode.trim());
      setPromoDiscount(result.discount_percent);
      setPromoApplied(true);
      Alert.alert('¡Promo aplicada! 🎉', `Se aplicará un ${result.discount_percent}% de descuento a tu viaje.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Código de promo inválido';
      Alert.alert('Código inválido', msg);
    } finally {
      setPromoValidating(false);
    }
  };

  const requestLabel = () => {
    if (selectedService === 'scheduled') return 'Programar un viaje →';
    const est = allEstimates[selectedService];
    if (est) {
      const name = SERVICE_OPTIONS.find(s => s.key === selectedService)?.label ?? '';
      return `Solicitar ${name}  ·  $${(est.total ?? 0).toFixed(2)}`;
    }
    return 'Solicitar viaje';
  };

  const canRequest = !!userLocation && !!dropoffCoords &&
    (selectedService === 'scheduled' || !!allEstimates[selectedService]);

  const isActiveRide = ['searching', 'driver_assigned', 'driver_arrived', 'in_progress']
    .includes(searchStatus);

  const panelStyle = styles.bottomPanel;


  return (
    <View style={styles.container}>

      {/* ══ MAPA ══ */}
      {!userLocation && (
        <View style={[styles.map, styles.mapLoading]}>
          <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} />
          <Text style={styles.mapLoadingText}>Obteniendo ubicación...</Text>
        </View>
      )}
      {userLocation && <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        mapType={mapType}
        showsUserLocation
        showsMyLocationButton={false}
        mapPadding={{ top: 0, right: 0, bottom: 360, left: 0 }}
        initialRegion={{
          latitude:      userLocation.latitude,
          longitude:     userLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {dropoffCoords && (
          <Marker coordinate={dropoffCoords} title="Destino" description={dropoffAddress}>
            <View style={styles.destMarker}>
              <Text style={styles.destMarkerText}>📍</Text>
            </View>
          </Marker>
        )}
        {/* Ruta pickup→destino: solo antes de que el conductor esté asignado */}
        {userLocation && dropoffCoords && !['driver_assigned', 'driver_arrived', 'in_progress'].includes(searchStatus) && (
          <MapViewDirections
            origin={userLocation}
            destination={dropoffCoords}
            apikey={GOOGLE_MAPS_KEY}
            strokeWidth={4}
            strokeColor={BRAND_COLORS.PRIMARY}
            onReady={fitMapToRoute}
          />
        )}

        {/* Ruta conductor→pasajero: cuando el conductor viene en camino */}
        {driverLocation && userLocation && ['driver_assigned', 'driver_arrived'].includes(searchStatus) && (
          <MapViewDirections
            origin={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }}
            destination={userLocation}
            apikey={GOOGLE_MAPS_KEY}
            strokeWidth={4}
            strokeColor={BRAND_COLORS.PRIMARY}
            optimizeWaypoints={false}
          />
        )}

        {driverLocation && (
          <Marker
            coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }}
            title={assignedDriver?.name ?? 'Your driver'}
          >
            <View style={styles.driverMarker}>
              <Text style={styles.driverMarkerText}>🚗</Text>
            </View>
          </Marker>
        )}
      </MapView>}

      {/* ── CONTROLES DE ZOOM ── */}
      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn}>
          <Text style={styles.zoomBtnText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut}>
          <Text style={styles.zoomBtnText}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomBtn} onPress={() => handleZoomReset(userLocation)}>
          <Text style={styles.zoomBtnIcon}>📍</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.zoomBtn, mapType === 'hybrid' && styles.zoomBtnActive]}
          onPress={() => setMapType(t => t === 'hybrid' ? 'standard' : 'hybrid')}
        >
          <Text style={styles.zoomBtnIcon}>{mapType === 'hybrid' ? '🏙️' : '🛰️'}</Text>
        </TouchableOpacity>
      </View>

      {/* ══ HEADER ══ */}
      <SafeAreaView style={styles.headerSafe}>
        <View style={styles.header}>
          <View style={styles.headerLogo}>
            <Image source={require('../../assets/logo.png')} style={{ width: 32, height: 32 }} resizeMode="contain" />
          </View>
          <Text style={styles.headerName}>{user?.name?.split(' ')[0] ?? 'VERONA Ride'}</Text>
          <TouchableOpacity onPress={handleProfileMenu} style={styles.profileBtn}>
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ══ OVERLAY DE BÚSQUEDA (pantalla completa) ══ */}
      {isSearchingDest && (
        <View style={styles.searchOverlay}>
          {/* Botón cerrar — siempre visible en esquina superior derecha */}
          <TouchableOpacity onPress={closeSearch} style={styles.closeBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <SafeAreaView style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.searchPaneHeader}>
              <Text style={styles.searchPaneTitle}>Where to?</Text>
            </View>

            {/* Pickup referencia */}
            <View style={[styles.locationRow, { marginHorizontal: 16 }]}>
              <View style={[styles.dot, { backgroundColor: BRAND_COLORS.ACCENT }]} />
              <Text style={styles.locationText} numberOfLines={1}>{pickupAddress}</Text>
            </View>

            {/* Input de búsqueda */}
            <View style={styles.searchInputRow}>
              <View style={[styles.dot, { backgroundColor: BRAND_COLORS.ALERT, marginLeft: 4 }]} />
              <TextInput
                ref={searchRef}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={handleSearchChange}
                onSubmitEditing={searchByText}
                placeholder="Type name or address..."
                placeholderTextColor="#aaa"
                returnKeyType="search"
                autoFocus
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {isLoadingPredictions || isResolvingPlace ? (
                <ActivityIndicator size="small" color={BRAND_COLORS.PRIMARY} style={styles.searchSpinner} />
              ) : (
                <TouchableOpacity
                  style={styles.searchBtn}
                  onPress={searchByText}
                  disabled={!searchQuery.trim()}
                >
                  <Text style={styles.searchBtnText}>Buscar</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Lista de sugerencias */}
            {predictions.length > 0 && (
              <ScrollView
                style={styles.predictionsList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {predictions.map((p, i) => (
                  <TouchableOpacity
                    key={p.place_id}
                    style={[styles.predictionRow, i < predictions.length - 1 && styles.predictionRowBorder]}
                    onPress={() => void selectPrediction(p)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.predictionIcon}>📍</Text>
                    <View style={styles.predictionTexts}>
                      <Text style={styles.predictionMain} numberOfLines={1}>
                        {p.structured_formatting.main_text}
                      </Text>
                      <Text style={styles.predictionSub} numberOfLines={1}>
                        {p.structured_formatting.secondary_text}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {predictions.length === 0 && !isLoadingPredictions && searchQuery.length > 0 && (
              <Text style={styles.searchHint}>
                Presiona Buscar o sigue escribiendo para ver sugerencias
              </Text>
            )}
          </SafeAreaView>
        </View>
      )}

      {/* ══ PANEL INFERIOR ══ */}
      {panelVisible && <View style={panelStyle}>

        {searchStatus === 'idle' && (
          <>
            {!isSearchingDest && (
              /* ── MODO NORMAL ── */
              <View style={styles.idlePane}>
                {/* Pickup */}
                <View style={styles.locationRow}>
                  <View style={[styles.dot, { backgroundColor: BRAND_COLORS.ACCENT }]} />
                  <Text style={styles.locationText} numberOfLines={1}>{pickupAddress}</Text>
                </View>

                {/* Destino */}
                <TouchableOpacity
                  style={[styles.locationRow, styles.destRow]}
                  onPress={openSearch}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dot, { backgroundColor: BRAND_COLORS.ALERT }]} />
                  <Text
                    style={[styles.locationText, !dropoffAddress && styles.placeholderText]}
                    numberOfLines={1}
                  >
                    {dropoffAddress || 'Buscar destino'}
                  </Text>
                  {dropoffAddress ? (
                    <TouchableOpacity
                      onPress={clearDestination}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Text style={styles.clearX}>✕</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.searchGlass}>🔎</Text>
                  )}
                </TouchableOpacity>

                {/* Grid de servicios con precios */}
                {dropoffCoords ? (
                  <>
                    {/* Línea de estado — solo visible si hay error o cargando */}
                    {estimateError && !isLoadingEstimates && (
                      <View style={styles.estimateErrorBanner}>
                        <Text style={styles.estimateErrorBannerText}>
                          ⚠️  {estimateError}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            setEstimateError(null);
                            setAllEstimates({});
                            setFareEstimate(null);
                            if (!userLocation || !dropoffCoords) return;
                            setIsLoadingEstimates(true);
                            void (async () => {
                              try {
                                const services: ServiceType[] = ['motorcycle', 'sedan', 'suv'];
                                const results = await Promise.allSettled(
                                  services.map(svc => rideMobileService.estimateFare({
                                    pickupLat: userLocation.latitude, pickupLng: userLocation.longitude,
                                    dropoffLat: dropoffCoords.latitude, dropoffLng: dropoffCoords.longitude,
                                    serviceType: svc, stateCode: user?.state_code ?? 'DC',
                                  }))
                                );
                                const est2: Partial<Record<ServiceType, FareEstimate>> = {};
                                services.forEach((svc, i) => {
                                  const r = results[i];
                                  if (r.status === 'fulfilled' && r.value) est2[svc] = r.value;
                                });
                                if (Object.keys(est2).length > 0) {
                                  setAllEstimates(est2);
                                  const active = est2[selectedService] ?? est2['sedan'];
                                  if (active) setFareEstimate(active);
                                } else {
                                  setEstimateError('Reintentar falló. Verifica tu conexión al servidor.');
                                }
                              } finally { setIsLoadingEstimates(false); }
                            })();
                          }}
                          style={styles.retryBannerBtn}
                        >
                          <Text style={styles.retryBannerBtnText}>↻ Reintentar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <View style={styles.serviceGrid}>
                      {SERVICE_OPTIONS.map(svc => {
                        const est      = allEstimates[svc.key];
                        const isActive = selectedService === svc.key;
                        const isSched  = svc.key === 'scheduled';
                        return (
                          <TouchableOpacity
                            key={svc.key}
                            style={[
                              styles.serviceCard,
                              isSched && styles.serviceCardFull,
                              isActive && styles.serviceCardActive,
                            ]}
                            onPress={() => {
                              setSelectedService(svc.key);
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            activeOpacity={0.75}
                          >
                            <Text style={styles.serviceCardEmoji}>{svc.emoji}</Text>
                            <Text style={[styles.serviceCardLabel, isActive && styles.textWhite]}>
                              {svc.label}
                            </Text>
                            {isSched ? (
                              <Text style={[styles.serviceCardBook, isActive && styles.textWhite]}>
                                Reservar →
                              </Text>
                            ) : isLoadingEstimates ? (
                              <ActivityIndicator
                                size="small"
                                color={isActive ? '#fff' : BRAND_COLORS.PRIMARY}
                                style={{ marginTop: 4 }}
                              />
                            ) : est ? (
                              <>
                                <Text style={[styles.serviceCardPrice, isActive && styles.textWhite]}>
                                  ${(est.total ?? 0).toFixed(2)}
                                </Text>
                                <Text style={[styles.serviceCardMeta, isActive && styles.textWhiteAlpha]}>
                                  {est.duration_minutes ?? 0} min · {((est.distance_miles ?? 0) * 1.609).toFixed(1)} km
                                </Text>
                                {est.surge_multiplier > 1 && (
                                  <Text style={styles.surgeTag}>⚡ Alta demanda</Text>
                                )}
                              </>
                            ) : (
                              <Text style={[styles.serviceCardPrice, { color: '#bbb' }]}>—</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                  </>
                ) : (
                  /* Chips sin destino */
                  <View style={styles.chipRow}>
                    {SERVICE_OPTIONS.map(svc => (
                      <TouchableOpacity
                        key={svc.key}
                        style={[styles.chip, selectedService === svc.key && styles.chipActive]}
                        onPress={() => {
                          setSelectedService(svc.key);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <Text style={styles.chipEmoji}>{svc.emoji}</Text>
                        <Text style={[styles.chipLabel, selectedService === svc.key && { color: '#fff' }]}>
                          {svc.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Badge de pasajero frecuente */}
                {isFrequentPassenger ? (
                  <View style={styles.loyaltyBadge}>
                    <Text style={styles.loyaltyBadgeText}>🎉 ¡Descuento del 10% por viajero frecuente aplicado!</Text>
                  </View>
                ) : (passengerRidesWeek >= 10 || passengerRidesMonth >= 40) ? (
                  <View style={[styles.loyaltyBadge, { backgroundColor: '#FFF7ED' }]}>
                    <Text style={[styles.loyaltyBadgeText, { color: '#C2410C' }]}>
                      {passengerRidesWeek >= 10
                        ? `🔥 ¡${15 - passengerRidesWeek} viajes más esta semana para 10% de descuento!`
                        : `🔥 ¡${50 - passengerRidesMonth} viajes más este mes para 10% de descuento!`}
                    </Text>
                  </View>
                ) : null}

                {/* Promo code */}
                {dropoffCoords && !promoApplied && (
                  <View style={styles.promoRow}>
                    <TextInput
                      style={styles.promoInput}
                      value={promoCode}
                      onChangeText={setPromoCode}
                      placeholder="Código de promo"
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="characters"
                      maxLength={30}
                    />
                    <TouchableOpacity
                      style={styles.promoBtn}
                      onPress={handleValidatePromo}
                      disabled={!promoCode.trim() || promoValidating}
                    >
                      {promoValidating
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.promoBtnText}>Aplicar</Text>
                      }
                    </TouchableOpacity>
                  </View>
                )}
                {promoApplied && (
                  <View style={styles.promoApplied}>
                    <Text style={styles.promoAppliedText}>🎉 {promoDiscount}% de descuento aplicado</Text>
                    <TouchableOpacity onPress={() => { setPromoApplied(false); setPromoCode(''); setPromoDiscount(0); }}>
                      <Text style={styles.promoRemove}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Botón solicitar */}
                <TouchableOpacity
                  style={[
                    styles.requestBtn,
                    (!canRequest || isLoadingEstimates) && styles.requestBtnDisabled,
                  ]}
                  onPress={handleRequestRide}
                  disabled={!canRequest || isLoadingEstimates}
                >
                  {isLoadingEstimates && dropoffCoords ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.requestBtnText}>{requestLabel()}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ── REQUESTING ── */}
        {searchStatus === 'requesting' && (
          <View style={styles.statusPanel}>
            <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} />
            <Text style={styles.statusTitle}>Procesando solicitud...</Text>
          </View>
        )}

        {/* ── SEARCHING ── */}
        {searchStatus === 'searching' && (
          <View style={styles.statusPanel}>
            <Animated.View style={[styles.pulseWrap, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.pulseEmoji}>🔍</Text>
            </Animated.View>
            <Text style={styles.statusTitle}>Buscando conductores...</Text>
            <Text style={styles.statusSub}>Buscando en un radio de {searchRadiusKm.toFixed(1)} km</Text>
          </View>
        )}

        {/* ── DRIVER_ASSIGNED ── */}
        {searchStatus === 'driver_assigned' && assignedDriver && (
          <View style={styles.driverPanel}>
            <View style={styles.driverInfo}>
              <UserAvatar
                name={assignedDriver.name}
                photoUrl={assignedDriver.photo_url}
                size={52}
              />
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{assignedDriver.name ?? 'Conductor'}</Text>
                {(assignedDriver.vehicle_brand || assignedDriver.vehicle_model) ? (
                  <Text style={styles.driverCar}>
                    {[assignedDriver.vehicle_color, assignedDriver.vehicle_brand, assignedDriver.vehicle_model]
                      .filter(Boolean).join(' ')}
                  </Text>
                ) : null}
                {assignedDriver.vehicle_plate ? (
                  <Text style={styles.driverPlate}>{assignedDriver.vehicle_plate}</Text>
                ) : null}
              </View>
              <Text style={styles.driverRating}>
                ⭐ {(Number(assignedDriver.rating_avg) || 5).toFixed(1)}
              </Text>
            </View>
            <Text style={styles.statusTitle}>Tu conductor está en camino</Text>
            {driverEtaMinutes !== null && (
              <Text style={styles.etaBadge}>🕐 ~{driverEtaMinutes} min de distancia</Text>
            )}
            {driverWaitMinutes >= 5 && (
              <TouchableOpacity
                style={styles.noShowBtn}
                onPress={() => Alert.alert(
                  '¿El conductor no está?',
                  'Han pasado más de 5 minutos. ¿Deseas cancelar y buscar otro conductor?',
                  [
                    { text: 'Seguir esperando', style: 'cancel' },
                    { text: 'Buscar otro conductor', style: 'destructive', onPress: handleCancel },
                  ]
                )}
              >
                <Text style={styles.noShowBtnText}>¿El conductor no está? ({driverWaitMinutes} min)</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── DRIVER_ARRIVED ── */}
        {searchStatus === 'driver_arrived' && assignedDriver && (
          <View style={styles.arrivedPanel}>
            <Text style={styles.bigEmoji}>🎉</Text>
            <Text style={styles.statusTitle}>¡Tu conductor llegó!</Text>
            <Text style={styles.statusSub}>
              {assignedDriver.vehicle_color} {assignedDriver.vehicle_brand} · {assignedDriver.vehicle_plate}
            </Text>
          </View>
        )}

        {/* ── NO_DRIVER_FOUND ── */}
        {searchStatus === 'no_driver_found' && (
          <View style={styles.statusPanel}>
            <Text style={styles.bigEmoji}>😔</Text>
            <Text style={styles.statusTitle}>No se encontraron conductores</Text>
            <Text style={styles.statusSub}>No hay conductores disponibles. Intenta de nuevo en unos minutos.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => resetPassengerState()}>
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── CANCELLED ── */}
        {searchStatus === 'cancelled' && (
          <View style={styles.statusPanel}>
            <Text style={styles.bigEmoji}>↩️</Text>
            <Text style={styles.statusTitle}>Viaje cancelado</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => resetPassengerState()}>
              <Text style={styles.retryBtnText}>Solicitar nuevo viaje</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>}

      {/* ── BOTÓN BUSCAR DESTINO (cuando panel está oculto) ── */}
      {!panelVisible && searchStatus === 'idle' && (
        <TouchableOpacity
          style={styles.searchFloatBtn}
          onPress={() => { setPanelVisible(true); openSearch(); }}
        >
          <Text style={styles.searchFloatBtnText}>🔎  ¿A dónde vas?</Text>
        </TouchableOpacity>
      )}

      {/* ── CANCELAR FLOTANTE ── */}
      {['requesting', 'searching', 'driver_assigned', 'driver_arrived', 'in_progress']
        .includes(searchStatus) && (
        <TouchableOpacity style={styles.cancelFloat} onPress={handleCancel}>
          <Text style={styles.cancelFloatText}>✕ Cancelar viaje</Text>
        </TouchableOpacity>
      )}

      {/* ── SOS ── */}
      {isActiveRide && (
        <View style={styles.sosContainer}>
          <SOSButton
            rideId={currentRide?.id}
            lat={userLocation?.latitude}
            lng={userLocation?.longitude}
          />
        </View>
      )}

      {/* Tip Modal (post-ride) */}
      {completedRideForTip && (
        <TipModal
          visible={tipModalVisible}
          rideId={completedRideForTip.rideId}
          driverName={completedRideForTip.driverName}
          rideTotal={completedRideForTip.total}
          onClose={() => { setTipModalVisible(false); router.push('/(passenger)/rating'); }}
          onSuccess={(amount) => {
            setTipModalVisible(false);
            Alert.alert('¡Gracias! 🙏', `Propina de $${amount.toFixed(2)} enviada a ${completedRideForTip.driverName}.`);
            router.push('/(passenger)/rating');
          }}
        />
      )}

      {/* Route deviation banner */}
      {deviated && (
        <View style={styles.deviationBanner}>
          <Text style={styles.deviationText}>🚨 Desvío de ruta detectado — si te sientes inseguro, presiona SOS</Text>
        </View>
      )}

      {/* ══ MENÚ DE PERFIL ══ */}
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
                <Text style={styles.menuAvatarName}>{user?.name ?? 'Mi cuenta'}</Text>
                <Text style={styles.menuAvatarHint}>
                  {uploadingPhoto ? 'Subiendo...' : 'Toca para cambiar foto'}
                </Text>
              </View>
            </TouchableOpacity>

            {[
              { icon: '💳', label: 'Métodos de pago',        route: '/(passenger)/payments'              as const },
              { icon: '📊', label: 'Mi gasto',               route: '/(passenger)/spending'              as const },
              { icon: '🗂️', label: 'Historial de viajes',    route: '/(passenger)/history'               as const },
              { icon: '📍', label: 'Lugares favoritos',      route: '/(passenger)/favorites'             as const },
              { icon: '♿', label: 'Perfil de accesibilidad', route: '/(passenger)/accessibility-profile' as const },
              { icon: '🚨', label: 'Contacto de emergencia', route: '/(passenger)/emergency-contact'     as const },
              { icon: '📄', label: 'Historial de recibos',   route: '/(passenger)/receipts'              as const },
              { icon: '🔧', label: 'Necesidades especiales',  route: '/(passenger)/special-needs'         as const },
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

            <View style={styles.menuDivider} />

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

            <View style={styles.menuDivider} />

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

      <InfoModal page={menuSubPage} onClose={() => setMenuSubPage(null)} />
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1 },
  map:       { ...StyleSheet.absoluteFillObject },
  mapLoading: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEF2FF' },
  mapLoadingText: { marginTop: 10, fontSize: 14, color: '#666', fontFamily: 'Inter_400Regular' },

  // Controles de zoom
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
  headerSafe: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 24 : 24,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 10,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  headerLogo: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  headerLogoText:  { fontSize: 18, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },
  headerName:      { flex: 1, fontSize: 18, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  profileBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center', alignItems: 'center', gap: 5,
    paddingHorizontal: 7,
  },
  hamburgerLine: {
    width: '100%', height: 2,
    backgroundColor: BRAND_COLORS.TEXT, borderRadius: 2,
  },

  // Marcadores
  destMarker: {
    backgroundColor: '#fff', borderRadius: 20, padding: 2,
    borderWidth: 2, borderColor: BRAND_COLORS.ALERT,
  },
  destMarkerText:  { fontSize: 22 },
  driverMarker: {
    backgroundColor: '#fff', borderRadius: 20, padding: 4,
    borderWidth: 2, borderColor: BRAND_COLORS.PRIMARY,
  },
  driverMarkerText: { fontSize: 20 },

  // Panel inferior
  bottomPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, elevation: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 32,
  },

  // ── Overlay de búsqueda (pantalla completa) ──
  searchOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#fff', zIndex: 20,
  },
  searchPaneHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  searchPaneTitle: { fontSize: 17, fontWeight: '600', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    right: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 30,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, elevation: 6,
  },
  closeBtnText: { fontSize: 16, color: '#333', fontWeight: '700' },
  searchFloatBtn: {
    position: 'absolute', bottom: 40, left: 20, right: 20,
    backgroundColor: '#fff', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 8,
  },
  searchFloatBtnText: { fontSize: 16, color: '#888', fontFamily: 'Inter_400Regular' },

  searchInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 10, marginBottom: 4,
    backgroundColor: '#F8F9FA', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1.5, borderColor: BRAND_COLORS.PRIMARY,
  },
  searchInput: {
    flex: 1, height: 48,
    fontSize: 16, color: BRAND_COLORS.TEXT, fontFamily: 'Inter_400Regular',
  },
  searchSpinner: { paddingHorizontal: 4 },
  searchBtn: {
    backgroundColor: BRAND_COLORS.PRIMARY,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8,
  },
  searchBtnText: { color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  predictionsList: { marginHorizontal: 16, marginTop: 4, maxHeight: 200 },
  predictionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 4,
  },
  predictionRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  predictionIcon:  { fontSize: 18 },
  predictionTexts: { flex: 1 },
  predictionMain:  { fontSize: 15, color: BRAND_COLORS.TEXT, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  predictionSub:   { fontSize: 12, color: '#888', marginTop: 2, fontFamily: 'Inter_400Regular' },
  searchHint: {
    textAlign: 'center', color: '#aaa', fontSize: 13,
    marginTop: 16, fontFamily: 'Inter_400Regular',
  },

  // ── Modo normal ──
  idlePane:  { padding: 12 },
  dot:           { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F8F9FA', borderRadius: 12,
    padding: 14, marginBottom: 8,
  },
  destRow:         { borderWidth: 1.5, borderColor: '#E8E8E8' },
  locationText:    { flex: 1, fontSize: 15, color: BRAND_COLORS.TEXT, fontFamily: 'Inter_400Regular' },
  placeholderText: { color: '#aaa' },
  clearX:          { fontSize: 14, color: '#aaa', fontWeight: '600' },
  searchGlass:     { fontSize: 16 },

  // Grid servicios
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 12 },
  serviceCard: {
    width: '47.5%', backgroundColor: '#F8F9FA',
    borderRadius: 14, padding: 14,
    borderWidth: 2, borderColor: 'transparent', minHeight: 100,
  },
  serviceCardActive:  { backgroundColor: BRAND_COLORS.PRIMARY, borderColor: BRAND_COLORS.PRIMARY },
  serviceCardFull:    { width: '100%' },
  serviceCardEmoji:   { fontSize: 24, marginBottom: 4 },
  serviceCardLabel:   { fontSize: 13, fontWeight: '600', color: '#555', fontFamily: 'Inter_600SemiBold' },
  serviceCardPrice:   { fontSize: 20, fontWeight: '700', color: BRAND_COLORS.TEXT, marginTop: 4, fontFamily: 'Inter_700Bold' },
  serviceCardMeta:    { fontSize: 11, color: '#888', marginTop: 2, fontFamily: 'Inter_400Regular' },
  serviceCardBook:    { fontSize: 13, color: '#666', marginTop: 4, fontFamily: 'Inter_400Regular' },
  textWhite:          { color: '#fff' },
  textWhiteAlpha:     { color: 'rgba(255,255,255,0.75)' },
  surgeTag: {
    fontSize: 10, color: '#F59E0B', fontWeight: '700',
    backgroundColor: '#FFFBEB', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, alignSelf: 'flex-start', marginTop: 4, fontFamily: 'Inter_700Bold',
  },
  estimateErrorBanner: {
    backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#FECACA',
  },
  estimateErrorBannerText: {
    fontSize: 13, color: '#B91C1C', fontFamily: 'Inter_400Regular', marginBottom: 8,
  },
  retryBannerBtn: {
    backgroundColor: '#EF4444', borderRadius: 8, alignSelf: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  retryBannerBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'Inter_600SemiBold' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: BRAND_COLORS.PRIMARY, borderColor: BRAND_COLORS.PRIMARY },
  chipEmoji:  { fontSize: 16 },
  chipLabel:  { fontSize: 14, fontWeight: '500', color: '#666', fontFamily: 'Inter_500Medium' },

  // Sub-selectors (Wait & Return / Hourly)
  subSelectorBox: {
    marginTop: 8, backgroundColor: '#F8FAFF',
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E0E7FF',
  },
  subSelectorTitle: {
    fontSize: 13, fontWeight: '600', color: '#374151',
    marginBottom: 10, fontFamily: 'Inter_600SemiBold',
  },
  subSelectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subSelectorChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#C7D2FE', backgroundColor: '#fff',
    alignItems: 'center',
  },
  subSelectorChipActive: {
    backgroundColor: BRAND_COLORS.PRIMARY, borderColor: BRAND_COLORS.PRIMARY,
  },
  subSelectorChipText: {
    fontSize: 13, fontWeight: '600', color: '#4B5563', fontFamily: 'Inter_600SemiBold',
  },
  subSelectorChipPrice: {
    fontSize: 12, color: '#4B5563', fontFamily: 'Inter_400Regular', marginTop: 2,
  },
  subSelectorChipTextActive: { color: '#fff' },
  subSelectorNote: {
    fontSize: 11, color: '#6B7280', marginTop: 8, fontFamily: 'Inter_400Regular',
  },

  requestBtn: {
    height: 56, backgroundColor: BRAND_COLORS.PRIMARY,
    borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  requestBtnDisabled: { backgroundColor: '#ccc' },
  requestBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  // Paneles de estado
  statusPanel:  { padding: 24, alignItems: 'center', minHeight: 180 },
  pulseWrap:    { marginBottom: 16 },
  pulseEmoji:   { fontSize: 48 },
  bigEmoji:     { fontSize: 48, marginBottom: 12 },
  arrivedPanel: { padding: 24, alignItems: 'center' },
  statusTitle: {
    fontSize: 20, fontWeight: '700', color: BRAND_COLORS.TEXT,
    marginBottom: 8, textAlign: 'center', fontFamily: 'Inter_700Bold',
  },
  statusSub: {
    fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22, fontFamily: 'Inter_400Regular',
  },
  cancelLink:     { marginTop: 16 },
  cancelLinkText: { fontSize: 15, color: BRAND_COLORS.ALERT, fontFamily: 'Inter_500Medium' },
  retryBtn: {
    marginTop: 16, height: 48, backgroundColor: BRAND_COLORS.PRIMARY,
    borderRadius: 12, paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center',
  },
  retryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  etaBadge: {
    fontSize: 15, color: BRAND_COLORS.PRIMARY, fontFamily: 'Inter_600SemiBold',
    fontWeight: '600', marginTop: 4, marginBottom: 8,
  },
  loyaltyBadge: {
    backgroundColor: '#22C55E15', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, alignItems: 'center',
  },
  loyaltyBadgeText: { fontSize: 14, color: '#16A34A', fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
  noShowBtn: {
    marginTop: 12, paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 20, borderWidth: 1.5, borderColor: BRAND_COLORS.ALERT,
    alignSelf: 'center',
  },
  noShowBtnText: { color: BRAND_COLORS.ALERT, fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  // Panel conductor
  driverPanel:      { padding: 20 },
  driverInfo:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  driverAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: BRAND_COLORS.PRIMARY, justifyContent: 'center', alignItems: 'center',
  },
  driverAvatarText: { fontSize: 22, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },
  driverDetails:    { flex: 1 },
  driverName:       { fontSize: 17, fontWeight: '600', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },
  driverCar:        { fontSize: 14, color: '#666', marginTop: 2, fontFamily: 'Inter_400Regular' },
  driverPlate:      { fontSize: 14, color: BRAND_COLORS.PRIMARY, fontWeight: '600', marginTop: 2, fontFamily: 'Inter_600SemiBold' },
  driverRating:     { fontSize: 15, fontWeight: '600', color: '#F59E0B', fontFamily: 'Inter_600SemiBold' },

  // Flotantes
  cancelFloat: {
    position: 'absolute', bottom: SCREEN_HEIGHT * 0.32 + 16, left: 16,
    backgroundColor: '#fff', borderWidth: 2, borderColor: BRAND_COLORS.ALERT,
    borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  cancelFloatText: { color: BRAND_COLORS.ALERT, fontSize: 15, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  sosContainer: {
    position: 'absolute', bottom: SCREEN_HEIGHT * 0.32 + 16, right: 16,
    shadowColor: '#DC2626', shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },

  // ── Promo code ──
  promoRow:         { flexDirection: 'row', gap: 8, marginBottom: 8 },
  promoInput:       { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#1E293B', backgroundColor: '#F8FAFC', letterSpacing: 1 },
  promoBtn:         { backgroundColor: BRAND_COLORS.PRIMARY, borderRadius: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  promoBtnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
  promoApplied:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0FFF4', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  promoAppliedText: { fontSize: 14, color: '#15803D', fontWeight: '600' },
  promoRemove:      { fontSize: 13, color: '#94A3B8', textDecorationLine: 'underline' },

  // ── Route deviation ──
  deviationBanner:  { position: 'absolute', top: 100, left: 16, right: 16, backgroundColor: '#DC2626', borderRadius: 12, padding: 14, zIndex: 999 },
  deviationText:    { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },

  // ── Menú de perfil ──
  menuOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingHorizontal: 20,
  },
  menuTitle: {
    fontSize: 16, fontWeight: '700', color: '#888',
    fontFamily: 'Inter_700Bold', marginBottom: 16, textAlign: 'center',
  },
  menuAvatarRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingBottom: 10, marginBottom: 4,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  menuAvatarInfo: { flex: 1 },
  menuAvatarName: { fontSize: 15, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  menuAvatarHint: { fontSize: 11, color: '#888', marginTop: 2, fontFamily: 'Inter_400Regular' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  menuItemIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  menuItemText: { fontSize: 14, color: BRAND_COLORS.TEXT, fontFamily: 'Inter_500Medium' },
  menuDivider:  { height: 4 },
  menuCloseBtn: {
    marginTop: 8, height: 42, borderRadius: 12,
    backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center',
  },
  menuCloseBtnText: { fontSize: 14, fontWeight: '600', color: '#555', fontFamily: 'Inter_600SemiBold' },
});
