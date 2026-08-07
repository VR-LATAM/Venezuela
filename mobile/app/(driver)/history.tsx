// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Historial de viajes del conductor — lista + detalle + recibo PDF
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  FlatList, Alert, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { apiClient } from '../../src/services/apiClient';
import { BRAND_COLORS } from '@vride/shared';

interface RideHistoryItem {
  id:               string;
  status:           string;
  service_type:     string;
  pickup_address:   string;
  dropoff_address:  string;
  total_charged:    number | null;
  driver_earnings:  number | null;
  distance_km:      number | null;
  duration_minutes: number | null;
  base_fare:        number | null;
  distance_fare:    number | null;
  time_fare:        number | null;
  surge_multiplier: number;
  platform_commission: number | null;
  payment_status:   string;
  completed_at:     string | null;
  created_at:       string;
}

export default function DriverHistoryScreen() {
  const [rides, setRides]                 = useState<RideHistoryItem[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [offset, setOffset]               = useState(0);
  const [hasMore, setHasMore]             = useState(true);
  const [selected, setSelected]           = useState<RideHistoryItem | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const LIMIT = 20;

  const loadRides = useCallback(async (reset = false) => {
    if (reset) setIsLoading(true);
    else setIsLoadingMore(true);
    try {
      const o = reset ? 0 : offset;
      const { data } = await apiClient.get<{ rides: RideHistoryItem[] }>(
        `/ride/history?limit=${LIMIT}&offset=${o}`
      );
      const fetched = data.rides ?? [];
      setRides(prev => reset ? fetched : [...prev, ...fetched]);
      setOffset(o + fetched.length);
      setHasMore(fetched.length === LIMIT);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el historial de viajes.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [offset]);

  useEffect(() => { loadRides(true); }, []);

  const handleDownloadReceipt = async (rideId: string) => {
    setIsDownloading(true);
    try {
      const response = await apiClient.get(`/ride/${rideId}/receipt`, { responseType: 'arraybuffer' });
      const base64 = btoa(
        new Uint8Array(response.data as ArrayBuffer)
          .reduce((d, b) => d + String.fromCharCode(b), '')
      );
      const fileUri = `${FileSystem.cacheDirectory}recibo-vride-${rideId.slice(0, 8)}.pdf`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: 'Recibo Verona Ride' });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert('Error', 'No se pudo descargar el recibo.');
    } finally {
      setIsDownloading(false);
    }
  };

  const renderItem = ({ item }: { item: RideHistoryItem }) => {
    const date = new Date(item.completed_at ?? item.created_at);
    const isCompleted = item.status === 'completed';
    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.7}>
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardDate}>
              {date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
            <Text style={styles.cardFrom} numberOfLines={1}>{item.pickup_address}</Text>
            <Text style={styles.cardTo}   numberOfLines={1}>{item.dropoff_address}</Text>
          </View>
          <View style={styles.cardRight}>
            {isCompleted && item.driver_earnings !== null && (
              <Text style={styles.earningAmt}>+${item.driver_earnings.toFixed(2)}</Text>
            )}
            <Text style={styles.distanceLbl}>
              {item.distance_km ? `${item.distance_km.toFixed(1)} mi` : '—'}
            </Text>
            <View style={[styles.statusDot,
              { backgroundColor: isCompleted ? '#22C55E' : BRAND_COLORS.ALERT }
            ]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const DetailModal = () => {
    if (!selected) return null;
    const isCompleted = selected.status === 'completed';
    return (
      <Modal visible animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalle del viaje</Text>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
              <Text style={{ fontSize: 14, color: '#555', fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <View style={styles.routeSection}>
              <Text style={styles.sectionTitle}>RUTA</Text>
              <Text style={styles.routeAddr}>🟢 {selected.pickup_address}</Text>
              <Text style={styles.routeAddr}>🔴 {selected.dropoff_address}</Text>
            </View>
            {isCompleted && (
              <>
                <View style={styles.metricsRow}>
                  {[
                    [`${(selected.distance_km ?? 0).toFixed(1)} km`, 'Distancia'],
                    [`${selected.duration_minutes ?? 0} min`, 'Duración'],
                    [selected.service_type.toUpperCase(), 'Servicio'],
                  ].map(([val, lbl]) => (
                    <View key={lbl} style={styles.metricBox}>
                      <Text style={styles.metricVal}>{val}</Text>
                      <Text style={styles.metricLbl}>{lbl}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.earningsSection}>
                  <Text style={styles.sectionTitle}>GANANCIAS</Text>
                  {[
                    ['Tarifa bruta',              selected.total_charged],
                    ['Comisión Verona Ride (13%)', selected.platform_commission],
                  ].map(([lbl, val]) => (
                    <View key={String(lbl)} style={styles.fareRow}>
                      <Text style={styles.fareLbl}>{String(lbl)}</Text>
                      <Text style={styles.fareVal}>${Number(val ?? 0).toFixed(2)}</Text>
                    </View>
                  ))}
                  <View style={[styles.fareRow, { borderBottomWidth: 0, marginTop: 4 }]}>
                    <Text style={[styles.fareLbl, { fontWeight: '700', color: '#22C55E', fontSize: 16 }]}>Tus ganancias</Text>
                    <Text style={[styles.fareVal, { color: '#22C55E', fontSize: 18, fontWeight: '700' }]}>
                      +${(selected.driver_earnings ?? 0).toFixed(2)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.receiptBtn, isDownloading && { opacity: 0.6 }]}
                  onPress={() => handleDownloadReceipt(selected.id)}
                  disabled={isDownloading}
                >
                  {isDownloading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.receiptBtnText}>📄  Descargar recibo PDF</Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Historial de viajes</Text>
        <View style={{ width: 40 }} />
      </View>
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={r => r.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          onEndReached={() => hasMore && !isLoadingMore && loadRides()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', padding: 40, gap: 12 }}>
              <Text style={{ fontSize: 48 }}>🚗</Text>
              <Text style={{ fontSize: 16, color: '#888' }}>Aún no hay viajes</Text>
            </View>
          }
        />
      )}
      <DetailModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#F8F9FA' },
  backBtnText: { fontSize: 22, color: BRAND_COLORS.TEXT },
  title: { fontSize: 18, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },

  card: { backgroundColor: '#F8F9FA', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EEEEEE' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1, gap: 3 },
  cardDate: { fontSize: 12, color: '#AAA', fontFamily: 'Inter_400Regular' },
  cardFrom: { fontSize: 14, fontWeight: '600', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },
  cardTo:   { fontSize: 14, color: '#666', fontFamily: 'Inter_400Regular' },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  earningAmt: { fontSize: 17, fontWeight: '700', color: '#22C55E', fontFamily: 'Inter_700Bold' },
  distanceLbl: { fontSize: 12, color: '#888', fontFamily: 'Inter_400Regular' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },

  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  closeBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F0F0', borderRadius: 16 },
  modalBody: { padding: 20, gap: 16 },
  routeSection: { gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#888', fontFamily: 'Inter_700Bold', letterSpacing: 0.8, textTransform: 'uppercase' },
  routeAddr: { fontSize: 15, color: BRAND_COLORS.TEXT, fontFamily: 'Inter_400Regular' },
  metricsRow: { flexDirection: 'row', gap: 8 },
  metricBox: { flex: 1, backgroundColor: '#F8F9FA', borderRadius: 10, padding: 12, alignItems: 'center' },
  metricVal: { fontSize: 15, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  metricLbl: { fontSize: 11, color: '#888', fontFamily: 'Inter_400Regular', marginTop: 2 },
  earningsSection: { gap: 6 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  fareLbl: { fontSize: 14, color: '#666', fontFamily: 'Inter_400Regular' },
  fareVal: { fontSize: 14, color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },
  receiptBtn: {
    height: 56, backgroundColor: BRAND_COLORS.PRIMARY, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
  },
  receiptBtnText: { fontSize: 17, color: '#fff', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
