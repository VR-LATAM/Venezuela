// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Historial de viajes del pasajero — lista + detalle + recibo PDF
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  FlatList, Alert, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from '../../src/services/apiClient';

const API_BASE = `${Constants.expoConfig?.extra?.apiUrl ?? process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:4000'}/api/v1`;
import { BRAND_COLORS } from '@vride/shared';

interface RideHistoryItem {
  id:              string;
  status:          string;
  service_type:    string;
  pickup_address:  string;
  dropoff_address: string;
  total_charged:   number | null;
  distance_km:     number | null;
  duration_minutes: number | null;
  driver_name?:    string;
  base_fare:       number | null;
  distance_fare:   number | null;
  time_fare:       number | null;
  surge_multiplier: number;
  platform_commission: number | null;
  driver_earnings: number | null;
  payment_status:  string;
  completed_at:    string | null;
  created_at:      string;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  completed:          { label: 'Completado',   color: '#22C55E' },
  cancelled_passenger:{ label: 'Cancelado',    color: BRAND_COLORS.ALERT },
  cancelled_driver:   { label: 'Cancelado',    color: BRAND_COLORS.ALERT },
  no_driver_found:    { label: 'Sin conductor', color: '#888' },
};

export default function HistoryScreen() {
  const [rides, setRides]               = useState<RideHistoryItem[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [offset, setOffset]             = useState(0);
  const [hasMore, setHasMore]           = useState(true);
  const [selected, setSelected]         = useState<RideHistoryItem | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const LIMIT = 20;

  const loadRides = useCallback(async (reset = false) => {
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
      Alert.alert('Error', 'No se pudo cargar el historial de viajes.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [offset]);

  useEffect(() => { loadRides(true); }, []);

  // ─────────────────────────────────────
  // DESCARGAR RECIBO PDF
  // ─────────────────────────────────────
  const handleDownloadReceipt = async (rideId: string) => {
    setIsDownloading(true);
    try {
      const token    = await SecureStore.getItemAsync('access_token');
      const filename = `receipt-vride-${rideId.slice(0, 8).toUpperCase()}.pdf`;
      const cacheUri = `${FileSystem.cacheDirectory}${filename}`;

      // 1. Descargar el PDF al cache
      const result = await FileSystem.downloadAsync(
        `${API_BASE}/ride/${rideId}/receipt`,
        cacheUri,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (result.status !== 200) {
        Alert.alert('Error', `Download failed (status ${result.status})`);
        return;
      }

      if (Platform.OS === 'android') {
        // Android: guardar en Downloads via Storage Access Framework
        const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
          'content://com.android.externalstorage.documents/tree/primary%3ADownload'
        );
        if (perm.granted) {
          const base64 = await FileSystem.readAsStringAsync(result.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
            perm.directoryUri, filename, 'application/pdf'
          );
          await FileSystem.writeAsStringAsync(destUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Descargado', 'Recibo guardado en tu carpeta de Descargas.');
        }
      } else {
        // iOS: share sheet con opción "Save to Files"
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Recibo V-Ride — ${rideId.slice(0, 8).toUpperCase()}`,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      Alert.alert('Error', `No se pudo descargar el recibo.\n\n${msg}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const renderItem = ({ item }: { item: RideHistoryItem }) => {
    const st = STATUS_LABEL[item.status] ?? { label: item.status, color: '#888' };
    const date = new Date(item.completed_at ?? item.created_at);
    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.7}>
        <View style={styles.cardTop}>
          <View style={[styles.serviceIcon]}>
            <Text style={{ fontSize: 22 }}>
              {item.service_type === 'accessible' ? '♿' : item.service_type === 'executive' ? '🚙' : '🚗'}
            </Text>
          </View>
          <View style={styles.cardMid}>
            <Text style={styles.cardFrom} numberOfLines={1}>{item.pickup_address}</Text>
            <Text style={styles.cardTo}   numberOfLines={1}>{item.dropoff_address}</Text>
            <Text style={styles.cardDate}>
              {date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={styles.cardRight}>
            {item.total_charged !== null && (
              <Text style={styles.cardAmount}>${Number(item.total_charged).toFixed(2)}</Text>
            )}
            <View style={[styles.statusPill, { backgroundColor: st.color + '20' }]}>
              <Text style={[styles.statusPillText, { color: st.color }]}>{st.label}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─────────────────────────────────────
  // MODAL DE DETALLE
  // ─────────────────────────────────────
  const DetailModal = () => {
    if (!selected) return null;
    const st = STATUS_LABEL[selected.status] ?? { label: selected.status, color: '#888' };
    return (
      <Modal visible animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalle del viaje</Text>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>

            {/* Estado */}
            <View style={[styles.statusBanner, { backgroundColor: st.color + '15' }]}>
              <Text style={[styles.statusBannerText, { color: st.color }]}>{st.label}</Text>
            </View>

            {/* Ruta */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ruta</Text>
              <View style={styles.routeRow}>
                <Text style={styles.routeIcon}>🟢</Text>
                <Text style={styles.routeAddr}>{selected.pickup_address}</Text>
              </View>
              <View style={styles.routeRow}>
                <Text style={styles.routeIcon}>🔴</Text>
                <Text style={styles.routeAddr}>{selected.dropoff_address}</Text>
              </View>
            </View>

            {/* Métricas */}
            {selected.status === 'completed' && (
              <View style={styles.metricsRow}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricVal}>{Number(selected.distance_km ?? 0).toFixed(1)} km</Text>
                  <Text style={styles.metricLbl}>Distancia</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricVal}>{selected.duration_minutes ?? 0} min</Text>
                  <Text style={styles.metricLbl}>Duración</Text>
                </View>
                <View style={styles.metricBox}>
                  <Text style={styles.metricVal}>{selected.service_type.toUpperCase()}</Text>
                  <Text style={styles.metricLbl}>Servicio</Text>
                </View>
              </View>
            )}

            {/* Desglose de tarifa */}
            {selected.status === 'completed' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Desglose de tarifa</Text>
                {[
                  ['Tarifa base',      selected.base_fare],
                  ['Tarifa por distancia',  selected.distance_fare],
                  ['Tarifa por tiempo',      selected.time_fare],
                ].map(([label, val]) => (
                  <View key={String(label)} style={styles.fareRow}>
                    <Text style={styles.fareLbl}>{String(label)}</Text>
                    <Text style={styles.fareVal}>${Number(val ?? 0).toFixed(2)}</Text>
                  </View>
                ))}
                {(selected.surge_multiplier ?? 1) > 1 && (
                  <View style={styles.fareRow}>
                    <Text style={styles.fareLbl}>Multiplicador de alta demanda ×{selected.surge_multiplier}</Text>
                    <Text style={[styles.fareVal, { color: BRAND_COLORS.ALERT }]}>activo</Text>
                  </View>
                )}
                <View style={[styles.fareRow, styles.fareRowTotal]}>
                  <Text style={styles.fareTotalLbl}>Total cobrado</Text>
                  <Text style={styles.fareTotalVal}>${Number(selected.total_charged ?? 0).toFixed(2)}</Text>
                </View>
                <View style={styles.fareRow}>
                  <Text style={styles.fareLbl}>Estado de pago</Text>
                  <Text style={[styles.fareVal, {
                    color: selected.payment_status === 'completed' ? '#22C55E' : BRAND_COLORS.ALERT
                  }]}>
                    {selected.payment_status === 'completed' ? '✓ Pagado' : '⚠ Pendiente'}
                  </Text>
                </View>
              </View>
            )}

            {/* Botón de recibo */}
            {selected.status === 'completed' && (
              <TouchableOpacity
                style={[styles.receiptBtn, isDownloading && { opacity: 0.6 }]}
                onPress={() => handleDownloadReceipt(selected.id)}
                disabled={isDownloading}
                accessibilityRole="button"
              >
                {isDownloading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.receiptBtnText}>📄  Descargar recibo PDF</Text>
                }
              </TouchableOpacity>
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
        <View style={styles.centered}><ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} /></View>
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
            <View style={styles.centered}>
              <Text style={{ fontSize: 48 }}>🗺️</Text>
              <Text style={styles.emptyText}>Aún no hay viajes</Text>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  emptyText: { fontSize: 16, color: '#888', fontFamily: 'Inter_400Regular' },

  card: {
    backgroundColor: '#F8F9FA', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#EEEEEE',
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  serviceIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: BRAND_COLORS.PRIMARY + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  cardMid: { flex: 1, gap: 3 },
  cardFrom: { fontSize: 14, fontWeight: '600', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },
  cardTo:   { fontSize: 14, color: '#666', fontFamily: 'Inter_400Regular' },
  cardDate: { fontSize: 12, color: '#AAA', fontFamily: 'Inter_400Regular', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  cardAmount: { fontSize: 17, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 11, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  // Modal
  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  closeBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F0F0', borderRadius: 16 },
  closeBtnText: { fontSize: 14, color: '#555', fontWeight: '700' },
  modalBody: { padding: 20, gap: 8 },

  statusBanner: { borderRadius: 10, padding: 12, marginBottom: 8 },
  statusBannerText: { fontSize: 15, fontWeight: '700', textAlign: 'center', fontFamily: 'Inter_700Bold' },

  section: { marginTop: 8, gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888', fontFamily: 'Inter_700Bold', letterSpacing: 0.8, textTransform: 'uppercase' },

  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  routeIcon: { fontSize: 16, marginTop: 1 },
  routeAddr: { fontSize: 15, color: BRAND_COLORS.TEXT, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 22 },

  metricsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  metricBox: {
    flex: 1, backgroundColor: '#F8F9FA', borderRadius: 10,
    padding: 12, alignItems: 'center',
  },
  metricVal: { fontSize: 17, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  metricLbl: { fontSize: 11, color: '#888', fontFamily: 'Inter_400Regular', marginTop: 2 },

  fareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  fareLbl: { fontSize: 14, color: '#666', fontFamily: 'Inter_400Regular' },
  fareVal: { fontSize: 14, color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },
  fareRowTotal: { marginTop: 4, borderBottomWidth: 0 },
  fareTotalLbl: { fontSize: 16, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  fareTotalVal: { fontSize: 18, fontWeight: '700', color: BRAND_COLORS.PRIMARY, fontFamily: 'Inter_700Bold' },

  receiptBtn: {
    height: 56, backgroundColor: BRAND_COLORS.PRIMARY, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginTop: 20,
  },
  receiptBtnText: { fontSize: 17, color: '#fff', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
