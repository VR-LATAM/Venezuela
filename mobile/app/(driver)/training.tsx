// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Pantalla de certificación — módulos agrupados por tipo de servicio
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { BRAND_COLORS } from '@vride/shared';
import { useTrainingStore } from '../../src/store/trainingStore';
import type { TrainingModule, ServiceType } from '../../src/services/trainingService';

const SERVICE_LABELS: Record<ServiceType | 'prerequisite', { label: string; icon: string; desc: string }> = {
  prerequisite: { label: 'Foundation',         icon: '📋', desc: 'Required for all service types' },
  standard:     { label: 'Standard Service',   icon: '🚗', desc: 'Core door-to-door transportation' },
  executive:    { label: 'Executive Service',  icon: '⭐', desc: 'Premium experience — 1.8x fare' },
  accessible:   { label: 'Accessible Service', icon: '♿', desc: 'ADA-compliant wheelchair transport' },
  scheduled:    { label: 'Scheduled Service',  icon: '📅', desc: 'Pre-booked rides for appointments' },
};

function moduleBadge(module: TrainingModule): { label: string; color: string; bg: string } {
  const s = module.progress?.status;
  if (s === 'passed')  return { label: '✓ Certified', color: BRAND_COLORS.ACCENT, bg: '#F0FFF4' };
  if (s === 'failed')  return { label: '✗ Failed',    color: BRAND_COLORS.ALERT,  bg: '#FFF5F5' };
  if (s === 'reading') return { label: '📖 Reading',  color: BRAND_COLORS.PRIMARY, bg: '#EFF6FF' };
  return { label: 'Pending', color: '#888', bg: '#F5F5F5' };
}

function certBadge(certified: boolean): { label: string; color: string; bg: string } {
  return certified
    ? { label: '✓ Certified', color: BRAND_COLORS.ACCENT, bg: '#F0FFF4' }
    : { label: 'Not certified', color: '#888', bg: '#F5F5F5' };
}

type GroupKey = ServiceType | 'prerequisite';

function groupModules(modules: TrainingModule[]): { key: GroupKey; modules: TrainingModule[] }[] {
  const groups: Record<GroupKey, TrainingModule[]> = {
    prerequisite: [],
    standard: [],
    executive: [],
    accessible: [],
    scheduled: [],
  };
  for (const m of modules) {
    if (m.is_prerequisite) {
      groups.prerequisite.push(m);
    } else if (m.service_type) {
      groups[m.service_type].push(m);
    }
  }
  const order: GroupKey[] = ['prerequisite', 'standard', 'executive', 'accessible', 'scheduled'];
  return order
    .filter(k => groups[k].length > 0)
    .map(k => ({ key: k, modules: groups[k] }));
}

