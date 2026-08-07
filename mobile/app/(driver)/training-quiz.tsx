// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Pantalla de quiz del módulo de entrenamiento
// Las preguntas y opciones se aleatorizan en el servidor cada intento
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BRAND_COLORS } from '@vride/shared';
import {
  trainingMobileService,
  QuizQuestion,
  QuizResult,
} from '../../src/services/trainingService';
import { useTrainingStore } from '../../src/store/trainingStore';

type QuizPhase = 'loading' | 'quiz' | 'result';

export default function TrainingQuizScreen() {
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const { refreshAll } = useTrainingStore();

  const [phase, setPhase]         = useState<QuizPhase>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [moduleTitle, setModuleTitle] = useState('');
  const [passingScore, setPassingScore] = useState(8);
  const [totalQ, setTotalQ]       = useState(10);

  // Respuestas seleccionadas: {question_id: selected_key}
  const [answers, setAnswers]     = useState<Record<number, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);

  // Resultado final
  const [result, setResult]       = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void loadQuiz();
  }, [moduleId]);

  const loadQuiz = async () => {
    try {
      const [quizData, moduleData] = await Promise.all([
        trainingMobileService.getQuiz(Number(moduleId)),
        trainingMobileService.getModule(Number(moduleId)),
      ]);
      setQuestions(quizData.questions);
      setModuleTitle(moduleData.title);
      setPassingScore(moduleData.passing_score);
      setTotalQ(moduleData.total_questions);
      setAnswers({});
      setCurrentIdx(0);
      setPhase('quiz');
    } catch {
      Alert.alert('Error', 'No se pudo cargar el examen. Intenta de nuevo.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  const handleSelectOption = (questionId: number, key: string) => {
    Haptics.selectionAsync();
    setAnswers(prev => ({ ...prev, [questionId]: key }));
  };

  const currentQuestion = questions[currentIdx];
  const selectedForCurrent = currentQuestion ? answers[currentQuestion.id] : null;
  const allAnswered = questions.length > 0 && questions.every(q => answers[q.id] !== undefined);
  const answeredCount = Object.keys(answers).length;

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!allAnswered) {
      Alert.alert(
        'Incompleto',
        `Has respondido ${answeredCount} de ${questions.length} preguntas. Responde todas antes de enviar.`
      );
      return;
    }

    Alert.alert(
      '¿Enviar examen?',
      `Estás a punto de enviar tus respuestas para ${questions.length} preguntas.`,
      [
        { text: 'Revisar respuestas', style: 'cancel' },
        {
          text: 'Enviar', style: 'default',
          onPress: async () => {
            setSubmitting(true);
            try {
              const res = await trainingMobileService.submitQuiz(Number(moduleId), answers);
              setResult(res);
              setPhase('result');
              await refreshAll();
              if (res.passed) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
            } catch {
              Alert.alert('Error', 'No se pudo enviar el examen. Intenta de nuevo.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleRetry = () => {
    setResult(null);
    setAnswers({});
    setCurrentIdx(0);
    setPhase('loading');
    void loadQuiz();
  };

  // ── Loading ──
  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Cargando examen…</Text>
      </SafeAreaView>
    );
  }

  // ── Result ──
  if (phase === 'result' && result) {
    const pct = Math.round((result.score / result.total) * 100);
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <View style={[styles.resultCard, result.passed ? styles.resultCardPass : styles.resultCardFail]}>
            <Text style={styles.resultEmoji}>{result.passed ? '🎓' : '📖'}</Text>
            <Text style={styles.resultTitle}>
              {result.passed ? '¡Felicitaciones!' : '¡Sigue estudiando!'}
            </Text>
            <Text style={styles.resultSubtitle}>
              {result.passed
                ? 'Aprobaste este módulo.'
                : `Necesitas ${result.passing_score}/${result.total} para aprobar.`}
            </Text>

            <View style={styles.scoreRow}>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreNumber}>{result.score}</Text>
                <Text style={styles.scoreLabel}>Correctas</Text>
              </View>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreNumber}>{result.total - result.score}</Text>
                <Text style={styles.scoreLabel}>Incorrectas</Text>
              </View>
              <View style={styles.scoreBox}>
                <Text style={[styles.scoreNumber, { color: result.passed ? BRAND_COLORS.ACCENT : BRAND_COLORS.ALERT }]}>
                  {pct}%
                </Text>
                <Text style={styles.scoreLabel}>Puntaje</Text>
              </View>
            </View>
          </View>

          {/* Revisión de respuestas */}
          <Text style={styles.reviewTitle}>Revisión de respuestas</Text>
          {questions.map((q, i) => {
            const selected = answers[q.id];
            const correct  = result.correct_answers[q.id];
            const isRight  = selected === correct;
            const correctOption = q.options.find(o => o.key === correct);
            const selectedOption = q.options.find(o => o.key === selected);

            return (
              <View key={q.id} style={[styles.reviewCard, isRight ? styles.reviewCardRight : styles.reviewCardWrong]}>
                <Text style={styles.reviewQNum}>Q{i + 1}</Text>
                <Text style={styles.reviewQText}>{q.question_text}</Text>
                {!isRight && (
                  <View style={styles.reviewAnswerRow}>
                    <Text style={styles.reviewWrongLabel}>Tu respuesta:</Text>
                    <Text style={styles.reviewWrongText}>{selectedOption?.text ?? '—'}</Text>
                  </View>
                )}
                <View style={styles.reviewAnswerRow}>
                  <Text style={styles.reviewCorrectLabel}>Respuesta correcta:</Text>
                  <Text style={styles.reviewCorrectText}>{correctOption?.text ?? '—'}</Text>
                </View>
              </View>
            );
          })}

          <View style={styles.resultActions}>
            {!result.passed && (
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
                <Text style={styles.retryButtonText}>🔄 Intentar de nuevo</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.backButton, result.passed && { flex: 1 }]}
              onPress={() => router.replace('/(driver)/training')}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>
                {result.passed ? '← Volver a certificaciones' : 'Volver al módulo'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Quiz ──
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {moduleTitle.replace(/^Module \d+: /, '')}
          </Text>
          <Text style={styles.headerSub}>
            Pregunta {currentIdx + 1} de {questions.length} · {answeredCount} respondidas
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${((currentIdx + 1) / questions.length) * 100}%` }]} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.quizContent}>
        {/* Pregunta */}
        <View style={styles.questionCard}>
          <Text style={styles.questionNumber}>Pregunta {currentIdx + 1}</Text>
          <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
        </View>

        {/* Opciones */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option) => {
            const isSelected = selectedForCurrent === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.optionBtn, isSelected && styles.optionBtnSelected]}
                onPress={() => handleSelectOption(currentQuestion.id, option.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.optionKeyBadge, isSelected && styles.optionKeyBadgeSelected]}>
                  <Text style={[styles.optionKey, isSelected && styles.optionKeySelected]}>
                    {option.key}
                  </Text>
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {option.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Navegación entre preguntas */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, currentIdx === 0 && styles.navBtnDisabled]}
            onPress={handlePrev}
            disabled={currentIdx === 0}
          >
            <Text style={styles.navBtnText}>← Anterior</Text>
          </TouchableOpacity>

          {currentIdx < questions.length - 1 ? (
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnNext]}
              onPress={handleNext}
            >
              <Text style={[styles.navBtnText, styles.navBtnNextText]}>Siguiente →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnSubmit, !allAnswered && styles.navBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.navBtnText, styles.navBtnSubmitText]}>Enviar ✓</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Mapa de preguntas respondidas */}
        <View style={styles.questionMap}>
          {questions.map((q, i) => (
            <TouchableOpacity
              key={q.id}
              style={[
                styles.mapDot,
                i === currentIdx && styles.mapDotCurrent,
                answers[q.id] !== undefined && styles.mapDotAnswered,
              ]}
              onPress={() => setCurrentIdx(i)}
            >
              <Text style={styles.mapDotText}>{i + 1}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#888', fontSize: 15 },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 40, justifyContent: 'center' },
  backBtnText: { fontSize: 18, color: '#888', fontWeight: '600' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: BRAND_COLORS.TEXT },
  headerSub: { fontSize: 12, color: '#888', marginTop: 2 },

  progressBarBg: { height: 4, backgroundColor: '#E5E7EB' },
  progressBarFill: { height: 4, backgroundColor: BRAND_COLORS.PRIMARY },

  quizContent: { paddingHorizontal: 20, paddingTop: 20 },

  questionCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  questionNumber: { fontSize: 12, fontWeight: '700', color: BRAND_COLORS.PRIMARY, marginBottom: 8 },
  questionText: { fontSize: 17, fontWeight: '700', color: BRAND_COLORS.TEXT, lineHeight: 25 },

  optionsContainer: { gap: 10, marginBottom: 20 },
  optionBtn: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 2, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  optionBtnSelected: {
    borderColor: BRAND_COLORS.PRIMARY,
    backgroundColor: BRAND_COLORS.PRIMARY + '08',
  },
  optionKeyBadge: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#F0F4FF', justifyContent: 'center', alignItems: 'center',
  },
  optionKeyBadgeSelected: { backgroundColor: BRAND_COLORS.PRIMARY },
  optionKey: { fontSize: 14, fontWeight: '800', color: BRAND_COLORS.PRIMARY },
  optionKeySelected: { color: '#fff' },
  optionText: { flex: 1, fontSize: 15, color: BRAND_COLORS.TEXT, lineHeight: 21 },
  optionTextSelected: { fontWeight: '600' },

  navRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  navBtn: {
    flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff',
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnNext: { backgroundColor: BRAND_COLORS.PRIMARY + '15', borderColor: BRAND_COLORS.PRIMARY + '40' },
  navBtnNextText: { color: BRAND_COLORS.PRIMARY, fontWeight: '700' },
  navBtnSubmit: { backgroundColor: BRAND_COLORS.ACCENT, borderColor: BRAND_COLORS.ACCENT },
  navBtnSubmitText: { color: '#fff', fontWeight: '700' },
  navBtnText: { fontSize: 15, fontWeight: '600', color: '#666' },

  questionMap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  mapDot: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center',
  },
  mapDotCurrent: { backgroundColor: BRAND_COLORS.PRIMARY + '20', borderWidth: 2, borderColor: BRAND_COLORS.PRIMARY },
  mapDotAnswered: { backgroundColor: BRAND_COLORS.ACCENT + '20', borderWidth: 1, borderColor: BRAND_COLORS.ACCENT },
  mapDotText: { fontSize: 12, fontWeight: '700', color: BRAND_COLORS.TEXT },

  // Result styles
  resultScroll: { padding: 20 },
  resultCard: {
    borderRadius: 18, padding: 28, alignItems: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  resultCardPass: { backgroundColor: '#fff', borderWidth: 2, borderColor: BRAND_COLORS.ACCENT + '40' },
  resultCardFail: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#FCA5A5' },
  resultEmoji: { fontSize: 52, marginBottom: 12 },
  resultTitle: { fontSize: 24, fontWeight: '800', color: BRAND_COLORS.TEXT, marginBottom: 6 },
  resultSubtitle: { fontSize: 15, color: '#666', marginBottom: 20, textAlign: 'center' },
  scoreRow: { flexDirection: 'row', gap: 16 },
  scoreBox: { alignItems: 'center', minWidth: 70 },
  scoreNumber: { fontSize: 32, fontWeight: '800', color: BRAND_COLORS.TEXT },
  scoreLabel: { fontSize: 13, color: '#888', marginTop: 2 },

  reviewTitle: {
    fontSize: 17, fontWeight: '700', color: BRAND_COLORS.TEXT, marginBottom: 12,
  },
  reviewCard: {
    borderRadius: 12, padding: 16, marginBottom: 10,
    borderLeftWidth: 4,
  },
  reviewCardRight: { backgroundColor: '#F0FFF4', borderLeftColor: BRAND_COLORS.ACCENT },
  reviewCardWrong: { backgroundColor: '#FFF5F5', borderLeftColor: BRAND_COLORS.ALERT },
  reviewQNum: { fontSize: 12, fontWeight: '700', color: '#888', marginBottom: 4 },
  reviewQText: { fontSize: 14, fontWeight: '600', color: BRAND_COLORS.TEXT, marginBottom: 8, lineHeight: 20 },
  reviewAnswerRow: { gap: 2, marginTop: 4 },
  reviewWrongLabel: { fontSize: 12, color: BRAND_COLORS.ALERT, fontWeight: '600' },
  reviewWrongText: { fontSize: 13, color: '#333' },
  reviewCorrectLabel: { fontSize: 12, color: BRAND_COLORS.ACCENT, fontWeight: '600' },
  reviewCorrectText: { fontSize: 13, color: '#333', fontWeight: '600' },

  resultActions: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 40 },
  retryButton: {
    flex: 1, height: 54, backgroundColor: BRAND_COLORS.PRIMARY,
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backButton: {
    flex: 1, height: 54, backgroundColor: '#F0F4FF',
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: BRAND_COLORS.PRIMARY + '40',
  },
  backButtonText: { color: BRAND_COLORS.PRIMARY, fontSize: 15, fontWeight: '700' },
});
