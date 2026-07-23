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
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/store/authStore';
import { useGoogleAuth } from '../../src/hooks/useGoogleAuth';
import { signInWithApple, isAppleSignInAvailable, getAppleButtonComponent, AppleButtonType, AppleButtonStyle } from '../../src/services/appleAuth';
import { BRAND_COLORS } from '@vride/shared';
import * as Haptics from 'expo-haptics';
import LicenseScanner from '../../src/components/common/LicenseScanner';
import { AAMVAData } from '../../src/utils/aamvaParser';

// Lista de estados de EE.UU. — TX activo al lanzamiento
const US_STATES = [
  { code: 'TX', name: 'Texas (active)' },
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

export default function RegisterPassengerScreen() {
  const { t } = useTranslation();
  const { registerPassenger, socialPassengerAuth, isLoading, clearError } = useAuthStore();
  const { signIn: googleSignIn, ready: googleReady } = useGoogleAuth();
  const [isSocialLoading, setIsSocialLoading] = useState<'google' | 'apple' | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [stateCode, setStateCode] = useState('TX');
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

  const selectedStateName = US_STATES.find(s => s.code === stateCode)?.name ?? stateCode;

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
    if (data.state && US_STATES.find(s => s.code === data.state)) {
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
        Alert.alert('Permission required', 'We need camera or gallery access to take your profile photo.');
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
    Alert.alert('Profile photo', 'Choose an option', [
      {
        text: 'Take selfie',
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
        text: 'Choose from gallery',
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
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const validate = (): string | null => {
    if (!photoUri) return 'Please add a profile photo';
    if (!idDocFrontUri) return 'Please upload the front of your government ID';
    if (!idDocBackUri)  return 'Please upload the back of your government ID';
    if (!name.trim() || name.trim().length < 2) return 'Name must be at least 2 characters';
    if (!homeAddress.trim()) return 'Home address is required';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Please enter a valid email';
    if (!password || password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handlePickIdDoc = async (side: 'front' | 'back') => {
    const setUri = side === 'front' ? setIdDocFrontUri : setIdDocBackUri;
    const label  = side === 'front' ? 'Front of ID' : 'Back of ID';
    Alert.alert(label, 'Take a photo or choose from gallery', [
      {
        text: 'Take photo',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { Alert.alert('Permission required', 'We need camera access.'); return; }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, quality: 0.9,
            cameraType: ImagePicker.CameraType.back,
          });
          if (!result.canceled && result.assets[0]) setUri(result.assets[0].uri);
        },
      },
      {
        text: 'Choose from gallery',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) { Alert.alert('Permission required', 'We need gallery access.'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false, quality: 0.9,
          });
          if (!result.canceled && result.assets[0]) setUri(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleGoogleSignIn = async () => {
    setIsSocialLoading('google');
    try {
      const result = await googleSignIn();
      if (!result) return;
      await socialPassengerAuth(result.firebaseToken, result.name);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Google Sign-In', 'Could not sign in with Google. Please try again.');
    } finally {
      setIsSocialLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setIsSocialLoading('apple');
    try {
      const result = await signInWithApple();
      if (!result) return;
      await socialPassengerAuth(result.firebaseToken, result.name);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Apple Sign-In', 'Could not sign in with Apple. Please try again.');
    } finally {
      setIsSocialLoading(null);
    }
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
        '📧 Check your email',
        `We sent a verification email to ${email.trim().toLowerCase()}. Please verify it to keep your account active.`
      );
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err instanceof Error ? err.message : 'Could not create account. Please try again.';
      Alert.alert('Registration error', msg);
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
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Create passenger account</Text>
          <Text style={styles.subtitle}>Sign up to request rides on Verona Ride</Text>

          {/* ── SOCIAL AUTH ── */}
          <TouchableOpacity
            style={[styles.socialButton, (!googleReady || isSocialLoading !== null) && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={!googleReady || isSocialLoading !== null}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            {isSocialLoading === 'google' ? (
              <ActivityIndicator color={BRAND_COLORS.TEXT} size="small" />
            ) : (
              <Text style={styles.socialButtonText}>🌐  Continue with Google</Text>
            )}
          </TouchableOpacity>

          {isAppleSignInAvailable && (() => {
            const AppleBtn = getAppleButtonComponent();
            return AppleBtn ? (
              <AppleBtn
                buttonType={AppleButtonType.SIGN_UP}
                buttonStyle={AppleButtonStyle.BLACK}
                cornerRadius={12}
                style={styles.appleButton}
                onPress={handleAppleSignIn}
              />
            ) : null;
          })()}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or register with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── FOTO DE PERFIL ── */}
          <View style={styles.photoSection}>
            <TouchableOpacity style={styles.photoContainer} onPress={handlePickPhoto} accessibilityRole="button" accessibilityLabel="Add profile photo">
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderIcon}>📷</Text>
                  <Text style={styles.photoPlaceholderText}>Add photo *</Text>
                </View>
              )}
              <View style={styles.photoEditBadge}>
                <Text style={styles.photoEditBadgeText}>{photoUri ? '✎' : '+'}</Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.photoHint}>
              Your photo helps drivers identify you. <Text style={styles.photoRequired}>Required.</Text>
            </Text>
          </View>

          {/* ── DOCUMENTO DE IDENTIDAD ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Government ID <Text style={styles.photoRequired}>*</Text></Text>
            <Text style={styles.sectionSubtitle}>
              Driver's license, passport, or state ID — both sides required.
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
                    <Text style={styles.idDocSideDone}>✓ Front</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.idDocSideIcon}>🪪</Text>
                    <Text style={styles.idDocSideLabel}>Front *</Text>
                    <Text style={styles.idDocSideHint}>Tap to upload</Text>
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
                    <Text style={styles.idDocSideDone}>✓ Back</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.idDocSideIcon}>🪪</Text>
                    <Text style={styles.idDocSideLabel}>Back *</Text>
                    <Text style={styles.idDocSideHint}>Tap to upload</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            {false && (
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={() => setShowScanner(true)}
                accessibilityRole="button"
                accessibilityLabel="Scan ID barcode"
              >
                <Text style={styles.scanBtnText}>Scan barcode to auto-fill your info</Text>
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
            <Text style={styles.sectionTitle}>Personal information</Text>

            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.name')} *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                placeholder="Your full name"
                placeholderTextColor="#aaa"
                accessibilityLabel={t('auth.name')}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.email')} *</Text>
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
              <Text style={styles.label}>{t('auth.password')} *</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  placeholder="Minimum 6 characters"
                  placeholderTextColor="#aaa"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm password *</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Repeat your password"
                placeholderTextColor="#aaa"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.phone')} (optional)</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                placeholder="(555) 123-4567"
                placeholderTextColor="#aaa"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Home address *</Text>
              <TextInput
                style={styles.input}
                value={homeAddress}
                onChangeText={setHomeAddress}
                autoCapitalize="words"
                placeholder="123 Main St, City, TX"
                placeholderTextColor="#aaa"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.state')}</Text>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowStatePicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Select state"
              >
                <Text style={styles.pickerText}>{selectedStateName}</Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── TIPO DE PASAJERO (multi-selección) ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My needs</Text>
            <Text style={styles.sectionSubtitle}>
              Select all that apply — your driver will be notified before every ride.
            </Text>
            {passengerCategories.length > 0 && (
              <TouchableOpacity onPress={() => { setPassengerCategories([]); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕  Clear selection</Text>
              </TouchableOpacity>
            )}
            <View style={styles.categoryGrid}>
              {[
                { key: 'elderly',           icon: '👴', label: 'Senior (65+)' },
                { key: 'pregnant',          icon: '🤰', label: 'Pregnant' },
                { key: 'post_surgery',      icon: '🏥', label: 'Post-surgery' },
                { key: 'wheelchair',        icon: '♿', label: 'Wheelchair' },
                { key: 'visual_impairment', icon: '👁️', label: 'Visual impairment' },
                { key: 'hearing_impairment',icon: '👂', label: 'Hearing impairment' },
                { key: 'cognitive',         icon: '🧠', label: 'Cognitive support' },
                { key: 'with_minor',        icon: '👶', label: 'With child' },
                { key: 'medical_equipment', icon: '💊', label: 'Medical equipment' },
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
              <Text style={styles.categoryNoneHint}>No special needs? Leave blank.</Text>
            )}
          </View>

          {/* ── CONTACTO DE EMERGENCIA ── */}
          <TouchableOpacity
            style={styles.expandRow}
            onPress={() => setShowEmergency(!showEmergency)}
            accessibilityRole="button"
          >
            <Text style={styles.expandText}>
              {showEmergency ? '▼' : '▶'} Emergency contact (recommended)
            </Text>
          </TouchableOpacity>

          {showEmergency && (
            <View style={styles.section}>
              <Text style={styles.emergencyNote}>
                🚨 This person will receive an automatic email alert with your location if you activate the SOS button during a ride.
              </Text>
              <View style={styles.field}>
                <Text style={styles.label}>Contact name</Text>
                <TextInput
                  style={styles.input}
                  value={emergencyName}
                  onChangeText={setEmergencyName}
                  autoCapitalize="words"
                  placeholder="Full name"
                  placeholderTextColor="#aaa"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Contact phone</Text>
                <TextInput
                  style={styles.input}
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                  keyboardType="phone-pad"
                  placeholder="(555) 123-4567"
                  placeholderTextColor="#aaa"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Contact email (for SOS alerts)</Text>
                <TextInput
                  style={styles.input}
                  value={emergencyEmail}
                  onChangeText={setEmergencyEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="contact@email.com"
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
            accessibilityLabel="Create account"
          >
            {isLoading || photoUploading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}>{photoUploading ? 'Uploading photo…' : 'Creating account…'}</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>{t('auth.haveAccount')} </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.loginLink}>{t('auth.loginButton')}</Text>
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
              data={US_STATES}
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
  safe: { flex: 1, backgroundColor: '#fff' },
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

  socialButton: {
    height: 56,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  socialButtonText: {
    fontSize: 17,
    fontWeight: '500',
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_500Medium',
  },
  appleButton: {
    height: 56,
    width: '100%',
    marginBottom: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    marginTop: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { fontSize: 14, color: '#999', fontFamily: 'Inter_400Regular' },

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
