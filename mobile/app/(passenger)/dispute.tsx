// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Abrir disputa sobre un viaje completado
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { BRAND_COLORS } from '@vride/shared';
import { disputeService, DisputeReason } from '../../src/services/disputeService';

interface ReasonOption { key: DisputeReason; label: string; icon: string; }

const REASONS: ReasonOption[] = [
  { key: 'overcharged',        icon: '💸', label: 'Me cobraron de más' },
  { key: 'wrong_route',        icon: '🗺️', label: 'El conductor tomó una ruta incorrecta' },
  { key: 'unsafe_driving',     icon: '🚗', label: 'Manejo inseguro' },
  { key: 'driver_behavior',    icon: '😤', label: 'Comportamiento inapropiado del conductor' },
  { key: 'vehicle_condition',  icon: '🔧', label: 'Mal estado del vehículo' },
  { key: 'no_show',            icon: '🕐', label: 'El conductor nunca llegó' },
  { key: 'cancellation_fee',   icon: '❌', label: 'Cargo de cancelación injusto' },
  { key: 'other',              icon: '📝', label: 'Otro problema' },
];

export default function DisputeScreen() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const [selected, setSelected]     = useState<DisputeReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selected) { Alert.alert('Requerido', 'Por favor selecciona un motivo'); return; }
    if (!rideId)   { Alert.alert('Error', 'ID de viaje no encontrado'); return; }

    setSubmitting(true);
    try {
      await disputeService.open({ rideId, reason: selected, description: description.trim() || undefined });
      Alert.alert(
        'Disputa enviada',
        'Nuestro equipo revisará tu caso en 24 horas y te contactará por correo electrónico.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch {
      Alert.alert('Error', 'No se pudo enviar la disputa. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reportar un problema</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>¿Qué pasó?</Text>
        {REASONS.map(r => (
          <TouchableOpacity
            key={r.key}
            style={[styles.reasonRow, selected === r.key && styles.reasonRowActive]}
            onPress={() => setSelected(r.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.reasonIcon}>{r.icon}</Text>
            <Text style={[styles.reasonLabel, selected === r.key && styles.reasonLabelActive]}>
              {r.label}
            </Text>
            {selected === r.key && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Detalles adicionales (opcional)</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          placeholder="Describe lo que ocurrió…"
          placeholderTextColor="#94A3B8"
          maxLength={1000}
        />
        <Text style={styles.charCount}>{description.length}/1000</Text>

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            📋 Las disputas se revisan en 24 horas. Guarda capturas de pantalla relevantes como referencia.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, (!selected || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!selected || submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>Enviar disputa</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#F8FAFC', paddingTop: 24 },
  header:             { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn:            { padding: 4, marginRight: 8 },
  backBtnText:        { fontSize: 28, color: BRAND_COLORS.PRIMARY, lineHeight: 32 },
  headerTitle:        { flex: 1, fontSize: 20, fontWeight: '700', color: '#1E293B' },
  scroll:             { padding: 16, paddingBottom: 120 },
  sectionLabel:       { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  reasonRow:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: '#E2E8F0' },
  reasonRowActive:    { borderColor: BRAND_COLORS.PRIMARY, backgroundColor: '#EFF6FF' },
  reasonIcon:         { fontSize: 22, marginRight: 12 },
  reasonLabel:        { flex: 1, fontSize: 15, color: '#334155', fontWeight: '500' },
  reasonLabelActive:  { color: BRAND_COLORS.PRIMARY, fontWeight: '700' },
  checkmark:          { fontSize: 18, color: BRAND_COLORS.PRIMARY, fontWeight: '700' },
  textArea:           { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 14, color: '#1E293B', minHeight: 100, textAlignVertical: 'top' },
  charCount:          { fontSize: 12, color: '#94A3B8', textAlign: 'right', marginTop: 4, marginBottom: 12 },
  noteBox:            { backgroundColor: '#FFFBEB', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#FDE68A' },
  noteText:           { fontSize: 13, color: '#92400E', lineHeight: 20 },
  footer:             { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  submitBtn:          { backgroundColor: BRAND_COLORS.ALERT, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  submitBtnDisabled:  { backgroundColor: '#CBD5E1' },
  submitBtnText:      { color: '#fff', fontSize: 17, fontWeight: '700' },
});
