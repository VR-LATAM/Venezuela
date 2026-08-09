// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Historial de servicios del conductor
// Muestra: nombre del pasajero, ruta, monto recibido
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  FlatList, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { apiClient } from '../../src/services/apiClient';
import { BRAND_COLORS } from '@vride/shared';

interface ServiceItem {
  id:              string;
  status:          string;
  service_type:    string;
  pickup_address:  string;
  dropoff_address: string;
  driver_earnings: number | null;
  total_charged:   number | null;
  payment_status:  string;
  passenger_name?: string;
  distance_km:     number | null;
  duration_minutes: number | null;
  completed_at:    string | null;
  created_at:      string;
}

function computeSummary(rides: ServiceItem[]) {
  const completed = rides.filter(r => r.status === 'completed' && r.driver_earnings);
  const now            = new Date();
  const startOfWeek    = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0,0,0,0);
  const startOfMonth   = new Date(now.getFullYear(), now.getMonth(), 1);

  const total     = completed.reduce((s, r) => s + Number(r.driver_earnings ?? 0), 0);
  const thisMonth = completed.filter(r => new Date(r.completed_at ?? r.created_at) >= startOfMonth)
                             .reduce((s, r) => s + Number(r.driver_earnings ?? 0), 0);
  const thisWeek  = completed.filter(r => new Date(r.completed_at ?? r.created_at) >= startOfWeek)
                             .reduce((s, r) => s + Number(r.driver_earnings ?? 0), 0);
  return { total, thisMonth, thisWeek, count: completed.length };
}

