// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Pantalla de registro de pasajero
// Campos: nombre, email, contraseña, teléfono (opc), estado, contacto de emergencia (opc)
// Accesibilidad: fuente mínima 17px, botones 56px (nicho adultos mayores)
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView, Modal, FlatList, Image,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/store/authStore';
import { BRAND_COLORS } from '@vride/shared';
import * as Haptics from 'expo-haptics';
import LicenseScanner from '../../src/components/common/LicenseScanner';
import { AAMVAData } from '../../src/utils/aamvaParser';

const VE_STATES = [
  { code: 'DC', name: 'Distrito Capital' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'AN', name: 'Anzoátegui' },
  { code: 'AP', name: 'Apure' },
  { code: 'AR', name: 'Aragua' },
  { code: 'BA', name: 'Barinas' },
  { code: 'BO', name: 'Bolívar' },
  { code: 'CA', name: 'Carabobo' },
  { code: 'CO', name: 'Cojedes' },
  { code: 'DA', name: 'Delta Amacuro' },
  { code: 'FA', name: 'Falcón' },
  { code: 'GU', name: 'Guárico' },
  { code: 'LA', name: 'Lara' },
  { code: 'ME', name: 'Mérida' },
  { code: 'MI', name: 'Miranda' },
  { code: 'MO', name: 'Monagas' },
  { code: 'NE', name: 'Nueva Esparta' },
  { code: 'PO', name: 'Portuguesa' },
  { code: 'SU', name: 'Sucre' },
  { code: 'TA', name: 'Táchira' },
  { code: 'TR', name: 'Trujillo' },
  { code: 'VA', name: 'Vargas (La Guaira)' },
  { code: 'YA', name: 'Yaracuy' },
  { code: 'ZU', name: 'Zulia' },
];

