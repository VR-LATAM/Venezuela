// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Contacto de emergencia del pasajero
// Se notifica por email cuando el pasajero activa el SOS
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Alert, ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { BRAND_COLORS } from '@vride/shared';
import { apiClient } from '../../src/services/apiClient';

export default function EmergencyContactScreen() {
  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    apiClient.get('/passenger/profile').then(r => {
      const p = r.data.data;
      setName(p.emergency_contact_name  ?? '');
      setPhone(p.emergency_contact_phone ?? '');
      setEmail(p.emergency_contact_email ?? '');
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Requerido', 'Por favor ingresa un nombre'); return; }
    setSaving(true);
    try {
      await apiClient.patch('/passenger/emergency-contact', {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      Alert.alert(
        'Guardado',
        `${name} será notificado por correo electrónico si activas el botón SOS durante un viaje.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} style={{ marginTop: 60 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contacto de emergencia</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>🚨</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>¿Quién recibe la alerta SOS?</Text>
            <Text style={styles.infoText}>
              Cuando mantienes presionado el botón SOS durante un viaje, esta persona recibe
              un correo automático con tu ubicación y la hora de la alerta.
            </Text>
          </View>
        </View>

        <Text style={styles.label}>Nombre completo *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ej. María Labrador"
          maxLength={100}
        />

        <Text style={styles.label}>Teléfono (opcional)</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="(0412) 123-4567"
          keyboardType="phone-pad"
          maxLength={20}
        />

        <Text style={styles.label}>Correo electrónico (recomendado)</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="contacto@correo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          maxLength={100}
        />

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            Se requiere al menos teléfono o correo para que la alerta pueda enviarse.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Guardar contacto de emergencia</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F8FAFC', paddingTop: 24 },
  header:      { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn:     { padding: 4, marginRight: 8 },
  backBtnText: { fontSize: 28, color: BRAND_COLORS.PRIMARY, lineHeight: 32 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#1E293B' },
  scroll:      { padding: 16, paddingBottom: 120 },
  infoBox:     { flexDirection: 'row', backgroundColor: '#FFF5F5', borderRadius: 14, padding: 14, gap: 12, marginBottom: 20, borderWidth: 1, borderColor: '#FECACA' },
  infoIcon:    { fontSize: 28 },
  infoTitle:   { fontSize: 15, fontWeight: '700', color: '#DC2626', marginBottom: 4 },
  infoText:    { fontSize: 13, color: '#7F1D1D', lineHeight: 19 },
  label:       { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 14 },
  input:       { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 13, fontSize: 15, color: '#1E293B', backgroundColor: '#fff' },
  noteBox:     { backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12, marginTop: 16, borderWidth: 1, borderColor: '#FDE68A' },
  noteText:    { fontSize: 13, color: '#92400E' },
  footer:      { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  saveBtn:     { backgroundColor: '#DC2626', borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
