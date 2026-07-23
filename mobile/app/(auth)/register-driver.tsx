// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Pantalla de registro de conductor — wizard de 8 pasos
// Paso 1: Datos personales
// Paso 2: Licencia de conducir
// Paso 3: Información del vehículo
// Paso 4: Seguro del vehículo
// Paso 5: Fotos del vehículo
// Paso 6: Certificaciones y cursos
// Paso 7: Idiomas y equipamiento especial
// Paso 8: Revisión y envío
// ═══════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView, Modal, FlatList, Image,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/store/authStore';
import { driverMobileService, DocumentType } from '../../src/services/driverService';
import { BRAND_COLORS } from '@vride/shared';
import LicenseScanner from '../../src/components/common/LicenseScanner';
import { AAMVAData } from '../../src/utils/aamvaParser';

// ─────────────────────────────────────
// Estados de EE.UU.
// ─────────────────────────────────────
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

const SERVICE_OPTIONS = [
  { key: 'standard',   label: 'Standard',    emoji: '🚗' },
  { key: 'executive',  label: 'Executive',   emoji: '🚙' },
  { key: 'accessible', label: 'Accessible',  emoji: '♿' },
  { key: 'scheduled',  label: 'Scheduled',   emoji: '📅' },
  { key: 'hourly',     label: 'By the hour', emoji: '⏱️' },
];

const LANGUAGE_OPTIONS = [
  { key: 'english', label: 'English', emoji: '🇺🇸' },
  { key: 'spanish', label: 'Spanish', emoji: '🇲🇽' },
  { key: 'french',  label: 'French',  emoji: '🇫🇷' },
  { key: 'portuguese', label: 'Portuguese', emoji: '🇧🇷' },
  { key: 'mandarin', label: 'Mandarin', emoji: '🇨🇳' },
  { key: 'arabic',  label: 'Arabic',  emoji: '🇸🇦' },
  { key: 'sign_language', label: 'Sign Language', emoji: '🤟' },
];

const MUSIC_OPTIONS = [
  { key: 'off',        label: 'Radio off',       emoji: '🔇' },
  { key: 'any',        label: 'No preference',   emoji: '🎵' },
  { key: 'pop',        label: 'Pop',             emoji: '🎤' },
  { key: 'rock',       label: 'Rock',            emoji: '🎸' },
  { key: 'latin',      label: 'Reggaeton/Latin', emoji: '🕺' },
  { key: 'jazz',       label: 'Jazz/Blues',      emoji: '🎺' },
  { key: 'classical',  label: 'Classical',       emoji: '🎻' },
  { key: 'country',    label: 'Country',         emoji: '🤠' },
  { key: 'gospel',     label: 'Gospel/Christian',emoji: '🙏' },
  { key: 'hiphop',     label: 'Hip Hop/R&B',     emoji: '🎧' },
  { key: 'news',       label: 'News/Talk radio', emoji: '📻' },
  { key: 'custom',     label: 'Favorite artist', emoji: '⭐' },
];

const EQUIPMENT_OPTIONS = [
  { key: 'wheelchair_ramp', label: 'Wheelchair ramp',    emoji: '♿' },
  { key: 'baby_seat',       label: 'Baby/child seat',    emoji: '👶' },
  { key: 'oxygen_support',  label: 'Oxygen support',     emoji: '🫁' },
  { key: 'hearing_loop',    label: 'Hearing loop',       emoji: '🔊' },
  { key: 'visual_aid',      label: 'Visual aid support', emoji: '👁️' },
  { key: 'dashcam',         label: 'Dashcam installed',  emoji: '📹' },
  { key: 'usb_charger',     label: 'USB charger',        emoji: '🔌' },
  { key: 'wifi',            label: 'WiFi in vehicle',    emoji: '📶' },
];

const CERTIFICATION_OPTIONS = [
  { key: 'medical_exam',        label: 'Current Medical Exam',            emoji: '🏥', docType: 'cert_medical_exam'        as DocumentType },
  { key: 'defensive_driving',   label: 'Defensive Driving',               emoji: '🚦', docType: 'cert_defensive_driving'   as DocumentType },
  { key: 'first_aid',           label: 'First Aid',                       emoji: '🩹', docType: 'cert_first_aid'           as DocumentType },
  { key: 'senior_transport',    label: 'Senior Passenger Transport',      emoji: '👴', docType: 'cert_senior_transport'    as DocumentType },
  { key: 'pregnant_transport',  label: 'Pregnant Women Transport',        emoji: '🤰', docType: 'cert_pregnant_transport'  as DocumentType },
  { key: 'disability_transport',label: 'Physical Disability Transport',   emoji: '🦽', docType: 'cert_disability_transport' as DocumentType },
  { key: 'visual_impairment',   label: 'Visual Impairment Transport',     emoji: '🦯', docType: 'cert_visual_impairment'   as DocumentType },
  { key: 'hearing_impairment',  label: 'Hearing Impairment Transport',    emoji: '🦻', docType: 'cert_hearing_impairment'  as DocumentType },
  { key: 'wheelchair_vehicle',  label: 'Wheelchair Accessible Vehicle',   emoji: '🚐', docType: 'cert_wheelchair_vehicle'  as DocumentType },
  { key: 'cpr',                 label: 'CPR Certification',               emoji: '❤️', docType: 'cert_cpr'                as DocumentType },
];

// Documentos requeridos (todos excepto accessible_cert y certificaciones)
const REQUIRED_DOCS: DocumentType[] = [
  'license_front', 'license_back',
  'vehicle_front', 'vehicle_back', 'vehicle_left', 'vehicle_right', 'vehicle_interior',
  'insurance', 'selfie',
];

interface DocState {
  uri: string | null;
  uploading: boolean;
  uploaded: boolean;
}

const emptyDoc = (): DocState => ({ uri: null, uploading: false, uploaded: false });

const TOTAL_STEPS = 8;

