import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ActivityIndicator, ScrollView, Share, Alert, RefreshControl,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { apiClient } from '../../src/services/apiClient';
import { BRAND_COLORS } from '@vride/shared';

interface Member {
  code:   string;
  rides:  number;
  status: string;
}

interface ActiveGroup {
  id:          string;
  daysLeft:    number;
  memberCount: number;
  members:     Member[];
}

interface ReferralProgress {
  myReferralCode:     string | null;
  credit:             number;
  completedThisMonth: number;
  maxPerMonth:        number;
  rewardAmount:       number;
  ridesRequired:      number;
  groupSize:          number;
  groupDays:          number;
  activeGroup:        ActiveGroup | null;
}

export default function ReferralsScreen() {
  const [data, setData]         = useState<ReferralProgress | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied]     = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await apiClient.get('/referral/passenger/me');
      setData((res.data as any).data ?? res.data);
    } catch {
      Alert.alert('Error', 'No se pudo cargar la información de referidos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCopy = async () => {
    if (!data?.myReferralCode) return;
    await Clipboard.setStringAsync(data.myReferralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!data?.myReferralCode) return;
    await Share.share({
      message:
        `¡Únete a V-Ride y pide tu primer viaje con descuento! ` +
        `Usa mi código *${data.myReferralCode}* al registrarte. ` +
        `Descarga la app y empieza a moverte. 🚗`,
    });
  };

  const memberColor = (status: string) =>
    status === 'completed' ? '#065F46' : status === 'abandoned' ? '#991B1B' : BRAND_COLORS.PRIMARY;

  const memberIcon = (status: string) =>
    status === 'completed' ? '✅' : status === 'abandoned' ? '❌' : '🔄';

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} />
      </SafeAreaView>
    );
  }

  const group = data?.activeGroup ?? null;
  const slotsLeft = (data?.groupSize ?? 3) - (group?.memberCount ?? 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mis referidos</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[BRAND_COLORS.PRIMARY]} />}
      >
        {/* ── Código de referido ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tu código de referido</Text>
          <Text style={styles.code}>{data?.myReferralCode ?? '—'}</Text>
          <Text style={styles.cardSubtitle}>
            Comparte este código con tus amigos. Cuando se registren y completen{' '}
            {data?.ridesRequired ?? 10} viajes cada uno (en grupos de {data?.groupSize ?? 3}),
            ¡ganas ${(data?.rewardAmount ?? 5).toFixed(2)} de crédito!
          </Text>
          <View style={styles.codeActions}>
            <TouchableOpacity style={styles.btnOutline} onPress={handleCopy}>
              <Text style={styles.btnOutlineText}>{copied ? '¡Copiado!' : '📋 Copiar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleShare}>
              <Text style={styles.btnPrimaryText}>📲 Compartir</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Saldo de crédito ── */}
        {(data?.credit ?? 0) > 0 && (
          <View style={[styles.card, styles.creditCard]}>
            <Text style={styles.creditLabel}>💰 Crédito disponible</Text>
            <Text style={styles.creditAmount}>${(data!.credit).toFixed(2)}</Text>
            <Text style={styles.creditHint}>Se aplica automáticamente $1 por viaje en servicios de $3 o más</Text>
          </View>
        )}

        {/* ── Grupo activo ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Grupo actual</Text>

          {group ? (
            <>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Progreso del grupo</Text>
                <Text style={styles.progressBadge}>{group.memberCount}/{data?.groupSize ?? 3} referidos</Text>
              </View>

              <View style={styles.daysRow}>
                <Text style={styles.daysText}>
                  {group.daysLeft > 0
                    ? `⏳ Quedan ${group.daysLeft} días para que completen sus viajes`
                    : '⚠️ El plazo del grupo venció'}
                </Text>
              </View>

              {group.members.map((m, i) => (
                <View key={m.code} style={styles.memberRow}>
                  <Text style={styles.memberIcon}>{memberIcon(m.status)}</Text>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberCode}>Referido {i + 1} — {m.code}</Text>
                    <View style={styles.memberBarBg}>
                      <View style={[styles.memberBarFill, {
                        width: `${Math.min(100, (m.rides / (data?.ridesRequired ?? 10)) * 100)}%` as any,
                        backgroundColor: memberColor(m.status),
                      }]} />
                    </View>
                    <Text style={[styles.memberRides, { color: memberColor(m.status) }]}>
                      {m.rides}/{data?.ridesRequired ?? 10} viajes
                    </Text>
                  </View>
                </View>
              ))}

              {slotsLeft > 0 && (
                <Text style={styles.slotsHint}>
                  Aún puedes invitar a {slotsLeft} persona{slotsLeft > 1 ? 's' : ''} más a este grupo
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>
              No tienes un grupo activo. Comparte tu código para empezar.
              {'\n\n'}Recuerda: necesitas {data?.groupSize ?? 3} referidos que completen{' '}
              {data?.ridesRequired ?? 10} viajes en {data?.groupDays ?? 30} días para ganar{' '}
              ${(data?.rewardAmount ?? 5).toFixed(2)}.
            </Text>
          )}
        </View>

        {/* ── Límite mensual ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Este mes</Text>
          <Text style={styles.monthText}>
            Grupos completados: <Text style={styles.monthBold}>{data?.completedThisMonth ?? 0} / {data?.maxPerMonth ?? 2}</Text>
          </Text>
          <Text style={styles.monthHint}>
            Máximo {data?.maxPerMonth ?? 2} grupos por mes = máximo ${((data?.maxPerMonth ?? 2) * (data?.rewardAmount ?? 5)).toFixed(2)} en créditos mensuales
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn:   { padding: 4, marginRight: 8 },
  backArrow: { fontSize: 22, color: BRAND_COLORS.PRIMARY },
  title:     { fontSize: 18, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  scroll:    { padding: 16, gap: 12 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardTitle:    { fontSize: 15, fontWeight: '700', color: BRAND_COLORS.TEXT, marginBottom: 12, fontFamily: 'Inter_700Bold' },
  cardSubtitle: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginTop: 8, fontFamily: 'Inter_400Regular' },

  code: {
    fontSize: 30, fontWeight: '800', color: BRAND_COLORS.PRIMARY,
    textAlign: 'center', letterSpacing: 3, marginVertical: 8, fontFamily: 'Inter_700Bold',
  },
  codeActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btnOutline: {
    flex: 1, borderWidth: 1.5, borderColor: BRAND_COLORS.PRIMARY,
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  btnOutlineText: { fontSize: 14, fontWeight: '600', color: BRAND_COLORS.PRIMARY, fontFamily: 'Inter_600SemiBold' },
  btnPrimary: {
    flex: 1, backgroundColor: BRAND_COLORS.PRIMARY,
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  btnPrimaryText: { fontSize: 14, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' },

  creditCard:   { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  creditLabel:  { fontSize: 14, fontWeight: '600', color: '#065F46', fontFamily: 'Inter_600SemiBold' },
  creditAmount: { fontSize: 36, fontWeight: '800', color: '#065F46', marginVertical: 4, fontFamily: 'Inter_700Bold' },
  creditHint:   { fontSize: 12, color: '#166534', fontFamily: 'Inter_400Regular' },

  progressRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel:{ fontSize: 13, color: '#6B7280', fontFamily: 'Inter_400Regular' },
  progressBadge:{
    fontSize: 12, fontWeight: '700', color: BRAND_COLORS.PRIMARY,
    backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
    fontFamily: 'Inter_700Bold',
  },
  daysRow:  { marginBottom: 14 },
  daysText: { fontSize: 13, color: '#374151', fontFamily: 'Inter_500Medium' },

  memberRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 10 },
  memberIcon:{ fontSize: 20, marginTop: 2 },
  memberInfo:{ flex: 1 },
  memberCode:{ fontSize: 13, fontWeight: '600', color: BRAND_COLORS.TEXT, marginBottom: 4, fontFamily: 'Inter_600SemiBold' },
  memberBarBg: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginBottom: 3 },
  memberBarFill: { height: 6, borderRadius: 3 },
  memberRides:{ fontSize: 12, fontFamily: 'Inter_500Medium' },

  slotsHint: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 4, fontFamily: 'Inter_400Regular' },
  emptyText: { fontSize: 13, color: '#6B7280', lineHeight: 20, fontFamily: 'Inter_400Regular' },

  monthText: { fontSize: 14, color: BRAND_COLORS.TEXT, marginBottom: 4, fontFamily: 'Inter_500Medium' },
  monthBold: { fontWeight: '700', color: BRAND_COLORS.PRIMARY, fontFamily: 'Inter_700Bold' },
  monthHint: { fontSize: 12, color: '#9CA3AF', fontFamily: 'Inter_400Regular' },
});
