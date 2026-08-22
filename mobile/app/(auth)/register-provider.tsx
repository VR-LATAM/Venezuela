// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// Registro de prestatario no-conductor (Técnico, Proveedor, Negocio)
// Paso 1: Datos personales
// Paso 2: Datos específicos del tipo
// Paso 3: Revisión y envío

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView, Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { BRAND_COLORS } from '@vride/shared';
import type { ProviderType } from './register-provider-type';

const API_BASE = `${Constants.expoConfig?.extra?.apiUrl ?? process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000'}/api/v1`;

const TOTAL_STEPS = 3;

const VE_STATES = [
  'Distrito Capital','Amazonas','Anzoátegui','Apure','Aragua','Barinas',
  'Bolívar','Carabobo','Cojedes','Delta Amacuro','Falcón','Guárico',
  'Lara','Mérida','Miranda','Monagas','Nueva Esparta','Portuguesa',
  'Sucre','Táchira','Trujillo','La Guaira','Yaracuy','Zulia',
];

const TYPE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  tecnico:   { label: 'Técnico',   emoji: '🔧', color: '#B45309' },
  proveedor: { label: 'Proveedor', emoji: '🚛', color: '#047857' },
  negocio:   { label: 'Negocio',   emoji: '🏪', color: '#7C3AED' },
};

const STEP_LABELS = ['Datos personales', 'Tu servicio', 'Revisión'];