export default function RegisterDriverScreen() {
  const { t } = useTranslation();
  const { registerDriver, setDriverWizardActive, isLoading: isCreatingAccount } = useAuthStore();

  const [step, setStep] = useState(1);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // ── PASO 1: Datos personales ──
  const [name, setName]                       = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [phone, setPhone]                     = useState('');
  const [dateOfBirth, setDateOfBirth]         = useState('');
  const [ssnLast4, setSsnLast4]               = useState('');
  const [homeAddress, setHomeAddress]         = useState('');
  const [stateCode, setStateCode]             = useState('TX');
  const [referralCode, setReferralCode]       = useState('');

  // ── PASO 2: Licencia ──
  const [licenseNumber, setLicenseNumber]     = useState('');
  const [licenseExpiry, setLicenseExpiry]     = useState('');

  // ── PASO 3: Vehículo ──
  const [vehiclePlate, setVehiclePlate]       = useState('');
  const [vehicleBrand, setVehicleBrand]       = useState('');
  const [vehicleModel, setVehicleModel]       = useState('');
  const [vehicleYear, setVehicleYear]         = useState('');
  const [vehicleColor, setVehicleColor]       = useState('');
  const [vehicleVin, setVehicleVin]           = useState('');
  const [vehicleSeats, setVehicleSeats]       = useState('4');
  const [services, setServices]               = useState<string[]>(['standard']);

  // ── PASO 4: Seguro ──
  const [insuranceCompany, setInsuranceCompany]           = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insuranceExpiry, setInsuranceExpiry]             = useState('');

  // ── PASO 6: Certificaciones ──
  const [certExpiries, setCertExpiries] = useState<Record<string, string>>({});

  // ── PASO 7: Idiomas, equipamiento y preferencias ──
  const [languages, setLanguages]               = useState<string[]>(['english']);
  const [specialEquipment, setSpecialEquipment] = useState<string[]>([]);
  const [smokes, setSmokes]                     = useState(false);
  const [longDistanceAvailable, setLongDistanceAvailable] = useState(false);
  const [musicPreference, setMusicPreference]   = useState('any');
  const [musicArtist, setMusicArtist]           = useState('');

  // ── Documentos ──
  const [docs, setDocs] = useState<Record<DocumentType, DocState>>({
    license_front:           emptyDoc(),
    license_back:            emptyDoc(),
    vehicle_front:           emptyDoc(),
    vehicle_back:            emptyDoc(),
    vehicle_left:            emptyDoc(),
    vehicle_right:           emptyDoc(),
    vehicle_interior:        emptyDoc(),
    insurance:               emptyDoc(),
    accessible_cert:         emptyDoc(),
    selfie:                  emptyDoc(),
    cert_medical_exam:        emptyDoc(),
    cert_defensive_driving:   emptyDoc(),
    cert_first_aid:           emptyDoc(),
    cert_senior_transport:    emptyDoc(),
    cert_pregnant_transport:  emptyDoc(),
    cert_disability_transport: emptyDoc(),
    cert_visual_impairment:   emptyDoc(),
    cert_hearing_impairment:  emptyDoc(),
    cert_wheelchair_vehicle:  emptyDoc(),
    cert_cpr:                 emptyDoc(),
  });

  const selectedStateName = US_STATES.find(s => s.code === stateCode)?.name ?? stateCode;

  // ─────────────────────────────────────
  // Handler del scanner PDF417 — mapea datos AAMVA al formulario
  const handleLicenseScanned = (data: AAMVAData) => {
    setShowScanner(false);
    if (data.licenseNumber) setLicenseNumber(data.licenseNumber);
    if (data.expiryDate) {
      // AAMVA da MM/DD/YYYY → el campo pide MM/YYYY
      const parts = data.expiryDate.split('/');
      if (parts.length >= 3) setLicenseExpiry(`${parts[0]}/${parts[2]}`);
    }
    if (data.state && US_STATES.find(s => s.code === data.state)) {
      setStateCode(data.state);
    }
  };

  // ─────────────────────────────────────
  // Seleccionar foto de perfil (paso 1) — se sube después de registrar la cuenta
  const handlePickProfilePhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (!camPerm.granted) {
        Alert.alert('Permission required', 'We need camera or gallery access for your profile photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.85,
        cameraType: ImagePicker.CameraType.front,
      });
      if (!result.canceled && result.assets[0]) setProfilePhotoUri(result.assets[0].uri);
      return;
    }
    Alert.alert('Profile photo', 'Choose an option', [
      {
        text: 'Take selfie',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.85,
            cameraType: ImagePicker.CameraType.front,
          });
          if (!result.canceled && result.assets[0]) setProfilePhotoUri(result.assets[0].uri);
        },
      },
      {
        text: 'Choose from gallery',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.85,
          });
          if (!result.canceled && result.assets[0]) setProfilePhotoUri(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Seleccionar y subir foto/documento
  // ─────────────────────────────────────
  const pickAndUpload = useCallback(async (
    docType: DocumentType,
    useCamera = false
  ) => {
    const permResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permResult.granted) {
      Alert.alert(
        'Permission required',
        useCamera
          ? 'We need camera access to take your photo.'
          : 'We need gallery access to upload documents.'
      );
      return;
    }

    const pickerResult = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.85,
          cameraType: docType === 'selfie'
            ? ImagePicker.CameraType.front
            : ImagePicker.CameraType.back,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.85,
        });

    if (pickerResult.canceled || !pickerResult.assets[0]) return;

    const asset = pickerResult.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';

    setDocs(prev => ({
      ...prev,
      [docType]: { uri: asset.uri, uploading: true, uploaded: false },
    }));

    try {
      await driverMobileService.uploadDocument(docType, asset.uri, mimeType);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDocs(prev => ({
        ...prev,
        [docType]: { uri: asset.uri, uploading: false, uploaded: true },
      }));
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setDocs(prev => ({
        ...prev,
        [docType]: { uri: null, uploading: false, uploaded: false },
      }));
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Upload error', msg);
    }
  }, []);

  // ─────────────────────────────────────
  // PASO 1 → Crear cuenta
  // ─────────────────────────────────────
  const handleStep1 = async () => {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert('', 'Name must be at least 2 characters'); return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('', 'Enter a valid email address'); return;
    }
    if (!password || password.length < 6) {
      Alert.alert('', 'Password must be at least 6 characters'); return;
    }
    if (password !== confirmPassword) {
      Alert.alert('', 'Passwords do not match'); return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      Alert.alert('', 'Phone number is required for drivers'); return;
    }
    if (!dateOfBirth.trim()) {
      Alert.alert('', 'Date of birth is required'); return;
    }
    if (!homeAddress.trim()) {
      Alert.alert('', 'Home address is required'); return;
    }
    if (!profilePhotoUri) {
      Alert.alert('', 'Profile photo is required'); return;
    }

    try {
      await registerDriver({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        stateCode,
        referralCode: referralCode.trim() || undefined,
      });
      // Subir foto de perfil si fue seleccionada (tokens ya guardados tras registerDriver)
      if (profilePhotoUri) {
        try {
          const { apiClient } = await import('../../src/services/apiClient');
          const fd = new FormData();
          fd.append('photo', { uri: profilePhotoUri, name: 'profile.jpg', type: 'image/jpeg' } as any);
          await apiClient.post('/user/photo', fd, { headers: { 'Content-Type': undefined }, timeout: 60_000 });
        } catch {}
      }
      // Guardar datos personales adicionales
      await driverMobileService.updateProfile({
        dateOfBirth: dateOfBirth.trim() || undefined,
        ssnLast4: ssnLast4.trim() || undefined,
        homeAddress: homeAddress.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '📧 Check your email',
        `We sent a verification email to ${email.trim()}. You will need to verify it to activate your account once you finish registration.`,
        [{ text: 'Got it, continue →', onPress: () => setStep(2) }]
      );
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err instanceof Error ? err.message : 'Error creating account';
      Alert.alert('Error', msg === 'ALREADY_REGISTERED'
        ? 'An account with this email already exists.'
        : msg
      );
    }
  };

  // ─────────────────────────────────────
  // PASO 2 → Guardar licencia
  // ─────────────────────────────────────
  const handleStep2 = async () => {
    if (!licenseNumber.trim()) {
      Alert.alert('', 'License number is required'); return;
    }
    if (!licenseExpiry.trim()) {
      Alert.alert('', 'License expiry date is required'); return;
    }
    if (!docs.license_front.uploaded || !docs.license_back.uploaded) {
      Alert.alert('', 'Upload the front and back photo of your license'); return;
    }
    try {
      await driverMobileService.updateProfile({
        licenseNumber: licenseNumber.trim(),
        licenseExpiry: licenseExpiry.trim(),
      });
      setStep(3);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Error (paso 2)', msg);
    }
  };

  // ─────────────────────────────────────
  // PASO 3 → Guardar vehículo
  // ─────────────────────────────────────
  const handleStep3 = async () => {
    if (!vehiclePlate.trim()) { Alert.alert('', 'Vehicle plate is required'); return; }
    if (!vehicleBrand.trim()) { Alert.alert('', 'Vehicle brand is required'); return; }
    if (!vehicleModel.trim()) { Alert.alert('', 'Vehicle model is required'); return; }
    if (!vehicleYear.trim())  { Alert.alert('', 'Vehicle year is required'); return; }
    if (!vehicleColor.trim()) { Alert.alert('', 'Vehicle color is required'); return; }
    if (services.length === 0) { Alert.alert('', 'Select at least one service type'); return; }

    const year = parseInt(vehicleYear.trim(), 10);
    if (isNaN(year) || year < 2000 || year > new Date().getFullYear() + 1) {
      Alert.alert('', 'Enter a valid vehicle year (e.g. 2018)'); return;
    }

    try {
      await driverMobileService.updateProfile({
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        vehicleBrand: vehicleBrand.trim(),
        vehicleModel: vehicleModel.trim(),
        vehicleYear: year,
        vehicleColor: vehicleColor.trim(),
        vehicleVin: vehicleVin.trim() || undefined,
        vehicleSeats: vehicleSeats ? parseInt(vehicleSeats, 10) : undefined,
        services,
      });
      setStep(4);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      Alert.alert('', msg || 'Could not save vehicle data. Please try again.');
    }
  };

  // ─────────────────────────────────────
  // PASO 4 → Guardar seguro
  // ─────────────────────────────────────
  const handleStep4 = async () => {
    if (!insuranceCompany.trim()) {
      Alert.alert('', 'Insurance company name is required'); return;
    }
    if (!insurancePolicyNumber.trim()) {
      Alert.alert('', 'Policy number is required'); return;
    }
    if (!insuranceExpiry.trim()) {
      Alert.alert('', 'Insurance expiry date is required'); return;
    }
    if (!docs.insurance.uploaded) {
      Alert.alert('', 'Upload your insurance policy document'); return;
    }
    try {
      await driverMobileService.updateProfile({
        insuranceCompany: insuranceCompany.trim(),
        insurancePolicyNumber: insurancePolicyNumber.trim(),
        insuranceExpiry: insuranceExpiry.trim(),
      });
      setStep(5);
    } catch {
      Alert.alert('', 'Could not save insurance data. Please try again.');
    }
  };

  // ─────────────────────────────────────
  // PASO 5 → Verificar fotos del vehículo
  // ─────────────────────────────────────
  const handleStep5 = () => {
    const vehiclePhotos: DocumentType[] = [
      'vehicle_front', 'vehicle_back', 'vehicle_left', 'vehicle_right', 'vehicle_interior',
    ];
    const missing = vehiclePhotos.filter(d => !docs[d].uploaded);
    if (missing.length > 0) {
      Alert.alert('', `Missing ${missing.length} vehicle photo(s)`); return;
    }
    if (!docs.selfie.uploaded) {
      Alert.alert('', 'We need your selfie to verify your identity'); return;
    }
    setStep(6);
  };

  // ─────────────────────────────────────
  // PASO 6 → Guardar certificaciones
  // ─────────────────────────────────────
  const handleStep6 = async () => {
    // Construir objeto de certificaciones para guardar
    const certifications: Record<string, { verified: boolean; expiry: string | null; doc_url: string | null }> = {};
    for (const cert of CERTIFICATION_OPTIONS) {
      if (docs[cert.docType].uploaded) {
        certifications[cert.key] = {
          verified: false, // El admin verificará
          expiry: certExpiries[cert.key] ?? null,
          doc_url: null, // Ya subido via uploadDocument
        };
      }
    }

    if (Object.keys(certifications).length > 0) {
      try {
        await driverMobileService.updateProfile({ certifications });
      } catch {
        Alert.alert('', 'Could not save certifications. Please try again.');
        return;
      }
    }
    setStep(7);
  };

  // ─────────────────────────────────────
  // PASO 7 → Guardar idiomas y equipo
  // ─────────────────────────────────────
  const handleStep7 = async () => {
    if (languages.length === 0) {
      Alert.alert('', 'Select at least one language'); return;
    }
    try {
      await driverMobileService.updateProfile({
        languages,
        specialEquipment,
        smokes,
        longDistanceAvailable,
        musicPreference,
        musicArtist: musicArtist.trim() || undefined,
      });
      setStep(8);
    } catch {
      Alert.alert('', 'Could not save preferences. Please try again.');
    }
  };

  // ─────────────────────────────────────
  // PASO 8 → Enviar para revisión
  // ─────────────────────────────────────
  const handleSubmitReview = async () => {
    setIsSubmittingReview(true);
    try {
      await driverMobileService.submitForReview();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDriverWizardActive(false); // Permite que el layout redirija a verify-email
      router.replace('/(auth)/verify-email');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      Alert.alert(
        'Error',
        msg.startsWith('MISSING_DOCUMENTS')
          ? 'Required documents are missing. Go back to the previous step.'
          : 'Could not submit the application. Please try again.'
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // ─────────────────────────────────────
  // Componente: botón de subida de documento
  // ─────────────────────────────────────
  const DocUploadButton = ({
    docType, label, useCamera = false, optional = false, bothOptions = false,
  }: {
    docType: DocumentType;
    label: string;
    useCamera?: boolean;
    optional?: boolean;
    bothOptions?: boolean;
  }) => {
    const doc = docs[docType];

    const handlePress = () => {
      if (bothOptions) {
        Alert.alert('Upload photo', 'Choose an option', [
          { text: '📷 Take photo', onPress: () => pickAndUpload(docType, true) },
          { text: '📎 Choose from gallery', onPress: () => pickAndUpload(docType, false) },
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else {
        pickAndUpload(docType, useCamera);
      }
    };

    return (
      <View style={styles.docItem}>
        <View style={styles.docInfo}>
          <Text style={styles.docLabel}>{label}{optional ? ' (optional)' : ' *'}</Text>
          {doc.uploaded && (
            <Text style={styles.docDone}>✓ Uploaded</Text>
          )}
        </View>
        {doc.uri && doc.uploaded && (
          <Image source={{ uri: doc.uri }} style={styles.docPreview} />
        )}
        <TouchableOpacity
          style={[
            styles.docButton,
            doc.uploaded && styles.docButtonDone,
            doc.uploading && styles.docButtonLoading,
          ]}
          onPress={handlePress}
          disabled={doc.uploading}
          accessibilityRole="button"
        >
          {doc.uploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.docButtonText}>
              {doc.uploaded ? 'Change' : '📷 Upload'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // ─────────────────────────────────────
  // Barra de progreso
  // ─────────────────────────────────────
  const stepLabels = [
    'Personal info',
    "Driver's license",
    'Vehicle info',
    'Insurance',
    'Vehicle photos',
    'Certifications',
    'Languages & equipment',
    'Review & submit',
  ];

  const progressPercent = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => step === 1 ? router.back() : setStep(step - 1)}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Driver Registration</Text>
          <Text style={styles.headerStep}>Step {step} of {TOTAL_STEPS} — {stepLabels[step - 1]}</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      {/* Barra de progreso */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` as any }]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ══════════════════════════════
              PASO 1 — DATOS PERSONALES
          ══════════════════════════════ */}
          {step === 1 && (
            <View>
              <Text style={styles.stepHint}>
                Create your account. All information is kept confidential and secure.
              </Text>

              {/* ── FOTO DE PERFIL ── */}
              <View style={styles.photoSection}>
                <TouchableOpacity style={styles.photoContainer} onPress={handlePickProfilePhoto} accessibilityRole="button" accessibilityLabel="Add profile photo">
                  {profilePhotoUri ? (
                    <Image source={{ uri: profilePhotoUri }} style={styles.photoPreview} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Text style={styles.photoPlaceholderIcon}>📷</Text>
                      <Text style={styles.photoPlaceholderText}>Add photo *</Text>
                    </View>
                  )}
                  <View style={styles.photoEditBadge}>
                    <Text style={styles.photoEditBadgeText}>{profilePhotoUri ? '✎' : '+'}</Text>
                  </View>
                </TouchableOpacity>
                <Text style={styles.photoHint}>
                  Passengers will see your photo during the ride. <Text style={styles.photoRequired}>Required.</Text>
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Full name *</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName}
                  autoCapitalize="words" placeholder="Your full name" placeholderTextColor="#aaa" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Email *</Text>
                <TextInput style={styles.input} value={email} onChangeText={setEmail}
                  keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                  placeholder="your@email.com" placeholderTextColor="#aaa" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Password *</Text>
                <View style={styles.passwordRow}>
                  <TextInput style={[styles.input, styles.passwordInput]}
                    value={password} onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none" autoCorrect={false}
                    placeholder="Minimum 6 characters" placeholderTextColor="#aaa" />
                  <TouchableOpacity style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}>
                    <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Confirm password *</Text>
                <TextInput style={styles.input} value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none" autoCorrect={false}
                  placeholder="Repeat your password" placeholderTextColor="#aaa" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Phone *</Text>
                <TextInput style={styles.input} value={phone} onChangeText={setPhone}
                  keyboardType="phone-pad" placeholder="(555) 123-4567" placeholderTextColor="#aaa" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Date of birth *</Text>
                <TextInput style={styles.input} value={dateOfBirth} onChangeText={setDateOfBirth}
                  placeholder="MM/DD/YYYY" placeholderTextColor="#aaa"
                  keyboardType="numbers-and-punctuation" maxLength={10} />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>SSN last 4 digits (optional)</Text>
                <TextInput style={styles.input} value={ssnLast4} onChangeText={setSsnLast4}
                  keyboardType="number-pad" placeholder="XXXX" placeholderTextColor="#aaa" maxLength={4}
                  secureTextEntry />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Home address *</Text>
                <TextInput style={styles.input} value={homeAddress} onChangeText={setHomeAddress}
                  autoCapitalize="words" placeholder="123 Main St, City, TX" placeholderTextColor="#aaa" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>State *</Text>
                <TouchableOpacity style={styles.picker} onPress={() => setShowStatePicker(true)}>
                  <Text style={styles.pickerText}>{selectedStateName}</Text>
                  <Text style={styles.pickerArrow}>▼</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Referral code (optional)</Text>
                <TextInput style={styles.input} value={referralCode}
                  onChangeText={setReferralCode}
                  autoCapitalize="characters" autoCorrect={false}
                  placeholder="Referral code (optional)" placeholderTextColor="#aaa" />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isCreatingAccount && styles.buttonDisabled]}
                onPress={handleStep1} disabled={isCreatingAccount}
                accessibilityRole="button">
                {isCreatingAccount
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.primaryButtonText}>Create account and continue →</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════
              PASO 2 — LICENCIA
          ══════════════════════════════ */}
          {step === 2 && (
            <View>
              <Text style={styles.stepHint}>
                We need your valid U.S. driver's license. This also serves as your government-issued identity document.
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>License number *</Text>
                <TextInput style={styles.input} value={licenseNumber}
                  onChangeText={setLicenseNumber}
                  autoCapitalize="characters" autoCorrect={false}
                  placeholder="License number" placeholderTextColor="#aaa" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Expiry date *</Text>
                <TextInput style={styles.input} value={licenseExpiry}
                  onChangeText={setLicenseExpiry}
                  placeholder="MM/YYYY" placeholderTextColor="#aaa"
                  keyboardType="numbers-and-punctuation" />
              </View>

              {false && (
                <TouchableOpacity
                  style={styles.scanBtn}
                  onPress={() => setShowScanner(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Scan license barcode"
                >
                  <Text style={styles.scanBtnText}>Scan barcode (back of license)</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.subSectionTitle}>License photos — both sides required *</Text>
              <View style={styles.docSideRow}>
                <View style={styles.docSideCol}>
                  <DocUploadButton docType="license_front" label="Front" bothOptions />
                </View>
                <View style={styles.docSideCol}>
                  <DocUploadButton docType="license_back" label="Back" bothOptions />
                </View>
              </View>

              {false && showScanner && (
                <LicenseScanner
                  onScanned={handleLicenseScanned}
                  onClose={() => setShowScanner(false)}
                />
              )}

              <TouchableOpacity style={styles.primaryButton} onPress={handleStep2}
                accessibilityRole="button">
                <Text style={styles.primaryButtonText}>Continue to vehicle →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════
              PASO 3 — VEHÍCULO
          ══════════════════════════════ */}
          {step === 3 && (
            <View>
              <Text style={styles.stepHint}>
                The vehicle must be less than 15 years old.
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>License plate *</Text>
                <TextInput style={styles.input} value={vehiclePlate}
                  onChangeText={setVehiclePlate}
                  autoCapitalize="characters" autoCorrect={false}
                  placeholder="ABC-1234" placeholderTextColor="#aaa" />
              </View>

              <View style={styles.twoCol}>
                <View style={[styles.field, styles.colHalf]}>
                  <Text style={styles.label}>Brand *</Text>
                  <TextInput style={styles.input} value={vehicleBrand}
                    onChangeText={setVehicleBrand}
                    autoCapitalize="words" placeholder="Toyota" placeholderTextColor="#aaa" />
                </View>
                <View style={[styles.field, styles.colHalf]}>
                  <Text style={styles.label}>Model *</Text>
                  <TextInput style={styles.input} value={vehicleModel}
                    onChangeText={setVehicleModel}
                    autoCapitalize="words" placeholder="Camry" placeholderTextColor="#aaa" />
                </View>
              </View>

              <View style={styles.twoCol}>
                <View style={[styles.field, styles.colHalf]}>
                  <Text style={styles.label}>Year *</Text>
                  <TextInput style={styles.input} value={vehicleYear}
                    onChangeText={setVehicleYear}
                    keyboardType="number-pad" placeholder="2020" placeholderTextColor="#aaa" />
                </View>
                <View style={[styles.field, styles.colHalf]}>
                  <Text style={styles.label}>Color *</Text>
                  <TextInput style={styles.input} value={vehicleColor}
                    onChangeText={setVehicleColor}
                    autoCapitalize="words" placeholder="White" placeholderTextColor="#aaa" />
                </View>
              </View>

              <View style={styles.twoCol}>
                <View style={[styles.field, styles.colHalf]}>
                  <Text style={styles.label}>VIN</Text>
                  <TextInput style={styles.input} value={vehicleVin}
                    onChangeText={setVehicleVin}
                    autoCapitalize="characters" autoCorrect={false}
                    placeholder="VIN (optional)" placeholderTextColor="#aaa" maxLength={17} />
                </View>
                <View style={[styles.field, styles.colHalf]}>
                  <Text style={styles.label}>Seats</Text>
                  <TextInput style={styles.input} value={vehicleSeats}
                    onChangeText={setVehicleSeats}
                    keyboardType="number-pad" placeholder="4" placeholderTextColor="#aaa" />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Service types you will offer *</Text>
                <View style={styles.servicesGrid}>
                  {SERVICE_OPTIONS.map(svc => {
                    const selected = services.includes(svc.key);
                    return (
                      <TouchableOpacity
                        key={svc.key}
                        style={[styles.serviceChip, selected && styles.serviceChipSelected]}
                        onPress={() => {
                          setServices(prev =>
                            selected ? prev.filter(s => s !== svc.key) : [...prev, svc.key]
                          );
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                      >
                        <Text style={styles.serviceEmoji}>{svc.emoji}</Text>
                        <Text style={[styles.serviceLabel, selected && styles.serviceLabelSelected]}>
                          {svc.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleStep3}
                accessibilityRole="button">
                <Text style={styles.primaryButtonText}>Continue to insurance →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════
              PASO 4 — SEGURO
          ══════════════════════════════ */}
          {step === 4 && (
            <View>
              <Text style={styles.stepHint}>
                Provide your vehicle insurance information. Commercial or rideshare insurance is required.
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>Insurance company *</Text>
                <TextInput style={styles.input} value={insuranceCompany}
                  onChangeText={setInsuranceCompany}
                  autoCapitalize="words" placeholder="State Farm, GEICO, etc." placeholderTextColor="#aaa" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Policy number *</Text>
                <TextInput style={styles.input} value={insurancePolicyNumber}
                  onChangeText={setInsurancePolicyNumber}
                  autoCapitalize="characters" autoCorrect={false}
                  placeholder="Policy number" placeholderTextColor="#aaa" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Policy expiry date *</Text>
                <TextInput style={styles.input} value={insuranceExpiry}
                  onChangeText={setInsuranceExpiry}
                  placeholder="MM/YYYY" placeholderTextColor="#aaa"
                  keyboardType="numbers-and-punctuation" />
              </View>

              <Text style={styles.subSectionTitle}>Insurance document</Text>
              <DocUploadButton docType="insurance" label="Insurance policy document" />

              <TouchableOpacity style={styles.primaryButton} onPress={handleStep4}
                accessibilityRole="button">
                <Text style={styles.primaryButtonText}>Continue to vehicle photos →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════
              PASO 5 — FOTOS DEL VEHÍCULO + SELFIE
          ══════════════════════════════ */}
          {step === 5 && (
            <View>
              <Text style={styles.stepHint}>
                Take clear, well-lit photos. All documents are confidential.
              </Text>

              <Text style={styles.subSectionTitle}>Vehicle photos</Text>
              <DocUploadButton docType="vehicle_front"    label="Front of vehicle" />
              <DocUploadButton docType="vehicle_back"     label="Back of vehicle" />
              <DocUploadButton docType="vehicle_left"     label="Left side" />
              <DocUploadButton docType="vehicle_right"    label="Right side" />
              <DocUploadButton docType="vehicle_interior" label="Interior" />

              <Text style={styles.subSectionTitle}>Identity verification</Text>
              <Text style={styles.selfieHint}>
                Take a clear selfie so we can verify your identity. It will be shown to passengers.
              </Text>
              <DocUploadButton docType="selfie" label="Take selfie" useCamera />

              <DocUploadButton docType="accessible_cert"
                label="Accessible vehicle certificate" optional />

              <TouchableOpacity style={styles.primaryButton} onPress={handleStep5}
                accessibilityRole="button">
                <Text style={styles.primaryButtonText}>Continue to certifications →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════
              PASO 6 — CERTIFICACIONES
          ══════════════════════════════ */}
          {step === 6 && (
            <View>
              <Text style={styles.stepHint}>
                Select the certifications you have. Upload the certificate photo and expiry date for each one.
                All certifications are optional but increase your chances of getting more rides.
              </Text>

              {CERTIFICATION_OPTIONS.map(cert => {
                const hasDoc = docs[cert.docType].uploaded;
                return (
                  <View key={cert.key} style={styles.certCard}>
                    <View style={styles.certHeader}>
                      <Text style={styles.certEmoji}>{cert.emoji}</Text>
                      <Text style={styles.certLabel}>{cert.label}</Text>
                      {hasDoc && <Text style={styles.certUploaded}>✓</Text>}
                    </View>
                    {hasDoc && (
                      <TextInput
                        style={[styles.input, { marginTop: 8 }]}
                        value={certExpiries[cert.key] ?? ''}
                        onChangeText={v => setCertExpiries(prev => ({ ...prev, [cert.key]: v }))}
                        placeholder="Expiry date MM/YYYY (optional)"
                        placeholderTextColor="#aaa"
                        keyboardType="numbers-and-punctuation"
                      />
                    )}
                    <DocUploadButton
                      docType={cert.docType}
                      label="Certificate document"
                      optional
                    />
                  </View>
                );
              })}

              <TouchableOpacity style={styles.primaryButton} onPress={handleStep6}
                accessibilityRole="button">
                <Text style={styles.primaryButtonText}>Continue to languages →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════
              PASO 7 — IDIOMAS Y EQUIPAMIENTO
          ══════════════════════════════ */}
          {step === 7 && (
            <View>
              <Text style={styles.stepHint}>
                Tell passengers what languages you speak, what equipment your vehicle has, and your availability.
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>Languages spoken *</Text>
                <View style={styles.servicesGrid}>
                  {LANGUAGE_OPTIONS.map(lang => {
                    const selected = languages.includes(lang.key);
                    return (
                      <TouchableOpacity
                        key={lang.key}
                        style={[styles.serviceChip, selected && styles.serviceChipSelected]}
                        onPress={() => {
                          setLanguages(prev =>
                            selected ? prev.filter(l => l !== lang.key) : [...prev, lang.key]
                          );
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <Text style={styles.serviceEmoji}>{lang.emoji}</Text>
                        <Text style={[styles.serviceLabel, selected && styles.serviceLabelSelected]}>
                          {lang.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Vehicle equipment (optional)</Text>
                <View style={styles.servicesGrid}>
                  {EQUIPMENT_OPTIONS.map(eq => {
                    const selected = specialEquipment.includes(eq.key);
                    return (
                      <TouchableOpacity
                        key={eq.key}
                        style={[styles.serviceChip, selected && styles.serviceChipSelected]}
                        onPress={() => {
                          setSpecialEquipment(prev =>
                            selected ? prev.filter(e => e !== eq.key) : [...prev, eq.key]
                          );
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                      >
                        <Text style={styles.serviceEmoji}>{eq.emoji}</Text>
                        <Text style={[styles.serviceLabel, selected && styles.serviceLabelSelected]}>
                          {eq.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Preferencia musical */}
              <View style={styles.field}>
                <Text style={styles.label}>Music preference</Text>
                <Text style={styles.stepHint}>
                  Passengers will see this before requesting a ride.
                </Text>
                <View style={styles.servicesGrid}>
                  {MUSIC_OPTIONS.map(opt => {
                    const selected = musicPreference === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[styles.serviceChip, selected && styles.serviceChipSelected]}
                        onPress={() => {
                          setMusicPreference(opt.key);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                      >
                        <Text style={styles.serviceEmoji}>{opt.emoji}</Text>
                        <Text style={[styles.serviceLabel, selected && styles.serviceLabelSelected]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {musicPreference === 'custom' && (
                  <TextInput
                    style={[styles.input, { marginTop: 10 }]}
                    value={musicArtist}
                    onChangeText={setMusicArtist}
                    placeholder="Favorite artist name"
                    placeholderTextColor="#aaa"
                    autoCapitalize="words"
                  />
                )}
              </View>

              {/* Toggles de salud y disponibilidad */}
              <View style={styles.field}>
                <Text style={styles.label}>Availability & health</Text>

                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => {
                    setLongDistanceAvailable(prev => !prev);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: longDistanceAvailable }}
                >
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleEmoji}>🛣️</Text>
                    <View>
                      <Text style={styles.toggleLabel}>Available for long distance trips</Text>
                      <Text style={styles.toggleDesc}>Trips over 50 miles / multi-city</Text>
                    </View>
                  </View>
                  <View style={[styles.toggleSwitch, longDistanceAvailable && styles.toggleSwitchOn]}>
                    <View style={[styles.toggleThumb, longDistanceAvailable && styles.toggleThumbOn]} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => {
                    setSmokes(prev => !prev);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: smokes }}
                >
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleEmoji}>🚬</Text>
                    <View>
                      <Text style={styles.toggleLabel}>I smoke</Text>
                      <Text style={styles.toggleDesc}>Passengers with health conditions may avoid smokers</Text>
                    </View>
                  </View>
                  <View style={[styles.toggleSwitch, smokes && styles.toggleSwitchOn]}>
                    <View style={[styles.toggleThumb, smokes && styles.toggleThumbOn]} />
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleStep7}
                accessibilityRole="button">
                <Text style={styles.primaryButtonText}>Review and submit →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════
              PASO 8 — REVISIÓN Y ENVÍO
          ══════════════════════════════ */}
          {step === 8 && (
            <View>
              <View style={styles.reviewCard}>
                <Text style={styles.reviewTitle}>✅ Ready to submit</Text>
                <Text style={styles.reviewDesc}>
                  Review that all information is correct before submitting your application.
                </Text>

                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Personal information</Text>
                  <ReviewRow label="Name"        value={name} />
                  <ReviewRow label="Email"       value={email} />
                  <ReviewRow label="Phone"       value={phone} />
                  <ReviewRow label="Date of birth" value={dateOfBirth} />
                  <ReviewRow label="Address"     value={homeAddress} />
                  <ReviewRow label="State"       value={stateCode} />
                </View>

                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Driver's license</Text>
                  <ReviewRow label="License #"  value={licenseNumber} />
                  <ReviewRow label="Expiry"     value={licenseExpiry} />
                </View>

                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Vehicle</Text>
                  <ReviewRow label="Plate"    value={vehiclePlate.toUpperCase()} />
                  <ReviewRow label="Vehicle"  value={`${vehicleBrand} ${vehicleModel} ${vehicleYear}`} />
                  <ReviewRow label="Color"    value={vehicleColor} />
                  {vehicleVin ? <ReviewRow label="VIN" value={vehicleVin} /> : null}
                  <ReviewRow label="Seats"    value={vehicleSeats} />
                  <ReviewRow label="Services" value={services.map(s =>
                    SERVICE_OPTIONS.find(o => o.key === s)?.label ?? s
                  ).join(', ')} />
                </View>

                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Insurance</Text>
                  <ReviewRow label="Company"  value={insuranceCompany} />
                  <ReviewRow label="Policy #" value={insurancePolicyNumber} />
                  <ReviewRow label="Expiry"   value={insuranceExpiry} />
                </View>

                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Languages</Text>
                  <ReviewRow label="Languages" value={languages.map(l =>
                    LANGUAGE_OPTIONS.find(o => o.key === l)?.label ?? l
                  ).join(', ')} />
                </View>

                {specialEquipment.length > 0 && (
                  <View style={styles.reviewSection}>
                    <Text style={styles.reviewSectionTitle}>Vehicle equipment</Text>
                    <ReviewRow label="Equipment" value={specialEquipment.map(e =>
                      EQUIPMENT_OPTIONS.find(o => o.key === e)?.label ?? e
                    ).join(', ')} />
                  </View>
                )}

                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Preferences</Text>
                  <ReviewRow label="Long distance trips" value={longDistanceAvailable ? 'Yes' : 'No'} />
                  <ReviewRow label="Smoker" value={smokes ? 'Yes' : 'No'} />
                  <ReviewRow
                    label="Music"
                    value={musicPreference === 'custom' && musicArtist
                      ? musicArtist
                      : MUSIC_OPTIONS.find(o => o.key === musicPreference)?.label ?? musicPreference}
                  />
                </View>

                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Uploaded documents</Text>
                  {REQUIRED_DOCS.map(d => (
                    <ReviewRow key={d}
                      label={d.replace(/_/g, ' ')}
                      value={docs[d].uploaded ? '✓ Uploaded' : '✗ Pending'}
                      valueColor={docs[d].uploaded ? BRAND_COLORS.ACCENT : BRAND_COLORS.ALERT}
                    />
                  ))}
                </View>

                {CERTIFICATION_OPTIONS.some(c => docs[c.docType].uploaded) && (
                  <View style={styles.reviewSection}>
                    <Text style={styles.reviewSectionTitle}>Certifications</Text>
                    {CERTIFICATION_OPTIONS.filter(c => docs[c.docType].uploaded).map(c => (
                      <ReviewRow key={c.key}
                        label={c.label}
                        value="✓ Uploaded"
                        valueColor={BRAND_COLORS.ACCENT}
                      />
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  📋 Our team will review your application within 24-48 hours. You will receive a notification once approved.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isSubmittingReview && styles.buttonDisabled]}
                onPress={handleSubmitReview}
                disabled={isSubmittingReview}
                accessibilityRole="button"
              >
                {isSubmittingReview
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.primaryButtonText}>Submit application</Text>
                }
              </TouchableOpacity>
            </View>
          )}

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
              <Text style={styles.modalTitle}>Select state</Text>
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

// ─────────────────────────────────────
// Componente helper para revisión
// ─────────────────────────────────────
function ReviewRow({
  label, value, valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewRowLabel}>{label}</Text>
      <Text style={[styles.reviewRowValue, valueColor ? { color: valueColor } : {}]}>
        {value}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────
// Estilos
// ─────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 48 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: { width: 44, height: 44, justifyContent: 'center' },
  backText: { fontSize: 24, color: BRAND_COLORS.PRIMARY },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_700Bold',
  },
  headerStep: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },

  // Barra de progreso
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E0E0E0',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: BRAND_COLORS.PRIMARY,
  },

  stepHint: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
  },

  // Documentos lado a lado
  docSideRow: { flexDirection: 'row', gap: 10 },
  docSideCol: { flex: 1 },

  // Foto de perfil (paso 1)
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

  twoCol: { flexDirection: 'row', gap: 12 },
  colHalf: { flex: 1 },

  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  serviceChipSelected: {
    borderColor: BRAND_COLORS.PRIMARY,
    backgroundColor: BRAND_COLORS.PRIMARY + '15',
  },
  serviceEmoji: { fontSize: 18 },
  serviceLabel: { fontSize: 15, color: '#666', fontFamily: 'Inter_400Regular' },
  serviceLabelSelected: { color: BRAND_COLORS.PRIMARY, fontFamily: 'Inter_600SemiBold' },

  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: BRAND_COLORS.PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
    backgroundColor: BRAND_COLORS.PRIMARY + '10',
  },
  scanBtnText: {
    fontSize: 16,
    color: BRAND_COLORS.PRIMARY,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },

  subSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  selfieHint: {
    fontSize: 15,
    color: '#666',
    marginBottom: 12,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 12,
  },
  docInfo: { flex: 1 },
  docLabel: { fontSize: 15, color: BRAND_COLORS.TEXT, fontFamily: 'Inter_400Regular' },
  docDone: { fontSize: 13, color: BRAND_COLORS.ACCENT, marginTop: 2, fontFamily: 'Inter_500Medium' },
  docPreview: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  docButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: BRAND_COLORS.PRIMARY,
    minWidth: 80,
    alignItems: 'center',
  },
  docButtonDone: { backgroundColor: BRAND_COLORS.ACCENT },
  docButtonLoading: { backgroundColor: '#ccc' },
  docButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },

  // Certificaciones
  certCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    marginBottom: 12,
  },
  certHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  certEmoji: { fontSize: 22 },
  certLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_600SemiBold',
  },
  certUploaded: { fontSize: 18, color: BRAND_COLORS.ACCENT },

  primaryButton: {
    height: 56,
    backgroundColor: BRAND_COLORS.PRIMARY,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  submitButton: {
    height: 56,
    backgroundColor: BRAND_COLORS.ACCENT,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },

  reviewCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 16,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: BRAND_COLORS.TEXT,
    marginBottom: 6,
    fontFamily: 'Inter_700Bold',
  },
  reviewDesc: {
    fontSize: 15,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
  },
  reviewSection: { marginBottom: 16 },
  reviewSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    fontFamily: 'Inter_600SemiBold',
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reviewRowLabel: { fontSize: 15, color: '#666', fontFamily: 'Inter_400Regular' },
  reviewRowValue: {
    fontSize: 15,
    color: BRAND_COLORS.TEXT,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
    maxWidth: '55%',
    textAlign: 'right',
  },

  infoBox: {
    backgroundColor: BRAND_COLORS.PRIMARY + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: BRAND_COLORS.PRIMARY,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
  },

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

  // Toggles (smokes, long distance)
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  toggleEmoji: { fontSize: 24 },
  toggleLabel: {
    fontSize: 15,
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_500Medium',
    fontWeight: '500',
  },
  toggleDesc: {
    fontSize: 13,
    color: '#999',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    padding: 3,
    justifyContent: 'center',
  },
  toggleSwitchOn: { backgroundColor: BRAND_COLORS.PRIMARY },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
});
