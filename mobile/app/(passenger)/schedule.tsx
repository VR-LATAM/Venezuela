// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Pantalla de viajes programados del pasajero
// Pestaña 1: Agendar nuevo viaje (formulario + date/time picker)
// Pestaña 2: Mis viajes programados (lista con cancelación)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, TextInput, Alert, ActivityIndicator,
  Platform, FlatList, KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { scheduledRideService, ScheduledRide } from '../../src/services/scheduledRideService';
import { useRideStore } from '../../src/store/rideStore';
import { BRAND_COLORS } from '@vride/shared';

type Tab = 'book' | 'list';

const SERVICE_OPTIONS = [
  { key: 'standard',   label: 'Estándar',   emoji: '🚗' },
  { key: 'executive',  label: 'Ejecutivo',  emoji: '🚙' },
  { key: 'accessible', label: 'Accesible',  emoji: '♿' },
  { key: 'military',   label: 'Militar',    emoji: '🎖️' },
];

const STATUS_LABELS: Record<ScheduledRide['status'], string> = {
  pending:     'Pendiente',
  dispatching: 'Buscando conductor',
  assigned:    'Conductor asignado',
  cancelled:   'Cancelado',
  completed:   'Completado',
};
const STATUS_COLORS: Record<ScheduledRide['status'], string> = {
  pending:     BRAND_COLORS.PRIMARY,
  dispatching: BRAND_COLORS.ACCENT,
  assigned:    '#22C55E',
  cancelled:   BRAND_COLORS.ALERT,
  completed:   '#888',
};