export default function RegisterPassengerScreen() {
  const { registerPassenger, isLoading, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [stateCode, setStateCode] = useState('DC');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [emergencyName, setEmergencyName]   = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyEmail, setEmergencyEmail] = useState('');
  const [showEmergency, setShowEmergency]   = useState(false);
  const [homeAddress, setHomeAddress] = useState('');
  const [passengerCategories, setPassengerCategories] = useState<string[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [idDocFrontUri, setIdDocFrontUri] = useState<string | null>(null);
  const [idDocBackUri, setIdDocBackUri] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const selectedStateName = VE_STATES.find(s => s.code === stateCode)?.name ?? stateCode;

  const handleLicenseScanned = (data: AAMVAData) => {
    setShowScanner(false);
    if (data.firstName || data.lastName) {
      const full = [data.firstName, data.lastName].filter(Boolean).join(' ');
      if (!name.trim()) setName(full);
    }
    if (data.address && data.city && data.state) {
      const addr = [data.address, data.city, data.state, data.zip].filter(Boolean).join(', ');
      if (!homeAddress.trim()) setHomeAddress(addr);
    }
    if (data.state && VE_STATES.find(s => s.code === data.state)) {
      setStateCode(data.state);
    }
  };

  const toggleCategory = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPassengerCategories(prev =>
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  };

  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (!camPerm.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara o galería para tu foto de perfil.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
        cameraType: ImagePicker.CameraType.front,
      });
      if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
      return;
    }
    Alert.alert('Foto de perfil', 'Elige una opción', [
      {
        text: 'Tomar selfie',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
            cameraType: ImagePicker.CameraType.front,
          });
          if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
        },
      },
      {
        text: 'Elegir de galería',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
          });
          if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const validate = (): string | null => {
    if (!photoUri) return 'Agrega una foto de perfil';
    if (!idDocFrontUri) return 'Sube el frente de tu documento de identidad';
    if (!idDocBackUri)  return 'Sube el dorso de tu documento de identidad';
    if (!name.trim() || name.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
    if (!homeAddress.trim()) return 'La dirección es requerida';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Ingresa un correo válido';
    if (!password || password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    if (password !== confirmPassword) return 'Las contraseñas no coinciden';
    return null;
  };

  const handlePickIdDoc = async (side: 'front' | 'back') => {
    const setUri = side === 'front' ? setIdDocFrontUri : setIdDocBackUri;
    const label  = side === 'front' ? 'Frente del documento' : 'Dorso del documento';
    Alert.alert(label, 'Tomar foto o elegir de galería', [
      {
        text: 'Tomar foto',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.'); return; }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, quality: 0.9,
            cameraType: ImagePicker.CameraType.back,
          });
          if (!result.canceled && result.assets[0]) setUri(result.assets[0].uri);
        },
      },
      {
        text: 'Elegir de galería',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) { Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false, quality: 0.9,
          });
          if (!result.canceled && result.assets[0]) setUri(result.assets[0].uri);
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleRegister = async () => {
    const validationError = validate();
    if (validationError) {
      Alert.alert('', validationError);
      return;
    }

    clearError();
    setPhotoUploading(true);
    try {
      await registerPassenger({
        name:                  name.trim(),
        email:                 email.trim().toLowerCase(),
        password,
        phone:                 phone.trim() || undefined,
        stateCode,
        emergencyContactName:  emergencyName.trim()  || undefined,
        emergencyContactPhone: emergencyPhone.trim() || undefined,
        emergencyContactEmail: emergencyEmail.trim() || undefined,
        passengerCategories:   passengerCategories.length > 0 ? passengerCategories : undefined,
        photoUri:              photoUri ?? undefined,
      });
      // Subir frente y dorso del ID (tokens ya guardados tras registro)
      if (idDocFrontUri || idDocBackUri) {
        try {
          const { apiClient } = await import('../../src/services/apiClient');
          if (idDocFrontUri) {
            const fd = new FormData();
            fd.append('document', { uri: idDocFrontUri, name: 'id_front.jpg', type: 'image/jpeg' } as any);
            await apiClient.post('/user/identity-document?side=front', fd, { headers: { 'Content-Type': undefined }, timeout: 60_000 });
          }
          if (idDocBackUri) {
            const fd = new FormData();
            fd.append('document', { uri: idDocBackUri, name: 'id_back.jpg', type: 'image/jpeg' } as any);
            await apiClient.post('/user/identity-document?side=back', fd, { headers: { 'Content-Type': undefined }, timeout: 60_000 });
          }
        } catch {}
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '📧 Verifica tu correo',
        `Enviamos un correo de verificación a ${email.trim().toLowerCase()}. Verifícalo para activar tu cuenta.`
      );
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err instanceof Error ? err.message : 'No se pudo crear la cuenta. Intenta de nuevo.';
      Alert.alert('Error al registrarse', msg);
    } finally {
      setPhotoUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>← Atrás</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Crear cuenta de pasajero</Text>
          <Text style={styles.subtitle}>Regístrate para solicitar viajes en VERONA Ride</Text>

          {/* ── FOTO DE PERFIL ── */}
          <View style={styles.photoSection}>
            <TouchableOpacity style={styles.photoContainer} onPress={handlePickPhoto} accessibilityRole="button" accessibilityLabel="Agregar foto de perfil">
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderIcon}>📷</Text>
                  <Text style={styles.photoPlaceholderText}>Agregar foto *</Text>
                </View>
              )}
              <View style={styles.photoEditBadge}>
                <Text style={styles.photoEditBadgeText}>{photoUri ? '✎' : '+'}</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.photoHint}>
              Tu foto ayuda a los conductores a identificarte. <Text style={styles.photoRequired}>Requerida.</Text>
            </Text>
          </View>

          {/* ── DOCUMENTO DE IDENTIDAD ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documento de identidad <Text style={styles.photoRequired}>*</Text></Text>
            <Text style={styles.sectionSubtitle}>
              Cédula, pasaporte o licencia — se requieren ambos lados.
            </Text>
            <View style={styles.idDocRow}>
              {/* Frente */}
              <TouchableOpacity
                style={[styles.idDocSideBtn, idDocFrontUri && styles.idDocSideBtnDone]}
                onPress={() => handlePickIdDoc('front')}
                accessibilityRole="button"
              >
                {idDocFrontUri ? (
                  <>
                    <Image source={{ uri: idDocFrontUri }} style={styles.idDocSidePreview} />
                    <Text style={styles.idDocSideDone}>✓ Frente</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.idDocSideIcon}>🪪</Text>
                    <Text style={styles.idDocSideLabel}>Frente *</Text>
                    <Text style={styles.idDocSideHint}>Toca para subir</Text>
                  </>
                )}
              </TouchableOpacity>
              {/* Dorso */}
              <TouchableOpacity
                style={[styles.idDocSideBtn, idDocBackUri && styles.idDocSideBtnDone]}
                onPress={() => handlePickIdDoc('back')}
                accessibilityRole="button"
              >
                {idDocBackUri ? (
                  <>
                    <Image source={{ uri: idDocBackUri }} style={styles.idDocSidePreview} />
                    <Text style={styles.idDocSideDone}>✓ Dorso</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.idDocSideIcon}>🪪</Text>
                    <Text style={styles.idDocSideLabel}>Dorso *</Text>
                    <Text style={styles.idDocSideHint}>Toca para subir</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            {false && (
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={() => setShowScanner(true)}
                accessibilityRole="button"
                accessibilityLabel="Escanear código de barras"
              >
                <Text style={styles.scanBtnText}>Escanear código para autocompletar tu info</Text>
              </TouchableOpacity>
            )}
          </View>

          {false && showScanner && (
            <LicenseScanner
              onScanned={handleLicenseScanned}
              onClose={() => setShowScanner(false)}
            />
          )}

          {/* ── DATOS BÁSICOS ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información personal</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Nombre completo *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                placeholder="Tu nombre completo"
                placeholderTextColor="#aaa"
                accessibilityLabel="Nombre completo"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Correo electrónico *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                placeholder="tu@email.com"
                placeholderTextColor="#aaa"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Contraseña *</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#aaa"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirmar contraseña *</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Repite tu contraseña"
                placeholderTextColor="#aaa"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Teléfono (opcional)</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                placeholder="(0412) 123-4567"
                placeholderTextColor="#aaa"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Dirección de residencia *</Text>
              <TextInput
                style={styles.input}
                value={homeAddress}
                onChangeText={setHomeAddress}
                autoCapitalize="words"
                placeholder="Av. Principal, Caracas"
                placeholderTextColor="#aaa"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Estado</Text>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowStatePicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Seleccionar estado"
              >
                <Text style={styles.pickerText}>{selectedStateName}</Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── TIPO DE PASAJERO (multi-selección) ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mis necesidades</Text>
            <Text style={styles.sectionSubtitle}>
              Selecciona las que apliquen — tu conductor será notificado antes de cada viaje.
            </Text>
            {passengerCategories.length > 0 && (
              <TouchableOpacity onPress={() => { setPassengerCategories([]); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕  Limpiar selección</Text>
              </TouchableOpacity>
            )}
            <View style={styles.categoryGrid}>
              {[
                { key: 'elderly',           icon: '👴', label: 'Adulto mayor (65+)' },
                { key: 'pregnant',          icon: '🤰', label: 'Embarazada' },
                { key: 'post_surgery',      icon: '🏥', label: 'Post-operatorio' },
                { key: 'wheelchair',        icon: '♿', label: 'Silla de ruedas' },
                { key: 'visual_impairment', icon: '👁️', label: 'Discap. visual' },
                { key: 'hearing_impairment',icon: '👂', label: 'Discap. auditiva' },
                { key: 'cognitive',         icon: '🧠', label: 'Apoyo cognitivo' },
                { key: 'with_minor',        icon: '👶', label: 'Con menor' },
                { key: 'medical_equipment', icon: '💊', label: 'Equipo médico' },
              ].map(opt => {
                const active = passengerCategories.includes(opt.key);
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.categoryCard, active && styles.categoryCardActive]}
                    onPress={() => toggleCategory(opt.key)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                  >
                    <Text style={styles.categoryIcon}>{opt.icon}</Text>
                    <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
                      {opt.label}
                    </Text>
                    {active && <Text style={styles.categoryCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
            {passengerCategories.length === 0 && (
              <Text style={styles.categoryNoneHint}>¿Sin necesidades especiales? Deja en blanco.</Text>
            )}
          </View>

          {/* ── CONTACTO DE EMERGENCIA ── */}
          <TouchableOpacity
            style={styles.expandRow}
            onPress={() => setShowEmergency(!showEmergency)}
            accessibilityRole="button"
          >
            <Text style={styles.expandText}>
              {showEmergency ? '▼' : '▶'} Contacto de emergencia (recomendado)
            </Text>
          </TouchableOpacity>

          {showEmergency && (
            <View style={styles.section}>
              <Text style={styles.emergencyNote}>
                🚨 Esta persona recibirá una alerta por correo con tu ubicación si activas el botón SOS durante un viaje.
              </Text>
              <View style={styles.field}>
                <Text style={styles.label}>Nombre del contacto</Text>
                <TextInput
                  style={styles.input}
                  value={emergencyName}
                  onChangeText={setEmergencyName}
                  autoCapitalize="words"
                  placeholder="Nombre completo"
                  placeholderTextColor="#aaa"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Teléfono del contacto</Text>
                <TextInput
                  style={styles.input}
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                  keyboardType="phone-pad"
                  placeholder="(0412) 123-4567"
                  placeholderTextColor="#aaa"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Correo del contacto (alertas SOS)</Text>
                <TextInput
                  style={styles.input}
                  value={emergencyEmail}
                  onChangeText={setEmergencyEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="contacto@email.com"
                  placeholderTextColor="#aaa"
                />
              </View>
            </View>
          )}

          {/* ── BOTÓN REGISTRO ── */}
          <TouchableOpacity
            style={[styles.button, (!photoUri || !idDocFrontUri || !idDocBackUri || isLoading || photoUploading) && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={!photoUri || !idDocFrontUri || !idDocBackUri || isLoading || photoUploading}
            accessibilityRole="button"
            accessibilityLabel="Crear cuenta"
          >
            {isLoading || photoUploading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}>{photoUploading ? 'Subiendo foto…' : 'Creando cuenta…'}</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Crear cuenta</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.loginLink}>Iniciar sesión</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── MODAL SELECTOR DE ESTADO ── */}
      <Modal
        visible={showStatePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowStatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar estado</Text>
              <TouchableOpacity onPress={() => setShowStatePicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={VE_STATES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.stateItem,
                    item.code === stateCode && styles.stateItemSelected,
                  ]}
                  onPress={() => {
                    setStateCode(item.code);
                    setShowStatePicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[
                    styles.stateItemText,
                    item.code === stateCode && styles.stateItemTextSelected,
                  ]}>
                    {item.code} — {item.name}
                  </Text>
                  {item.code === stateCode && (
                    <Text style={styles.stateCheckmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff', paddingTop: 24 },
  flex: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 48 },

  backButton: { paddingVertical: 8, marginBottom: 16 },
  backText: { fontSize: 17, color: BRAND_COLORS.PRIMARY, fontFamily: 'Inter_500Medium' },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: BRAND_COLORS.TEXT,
    marginBottom: 6,
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 24,
    fontFamily: 'Inter_400Regular',
  },

  section: { marginBottom: 8 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    fontFamily: 'Inter_600SemiBold',
  },

  field: { marginBottom: 16 },
  label: {
    fontSize: 17,
    fontWeight: '500',
    color: BRAND_COLORS.TEXT,
    marginBottom: 6,
    fontFamily: 'Inter_500Medium',
  },
  input: {
    height: 56,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    color: BRAND_COLORS.TEXT,
    backgroundColor: '#FAFAFA',
    fontFamily: 'Inter_400Regular',
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 52 },
  eyeBtn: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeText: { fontSize: 20 },

  picker: {
    height: 56,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
  },
  pickerText: { fontSize: 17, color: BRAND_COLORS.TEXT, fontFamily: 'Inter_400Regular' },
  pickerArrow: { fontSize: 14, color: '#888' },

  sectionSubtitle: { fontSize: 14, color: '#888', marginBottom: 14, fontFamily: 'Inter_400Regular' },

  // Foto de perfil
  photoSection: { alignItems: 'center', marginBottom: 24 },
  photoContainer: { position: 'relative', marginBottom: 10 },
  photoPreview: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f0f0f0' },
  photoPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: BRAND_COLORS.PRIMARY + '15',
    borderWidth: 2, borderColor: BRAND_COLORS.PRIMARY,
    borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  photoPlaceholderIcon: { fontSize: 28, marginBottom: 4 },
  photoPlaceholderText: { fontSize: 12, color: BRAND_COLORS.PRIMARY, fontFamily: 'Inter_500Medium' },
  photoEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: BRAND_COLORS.PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  photoEditBadgeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  photoHint: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 18, fontFamily: 'Inter_400Regular' },
  photoHintOptional: { color: '#aaa', fontStyle: 'italic' },
  photoRequired: { color: BRAND_COLORS.ALERT, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  // Categorías multi-select
  categoryGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryCard:       { width: '47%', borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 14, padding: 14, alignItems: 'center', backgroundColor: '#FAFAFA', position: 'relative' },
  categoryCardActive: { borderColor: BRAND_COLORS.PRIMARY, backgroundColor: BRAND_COLORS.PRIMARY + '10' },
  categoryIcon:       { fontSize: 28, marginBottom: 6 },
  categoryLabel:      { fontSize: 13, textAlign: 'center', color: '#444', fontFamily: 'Inter_400Regular' },
  categoryLabelActive:{ color: BRAND_COLORS.PRIMARY, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  categoryCheck:      { position: 'absolute', top: 6, right: 8, fontSize: 16, color: BRAND_COLORS.PRIMARY, fontWeight: '700' },
  categoryNoneHint:   { fontSize: 13, color: '#aaa', textAlign: 'center', marginTop: 10, fontStyle: 'italic', fontFamily: 'Inter_400Regular' },
  clearBtn:           { alignSelf: 'flex-end', marginBottom: 8, paddingVertical: 4, paddingHorizontal: 10 },
  clearBtnText:       { fontSize: 13, color: BRAND_COLORS.ALERT, fontFamily: 'Inter_500Medium' },

  emergencyNote: { fontSize: 13, color: '#DC2626', backgroundColor: '#FFF5F5', borderRadius: 10, padding: 12, marginBottom: 14, lineHeight: 19 },

  // ID document — dos lados visibles simultáneamente sin scroll
  idDocRow:        { flexDirection: 'row', gap: 12 },
  idDocSideBtn:    { flex: 1, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 14, padding: 16, alignItems: 'center', backgroundColor: '#FAFAFA', minHeight: 130 },
  idDocSideBtnDone:{ borderColor: BRAND_COLORS.ACCENT, backgroundColor: BRAND_COLORS.ACCENT + '10' },
  idDocSidePreview:{ width: '100%', height: 70, borderRadius: 8, backgroundColor: '#f0f0f0', marginBottom: 6 },
  idDocSideIcon:   { fontSize: 32, marginBottom: 6 },
  idDocSideLabel:  { fontSize: 14, fontWeight: '600', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },
  idDocSideHint:   { fontSize: 12, color: '#aaa', fontFamily: 'Inter_400Regular', marginTop: 2 },
  idDocSideDone:   { fontSize: 13, fontWeight: '600', color: BRAND_COLORS.ACCENT, fontFamily: 'Inter_600SemiBold', marginTop: 4 },

  scanBtn: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: BRAND_COLORS.PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.PRIMARY + '10',
  },
  scanBtnText: {
    fontSize: 16,
    color: BRAND_COLORS.PRIMARY,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },

  expandRow: { paddingVertical: 14, marginBottom: 8 },
  expandText: { fontSize: 17, color: BRAND_COLORS.PRIMARY, fontFamily: 'Inter_500Medium' },

  button: {
    height: 56,
    backgroundColor: BRAND_COLORS.PRIMARY,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },

  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { fontSize: 17, color: '#666', fontFamily: 'Inter_400Regular' },
  loginLink: {
    fontSize: 17,
    color: BRAND_COLORS.PRIMARY,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_600SemiBold',
  },
  modalClose: { fontSize: 20, color: '#888', padding: 4 },
  stateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  stateItemSelected: { backgroundColor: BRAND_COLORS.PRIMARY + '10' },
  stateItemText: { fontSize: 17, color: BRAND_COLORS.TEXT, fontFamily: 'Inter_400Regular' },
  stateItemTextSelected: { color: BRAND_COLORS.PRIMARY, fontFamily: 'Inter_600SemiBold' },
  stateCheckmark: { fontSize: 18, color: BRAND_COLORS.PRIMARY },
});