function ModuleCard({ module, onPress }: { module: TrainingModule; onPress: () => void }) {
  const badge = moduleBadge(module);
  const isPassed = module.progress?.status === 'passed';
  return (
    <TouchableOpacity
      style={[styles.moduleCard, isPassed && styles.moduleCardPassed]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.moduleCardLeft}>
        <View style={styles.moduleInfo}>
          <Text style={styles.moduleCode}>{module.code}</Text>
          <Text style={styles.moduleTitle} numberOfLines={2}>
            {module.title.replace(/^(Module \d+: |VRN-TRN-\d+[\w-]*: )/, '')}
          </Text>
          <Text style={styles.moduleMeta}>
            {module.total_questions} questions · Pass {module.passing_score}/{module.total_questions}
            {(module.progress?.attempts ?? 0) > 0
              ? ` · ${module.progress!.attempts} attempt${module.progress!.attempts !== 1 ? 's' : ''}`
              : ''}
          </Text>
        </View>
      </View>
      <View style={[styles.badge, { backgroundColor: badge.bg }]}>
        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

function ServiceGroup({
  groupKey,
  modules,
  certified,
  prerequisitesPassed,
  onModulePress,
}: {
  groupKey: GroupKey;
  modules: TrainingModule[];
  certified: boolean;
  prerequisitesPassed: boolean;
  onModulePress: (m: TrainingModule) => void;
}) {
  const info = SERVICE_LABELS[groupKey];
  const badge = groupKey === 'prerequisite'
    ? (prerequisitesPassed ? { label: '✓ Complete', color: BRAND_COLORS.ACCENT, bg: '#F0FFF4' } : { label: 'Required', color: '#F59E0B', bg: '#FFF9E6' })
    : certBadge(certified);

  const locked = groupKey !== 'prerequisite' && !prerequisitesPassed;

  return (
    <View style={styles.group}>
      <View style={[styles.groupHeader, locked && styles.groupHeaderLocked]}>
        <View style={styles.groupHeaderLeft}>
          <Text style={styles.groupIcon}>{info.icon}</Text>
          <View>
            <Text style={styles.groupLabel}>{info.label}</Text>
            <Text style={styles.groupDesc}>{info.desc}</Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      {locked ? (
        <View style={styles.lockedNotice}>
          <Text style={styles.lockedText}>🔒 Complete the Foundation module first</Text>
        </View>
      ) : (
        modules.map(m => (
          <ModuleCard key={m.id} module={m} onPress={() => onModulePress(m)} />
        ))
      )}
    </View>
  );
}

export default function TrainingScreen() {
  const { modules, status, certifications, loading, loadModules, loadStatus, loadCertifications } = useTrainingStore();

  useEffect(() => {
    void loadModules();
    void loadStatus();
    void loadCertifications();
  }, []);

  const onRefresh = useCallback(async () => {
    await Promise.all([loadModules(), loadStatus(), loadCertifications()]);
  }, []);

  const handleModulePress = (module: TrainingModule) => {
    router.push({
      pathname: '/(driver)/training-module',
      params: { moduleId: String(module.id) },
    });
  };

  if (loading && modules.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Loading certifications…</Text>
      </SafeAreaView>
    );
  }

  const groups = groupModules(modules);
  const prerequisitesPassed = certifications?.prerequisites_passed ?? false;
  const certifiedServices = certifications?.certified_services ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Certifications</Text>
        <View style={{ width: 60 }} />
      </View>

      {status && (
        <View style={[
          styles.progressBanner,
          status.isComplete ? styles.bannerComplete : styles.bannerPending,
        ]}>
          <Text style={styles.progressEmoji}>{status.isComplete ? '🎓' : '📚'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.progressTitle}>
              {status.isComplete ? 'All certifications complete!' : 'Complete your certifications to go online'}
            </Text>
            <Text style={styles.progressSub}>
              {certifiedServices.length} of 4 services certified
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={BRAND_COLORS.PRIMARY} />
        }
      >
        <Text style={styles.intro}>
          Read each module and pass the exam to unlock that service type. Start with the Foundation module.
        </Text>
        {groups.map(g => (
          <ServiceGroup
            key={g.key}
            groupKey={g.key}
            modules={g.modules}
            certified={g.key !== 'prerequisite' && certifiedServices.includes(g.key as ServiceType)}
            prerequisitesPassed={prerequisitesPassed}
            onModulePress={handleModulePress}
          />
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#888', fontSize: 15 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 60 },
  backBtnText: { color: BRAND_COLORS.PRIMARY, fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: BRAND_COLORS.TEXT },

  progressBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    margin: 16, padding: 16, borderRadius: 14,
  },
  bannerComplete: { backgroundColor: BRAND_COLORS.ACCENT + '20', borderWidth: 1, borderColor: BRAND_COLORS.ACCENT + '40' },
  bannerPending:  { backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#F59E0B40' },
  progressEmoji: { fontSize: 28 },
  progressTitle: { fontSize: 14, fontWeight: '700', color: BRAND_COLORS.TEXT, marginBottom: 2 },
  progressSub:   { fontSize: 13, color: '#666' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  intro: { fontSize: 13, color: '#888', lineHeight: 18, marginBottom: 16 },

  group: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  groupHeaderLocked: { opacity: 0.6 },
  groupHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  groupIcon: { fontSize: 26 },
  groupLabel: { fontSize: 15, fontWeight: '700', color: BRAND_COLORS.TEXT },
  groupDesc:  { fontSize: 12, color: '#888', marginTop: 1 },

  lockedNotice: {
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#F9FAFB',
  },
  lockedText: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },

  moduleCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  moduleCardPassed: { borderLeftWidth: 3, borderLeftColor: BRAND_COLORS.ACCENT },
  moduleCardLeft: { flex: 1, marginRight: 8 },
  moduleInfo: { flex: 1 },
  moduleCode:  { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 2 },
  moduleTitle: { fontSize: 14, fontWeight: '700', color: BRAND_COLORS.TEXT, lineHeight: 19, marginBottom: 3 },
  moduleMeta:  { fontSize: 12, color: '#9CA3AF' },

  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
});
