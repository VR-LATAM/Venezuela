// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Pantalla de ganancias del conductor
// Resumen: hoy / semana / mes + historial + retiro a cuenta bancaria
// Acceso a Stripe Connect onboarding si la cuenta no está configurada
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, ActivityIndicator, Linking, Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { paymentService, EarningsSummary, EarningEntry, Withdrawal } from '../../src/services/paymentService';
import { BRAND_COLORS } from '@vride/shared';

type Period = 'today' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy',
  week:  'Esta semana',
  month: 'Este mes',
};

const EARNING_TYPE_LABELS: Record<string, string> = {
  ride:               'Viaje completado',
  cancellation_fee:   'Cargo por cancelación',
  referral_bonus:     'Bono de referido',
  performance_bonus:  'Bono de desempeño',
  quality_bonus:      'Bono de calidad',
  correction:         'Ajuste manual',
};

export default function EarningsScreen() {
  const [summary, setSummary]                   = useState<EarningsSummary | null>(null);
  const [entries, setEntries]                   = useState<EarningEntry[]>([]);
  const [withdrawals, setWithdrawals]           = useState<Withdrawal[]>([]);
  const [connectStatus, setConnectStatus]       = useState<{
    hasConnectAccount: boolean;
    accountVerified: boolean;
    availableBalance: number;
  } | null>(null);
  const [period, setPeriod]                     = useState<Period>('today');
  const [isLoading, setIsLoading]               = useState(true);
  const [isWithdrawing, setIsWithdrawing]       = useState(false);
  const [isConnecting, setIsConnecting]         = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [earningsData, statusData, withdrawalData] = await Promise.all([
        paymentService.getEarnings(),
        paymentService.getDriverPaymentStatus(),
        paymentService.listWithdrawals(),
      ]);
      setSummary(earningsData.summary);
      setEntries(earningsData.recent);
      setConnectStatus(statusData);
      setWithdrawals(withdrawalData);
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

  // ─────────────────────────────────────
  // STRIPE CONNECT ONBOARDING
  // ─────────────────────────────────────
  const handleConnectStripe = async () => {
    setIsConnecting(true);
    try {
      const { onboardingUrl } = await paymentService.createConnectAccount();
      await Linking.openURL(onboardingUrl);
      // Al regresar a la app, recargar el estado
      await loadData();
    } catch {
      Alert.alert('Error', 'No se pudo abrir el proceso de configuración de cobros.');
    } finally {
      setIsConnecting(false);
    }
  };

  // ─────────────────────────────────────
  // SOLICITAR RETIRO
  // ─────────────────────────────────────
  const handleWithdraw = () => {
    if (!connectStatus?.accountVerified) {
      Alert.alert(
        'Cuenta de cobro requerida',
        'Configura tu cuenta bancaria para recibir tus ganancias.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Configurar', onPress: handleConnectStripe },
        ]
      );
      return;
    }

    const available = connectStatus.availableBalance;
    if (available < 1) {
      Alert.alert('Sin saldo disponible', 'No tienes ganancias pendientes de retiro.');
      return;
    }

    Alert.alert(
      'Solicitar retiro',
      `¿Transferir $${available.toFixed(2)} a tu cuenta bancaria?\n\nLlegará en 1-3 días hábiles.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setIsWithdrawing(true);
            try {
              const { message } = await paymentService.requestWithdrawal(available);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Retiro solicitado', message);
              await loadData();
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Unknown error';
              Alert.alert('Error', msg);
            } finally {
              setIsWithdrawing(false);
            }
          },
        },
      ]
    );
  };

  const withdrawalStatusColor = (status: Withdrawal['status']) => {
    if (status === 'completed')  return '#22C55E';
    if (status === 'processing') return BRAND_COLORS.ACCENT;
    if (status === 'failed')     return BRAND_COLORS.ALERT;
    return '#888';
  };

  const withdrawalStatusLabel = (status: Withdrawal['status']) => ({
    pending:    'Pendiente',
    processing: 'Procesando',
    completed:  'Completado',
    failed:     'Fallido',
  }[status]);

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

        {/* Balance disponible + botón de retiro */}
        <View style={styles.balanceCard}>
          <View>
            <Text style={styles.balanceLabel}>Disponible para retirar</Text>
            <Text style={styles.balanceAmount}>
              ${Number(connectStatus?.availableBalance ?? 0).toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.withdrawBtn, isWithdrawing && styles.withdrawBtnDisabled]}
            onPress={handleWithdraw}
            disabled={isWithdrawing}
            accessibilityRole="button"
          >
            {isWithdrawing
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.withdrawBtnText}>Retirar</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Banner Stripe Connect si no está configurado */}
        {!connectStatus?.accountVerified && (
          <TouchableOpacity
            style={styles.connectBanner}
            onPress={handleConnectStripe}
            disabled={isConnecting}
            activeOpacity={0.8}
          >
            <View style={styles.connectBannerContent}>
              <Text style={styles.connectBannerIcon}>🏦</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.connectBannerTitle}>Configura tu cuenta bancaria</Text>
                <Text style={styles.connectBannerSubtitle}>
                  {connectStatus?.hasConnectAccount
                    ? 'Tu cuenta está en revisión.'
                    : 'Vincula tu cuenta bancaria para recibir tus ganancias.'}
                </Text>
              </View>
              {isConnecting
                ? <ActivityIndicator color={BRAND_COLORS.PRIMARY} size="small" />
                : <Text style={styles.connectBannerArrow}>→</Text>
              }
            </View>
          </TouchableOpacity>
        )}

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
                  {new Date(entry.created_at).toLocaleDateString('es-MX', {
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

        {/* Historial de retiros */}
        {withdrawals.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Retiros</Text>
            {withdrawals.map(w => (
              <View key={w.id} style={styles.withdrawalRow}>
                <View>
                  <Text style={styles.withdrawalAmount}>${Number(w.amount).toFixed(2)}</Text>
                  <Text style={styles.withdrawalDate}>
                    {new Date(w.requested_at).toLocaleDateString('es-MX', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: withdrawalStatusColor(w.status) + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: withdrawalStatusColor(w.status) }]}>
                    {withdrawalStatusLabel(w.status)}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff', paddingTop: 24 },
  scroll: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  chartCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#FAFAFA', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#EEEEEE',
  },
  chartTitle: {
    fontSize: 15, fontWeight: '600', color: '#888',
    fontFamily: 'Inter_600SemiBold', marginBottom: 16,
  },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 6 },
  chartBarCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  chartAmount: { fontSize: 10, color: '#888', fontFamily: 'Inter_400Regular', marginBottom: 2 },
  chartBarBg: {
    width: '100%', height: 70, backgroundColor: '#E8E8E8',
    borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end',
  },
  chartBarFill: { width: '100%', backgroundColor: BRAND_COLORS.PRIMARY + '80', borderRadius: 6 },
  chartBarToday: { backgroundColor: BRAND_COLORS.PRIMARY },
  chartLabel: { fontSize: 11, color: '#888', fontFamily: 'Inter_400Regular', marginTop: 4 },
  chartLabelToday: { color: BRAND_COLORS.PRIMARY, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
    borderRadius: 20, backgroundColor: '#F8F9FA',
  },
  backBtnText: { fontSize: 22, color: BRAND_COLORS.TEXT },
  title: { fontSize: 18, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },

  periodSelector: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  periodBtn: {
    flex: 1, paddingVertical: 10,
    borderRadius: 10, alignItems: 'center',
  },
  periodBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  periodBtnText: { fontSize: 14, color: '#888', fontFamily: 'Inter_500Medium' },
  periodBtnTextActive: { color: BRAND_COLORS.TEXT, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  mainCard: {
    marginHorizontal: 16,
    backgroundColor: BRAND_COLORS.PRIMARY,
    borderRadius: 20,
    padding: 24,
    marginBottom: 12,
  },
  mainCardLabel: { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter_400Regular' },
  mainCardAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    marginTop: 12,
    paddingTop: 12,
  },
  totalLabel: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontFamily: 'Inter_400Regular' },
  totalAmount: { fontSize: 15, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' },

  balanceCard: {
    marginHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  balanceLabel: { fontSize: 14, color: '#888', fontFamily: 'Inter_400Regular' },
  balanceAmount: { fontSize: 28, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold', marginTop: 4 },
  withdrawBtn: {
    backgroundColor: BRAND_COLORS.ACCENT,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 100,
    alignItems: 'center',
  },
  withdrawBtnDisabled: { opacity: 0.6 },
  withdrawBtnText: { fontSize: 16, color: '#fff', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  connectBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: BRAND_COLORS.PRIMARY + '10',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BRAND_COLORS.PRIMARY + '40',
    padding: 16,
  },
  connectBannerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  connectBannerIcon: { fontSize: 28 },
  connectBannerTitle: { fontSize: 16, fontWeight: '600', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },
  connectBannerSubtitle: { fontSize: 13, color: '#666', fontFamily: 'Inter_400Regular', marginTop: 2 },
  connectBannerArrow: { fontSize: 20, color: BRAND_COLORS.PRIMARY, fontWeight: '700' },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_700Bold',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },

  emptyHistory: { alignItems: 'center', paddingVertical: 24 },
  emptyHistoryText: { fontSize: 15, color: '#AAA', fontFamily: 'Inter_400Regular' },

  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  entryLeft: { flex: 1, gap: 2 },
  entryType: { fontSize: 16, fontWeight: '600', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },
  entryDesc: { fontSize: 13, color: '#888', fontFamily: 'Inter_400Regular' },
  entryDate: { fontSize: 12, color: '#AAA', fontFamily: 'Inter_400Regular', marginTop: 2 },
  entryRight: { alignItems: 'flex-end', gap: 2 },
  entryNet: { fontSize: 18, fontWeight: '700', color: '#22C55E', fontFamily: 'Inter_700Bold' },
  entryGross: { fontSize: 12, color: '#AAA', fontFamily: 'Inter_400Regular' },

  withdrawalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  withdrawalAmount: { fontSize: 17, fontWeight: '600', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },
  withdrawalDate: { fontSize: 13, color: '#AAA', fontFamily: 'Inter_400Regular', marginTop: 2 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  statusBadgeText: { fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
