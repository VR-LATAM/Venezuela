// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Pantalla de lectura de un módulo de entrenamiento
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BRAND_COLORS } from '@vride/shared';
import { trainingMobileService, TrainingModule } from '../../src/services/trainingService';
import { useTrainingStore } from '../../src/store/trainingStore';

export default function TrainingModuleScreen() {
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const { loadModules, loadStatus } = useTrainingStore();

  const [module, setModule]         = useState<TrainingModule | null>(null);
  const [loading, setLoading]       = useState(true);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [startedReading, setStartedReading] = useState(false);

  useEffect(() => {
    void loadModule();
  }, [moduleId]);

  const loadModule = async () => {
    try {
      const data = await trainingMobileService.getModule(Number(moduleId));
      setModule(data);

      // Marcar como "en lectura" si aún no lo estaba
      if (!data.progress || data.progress.status === 'not_started') {
        await trainingMobileService.startReading(data.id);
        setStartedReading(true);
      }
    } catch {
      Alert.alert('Error', 'Could not load this module. Please try again.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 80;
    if (isNearBottom && !hasScrolled) {
      setHasScrolled(true);
    }
  };

  const handleStartQuiz = () => {
    if (!module) return;
    router.push({
      pathname: '/(driver)/training-quiz',
      params: { moduleId: String(module.id) },
    });
  };

  const isPassed  = module?.progress?.status === 'passed';
  const hasFailed = module?.progress?.status === 'failed';

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} />
      </SafeAreaView>
    );
  }

  if (!module) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerCode}>{module.code}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        showsVerticalScrollIndicator
      >
        {/* Título del módulo */}
        <Text style={styles.moduleTitle}>{module.title}</Text>

        {/* Chip de estado */}
        {isPassed && (
          <View style={styles.passedChip}>
            <Text style={styles.passedChipText}>✓ Passed — Score: {module.progress?.last_score}/{module.total_questions}</Text>
          </View>
        )}
        {hasFailed && (
          <View style={styles.failedChip}>
            <Text style={styles.failedChipText}>Last score: {module.progress?.last_score}/{module.total_questions} — Try again</Text>
          </View>
        )}

        {/* Info del quiz */}
        <View style={styles.quizInfoBox}>
          <Text style={styles.quizInfoText}>📝 {module.total_questions} questions · Pass {module.passing_score}/{module.total_questions}</Text>
          {(module.progress?.attempts ?? 0) > 0 && (
            <Text style={styles.quizInfoText}>🔄 {module.progress!.attempts} attempt{module.progress!.attempts !== 1 ? 's' : ''}</Text>
          )}
        </View>

        {/* Contenido del módulo por secciones */}
        {module.content.map((section, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        {/* Espaciado antes del botón */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botón de acción fijo abajo */}
      <View style={styles.footer}>
        {!hasScrolled && !isPassed && !hasFailed && (
          <Text style={styles.scrollHint}>↓ Scroll to the bottom to unlock the quiz</Text>
        )}
        <TouchableOpacity
          style={[
            styles.quizButton,
            (!hasScrolled && !isPassed && !hasFailed) && styles.quizButtonDisabled,
          ]}
          onPress={handleStartQuiz}
          disabled={!hasScrolled && !isPassed && !hasFailed}
          activeOpacity={0.8}
        >
          <Text style={styles.quizButtonText}>
            {isPassed ? '📝 Retake Quiz' : hasFailed ? '🔄 Retry Quiz' : '📝 Start Quiz'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 60 },
  backBtnText: { color: BRAND_COLORS.PRIMARY, fontSize: 15, fontWeight: '600' },
  headerCode: { fontSize: 13, fontWeight: '700', color: '#888', letterSpacing: 0.5 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  moduleTitle: {
    fontSize: 22, fontWeight: '800', color: BRAND_COLORS.TEXT,
    lineHeight: 30, marginBottom: 12,
  },

  passedChip: {
    backgroundColor: BRAND_COLORS.ACCENT + '20', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start',
    marginBottom: 12, borderWidth: 1, borderColor: BRAND_COLORS.ACCENT + '40',
  },
  passedChipText: { color: BRAND_COLORS.ACCENT, fontSize: 13, fontWeight: '700' },

  failedChip: {
    backgroundColor: '#FFF5F5', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start',
    marginBottom: 12, borderWidth: 1, borderColor: '#FCA5A5',
  },
  failedChipText: { color: BRAND_COLORS.ALERT, fontSize: 13, fontWeight: '700' },

  quizInfoBox: {
    flexDirection: 'row', gap: 16, backgroundColor: '#fff',
    borderRadius: 10, padding: 12, marginBottom: 20,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  quizInfoText: { fontSize: 13, color: '#666', fontWeight: '500' },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 17, fontWeight: '700', color: BRAND_COLORS.PRIMARY,
    marginBottom: 10, paddingBottom: 6,
    borderBottomWidth: 2, borderBottomColor: BRAND_COLORS.PRIMARY + '30',
  },
  sectionBody: {
    fontSize: 15, color: BRAND_COLORS.TEXT, lineHeight: 24,
  },

  footer: {
    padding: 16, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 8,
  },
  scrollHint: {
    textAlign: 'center', fontSize: 13, color: '#888',
  },
  quizButton: {
    backgroundColor: BRAND_COLORS.PRIMARY, borderRadius: 14,
    height: 54, justifyContent: 'center', alignItems: 'center',
  },
  quizButtonDisabled: { backgroundColor: '#CBD5E1' },
  quizButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
