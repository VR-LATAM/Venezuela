// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Pantalla de referidos del conductor
// Muestra código, progreso de referidos, bonos ganados y leaderboard
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, ActivityIndicator, Share,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { apiClient } from '../../src/services/apiClient';
import { BRAND_COLORS } from '@vride/shared';

interface ReferralData {
  referralCode:      string | null;
  referrals: {
    referred_driver_id: string;
    referred_name:      string;
    rides_completed:    number;
    rides_required:     number;
    status:             string;
    progressPercent:    number;
    first_ride_bonus_paid: boolean;
  }[];
  totalReferrals:    number;
  activeReferrals:   number;
  totalBonusEarned:  number;
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending:     { text: 'Pending',     color: '#888' },
  in_progress: { text: 'In progress', color: BRAND_COLORS.ACCENT },
  completed:   { text: 'Completed',   color: '#22C55E' },
  paid:        { text: 'Paid',        color: BRAND_COLORS.PRIMARY },
};

export default function ReferralsScreen() {
  const [data, setData]         = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied]     = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get<{ success: boolean; data: ReferralData }>('/referral/me');
      setData(res.data);
    } catch {
      Alert.alert('Error', 'Could not load referral dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCopyCode = async () => {
    if (!data?.referralCode) return;
    await Clipboard.setStringAsync(data.referralCode);
    setCopied(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!data?.referralCode) return;
    try {
      await Share.share({
        message: `Join Verona Ride and earn $50 on your first ride!\n\nUse my referral code: ${data.referralCode}\n\nDownload the app at: https://veronaride.app/download`,
        title:   'Join Verona Ride',
      });
    } catch { /* usuario canceló */ }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}><ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Referral Program</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Banner explicativo */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroEmoji}>🤝</Text>
          <Text style={styles.heroTitle}>Earn up to $600 per referral!</Text>
          <Text style={styles.heroSub}>
            Invite a driver:
            {'\n'}• Your referral earns <Text style={styles.bold}>$50</Text> on their first ride
            {'\n'}• You earn <Text style={styles.bold}>$50/month</Text> for each month they complete 100+ rides
            {'\n'}• <Text style={styles.bold}>$600 total</Text> after 12 qualifying months
          </Text>
        </View>

        {/* Mi código */}
        {data?.referralCode && (
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>MY CODE</Text>
            <Text style={styles.codeValue}>{data.referralCode}</Text>
            <View style={styles.codeActions}>
              <TouchableOpacity style={styles.codeBtn} onPress={handleCopyCode}>
                <Text style={styles.codeBtnText}>{copied ? '✓ Copied' : '📋  Copy'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.codeBtn, styles.codeBtnShare]} onPress={handleShare}>
                <Text style={[styles.codeBtnText, { color: '#fff' }]}>📤  Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Resumen */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{data?.totalReferrals ?? 0}</Text>
            <Text style={styles.statLbl}>Total referrals</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{data?.activeReferrals ?? 0}</Text>
            <Text style={styles.statLbl}>In progress</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#22C55E' }]}>
              ${(data?.totalBonusEarned ?? 0).toFixed(0)}
            </Text>
            <Text style={styles.statLbl}>Bonus earned</Text>
          </View>
        </View>

        {/* Lista de referidos */}
        <Text style={styles.sectionTitle}>My referrals</Text>

        {data?.referrals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>You haven't referred any drivers yet</Text>
            <TouchableOpacity style={styles.sharePrompt} onPress={handleShare}>
              <Text style={styles.sharePromptText}>Share my code now →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          data?.referrals.map(ref => {
            const st = STATUS_LABEL[ref.status] ?? { text: ref.status, color: '#888' };
            return (
              <View key={ref.referred_driver_id} style={styles.referralCard}>
                <View style={styles.referralTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{ref.referred_name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.referralInfo}>
                    <Text style={styles.referralName}>{ref.referred_name}</Text>
                    <View style={[styles.statusPill, { backgroundColor: st.color + '20' }]}>
                      <Text style={[styles.statusPillText, { color: st.color }]}>{st.text}</Text>
                    </View>
                  </View>
                  <View style={styles.referralRight}>
                    <Text style={styles.ridesCount}>{ref.rides_completed}/{ref.rides_required}</Text>
                    <Text style={styles.ridesLabel}>months</Text>
                  </View>
                </View>

                {/* Barra de progreso */}
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${ref.progressPercent}%` as any }]} />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabel}>{ref.progressPercent}% · {ref.rides_completed}/12 months</Text>
                  {ref.first_ride_bonus_paid && (
                    <Text style={styles.bonusPaid}>✓ Welcome bonus paid</Text>
                  )}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#F8F9FA' },
  backBtnText: { fontSize: 22, color: BRAND_COLORS.TEXT },
  title: { fontSize: 18, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  scroll: { padding: 16, gap: 16 },

  heroBanner: {
    backgroundColor: BRAND_COLORS.PRIMARY,
    borderRadius: 20, padding: 24, alignItems: 'center', gap: 8,
  },
  heroEmoji: { fontSize: 40 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff', fontFamily: 'Inter_700Bold', textAlign: 'center' },
  heroSub:   { fontSize: 15, color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  bold: { fontWeight: '700', color: '#fff' },

  codeCard: {
    backgroundColor: '#F8F9FA', borderRadius: 16, padding: 20,
    alignItems: 'center', gap: 12, borderWidth: 2, borderColor: BRAND_COLORS.PRIMARY + '30',
    borderStyle: 'dashed',
  },
  codeLabel: { fontSize: 12, fontWeight: '700', color: '#888', fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
  codeValue: { fontSize: 32, fontWeight: '800', color: BRAND_COLORS.PRIMARY, fontFamily: 'Inter_700Bold', letterSpacing: 4 },
  codeActions: { flexDirection: 'row', gap: 10, width: '100%' },
  codeBtn: {
    flex: 1, height: 48, justifyContent: 'center', alignItems: 'center',
    borderRadius: 12, backgroundColor: '#EBEBEB',
  },
  codeBtnShare: { backgroundColor: BRAND_COLORS.PRIMARY },
  codeBtnText: { fontSize: 15, fontWeight: '600', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },

  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: {
    flex: 1, backgroundColor: '#F8F9FA', borderRadius: 12,
    padding: 14, alignItems: 'center', gap: 4,
  },
  statVal: { fontSize: 22, fontWeight: '800', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  statLbl: { fontSize: 12, color: '#888', fontFamily: 'Inter_400Regular', textAlign: 'center' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },

  emptyContainer: { alignItems: 'center', gap: 12, paddingVertical: 20 },
  emptyText: { fontSize: 15, color: '#888', fontFamily: 'Inter_400Regular' },
  sharePrompt: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: BRAND_COLORS.PRIMARY + '15', borderRadius: 10 },
  sharePromptText: { fontSize: 15, color: BRAND_COLORS.PRIMARY, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  referralCard: {
    backgroundColor: '#F8F9FA', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#EEEEEE', gap: 10,
  },
  referralTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: BRAND_COLORS.PRIMARY, justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },
  referralInfo: { flex: 1, gap: 4 },
  referralName: { fontSize: 16, fontWeight: '600', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },
  statusPill: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  statusPillText: { fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  referralRight: { alignItems: 'center' },
  ridesCount: { fontSize: 18, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  ridesLabel: { fontSize: 11, color: '#888', fontFamily: 'Inter_400Regular' },

  progressBar: { height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: BRAND_COLORS.PRIMARY, borderRadius: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 12, color: '#888', fontFamily: 'Inter_400Regular' },
  bonusPaid: { fontSize: 12, color: '#22C55E', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