export default function RegisterProviderScreen() {
  const { providerType } = useLocalSearchParams<{ providerType: ProviderType }>();
  const config = TYPE_CONFIG[providerType ?? 'tecnico'];

  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);

  // Paso 1 — datos personales
  const [fullName, setFullName]     = useState('');
  const [cedula, setCedula]         = useState('');
  const [phone, setPhone]           = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [state, setState]           = useState('');
  const [photoUri, setPhotoUri]     = useState<string | null>(null);

  // Paso 2 — datos específicos
  const [specialty, setSpecialty]   = useState('');   // técnico
  const [experience, setExperience] = useState('');   // técnico
  const [equipment, setEquipment]   = useState('');   // proveedor
  const [capacity, setCapacity]     = useState('');   // proveedor
  const [bizName, setBizName]       = useState('');   // negocio
  const [bizAddress, setBizAddress] = useState('');   // negocio
  const [rif, setRif]               = useState('');   // negocio
  const [equipPhotoUri, setEquipPhotoUri] = useState<string | null>(null);

  const pickPhoto = async (setter: (uri: string) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) setter(result.assets[0].uri);
  };

  const validateStep1 = () => {
    if (!fullName.trim())  { Alert.alert('', 'Ingresa tu nombre completo.');  return false; }
    if (!cedula.trim())    { Alert.alert('', 'Ingresa tu número de cédula.'); return false; }
    if (!phone.trim())     { Alert.alert('', 'Ingresa tu teléfono.');         return false; }
    if (!email.trim())     { Alert.alert('', 'Ingresa tu correo.');            return false; }
    if (!password.trim() || password.length < 6) { Alert.alert('', 'La contraseña debe tener al menos 6 caracteres.'); return false; }
    if (!state)            { Alert.alert('', 'Selecciona tu estado.');         return false; }
    return true;
  };

  const validateStep2 = () => {
    if (providerType === 'tecnico'   && !specialty.trim())   { Alert.alert('', 'Describe tu especialidad.'); return false; }
    if (providerType === 'proveedor' && !equipment.trim())   { Alert.alert('', 'Describe tu equipo.');       return false; }
    if (providerType === 'negocio'   && !bizName.trim())     { Alert.alert('', 'Ingresa el nombre del negocio.'); return false; }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step < TOTAL_STEPS) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setStep(step + 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const body = {
        fullName, cedula, phone, email, password,
        state, providerType,
        specialty, experience, equipment, capacity,
        bizName, bizAddress, rif,
      };
      const res = await fetch(`${API_BASE}/auth/register-provider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `Error ${res.status}`);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '✅ Registro enviado',
        'Tu solicitud está en revisión. Te notificaremos cuando sea aprobada.',
        [{ text: 'Aceptar', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo completar el registro.');
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 1 ? router.back() : setStep(step - 1)}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerType}>{config.emoji} {config.label}</Text>
          <Text style={styles.headerStep}>Paso {step} de {TOTAL_STEPS} — {STEP_LABELS[step - 1]}</Text>
        </View>
      </View>

      {/* Barra de progreso */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: config.color }]} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

          {/* ── PASO 1: Datos personales ── */}
          {step === 1 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Datos personales</Text>

              <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhoto(setPhotoUri)}>
                {photoUri
                  ? <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                  : <Text style={styles.photoPlaceholder}>📷{'\n'}Foto de perfil</Text>
                }
              </TouchableOpacity>

              {[
                { label: 'Nombre completo', value: fullName, setter: setFullName, placeholder: 'Ej: Juan Pérez' },
                { label: 'Cédula de identidad', value: cedula, setter: setCedula, placeholder: 'V-12345678', keyboard: 'default' as const },
                { label: 'Teléfono', value: phone, setter: setPhone, placeholder: '+58 412 000 0000', keyboard: 'phone-pad' as const },
                { label: 'Correo electrónico', value: email, setter: setEmail, placeholder: 'correo@email.com', keyboard: 'email-address' as const },
                { label: 'Contraseña', value: password, setter: setPassword, placeholder: 'Mínimo 6 caracteres', secure: true },
              ].map(f => (
                <View key={f.label} style={styles.field}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={f.value}
                    onChangeText={f.setter}
                    placeholder={f.placeholder}
                    keyboardType={f.keyboard}
                    secureTextEntry={f.secure}
                    autoCapitalize="none"
                    placeholderTextColor="#aaa"
                  />
                </View>
              ))}

              <View style={styles.field}>
                <Text style={styles.label}>Estado / Ciudad</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  {VE_STATES.map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.stateChip, state === s && { backgroundColor: config.color, borderColor: config.color }]}
                      onPress={() => setState(s)}
                    >
                      <Text style={[styles.stateChipText, state === s && { color: '#fff' }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

          {/* ── PASO 2: Datos específicos ── */}
          {step === 2 && providerType === 'tecnico' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tu especialidad técnica</Text>
              <View style={styles.field}>
                <Text style={styles.label}>Especialidad</Text>
                <TextInput style={styles.input} value={specialty} onChangeText={setSpecialty}
                  placeholder="Ej: Mecánico automotriz, Técnico A/C" placeholderTextColor="#aaa" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Años de experiencia</Text>
                <TextInput style={styles.input} value={experience} onChangeText={setExperience}
                  placeholder="Ej: 5 años" keyboardType="numeric" placeholderTextColor="#aaa" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Foto de certificado o herramientas (opcional)</Text>
                <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhoto(setEquipPhotoUri)}>
                  {equipPhotoUri
                    ? <Image source={{ uri: equipPhotoUri }} style={styles.photoPreview} />
                    : <Text style={styles.photoPlaceholder}>📷{'\n'}Agregar foto</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 2 && providerType === 'proveedor' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tu equipo o vehículo</Text>
              <View style={styles.field}>
                <Text style={styles.label}>Tipo de equipo</Text>
                <TextInput style={styles.input} value={equipment} onChangeText={setEquipment}
                  placeholder="Ej: Cisterna 10.000 litros, Planta 20 KVA" placeholderTextColor="#aaa" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Capacidad</Text>
                <TextInput style={styles.input} value={capacity} onChangeText={setCapacity}
                  placeholder="Ej: 10.000 L / 20 KVA / 1 tonelada" placeholderTextColor="#aaa" />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Foto del equipo</Text>
                <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhoto(setEquipPhotoUri)}>
                  {equipPhotoUri
                    ? <Image source={{ uri: equipPhotoUri }} style={styles.photoPreview} />
                    : <Text style={styles.photoPlaceholder}>📷{'\n'}Agregar foto</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 2 && providerType === 'negocio' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Datos del negocio</Text>
              {[
                { label: 'Nombre del negocio', value: bizName, setter: setBizName, placeholder: 'Ej: Taller El Venezolano' },
                { label: 'Dirección', value: bizAddress, setter: setBizAddress, placeholder: 'Av. Principal, Local 5' },
                { label: 'RIF', value: rif, setter: setRif, placeholder: 'J-12345678-9' },
              ].map(f => (
                <View key={f.label} style={styles.field}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput style={styles.input} value={f.value} onChangeText={f.setter}
                    placeholder={f.placeholder} placeholderTextColor="#aaa" />
                </View>
              ))}
              <View style={styles.field}>
                <Text style={styles.label}>Foto del local</Text>
                <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhoto(setEquipPhotoUri)}>
                  {equipPhotoUri
                    ? <Image source={{ uri: equipPhotoUri }} style={styles.photoPreview} />
                    : <Text style={styles.photoPlaceholder}>📷{'\n'}Agregar foto</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── PASO 3: Revisión ── */}
          {step === 3 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Revisa tu información</Text>
              {[
                { label: 'Nombre',      value: fullName },
                { label: 'Cédula',      value: cedula },
                { label: 'Teléfono',    value: phone },
                { label: 'Correo',      value: email },
                { label: 'Estado',      value: state },
                { label: 'Tipo',        value: config.label },
                ...(providerType === 'tecnico'   ? [{ label: 'Especialidad', value: specialty }, { label: 'Experiencia', value: experience }] : []),
                ...(providerType === 'proveedor' ? [{ label: 'Equipo', value: equipment }, { label: 'Capacidad', value: capacity }] : []),
                ...(providerType === 'negocio'   ? [{ label: 'Negocio', value: bizName }, { label: 'Dirección', value: bizAddress }, { label: 'RIF', value: rif }] : []),
              ].map(r => (
                <View key={r.label} style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>{r.label}</Text>
                  <Text style={styles.reviewValue}>{r.value}</Text>
                </View>
              ))}
              <Text style={styles.reviewNote}>
                Tu solicitud será revisada por el equipo de VERONA. Te notificaremos por correo cuando sea aprobada.
              </Text>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Botón de acción */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: config.color }]}
          onPress={step < TOTAL_STEPS ? handleNext : handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{step < TOTAL_STEPS ? 'Continuar →' : 'Enviar solicitud'}</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#fff' },
  header:         { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  back:           { fontSize: 22, color: BRAND_COLORS.PRIMARY, fontWeight: '700' },
  headerCenter:   { flex: 1 },
  headerType:     { fontSize: 16, fontWeight: '700', color: '#111' },
  headerStep:     { fontSize: 12, color: '#888', marginTop: 2 },
  progressBar:    { height: 4, backgroundColor: '#eee', marginHorizontal: 16, borderRadius: 2 },
  progressFill:   { height: 4, borderRadius: 2 },
  body:           { padding: 20, paddingBottom: 40 },
  section:        { gap: 16 },
  sectionTitle:   { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 4 },
  field:          { gap: 6 },
  label:          { fontSize: 13, fontWeight: '600', color: '#444' },
  input: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
    padding: 12, fontSize: 15, color: '#111', backgroundColor: '#fafafa',
  },
  stateChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fafafa', marginRight: 8,
  },
  stateChipText:  { fontSize: 12, color: '#555', fontWeight: '600' },
  photoBtn: {
    width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#ddd',
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', backgroundColor: '#fafafa',
  },
  photoPreview:     { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: { fontSize: 12, color: '#aaa', textAlign: 'center', lineHeight: 18 },
  reviewRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  reviewLabel:      { fontSize: 13, color: '#888', fontWeight: '600' },
  reviewValue:      { fontSize: 13, color: '#111', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  reviewNote:       { fontSize: 12, color: '#888', lineHeight: 18, marginTop: 16, textAlign: 'center' },
  footer:           { padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  btn:              { borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText:          { color: '#fff', fontSize: 16, fontWeight: '700' },
});