export default function ServiceHistoryScreen() {
  const [rides, setRides]               = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [offset, setOffset]             = useState(0);
  const [hasMore, setHasMore]           = useState(true);
  const LIMIT = 30;

  const loadRides = async (reset = false) => {
    if (reset) setIsLoading(true);
    else setIsLoadingMore(true);
    try {
      const o = reset ? 0 : offset;
      const { data } = await apiClient.get<{ data: ServiceItem[] }>(
        `/ride/history?limit=${LIMIT}&offset=${o}`
      );
      const fetched = (data.data ?? []).filter(r => r.status === 'completed');
      setRides(prev => reset ? fetched : [...prev, ...fetched]);
      setOffset(o + (data.data ?? []).length);
      setHasMore((data.data ?? []).length === LIMIT);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el historial de servicios.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => { void loadRides(true); }, []);

  const summary = computeSummary(rides);

  const renderItem = ({ item }: { item: ServiceItem }) => {
    const date = new Date(item.completed_at ?? item.created_at);
    return (
      <View style={styles.card}>
        {/* Cabecera: pasajero + fecha */}
        <View style={styles.cardHeader}>
          <View style={styles.passengerAvatar}>
            <Text style={styles.passengerInitial}>
              {(item.passenger_name ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.passengerName}>{item.passenger_name ?? 'Pasajero'}</Text>
            <Text style={styles.cardDate}>
              {date.toLocaleDateString('es-VE', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Ganado</Text>
            <Text style={styles.amountValue}>
              +${Number(item.driver_earnings ?? 0).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Ruta */}
        <View style={styles.routeBlock}>
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: BRAND_COLORS.ACCENT }]} />
            <Text style={styles.routeText} numberOfLines={1}>{item.pickup_address}</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: BRAND_COLORS.ALERT }]} />
            <Text style={styles.routeText} numberOfLines={1}>{item.dropoff_address}</Text>
          </View>
        </View>

        {/* Métricas */}
        <View style={styles.metaRow}>
          {item.distance_km !== null && (
            <Text style={styles.metaChip}>
              📏 {Number(item.distance_km).toFixed(1)} km
            </Text>
          )}
          {item.duration_minutes !== null && (
            <Text style={styles.metaChip}>
              ⏱ {item.duration_minutes} min
            </Text>
          )}
          <Text style={styles.metaChip}>
            {item.service_type === 'accessible' ? '♿' :
             item.service_type === 'executive'  ? '🚙' : '🚗'} {item.service_type}
          </Text>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <>
      {/* Resumen */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCardMain}>
          <Text style={styles.summaryMainLabel}>Total ganado</Text>
          <Text style={styles.summaryMainAmount}>${summary.total.toFixed(2)}</Text>
          <Text style={styles.summaryMainSub}>{summary.count} servicios completados</Text>
        </View>
        <View style={styles.summaryCol}>
          <View style={styles.summaryCardSmall}>
            <Text style={styles.summarySmallLabel}>Este mes</Text>
            <Text style={styles.summarySmallAmount}>${summary.thisMonth.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryCardSmall}>
            <Text style={styles.summarySmallLabel}>Esta semana</Text>
            <Text style={styles.summarySmallAmount}>${summary.thisWeek.toFixed(2)}</Text>
          </View>
        </View>
      </View>
      {rides.length > 0 && <Text style={styles.sectionTitle}>Servicios</Text>}
    </>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Historial de servicios</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={r => r.id}
          renderItem={renderItem}
          ListHeaderComponent={<ListHeader />}
          contentContainerStyle={styles.list}
          onEndReached={() => hasMore && !isLoadingMore && loadRides()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={isLoadingMore
            ? <ActivityIndicator style={{ marginVertical: 16 }} color={BRAND_COLORS.PRIMARY} />
            : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={{ fontSize: 48 }}>🗺️</Text>
              <Text style={styles.emptyText}>Aún no hay servicios completados</Text>
            </View>
          }
        />
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 48 },
  emptyText: { fontSize: 16, color: '#888', fontFamily: 'Inter_400Regular' },
  list: { padding: 16, paddingBottom: 32 },

  // Resumen
  summaryGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  summaryCardMain: {
    flex: 1.4, backgroundColor: BRAND_COLORS.ACCENT,
    borderRadius: 18, padding: 20, justifyContent: 'center',
  },
  summaryMainLabel:  { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_400Regular', marginBottom: 4 },
  summaryMainAmount: { fontSize: 30, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },
  summaryMainSub:    { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter_400Regular', marginTop: 6 },
  summaryCol: { flex: 1, gap: 10 },
  summaryCardSmall: {
    flex: 1, backgroundColor: '#F8F9FA', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#EEEEEE', justifyContent: 'center',
  },
  summarySmallLabel:  { fontSize: 11, color: '#888', fontFamily: 'Inter_400Regular', marginBottom: 4 },
  summarySmallAmount: { fontSize: 18, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },

  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#888', fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
  },

  // Tarjeta de servicio
  card: {
    backgroundColor: '#F8F9FA', borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  passengerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: BRAND_COLORS.PRIMARY,
    justifyContent: 'center', alignItems: 'center',
  },
  passengerInitial: { fontSize: 18, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },
  cardHeaderInfo: { flex: 1 },
  passengerName: { fontSize: 16, fontWeight: '600', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },
  cardDate: { fontSize: 12, color: '#AAA', fontFamily: 'Inter_400Regular', marginTop: 2 },
  amountBox: { alignItems: 'flex-end' },
  amountLabel: { fontSize: 11, color: '#888', fontFamily: 'Inter_400Regular' },
  amountValue: { fontSize: 20, fontWeight: '700', color: BRAND_COLORS.ACCENT, fontFamily: 'Inter_700Bold' },

  // Ruta
  routeBlock: { marginBottom: 10, gap: 4 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeText: { flex: 1, fontSize: 13, color: '#555', fontFamily: 'Inter_400Regular' },
  routeLine: { width: 2, height: 10, backgroundColor: '#DDD', marginLeft: 3 },

  // Meta
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: {
    fontSize: 12, color: '#666', fontFamily: 'Inter_400Regular',
    backgroundColor: '#fff', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
});
