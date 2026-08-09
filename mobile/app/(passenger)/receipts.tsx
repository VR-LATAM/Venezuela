// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Historial de recibos del pasajero — lista de viajes con opcion de descarga PDF
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  SafeAreaView, Alert, ActivityIndicator, Linking, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { BRAND_COLORS } from '@vride/shared';
import { apiClient } from '../../src/services/apiClient';

interface RideItem {
  id: string;
  completed_at: string;
  pickup_address: string;
  dropoff_address: string;
  total_charged: number;
  payment_status: string;
  service_type: string;
  driver_notes: string | null;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export default function ReceiptsScreen() {
  const [rides, setRides]       = useState<RideItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiClient.get('/ride/history', { params: { limit: 50, offset: 0 } });
      const completed = (r.data.data as RideItem[]).filter(
        ride => ride.payment_status === 'completed' || ride.total_charged > 0
      );
      setRides(completed);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el historial de recibos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const downloadReceipt = async (rideId: string) => {
    try {
      const token = (await apiClient.get('/auth/token')).data?.token ??
        apiClient.defaults.headers.common['Authorization']?.toString().replace('Bearer ', '');
      const url = `${API_URL}/api/v1/ride/${rideId}/receipt`;
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'No se pudo abrir el recibo. Inténtalo de nuevo.');
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-VE', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatService = (s: string) =>
    s.charAt(0).toUpperCase() + s.slice(1);

  const renderItem = ({ item }: { item: RideItem }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardDate}>{formatDate(item.completed_at)}</Text>
          <Text style={styles.cardService}>{formatService(item.service_type)}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardAmount}>${Number(item.total_charged).toFixed(2)}</Text>
          <Text style={[styles.cardStatus,
            item.payment_status === 'completed' ? styles.statusOk : styles.statusFail
          ]}>
            {item.payment_status === 'completed' ? 'Pagado' : 'Pendiente'}
          </Text>
        </View>
      </View>
      <Text style={styles.cardFrom} numberOfLines={1}>Desde: {item.pickup_address}</Text>
      <Text style={styles.cardTo} numberOfLines={1}>Hasta: {item.dropoff_address}</Text>
      {item.driver_notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>Nota del conductor:</Text>
          <Text style={styles.notesText}>{item.driver_notes}</Text>
        </View>
      ) : null}
      <TouchableOpacity style={styles.downloadBtn} onPress={() => downloadReceipt(item.id)}>
        <Text style={styles.downloadBtnText}>📄 Descargar recibo PDF</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de recibos</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rides}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📄</Text>
              <Text style={styles.emptyText}>Aún no hay recibos</Text>
              <Text style={styles.emptyMeta}>Los viajes completados aparecerán aquí</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F8FAFC', paddingTop: 24 },
  header:          { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn:         { padding: 4, marginRight: 8 },
  backBtnText:     { fontSize: 28, color: BRAND_COLORS.PRIMARY, lineHeight: 32 },
  headerTitle:     { flex: 1, fontSize: 20, fontWeight: '700', color: '#1E293B' },
  list:            { padding: 16, gap: 12 },
  card:            { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardTop:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardLeft:        {},
  cardRight:       { alignItems: 'flex-end' },
  cardDate:        { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  cardService:     { fontSize: 12, color: '#64748B' },
  cardAmount:      { fontSize: 20, fontWeight: '800', color: BRAND_COLORS.PRIMARY, marginBottom: 2 },
  cardStatus:      { fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusOk:        { backgroundColor: '#DCFCE7', color: '#15803D' },
  statusFail:      { backgroundColor: '#FEF3C7', color: '#B45309' },
  cardFrom:        { fontSize: 13, color: '#64748B', marginBottom: 2 },
  cardTo:          { fontSize: 13, color: '#64748B', marginBottom: 10 },
  notesBox:        { backgroundColor: '#F0F9FF', borderRadius: 8, padding: 10, marginBottom: 10 },
  notesLabel:      { fontSize: 11, fontWeight: '700', color: '#0EA5E9', marginBottom: 2 },
  notesText:       { fontSize: 13, color: '#0C4A6E' },
  downloadBtn:     { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 12, alignItems: 'center' },
  downloadBtnText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  empty:           { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon:       { fontSize: 48, marginBottom: 4 },
  emptyText:       { fontSize: 17, fontWeight: '600', color: '#334155' },
  emptyMeta:       { fontSize: 14, color: '#94A3B8' },
});
