// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Perfil de accesibilidad — necesidades que se comparten con el conductor
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, ActivityIndicator, Switch, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { BRAND_COLORS } from '@vride/shared';
import { accessibilityService, AccessibilityProfile } from '../../src/services/accessibilityService';

interface Option {
  key: keyof Omit<AccessibilityProfile, 'notes'>;
  label: string;
  description: string;
  icon: string;
}

const OPTIONS: Option[] = [
  { key: 'wheelchair',          icon: '♿', label: 'Silla de ruedas',       description: 'Uso silla de ruedas' },
  { key: 'walker',              icon: '🦯', label: 'Andador / Rollator',    description: 'Uso un apoyo para caminar' },
  { key: 'white_cane',          icon: '🦮', label: 'Bastón blanco',         description: 'Tengo discapacidad visual y uso bastón blanco' },
  { key: 'service_animal',      icon: '🐕', label: 'Animal de servicio',    description: 'Viajo con un animal de servicio certificado' },
  { key: 'oxygen_support',      icon: '🫁', label: 'Equipo de oxígeno',     description: 'Necesito llevar equipo de oxígeno' },
  { key: 'hearing_impaired',    icon: '👂', label: 'Discapacidad auditiva', description: 'Tengo una discapacidad auditiva' },
  { key: 'visual_impaired',     icon: '👁️', label: 'Discapacidad visual',   description: 'Tengo una discapacidad visual' },
  { key: 'cognitive_support',   icon: '🧠', label: 'Apoyo cognitivo',       description: 'Puedo necesitar asistencia adicional de comunicación' },
  { key: 'extra_time_boarding', icon: '⏳', label: 'Tiempo extra de abordaje', description: 'Necesito tiempo adicional para subir y bajar' },
];

const BLANK: Omit<AccessibilityProfile, 'notes'> & { notes: string } = {
  wheelchair: false, walker: false, white_cane: false,
  service_animal: false, oxygen_support: false,
  hearing_impaired: false, visual_impaired: false,
  cognitive_support: false, extra_time_boarding: false,
  notes: '',
};

export default function AccessibilityProfileScreen() {
  const [profile, setProfile]   = useState({ ...BLANK });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const saved = await accessibilityService.get();
      if (saved) setProfile({ ...BLANK, ...saved, notes: saved.notes ?? '' });
    } catch {
      // Show blank form if none saved yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (key: keyof typeof BLANK) => {
    if (key === 'notes') return;
    setProfile(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await accessibilityService.save({ ...profile, notes: profile.notes || null });
      Alert.alert('Guardado', 'Tu perfil de accesibilidad ha sido actualizado. Los conductores verán tus necesidades antes de cada viaje.');
      router.back();
    } catch {
      Alert.alert('Error', 'No se pudo guardar el perfil. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const anySelected = OPTIONS.some(o => profile[o.key]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil de accesibilidad</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>♿</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Compartido con tu conductor</Text>
            <Text style={styles.infoText}>
              Este perfil se comparte con tu conductor antes de cada viaje para que pueda prepararse adecuadamente.
            </Text>
          </View>
        </View>

        {OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.optRow, profile[opt.key] && styles.optRowActive]}
            onPress={() => toggle(opt.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.optIcon}>{opt.icon}</Text>
            <View style={styles.optInfo}>
              <Text style={styles.optLabel}>{opt.label}</Text>
              <Text style={styles.optDesc}>{opt.description}</Text>
            </View>
            <Switch
              value={profile[opt.key] as boolean}
              onValueChange={() => toggle(opt.key)}
              trackColor={{ false: '#E2E8F0', true: BRAND_COLORS.PRIMARY }}
              thumbColor="#fff"
            />
          </TouchableOpacity>
        ))}

        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Notas adicionales para el conductor (opcional)</Text>
          <TextInput
            style={styles.notesInput}
            value={profile.notes}
            onChangeText={v => setProfile(prev => ({ ...prev, notes: v }))}
            multiline
            numberOfLines={3}
            placeholder="Ej. Por favor espera 2 minutos adicionales para que pueda subir…"
            placeholderTextColor="#94A3B8"
          />
        </View>

        {anySelected && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Tus necesidades activas:</Text>
            <Text style={styles.summaryText}>
              {OPTIONS.filter(o => profile[o.key]).map(o => o.icon + ' ' + o.label).join('  ·  ')}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Guardar perfil</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F8FAFC', paddingTop: 24 },
  header:       { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn:      { padding: 4, marginRight: 8 },
  backBtnText:  { fontSize: 28, color: BRAND_COLORS.PRIMARY, lineHeight: 32 },
  headerTitle:  { flex: 1, fontSize: 20, fontWeight: '700', color: '#1E293B' },
  scroll:       { padding: 16, paddingBottom: 120, gap: 10 },
  infoBox:      { flexDirection: 'row', backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14, gap: 12, marginBottom: 8 },
  infoIcon:     { fontSize: 28 },
  infoTitle:    { fontSize: 15, fontWeight: '700', color: '#1E40AF', marginBottom: 4 },
  infoText:     { fontSize: 13, color: '#3B82F6', lineHeight: 19 },
  optRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#E2E8F0' },
  optRowActive: { borderColor: BRAND_COLORS.PRIMARY, backgroundColor: '#EFF6FF' },
  optIcon:      { fontSize: 26, marginRight: 12 },
  optInfo:      { flex: 1 },
  optLabel:     { fontSize: 15, fontWeight: '600', color: '#1E293B', marginBottom: 2 },
  optDesc:      { fontSize: 12, color: '#64748B' },
  notesSection: { marginTop: 8 },
  notesLabel:   { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8 },
  notesInput:   { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 14, color: '#1E293B', minHeight: 80, textAlignVertical: 'top' },
  summaryBox:   { backgroundColor: '#F0FFF4', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#86EFAC' },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: '#166534', marginBottom: 6 },
  summaryText:  { fontSize: 13, color: '#15803D', lineHeight: 22 },
  footer:       { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  saveBtn:      { backgroundColor: BRAND_COLORS.PRIMARY, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  saveBtnText:  { color: '#fff', fontSize: 17, fontWeight: '700' },
});
