// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Pantalla de gastos del pasajero — resumen + historial de cobros
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  FlatList, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { apiClient } from '../../src/services/apiClient';
import { BRAND_COLORS } from '@vride/shared';

interface RideHistoryItem {
  id:                string;
  status:            string;
  service_type:      string;
  pickup_address:    string;
  dropoff_address:   string;
  total_charged:     number | null;
  cancellation_fee:  number | null;
  payment_status:    string;
  completed_at:      string | null;
  cancelled_at:      string | null;
  created_at:        string;
}

function isChargeable(r: RideHistoryItem) {
  const isCompletedRide = r.status === 'completed' && r.payment_status === 'completed' && r.total_charged;
  const isCancelFee     = r.status === 'cancelled_passenger' && Number(r.cancellation_fee ?? 0) > 0;
  return isCompletedRide || isCancelFee;
}

function chargeAmount(r: RideHistoryItem): number {
  if (r.status === 'cancelled_passenger') return Number(r.cancellation_fee ?? 0);
  return Number(r.total_charged ?? 0);
}

function chargeDate(r: RideHistoryItem): Date {
  return new Date(r.completed_at ?? r.cancelled_at ?? r.created_at);
}

function computeSummary(rides: RideHistoryItem[]) {
  const paid = rides.filter(isChargeable);
  const now   = new Date();
  const startOfWeek  = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0,0,0,0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const total     = paid.reduce((s, r) => s + chargeAmount(r), 0);
  const thisMonth = paid.filter(r => chargeDate(r) >= startOfMonth).reduce((s, r) => s + chargeAmount(r), 0);
  const thisWeek  = paid.filter(r => chargeDate(r) >= startOfWeek).reduce((s, r) => s + chargeAmount(r), 0);
  return { total, thisMonth, thisWeek, count: paid.length };
}

export default function SpendingScreen() {
  const [rides, setRides]         = useState<RideHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset]       = useState(0);
  const [hasMore, setHasMore]     = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const LIMIT = 50;

  const loadRides = async (reset = false) => {
    if (reset) setIsLoading(true);
    else setIsLoadingMore(true);
    try {
      const o = reset ? 0 : offset;
      const { data } = await apiClient.get<{ data: RideHistoryItem[] }>(
        `/ride/history?limit=${LIMIT}&offset=${o}`
      );
      const fetched = data.data ?? [];
      setRides(prev => reset ? fetched : [...prev, ...fetched]);
      setOffset(o + fetched.length);
      setHasMore(fetched.length === LIMIT);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el historial de gastos.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => { void loadRides(true); }, []);

  const paid = rides.filter(isChargeable);
  const summary = computeSummary(rides);

  const renderItem = ({ item }: { item: RideHistoryItem }) => {
    if (!isChargeable(item)) return null;
    const isCancelFee = item.status === 'cancelled_passenger';
    const date = chargeDate(item);
    const amount = chargeAmount(item);
    return (
      <View style={styles.txRow}>
        <View style={[styles.txIcon, isCancelFee && styles.txIconCancel]}>
          <Text style={{ fontSize: 20 }}>
            {isCancelFee ? '❌' : item.service_type === 'accessible' ? '♿' : item.service_type === 'executive' ? '🚙' : '🚗'}
          </Text>
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txTo} numberOfLines={1}>
            {isCancelFee ? 'Cargo por cancelación' : item.dropoff_address}
          </Text>
          <Text style={styles.txDate}>
            {date.toLocaleDateString('es-VE', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
          {isCancelFee && (
            <Text style={styles.txCancelSub} numberOfLines={1}>{item.pickup_address}</Text>
          )}
        </View>
        <Text style={[styles.txAmount, isCancelFee && styles.txAmountCancel]}>
          −${amount.toFixed(2)}
        </Text>
      </View>
    );
  };

  const ListHeader = () => (
    <>
      {/* ── Tarjetas de resumen ── */}
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, styles.summaryCardMain]}>
          <Text style={styles.summaryMainLabel}>Total gastado</Text>
          <Text style={styles.summaryMainAmount}>${summary.total.toFixed(2)}</Text>
          <Text style={styles.summaryMainSub}>{summary.count} transacción{summary.count !== 1 ? 'es' : ''}</Text>
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

      {/* ── Título de la lista ── */}
      {paid.length > 0 && (
        <Text style={styles.sectionTitle}>Transacciones</Text>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mi gasto</Text>
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
              <Text style={{ fontSize: 48 }}>💳</Text>
              <Text style={styles.emptyText}>Aún sin cobros</Text>
              <Text style={styles.emptySubText}>Tus pagos de viaje aparecerán aquí</Text>
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
  backBtn: {
    width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
    borderRadius: 20, backgroundColor: '#F8F9FA',
  },
  backBtnText: { fontSize: 22, color: BRAND_COLORS.TEXT },
  title: { fontSize: 18, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 48 },
  emptyText:    { fontSize: 18, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  emptySubText: { fontSize: 14, color: '#888', fontFamily: 'Inter_400Regular', textAlign: 'center' },

  list: { padding: 16, paddingBottom: 32 },

  // Resumen
  summaryGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  summaryCard: {
    flex: 1.4,
    backgroundColor: BRAND_COLORS.PRIMARY,
    borderRadius: 18,
    padding: 20,
    justifyContent: 'center',
  },
  summaryCardMain: {},
  summaryMainLabel:  { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_400Regular', marginBottom: 4 },
  summaryMainAmount: { fontSize: 32, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },
  summaryMainSub:    { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter_400Regular', marginTop: 6 },

  summaryCol: { flex: 1, gap: 10 },
  summaryCardSmall: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    justifyContent: 'center',
  },
  summarySmallLabel:  { fontSize: 11, color: '#888', fontFamily: 'Inter_400Regular', marginBottom: 4 },
  summarySmallAmount: { fontSize: 18, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },

  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#888',
    fontFamily: 'Inter_700Bold', letterSpacing: 0.8,
    textTransform: 'uppercase', marginBottom: 10,
  },

  // Transacciones
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  txIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: BRAND_COLORS.PRIMARY + '12',
    justifyContent: 'center', alignItems: 'center',
  },
  txIconCancel: { backgroundColor: BRAND_COLORS.ALERT + '15' },
  txInfo: { flex: 1 },
  txTo:   { fontSize: 15, color: BRAND_COLORS.TEXT, fontFamily: 'Inter_500Medium' },
  txDate: { fontSize: 12, color: '#AAA', fontFamily: 'Inter_400Regular', marginTop: 2 },
  txCancelSub: { fontSize: 11, color: '#BBB', fontFamily: 'Inter_400Regular', marginTop: 1 },
  txAmount: {
    fontSize: 16, fontWeight: '700',
    color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold',
  },
  txAmountCancel: { color: BRAND_COLORS.ALERT },
});
