// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Estadísticas del conductor — tasa de aceptación, meta diaria, vencimientos
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { BRAND_COLORS } from '@vride/shared';
import { driverMobileService } from '../../src/services/driverService';

interface AcceptanceStats {
  rides_offered: number;
  rides_accepted: number;
  acceptance_rate_pct: number;
}

interface DocAlert {
  document_type: string;
  expires_at: string;
  days_left: number;
  is_expired: boolean;
  urgent: boolean;
  warning: boolean;
}

export default function DriverStatsScreen() {
  const [stats, setStats]         = useState<AcceptanceStats | null>(null);
  const [docAlerts, setDocAlerts] = useState<DocAlert[]>([]);
  const [dailyGoal, setDailyGoal] = useState('');
  const [loading, setLoading]     = useState(true);
  const [savingGoal, setSavingGoal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, alerts] = await Promise.all([
        driverMobileService.getAcceptanceRate(),
        driverMobileService.getDocumentExpiry(),
      ]);
      setStats(s);
      setDocAlerts(alerts);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar las estadísticas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveGoal = async () => {
    const goalNum = parseFloat(dailyGoal);
    if (dailyGoal && (isNaN(goalNum) || goalNum <= 0)) {
      Alert.alert('Valor inválido', 'Por favor ingresa un monto válido');
      return;
    }
    setSavingGoal(true);
    try {
      await driverMobileService.setDailyGoal(dailyGoal ? goalNum : null);
      Alert.alert('Guardado', dailyGoal ? `Meta diaria establecida en $${goalNum.toFixed(2)}` : 'Meta diaria eliminada');
    } catch {
      Alert.alert('Error', 'No se pudo guardar la meta');
    } finally {
      setSavingGoal(false);
    }
  };

  const rateColor = (rate: number) =>
    rate >= 80 ? '#16A34A' : rate >= 60 ? '#D97706' : '#DC2626';

  const docLabel = (type: string) =>
    type === 'license' ? 'Licencia de conducir' : 'Seguro vehicular';

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis estadísticas</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {/* Document Expiry Alerts */}
        {docAlerts.filter(a => a.is_expired || a.urgent || a.warning).map(alert => (
          <View
            key={alert.document_type}
            style={[styles.alertBox,
              alert.is_expired ? styles.alertExpired :
              alert.urgent     ? styles.alertUrgent  : styles.alertWarning
            ]}
          >
            <Text style={styles.alertIcon}>{alert.is_expired ? '🚫' : alert.urgent ? '⚠️' : '📋'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>
                {docLabel(alert.document_type)} {alert.is_expired ? 'VENCIDA' : `vence en ${alert.days_left} día${alert.days_left !== 1 ? 's' : ''}`}
              </Text>
              <Text style={styles.alertSub}>
                {new Date(alert.expires_at).toLocaleDateString('es-VE', { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
          </View>
        ))}

        {/* Acceptance Rate */}
        {stats && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tasa de aceptación</Text>
            <View style={styles.rateRow}>
              <Text style={[styles.rateValue, { color: rateColor(stats.acceptance_rate_pct) }]}>
                {stats.acceptance_rate_pct}%
              </Text>
              <Text style={styles.rateSub}>
                {stats.rides_accepted} aceptados / {stats.rides_offered} ofrecidos
              </Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBg}>
              <View style={[
                styles.progressFill,
                { width: `${Math.min(stats.acceptance_rate_pct, 100)}%` as any,
                  backgroundColor: rateColor(stats.acceptance_rate_pct) }
              ]} />
            </View>

            <Text style={styles.rateHint}>
              {stats.acceptance_rate_pct >= 80
                ? '✅ ¡Excelente! Sigue así.'
                : stats.acceptance_rate_pct >= 60
                  ? '⚠️ Intenta aceptar más viajes para mejorar tu nivel.'
                  : '🚨 Una tasa baja puede afectar tu categoría de conductor.'}
            </Text>

            {/* Tier thresholds */}
            <View style={styles.tierRow}>
              <View style={styles.tierBadge}>
                <Text style={styles.tierBadgeText}>80%+</Text>
                <Text style={styles.tierBadgeLabel}>Despacho prioritario</Text>
              </View>
              <View style={styles.tierBadge}>
                <Text style={styles.tierBadgeText}>60%+</Text>
                <Text style={styles.tierBadgeLabel}>Estándar</Text>
              </View>
              <View style={[styles.tierBadge, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.tierBadgeText, { color: '#DC2626' }]}>{'<60%'}</Text>
                <Text style={styles.tierBadgeLabel}>Baja prioridad</Text>
              </View>
            </View>
          </View>
        )}

        {/* Daily Earnings Goal */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Meta diaria de ganancias</Text>
          <Text style={styles.cardSub}>Establece un objetivo para seguir tu progreso cada día</Text>
          <View style={styles.goalRow}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.goalInput}
              value={dailyGoal}
              onChangeText={setDailyGoal}
              keyboardType="decimal-pad"
              placeholder="ej. 150"
              placeholderTextColor="#94A3B8"
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.goalBtn, savingGoal && { opacity: 0.7 }]}
              onPress={handleSaveGoal}
              disabled={savingGoal}
            >
              {savingGoal
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.goalBtnText}>Guardar</Text>
              }
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => { setDailyGoal(''); handleSaveGoal(); }}>
            <Text style={styles.clearGoal}>Eliminar meta</Text>
          </TouchableOpacity>
        </View>

        {/* Document Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Estado de documentos</Text>
          {docAlerts.length === 0 ? (
            <Text style={styles.allGood}>✅ Todos los documentos están al día</Text>
          ) : (
            docAlerts.map(a => (
              <View key={a.document_type} style={styles.docRow}>
                <Text style={styles.docName}>{docLabel(a.document_type)}</Text>
                <Text style={[styles.docStatus,
                  a.is_expired ? { color: '#DC2626' } :
                  a.urgent     ? { color: '#D97706' } :
                  a.warning    ? { color: '#D97706' } : { color: '#16A34A' }
                ]}>
                  {a.is_expired ? 'VENCIDA' : `${a.days_left}d restantes`}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#F8FAFC' },
  header:         { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn:        { padding: 4, marginRight: 8 },
  backBtnText:    { fontSize: 28, color: BRAND_COLORS.PRIMARY, lineHeight: 32 },
  headerTitle:    { flex: 1, fontSize: 20, fontWeight: '700', color: '#1E293B' },
  scroll:         { padding: 16, gap: 14, paddingBottom: 40 },
  alertBox:       { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, gap: 12 },
  alertExpired:   { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' },
  alertUrgent:    { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA' },
  alertWarning:   { backgroundColor: '#FEFCE8', borderWidth: 1, borderColor: '#FEF08A' },
  alertIcon:      { fontSize: 24 },
  alertTitle:     { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  alertSub:       { fontSize: 12, color: '#64748B', marginTop: 2 },
  card:           { backgroundColor: '#fff', borderRadius: 16, padding: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTitle:      { fontSize: 17, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  cardSub:        { fontSize: 13, color: '#64748B', marginBottom: 12 },
  rateRow:        { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginBottom: 12 },
  rateValue:      { fontSize: 52, fontWeight: '800', lineHeight: 60 },
  rateSub:        { fontSize: 14, color: '#64748B' },
  progressBg:     { height: 10, backgroundColor: '#E2E8F0', borderRadius: 5, marginBottom: 12, overflow: 'hidden' },
  progressFill:   { height: 10, borderRadius: 5 },
  rateHint:       { fontSize: 13, color: '#475569', marginBottom: 16 },
  tierRow:        { flexDirection: 'row', gap: 8 },
  tierBadge:      { flex: 1, backgroundColor: '#F0FFF4', borderRadius: 10, padding: 10, alignItems: 'center' },
  tierBadgeText:  { fontSize: 15, fontWeight: '700', color: '#15803D', marginBottom: 2 },
  tierBadgeLabel: { fontSize: 11, color: '#64748B', textAlign: 'center' },
  goalRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  dollarSign:     { fontSize: 24, color: '#475569', fontWeight: '600' },
  goalInput:      { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, fontSize: 20, fontWeight: '700', color: '#1E293B', backgroundColor: '#F8FAFC' },
  goalBtn:        { backgroundColor: BRAND_COLORS.PRIMARY, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12 },
  goalBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  clearGoal:      { fontSize: 13, color: '#94A3B8', marginTop: 8, textDecorationLine: 'underline' },
  allGood:        { fontSize: 15, color: '#15803D', fontWeight: '600', marginTop: 4 },
  docRow:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  docName:        { fontSize: 14, color: '#334155', fontWeight: '500' },
  docStatus:      { fontSize: 14, fontWeight: '700' },
});