// Retorna el mínimo ISO 8601 para el picker (30 min desde ahora)
function minDateTime(): string {
  const d = new Date(Date.now() + 31 * 60 * 1000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

function formatScheduledAt(iso: string): string {
  return new Date(iso).toLocaleString('es-VE', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ScheduleScreen() {
  const { fareEstimate } = useRideStore();
  const [tab, setTab]                     = useState<Tab>('book');
  const [serviceType, setServiceType]     = useState('standard');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  // Fecha y hora como strings separados para facilitar el input manual
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isBooking, setIsBooking]         = useState(false);
  const [rides, setRides]                 = useState<ScheduledRide[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [cancellingId, setCancellingId]   = useState<string | null>(null);

  // Pre-rellenar dirección de recogida desde el home si hay una activa
  useEffect(() => {
    // El pasajero puede venir con dirección ya rellenada del mapa principal
  }, []);

  const loadList = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const list = await scheduledRideService.list();
      setRides(list);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los viajes programados.');
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'list') loadList();
  }, [tab, loadList]);

  const handleBook = async () => {
    if (!pickupAddress.trim() || !dropoffAddress.trim()) {
      Alert.alert('Campos requeridos', 'Por favor ingresa las direcciones de recogida y destino.');
      return;
    }
    if (!scheduledDate || !scheduledTime) {
      Alert.alert('Fecha y hora requeridas', 'Por favor ingresa la fecha y hora del viaje.');
      return;
    }

    // Convertir DD/MM/YYYY + HH:MM a Date (hora local del usuario)
    const dateParts = scheduledDate.split('/');
    if (dateParts.length !== 3) {
      Alert.alert('Fecha inválida', 'Usa el formato DD/MM/AAAA (ej. 23/04/2026).');
      return;
    }
    const [day, month, year] = dateParts;
    const scheduled = new Date(`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}T${scheduledTime}:00`);
    if (isNaN(scheduled.getTime())) {
      Alert.alert('Fecha inválida', 'Por favor verifica el formato de fecha y hora.');
      return;
    }
    if (scheduled.getTime() - Date.now() < 30 * 60 * 1000) {
      Alert.alert('Muy pronto', 'Los viajes deben programarse con al menos 30 minutos de anticipación.');
      return;
    }

    setIsBooking(true);
    try {
      await scheduledRideService.book({
        serviceType,
        pickupAddress:  pickupAddress.trim(),
        pickupLat:      0, // En producción vendría de geocodificación
        pickupLng:      0,
        dropoffAddress: dropoffAddress.trim(),
        scheduledAt:    scheduled.toISOString(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '¡Viaje programado!',
        `Tu viaje para el ${formatScheduledAt(scheduled.toISOString())} ha sido reservado. Te enviaremos un recordatorio 30 minutos antes.`,
        [{ text: 'Ver mis viajes', onPress: () => { setTab('list'); loadList(); } }]
      );
      // Limpiar formulario
      setPickupAddress(''); setDropoffAddress('');
      setScheduledDate(''); setScheduledTime('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('TOO_SOON')) {
        Alert.alert('Muy pronto', 'Mínimo 30 minutos de anticipación.');
      } else {
        Alert.alert('Error', 'No se pudo programar el viaje. Inténtalo de nuevo.');
      }
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancel = (ride: ScheduledRide) => {
    Alert.alert(
      'Cancelar viaje',
      `¿Cancelar el viaje del ${formatScheduledAt(ride.scheduled_at)}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(ride.id);
            try {
              await scheduledRideService.cancel(ride.id);
              setRides(prev => prev.map(r => r.id === ride.id ? { ...r, status: 'cancelled' } : r));
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch {
              Alert.alert('Error', 'No se pudo cancelar el viaje.');
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Viajes programados</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['book', 'list'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
            accessibilityRole="tab"
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'book' ? '📅  Programar' : '📋  Mis viajes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'book' ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

          {/* Service type */}
          <Text style={styles.label}>Tipo de servicio</Text>
          <View style={styles.serviceRow}>
            {SERVICE_OPTIONS.map(s => (
              <TouchableOpacity
                key={s.key}
                style={[styles.serviceChip, serviceType === s.key && styles.serviceChipActive]}
                onPress={() => setServiceType(s.key)}
              >
                <Text style={styles.serviceEmoji}>{s.emoji}</Text>
                <Text style={[styles.serviceLabel, serviceType === s.key && styles.serviceLabelActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Origen */}
          <Text style={styles.label}>Dirección de recogida</Text>
          <TextInput
            style={styles.input}
            value={pickupAddress}
            onChangeText={setPickupAddress}
            placeholder="Ingresa la dirección de recogida"
            placeholderTextColor="#AAA"
            returnKeyType="next"
          />

          {/* Destino */}
          <Text style={styles.label}>Destino</Text>
          <TextInput
            style={styles.input}
            value={dropoffAddress}
            onChangeText={setDropoffAddress}
            placeholder="Ingresa la dirección de destino"
            placeholderTextColor="#AAA"
            returnKeyType="next"
          />

          {/* Date & time */}
          <Text style={styles.label}>Fecha del viaje</Text>
          <TextInput
            style={styles.input}
            value={scheduledDate}
            onChangeText={setScheduledDate}
            placeholder="DD/MM/AAAA  (ej. 23/04/2026)"
            placeholderTextColor="#AAA"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />

          <Text style={styles.label}>Hora del viaje</Text>
          <TextInput
            style={styles.input}
            value={scheduledTime}
            onChangeText={setScheduledTime}
            placeholder="HH:MM  (ej. 09:30)"
            placeholderTextColor="#AAA"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ⏰ Los viajes programados se despachan 15 minutos antes de la hora indicada. Recibirás un recordatorio 30 minutos antes.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.bookBtn, isBooking && styles.bookBtnDisabled]}
            onPress={handleBook}
            disabled={isBooking}
            accessibilityRole="button"
          >
            {isBooking
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.bookBtnText}>Programar viaje</Text>
            }
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
        </KeyboardAvoidingView>

      ) : (
        isLoadingList ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} />
          </View>
        ) : (
          <FlatList
            data={rides}
            keyExtractor={r => r.id}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.emptyEmoji}>📅</Text>
                <Text style={styles.emptyText}>Aún no hay viajes programados</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.rideCard}>
                <View style={styles.rideCardTop}>
                  <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] }]} />
                  <Text style={[styles.statusLabel, { color: STATUS_COLORS[item.status] }]}>
                    {STATUS_LABELS[item.status]}
                  </Text>
                  {item.status === 'pending' && (
                    <TouchableOpacity
                      style={styles.cancelSmallBtn}
                      onPress={() => handleCancel(item)}
                      disabled={cancellingId === item.id}
                    >
                      {cancellingId === item.id
                        ? <ActivityIndicator size="small" color={BRAND_COLORS.ALERT} />
                        : <Text style={styles.cancelSmallText}>Cancelar</Text>
                      }
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.rideDate}>{formatScheduledAt(item.scheduled_at)}</Text>
                <View style={styles.rideAddresses}>
                  <Text style={styles.rideFrom} numberOfLines={1}>🟢 {item.pickup_address}</Text>
                  <Text style={styles.rideTo}   numberOfLines={1}>🔴 {item.dropoff_address}</Text>
                </View>
              </View>
            )}
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff', paddingTop: 24 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#F8F9FA' },
  backBtnText: { fontSize: 22, color: BRAND_COLORS.TEXT },
  title: { fontSize: 18, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: BRAND_COLORS.PRIMARY },
  tabText: { fontSize: 15, color: '#888', fontFamily: 'Inter_500Medium' },
  tabTextActive: { color: BRAND_COLORS.PRIMARY, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  form: { padding: 16, gap: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', fontFamily: 'Inter_600SemiBold', marginTop: 12, marginBottom: 6 },
  input: {
    height: 52, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 14, fontSize: 16, color: BRAND_COLORS.TEXT,
    backgroundColor: '#FAFAFA', fontFamily: 'Inter_400Regular',
  },
  serviceRow: { flexDirection: 'row', gap: 8 },
  serviceChip: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#FAFAFA',
  },
  serviceChipActive: { borderColor: BRAND_COLORS.PRIMARY, backgroundColor: BRAND_COLORS.PRIMARY + '10' },
  serviceEmoji: { fontSize: 22, marginBottom: 4 },
  serviceLabel: { fontSize: 12, color: '#888', fontFamily: 'Inter_500Medium' },
  serviceLabelActive: { color: BRAND_COLORS.PRIMARY, fontWeight: '600' },

  infoBox: {
    backgroundColor: BRAND_COLORS.ACCENT + '15', borderRadius: 12,
    padding: 14, marginTop: 16,
  },
  infoText: { fontSize: 13, color: '#666', fontFamily: 'Inter_400Regular', lineHeight: 20 },

  bookBtn: {
    height: 56, backgroundColor: BRAND_COLORS.PRIMARY, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginTop: 20,
  },
  bookBtnDisabled: { opacity: 0.6 },
  bookBtnText: { fontSize: 18, color: '#fff', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 16, color: '#888', fontFamily: 'Inter_400Regular' },

  rideCard: {
    backgroundColor: '#F8F9FA', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: '#EFEFEF',
  },
  rideCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold', flex: 1 },
  cancelSmallBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: BRAND_COLORS.ALERT + '15', borderRadius: 8 },
  cancelSmallText: { fontSize: 13, color: BRAND_COLORS.ALERT, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  rideDate: { fontSize: 16, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  rideAddresses: { gap: 4 },
  rideFrom: { fontSize: 14, color: '#555', fontFamily: 'Inter_400Regular' },
  rideTo:   { fontSize: 14, color: '#555', fontFamily: 'Inter_400Regular' },
});
