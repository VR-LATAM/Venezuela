// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Pantalla de ganancias del conductor
// Resumen: hoy / semana / mes + historial de viajes
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { paymentService, EarningsSummary, EarningEntry } from '../../src/services/paymentService';
import { BRAND_COLORS } from '@vride/shared';

type Period = 'today' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy',
  week:  'Esta semana',
  month: 'Este mes',
};

const EARNING_TYPE_LABELS: Record<string, string> = {
  ride:              'Viaje completado',
  cancellation_fee:  'Cargo por cancelación',
  referral_bonus:    'Bono de referido',
  performance_bonus: 'Bono de desempeño',
  quality_bonus:     'Bono de calidad',
  correction:        'Ajuste manual',
};

export default function EarningsScreen() {
  const [summary,   setSummary]   = useState<EarningsSummary | null>(null);
  const [entries,   setEntries]   = useState<EarningEntry[]>([]);
  const [period,    setPeriod]    = useState<Period>('today');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const earningsData = await paymentService.getEarnings();
      setSummary(earningsData.summary);
      setEntries(earningsData.recent);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar las ganancias.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const periodAmount = (): number => {
    if (!summary) return 0;
    if (period === 'today') return summary.today;
    if (period === 'week')  return summary.this_week;
    return summary.this_month;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Mis ganancias</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Selector de período */}
        <View style={styles.periodSelector}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
              accessibilityRole="tab"
              accessibilityState={{ selected: period === p }}
            >
              <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Card principal — monto del período */}
        <View style={styles.mainCard}>
          <Text style={styles.mainCardLabel}>Ganancias — {PERIOD_LABELS[period].toLowerCase()}</Text>
          <Text style={styles.mainCardAmount}>${periodAmount().toFixed(2)}</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total histórico</Text>
            <Text style={styles.totalAmount}>${(summary?.total_earned ?? 0).toFixed(2)}</Text>
          </View>
        </View>

        {/* Gráfica semanal */}
        {entries.length > 0 && (() => {
          const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
          const today = new Date();
          const weekData = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() - (6 - i));
            const dayStr = d.toDateString();
            const total = entries
              .filter(e => new Date(e.created_at).toDateString() === dayStr)
              .reduce((sum, e) => sum + Number(e.net_amount), 0);
            return { label: days[d.getDay()], amount: total, isToday: i === 6 };
          });
          const maxAmount = Math.max(...weekData.map(d => d.amount), 1);
          return (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Últimos 7 días</Text>
              <View style={styles.chartBars}>
                {weekData.map((day, i) => (
                  <View key={i} style={styles.chartBarCol}>
                    <Text style={styles.chartAmount}>
                      {day.amount > 0 ? `$${day.amount.toFixed(0)}` : ''}
                    </Text>
                    <View style={styles.chartBarBg}>
                      <View style={[
                        styles.chartBarFill,
                        { height: `${Math.round((day.amount / maxAmount) * 100)}%` },
                        day.isToday && styles.chartBarToday,
                      ]} />
                    </View>
                    <Text style={[styles.chartLabel, day.isToday && styles.chartLabelToday]}>
                      {day.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {/* Historial de ganancias */}
        <Text style={styles.sectionTitle}>Historial reciente</Text>

        {entries.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Text style={styles.emptyHistoryText}>Aún no hay ganancias registradas</Text>
          </View>
        ) : (
          entries.map(entry => (
            <View key={entry.id} style={styles.entryRow}>
              <View style={styles.entryLeft}>
                <Text style={styles.entryType}>
                  {EARNING_TYPE_LABELS[entry.type] ?? entry.type}
                </Text>
                {entry.description && (
                  <Text style={styles.entryDesc} numberOfLines={1}>{entry.description}</Text>
                )}
                <Text style={styles.entryDate}>
                  {new Date(entry.created_at).toLocaleDateString('es-VE', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={styles.entryRight}>
                <Text style={styles.entryNet}>+${Number(entry.net_amount).toFixed(2)}</Text>
                <Text style={styles.entryGross}>Bruto: ${Number(entry.gross_amount).toFixed(2)}</Text>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: '#fff', paddingTop: 24 },
  scroll:   { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#F8F9FA' },
  backBtnText: { fontSize: 22, color: BRAND_COLORS.TEXT },
  title:       { fontSize: 18, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },

  periodSelector: {
    flexDirection: 'row', margin: 16,
    backgroundColor: '#F0F0F0', borderRadius: 12, padding: 4, gap: 4,
  },
  periodBtn:         { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  periodBtnActive:   { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  periodBtnText:     { fontSize: 14, color: '#888', fontFamily: 'Inter_500Medium' },
  periodBtnTextActive: { color: BRAND_COLORS.TEXT, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  mainCard: {
    marginHorizontal: 16, backgroundColor: BRAND_COLORS.PRIMARY,
    borderRadius: 20, padding: 24, marginBottom: 16,
  },
  mainCardLabel:  { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_400Regular' },
  mainCardAmount: { fontSize: 48, fontWeight: '800', color: '#fff', fontFamily: 'Inter_700Bold', marginVertical: 8 },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', marginTop: 12, paddingTop: 12,
  },
  totalLabel:  { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_400Regular' },
  totalAmount: { fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' },

  chartCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#FAFAFA', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#EEEEEE',
  },
  chartTitle:    { fontSize: 15, fontWeight: '600', color: '#888', fontFamily: 'Inter_600SemiBold', marginBottom: 16 },
  chartBars:     { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 6 },
  chartBarCol:   { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  chartAmount:   { fontSize: 10, color: '#888', fontFamily: 'Inter_400Regular', marginBottom: 2 },
  chartBarBg:    { width: '100%', height: 70, backgroundColor: '#E8E8E8', borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  chartBarFill:  { width: '100%', backgroundColor: BRAND_COLORS.PRIMARY + '80', borderRadius: 6 },
  chartBarToday: { backgroundColor: BRAND_COLORS.PRIMARY },
  chartLabel:    { fontSize: 11, color: '#888', fontFamily: 'Inter_400Regular', marginTop: 4 },
  chartLabelToday: { color: BRAND_COLORS.PRIMARY, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  sectionTitle: {
    fontSize: 17, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold',
    marginHorizontal: 16, marginTop: 20, marginBottom: 12,
  },

  emptyHistory:     { alignItems: 'center', paddingVertical: 24 },
  emptyHistoryText: { fontSize: 15, color: '#AAA', fontFamily: 'Inter_400Regular' },

  entryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  entryLeft:  { flex: 1, gap: 2 },
  entryType:  { fontSize: 16, fontWeight: '600', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },
  entryDesc:  { fontSize: 13, color: '#888', fontFamily: 'Inter_400Regular' },
  entryDate:  { fontSize: 12, color: '#AAA', fontFamily: 'Inter_400Regular', marginTop: 2 },
  entryRight: { alignItems: 'flex-end', gap: 2 },
  entryNet:   { fontSize: 18, fontWeight: '700', color: '#22C55E', fontFamily: 'Inter_700Bold' },
  entryGross: { fontSize: 12, color: '#AAA', fontFamily: 'Inter_400Regular' },
});
