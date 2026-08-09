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
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/store/authStore';
import { driverMobileService, DocumentType } from '../../src/services/driverService';
import { BRAND_COLORS } from '@vride/shared';
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

const VEHICLE_TYPE_OPTIONS = [
  { key: 'motorcycle', label: 'Moto',       emoji: '🏍️', desc: 'Motocicleta' },
  { key: 'sedan',      label: 'Sedán',      emoji: '🚗', desc: 'Sedan / Compacto / Familiar' },
  { key: 'suv',        label: 'SUV',        emoji: '🚙', desc: 'SUV / Camioneta / Minivan' },
  { key: 'pickup',     label: 'Pick-Up',    emoji: '🛻', desc: 'Camioneta Pick-Up / Carga mediana' },
  { key: 'plataforma', label: 'Plataforma', emoji: '🚛', desc: 'Camión plataforma / Materiales de construcción' },
] as const;

type VehicleType = 'motorcycle' | 'sedan' | 'suv' | 'pickup' | 'plataforma';

const LANGUAGE_OPTIONS = [
  { key: 'spanish',      label: 'Español',    emoji: '🇻🇪' },
  { key: 'english',      label: 'Inglés',     emoji: '🇺🇸' },
  { key: 'portuguese',   label: 'Portugués',  emoji: '🇧🇷' },
  { key: 'french',       label: 'Francés',    emoji: '🇫🇷' },
  { key: 'mandarin',     label: 'Mandarín',   emoji: '🇨🇳' },
  { key: 'arabic',       label: 'Árabe',      emoji: '🇸🇦' },
  { key: 'sign_language',label: 'Lengua de señas', emoji: '🤟' },
];

const MUSIC_OPTIONS = [
  { key: 'off',        label: 'Sin música',      emoji: '🔇' },
  { key: 'any',        label: 'Sin preferencia', emoji: '🎵' },
  { key: 'pop',        label: 'Pop',             emoji: '🎤' },
  { key: 'rock',       label: 'Rock',            emoji: '🎸' },
  { key: 'latin',      label: 'Reguetón/Latin',  emoji: '🕺' },
  { key: 'jazz',       label: 'Jazz/Blues',      emoji: '🎺' },
  { key: 'classical',  label: 'Clásica',         emoji: '🎻' },
  { key: 'salsa',      label: 'Salsa/Merengue',  emoji: '💃' },
  { key: 'gospel',     label: 'Cristiana',       emoji: '🙏' },
  { key: 'hiphop',     label: 'Hip Hop/R&B',     emoji: '🎧' },
  { key: 'news',       label: 'Noticias/Radio',  emoji: '📻' },
  { key: 'custom',     label: 'Artista favorito',emoji: '⭐' },
];

const EQUIPMENT_OPTIONS = [
  { key: 'wheelchair_ramp', label: 'Rampa para silla',  emoji: '♿' },
  { key: 'baby_seat',       label: 'Silla de bebé',     emoji: '👶' },
  { key: 'oxygen_support',  label: 'Soporte de oxígeno',emoji: '🫁' },
  { key: 'hearing_loop',    label: 'Bucle auditivo',    emoji: '🔊' },
  { key: 'visual_aid',      label: 'Apoyo visual',      emoji: '👁️' },
  { key: 'dashcam',         label: 'Dashcam instalada', emoji: '📹' },
  { key: 'usb_charger',     label: 'Cargador USB',      emoji: '🔌' },
  { key: 'wifi',            label: 'WiFi en vehículo',  emoji: '📶' },
];

const CERTIFICATION_OPTIONS = [
  { key: 'medical_exam',        label: 'Examen médico vigente',           emoji: '🏥', docType: 'cert_medical_exam'        as DocumentType },
  { key: 'defensive_driving',   label: 'Manejo defensivo',                emoji: '🚦', docType: 'cert_defensive_driving'   as DocumentType },
  { key: 'first_aid',           label: 'Primeros auxilios',               emoji: '🩹', docType: 'cert_first_aid'           as DocumentType },
  { key: 'senior_transport',    label: 'Transporte de adultos mayores',   emoji: '👴', docType: 'cert_senior_transport'    as DocumentType },
  { key: 'pregnant_transport',  label: 'Transporte de embarazadas',       emoji: '🤰', docType: 'cert_pregnant_transport'  as DocumentType },
  { key: 'disability_transport',label: 'Transporte de discapacitados',    emoji: '🦽', docType: 'cert_disability_transport' as DocumentType },
  { key: 'visual_impairment',   label: 'Discapacidad visual',             emoji: '🦯', docType: 'cert_visual_impairment'   as DocumentType },
  { key: 'hearing_impairment',  label: 'Discapacidad auditiva',           emoji: '🦻', docType: 'cert_hearing_impairment'  as DocumentType },
  { key: 'wheelchair_vehicle',  label: 'Vehículo accesible para silla',   emoji: '🚐', docType: 'cert_wheelchair_vehicle'  as DocumentType },
  { key: 'cpr',                 label: 'Certificación RCP',               emoji: '❤️', docType: 'cert_cpr'                as DocumentType },
];

// Documentos requeridos (todos excepto accessible_cert y certificaciones)
const REQUIRED_DOCS: DocumentType[] = [
  'cedula_front',
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
  const [cedulaNumber, setCedulaNumber]        = useState('');
  const [homeAddress, setHomeAddress]         = useState('');
  const [stateCode, setStateCode]             = useState('DC');
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
  const [vehicleType, setVehicleType]         = useState<VehicleType>('sedan');

  // ── PASO 4: Seguro ──
  const [insuranceCompany, setInsuranceCompany]           = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insuranceExpiry, setInsuranceExpiry]             = useState('');

  // ── PASO 6: Certificaciones ──
  const [certExpiries, setCertExpiries] = useState<Record<string, string>>({});

  // ── PASO 7: Idiomas, equipamiento y preferencias ──
  const [languages, setLanguages]               = useState<string[]>(['spanish']);
  const [specialEquipment, setSpecialEquipment] = useState<string[]>([]);
  const [smokes, setSmokes]                     = useState(false);
  const [longDistanceAvailable, setLongDistanceAvailable] = useState(false);
  const [musicPreference, setMusicPreference]   = useState('any');
  const [musicArtist, setMusicArtist]           = useState('');

  // ── Documentos ──
  const [docs, setDocs] = useState<Record<DocumentType, DocState>>({
    cedula_front:            emptyDoc(),
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

  const selectedStateName = VE_STATES.find(s => s.code === stateCode)?.name ?? stateCode;

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
    if (data.state && VE_STATES.find(s => s.code === data.state)) {
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
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara o galería para tu foto de perfil.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true, aspect: [1, 1], quality: 0.85,
        cameraType: 'front' as any,
      });
      if (!result.canceled && result.assets[0]) setProfilePhotoUri(result.assets[0].uri);
      return;
    }
    Alert.alert('Foto de perfil', 'Elige una opción', [
      {
        text: 'Tomar selfie',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'] as any,
            allowsEditing: true, aspect: [1, 1], quality: 0.85,
            cameraType: 'front' as any,
          });
          if (!result.canceled && result.assets[0]) setProfilePhotoUri(result.assets[0].uri);
        },
      },
      {
        text: 'Elegir de galería',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'] as any,
            allowsEditing: true, aspect: [1, 1], quality: 0.85,
          });
          if (!result.canceled && result.assets[0]) setProfilePhotoUri(result.assets[0].uri);
        },
      },
      { text: 'Cancelar', style: 'cancel' },
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
        'Permiso requerido',
        useCamera
          ? 'Necesitamos acceso a la cámara para tomar la foto.'
          : 'Necesitamos acceso a la galería para subir documentos.'
      );
      return;
    }

    const pickerResult = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'] as any,
          allowsEditing: true,
          quality: 0.85,
          cameraType: docType === 'selfie'
            ? 'front' as any
            : 'back' as any,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'] as any,
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
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      Alert.alert('Error al subir', msg);
    }
  }, []);

  // ─────────────────────────────────────
  // PASO 1 → Crear cuenta
  // ─────────────────────────────────────
  const handleStep1 = async () => {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert('', 'El nombre debe tener al menos 2 caracteres'); return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('', 'Ingresa un correo válido'); return;
    }
    if (!password || password.length < 6) {
      Alert.alert('', 'La contraseña debe tener al menos 6 caracteres'); return;
    }
    if (password !== confirmPassword) {
      Alert.alert('', 'Las contraseñas no coinciden'); return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      Alert.alert('', 'El teléfono es requerido para conductores'); return;
    }
    if (!dateOfBirth.trim()) {
      Alert.alert('', 'La fecha de nacimiento es requerida'); return;
    }
    if (!cedulaNumber.trim()) {
      Alert.alert('', 'La cédula de identidad es requerida'); return;
    }
    if (!homeAddress.trim()) {
      Alert.alert('', 'La dirección de residencia es requerida'); return;
    }
    if (!profilePhotoUri) {
      Alert.alert('', 'La foto de perfil es requerida'); return;
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
        ssnLast4: cedulaNumber.trim() || undefined,
        homeAddress: homeAddress.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '📧 Verifica tu correo',
        `Enviamos un correo de verificación a ${email.trim()}. Deberás verificarlo para activar tu cuenta al terminar el registro.`,
        [{ text: 'Entendido, continuar →', onPress: () => setStep(2) }]
      );
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err instanceof Error ? err.message : 'Error al crear la cuenta';
      Alert.alert('Error', msg === 'ALREADY_REGISTERED'
        ? 'Ya existe una cuenta con este correo.'
        : msg
      );
    }
  };

  // ─────────────────────────────────────
  // PASO 2 → Guardar licencia
  // ─────────────────────────────────────
  const handleStep2 = async () => {
    if (!licenseNumber.trim()) {
      Alert.alert('', 'El número de licencia es requerido'); return;
    }
    if (!licenseExpiry.trim()) {
      Alert.alert('', 'La fecha de vencimiento de la licencia es requerida'); return;
    }
    if (!docs.cedula_front.uploaded) {
      Alert.alert('', 'Sube la foto de tu cédula de identidad'); return;
    }
    if (!docs.license_front.uploaded || !docs.license_back.uploaded) {
      Alert.alert('', 'Sube la foto del frente y dorso de tu licencia'); return;
    }
    try {
      await driverMobileService.updateProfile({
        licenseNumber: licenseNumber.trim(),
        licenseExpiry: licenseExpiry.trim(),
      });
      setStep(3);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      Alert.alert('Error (paso 2)', msg || 'Intenta de nuevo.');
    }
  };

  // ─────────────────────────────────────
  // PASO 3 → Guardar vehículo
  // ─────────────────────────────────────
  const handleStep3 = async () => {
    if (!vehiclePlate.trim()) { Alert.alert('', 'La placa del vehículo es requerida'); return; }
    if (!vehicleBrand.trim()) { Alert.alert('', 'La marca del vehículo es requerida'); return; }
    if (!vehicleModel.trim()) { Alert.alert('', 'El modelo del vehículo es requerido'); return; }
    if (!vehicleYear.trim())  { Alert.alert('', 'El año del vehículo es requerido'); return; }
    if (!vehicleColor.trim()) { Alert.alert('', 'El color del vehículo es requerido'); return; }

    const year = parseInt(vehicleYear.trim(), 10);
    if (isNaN(year) || year < 2000 || year > new Date().getFullYear() + 1) {
      Alert.alert('', 'Ingresa un año de vehículo válido (ej. 2018)'); return;
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
        services: [vehicleType],
      });
      setStep(4);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      Alert.alert('', msg || 'No se pudo guardar la información del vehículo. Intenta de nuevo.');
    }
  };

  // ─────────────────────────────────────
  // PASO 4 → Guardar seguro
  // ─────────────────────────────────────
  const handleStep4 = async () => {
    if (!insuranceCompany.trim()) {
      Alert.alert('', 'El nombre de la aseguradora es requerido'); return;
    }
    if (!insurancePolicyNumber.trim()) {
      Alert.alert('', 'El número de póliza es requerido'); return;
    }
    if (!insuranceExpiry.trim()) {
      Alert.alert('', 'La fecha de vencimiento del seguro es requerida'); return;
    }
    if (!docs.insurance.uploaded) {
      Alert.alert('', 'Sube el documento de tu póliza de seguro'); return;
    }
    try {
      await driverMobileService.updateProfile({
        insuranceCompany: insuranceCompany.trim(),
        insurancePolicyNumber: insurancePolicyNumber.trim(),
        insuranceExpiry: insuranceExpiry.trim(),
      });
      setStep(5);
    } catch {
      Alert.alert('', 'No se pudo guardar la información del seguro. Intenta de nuevo.');
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
      Alert.alert('', `Faltan ${missing.length} foto(s) del vehículo`); return;
    }
    if (!docs.selfie.uploaded) {
      Alert.alert('', 'Necesitamos tu selfie para verificar tu identidad'); return;
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
        Alert.alert('', 'No se pudieron guardar las certificaciones. Intenta de nuevo.');
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
      Alert.alert('', 'Selecciona al menos un idioma'); return;
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
      Alert.alert('', 'No se pudieron guardar las preferencias. Intenta de nuevo.');
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
          ? 'Faltan documentos requeridos. Regresa al paso anterior.'
          : 'No se pudo enviar la solicitud. Intenta de nuevo.'
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
        Alert.alert('Subir foto', 'Elige una opción', [
          { text: '📷 Tomar foto', onPress: () => pickAndUpload(docType, true) },
          { text: '📎 Elegir de galería', onPress: () => pickAndUpload(docType, false) },
          { text: 'Cancelar', style: 'cancel' },
        ]);
      } else {
        pickAndUpload(docType, useCamera);
      }
    };

    return (
      <View style={styles.docItem}>
        <View style={styles.docInfo}>
          <Text style={styles.docLabel}>{label}{optional ? ' (opcional)' : ' *'}</Text>
          {doc.uploaded && (
            <Text style={styles.docDone}>✓ Subido</Text>
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
              {doc.uploaded ? 'Cambiar' : '📷 Subir'}
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
    'Datos personales',
    'Licencia de conducir',
    'Vehículo',
    'Seguro',
    'Fotos del vehículo',
    'Certificaciones',
    'Idiomas y equipamiento',
    'Revisión y envío',
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
          accessibilityLabel="Atrás"
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Registro de conductor</Text>
          <Text style={styles.headerStep}>Paso {step} de {TOTAL_STEPS} — {stepLabels[step - 1]}</Text>
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
                Crea tu cuenta. Toda tu información es confidencial y segura.
              </Text>

              {/* ── FOTO DE PERFIL ── */}
              <View style={styles.photoSection}>
                <TouchableOpacity style={styles.photoContainer} onPress={handlePickProfilePhoto} accessibilityRole="button" accessibilityLabel="Agregar foto de perfil">
                  {profilePhotoUri ? (
                    <Image source={{ uri: profilePhotoUri }} style={styles.photoPreview} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Text style={styles.photoPlaceholderIcon}>📷</Text>
                      <Text style={styles.photoPlaceholderText}>Agregar foto *</Text>
                    </View>
                  )}
                  <View style={styles.photoEditBadge}>
                    <Text style={styles.photoEditBadgeText}>{profilePhotoUri ? '✎' : '+'}</Text>
                  </View>
                </TouchableOpacity>
                <Text style={styles.photoHint}>
                  Los pasajeros verán tu foto durante el viaje. <Text style={styles.photoRequired}>Requerida.</Text>
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Nombre completo *</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName}
                  autoCapitalize="words" placeholder="Tu nombre completo" placeholderTextColor="#aaa" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Correo electrónico *</Text>
                <TextInput style={styles.input} value={email} onChangeText={setEmail}
                  keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                  placeholder="tu@email.com" placeholderTextColor="#aaa" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Contraseña *</Text>
                <View style={styles.passwordRow}>
                  <TextInput style={[styles.input, styles.passwordInput]}
                    value={password} onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none" autoCorrect={false}
                    placeholder="Mínimo 6 caracteres" placeholderTextColor="#aaa" />
                  <TouchableOpacity style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}>
                    <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Confirmar contraseña *</Text>
                <TextInput style={styles.input} value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none" autoCorrect={false}
                  placeholder="Repite tu contraseña" placeholderTextColor="#aaa" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Teléfono *</Text>
                <TextInput style={styles.input} value={phone} onChangeText={setPhone}
                  keyboardType="phone-pad" placeholder="(0412) 123-4567" placeholderTextColor="#aaa" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Fecha de nacimiento *</Text>
                <TextInput style={styles.input} value={dateOfBirth} onChangeText={setDateOfBirth}
                  placeholder="DD/MM/AAAA" placeholderTextColor="#aaa"
                  keyboardType="numbers-and-punctuation" maxLength={10} />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Cédula de identidad *</Text>
                <TextInput style={styles.input} value={cedulaNumber} onChangeText={setCedulaNumber}
                  keyboardType="default" autoCapitalize="characters" autoCorrect={false}
                  placeholder="V-12345678 o E-12345678" placeholderTextColor="#aaa" maxLength={12} />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Dirección de residencia *</Text>
                <TextInput style={styles.input} value={homeAddress} onChangeText={setHomeAddress}
                  autoCapitalize="words" placeholder="Av. Principal, Caracas" placeholderTextColor="#aaa" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Estado *</Text>
                <TouchableOpacity style={styles.picker} onPress={() => setShowStatePicker(true)}>
                  <Text style={styles.pickerText}>{selectedStateName}</Text>
                  <Text style={styles.pickerArrow}>▼</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Código de referido (opcional)</Text>
                <TextInput style={styles.input} value={referralCode}
                  onChangeText={setReferralCode}
                  autoCapitalize="characters" autoCorrect={false}
                  placeholder="Código de referido (opcional)" placeholderTextColor="#aaa" />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isCreatingAccount && styles.buttonDisabled]}
                onPress={handleStep1} disabled={isCreatingAccount}
                accessibilityRole="button">
                {isCreatingAccount
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.primaryButtonText}>Crear cuenta y continuar →</Text>
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
                Necesitamos tu cédula de identidad y tu licencia de conducir vigente.
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>Número de licencia *</Text>
                <TextInput style={styles.input} value={licenseNumber}
                  onChangeText={setLicenseNumber}
                  autoCapitalize="characters" autoCorrect={false}
                  placeholder="Número de licencia" placeholderTextColor="#aaa" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Fecha de vencimiento *</Text>
                <TextInput style={styles.input} value={licenseExpiry}
                  onChangeText={setLicenseExpiry}
                  placeholder="MM/AAAA" placeholderTextColor="#aaa"
                  keyboardType="numbers-and-punctuation" />
              </View>

              {false && (
                <TouchableOpacity
                  style={styles.scanBtn}
                  onPress={() => setShowScanner(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Escanear código de barras"
                >
                  <Text style={styles.scanBtnText}>Escanear código de barras (dorso de la licencia)</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.subSectionTitle}>Cédula de identidad *</Text>
              <DocUploadButton docType="cedula_front" label="Foto de la cédula" bothOptions />

              <Text style={styles.subSectionTitle}>Licencia de conducir — ambos lados requeridos *</Text>
              <View style={styles.docSideRow}>
                <View style={styles.docSideCol}>
                  <DocUploadButton docType="license_front" label="Frente" bothOptions />
                </View>
                <View style={styles.docSideCol}>
                  <DocUploadButton docType="license_back" label="Dorso" bothOptions />
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
                <Text style={styles.primaryButtonText}>Continuar al vehículo →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════
              PASO 3 — VEHÍCULO
          ══════════════════════════════ */}
          {step === 3 && (
            <View>
              <Text style={styles.stepHint}>
                El vehículo debe tener menos de 15 años de antigüedad.
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>Placa del vehículo *</Text>
                <TextInput style={styles.input} value={vehiclePlate}
                  onChangeText={setVehiclePlate}
                  autoCapitalize="characters" autoCorrect={false}
                  placeholder="ABC-1234" placeholderTextColor="#aaa" />
              </View>

              <View style={styles.twoCol}>
                <View style={[styles.field, styles.colHalf]}>
                  <Text style={styles.label}>Marca *</Text>
                  <TextInput style={styles.input} value={vehicleBrand}
                    onChangeText={setVehicleBrand}
                    autoCapitalize="words" placeholder="Toyota" placeholderTextColor="#aaa" />
                </View>
                <View style={[styles.field, styles.colHalf]}>
                  <Text style={styles.label}>Modelo *</Text>
                  <TextInput style={styles.input} value={vehicleModel}
                    onChangeText={setVehicleModel}
                    autoCapitalize="words" placeholder="Corolla" placeholderTextColor="#aaa" />
                </View>
              </View>

              <View style={styles.twoCol}>
                <View style={[styles.field, styles.colHalf]}>
                  <Text style={styles.label}>Año *</Text>
                  <TextInput style={styles.input} value={vehicleYear}
                    onChangeText={setVehicleYear}
                    keyboardType="number-pad" placeholder="2020" placeholderTextColor="#aaa" />
                </View>
                <View style={[styles.field, styles.colHalf]}>
                  <Text style={styles.label}>Color *</Text>
                  <TextInput style={styles.input} value={vehicleColor}
                    onChangeText={setVehicleColor}
                    autoCapitalize="words" placeholder="Blanco" placeholderTextColor="#aaa" />
                </View>
              </View>

              <View style={styles.twoCol}>
                <View style={[styles.field, styles.colHalf]}>
                  <Text style={styles.label}>Serial (VIN)</Text>
                  <TextInput style={styles.input} value={vehicleVin}
                    onChangeText={setVehicleVin}
                    autoCapitalize="characters" autoCorrect={false}
                    placeholder="VIN (opcional)" placeholderTextColor="#aaa" maxLength={17} />
                </View>
                <View style={[styles.field, styles.colHalf]}>
                  <Text style={styles.label}>Asientos</Text>
                  <TextInput style={styles.input} value={vehicleSeats}
                    onChangeText={setVehicleSeats}
                    keyboardType="number-pad" placeholder="4" placeholderTextColor="#aaa" />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Tipo de vehículo *</Text>
                <Text style={styles.stepHint}>
                  Solo recibirás solicitudes del tipo que selecciones.
                </Text>
                <View style={styles.vehicleTypeGrid}>
                  {VEHICLE_TYPE_OPTIONS.map(opt => {
                    const selected = vehicleType === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[styles.vehicleTypeCard, selected && styles.vehicleTypeCardSelected]}
                        onPress={() => {
                          setVehicleType(opt.key);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                      >
                        <Text style={styles.vehicleTypeEmoji}>{opt.emoji}</Text>
                        <Text style={[styles.vehicleTypeLabel, selected && styles.vehicleTypeLabelSelected]}>
                          {opt.label}
                        </Text>
                        <Text style={styles.vehicleTypeDesc}>{opt.desc}</Text>
                        {selected && <Text style={styles.vehicleTypeCheck}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleStep3}
                accessibilityRole="button">
                <Text style={styles.primaryButtonText}>Continuar al seguro →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════
              PASO 4 — SEGURO
          ══════════════════════════════ */}
          {step === 4 && (
            <View>
              <Text style={styles.stepHint}>
                Proporciona los datos del seguro de tu vehículo. Se requiere seguro comercial o de transporte.
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>Aseguradora *</Text>
                <TextInput style={styles.input} value={insuranceCompany}
                  onChangeText={setInsuranceCompany}
                  autoCapitalize="words" placeholder="Mapfre, Seguros Caracas, etc." placeholderTextColor="#aaa" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Número de póliza *</Text>
                <TextInput style={styles.input} value={insurancePolicyNumber}
                  onChangeText={setInsurancePolicyNumber}
                  autoCapitalize="characters" autoCorrect={false}
                  placeholder="Número de póliza" placeholderTextColor="#aaa" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Fecha de vencimiento de la póliza *</Text>
                <TextInput style={styles.input} value={insuranceExpiry}
                  onChangeText={setInsuranceExpiry}
                  placeholder="MM/AAAA" placeholderTextColor="#aaa"
                  keyboardType="numbers-and-punctuation" />
              </View>

              <Text style={styles.subSectionTitle}>Documento del seguro</Text>
              <DocUploadButton docType="insurance" label="Póliza de seguro" />

              <TouchableOpacity style={styles.primaryButton} onPress={handleStep4}
                accessibilityRole="button">
                <Text style={styles.primaryButtonText}>Continuar a fotos del vehículo →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════
              PASO 5 — FOTOS DEL VEHÍCULO + SELFIE
          ══════════════════════════════ */}
          {step === 5 && (
            <View>
              <Text style={styles.stepHint}>
                Toma fotos claras y bien iluminadas. Todos los documentos son confidenciales.
              </Text>

              <Text style={styles.subSectionTitle}>Fotos del vehículo</Text>
              <DocUploadButton docType="vehicle_front"    label="Frente del vehículo" />
              <DocUploadButton docType="vehicle_back"     label="Parte trasera" />
              <DocUploadButton docType="vehicle_left"     label="Lado izquierdo" />
              <DocUploadButton docType="vehicle_right"    label="Lado derecho" />
              <DocUploadButton docType="vehicle_interior" label="Interior" />

              <Text style={styles.subSectionTitle}>Verificación de identidad</Text>
              <Text style={styles.selfieHint}>
                Toma una selfie clara para verificar tu identidad. Los pasajeros la verán.
              </Text>
              <DocUploadButton docType="selfie" label="Tomar selfie" useCamera />

              <DocUploadButton docType="accessible_cert"
                label="Certificado de vehículo accesible" optional />

              <TouchableOpacity style={styles.primaryButton} onPress={handleStep5}
                accessibilityRole="button">
                <Text style={styles.primaryButtonText}>Continuar a certificaciones →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════
              PASO 6 — CERTIFICACIONES
          ══════════════════════════════ */}
          {step === 6 && (
            <View>
              <Text style={styles.stepHint}>
                Selecciona las certificaciones que tienes. Sube la foto del certificado y la fecha de vencimiento.
                Todas son opcionales pero aumentan tus posibilidades de conseguir más viajes.
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
                        placeholder="Vencimiento MM/AAAA (opcional)"
                        placeholderTextColor="#aaa"
                        keyboardType="numbers-and-punctuation"
                      />
                    )}
                    <DocUploadButton
                      docType={cert.docType}
                      label="Documento del certificado"
                      optional
                    />
                  </View>
                );
              })}

              <TouchableOpacity style={styles.primaryButton} onPress={handleStep6}
                accessibilityRole="button">
                <Text style={styles.primaryButtonText}>Continuar a idiomas →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════
              PASO 7 — IDIOMAS Y EQUIPAMIENTO
          ══════════════════════════════ */}
          {step === 7 && (
            <View>
              <Text style={styles.stepHint}>
                Cuéntale a los pasajeros qué idiomas hablas, qué equipamiento tiene tu vehículo y tu disponibilidad.
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>Idiomas que hablas *</Text>
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
                <Text style={styles.label}>Equipamiento del vehículo (opcional)</Text>
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
                <Text style={styles.label}>Preferencia musical</Text>
                <Text style={styles.stepHint}>
                  Los pasajeros verán esto antes de solicitar un viaje.
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
                    placeholder="Nombre del artista favorito"
                    placeholderTextColor="#aaa"
                    autoCapitalize="words"
                  />
                )}
              </View>

              {/* Toggles de salud y disponibilidad */}
              <View style={styles.field}>
                <Text style={styles.label}>Disponibilidad y salud</Text>

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
                      <Text style={styles.toggleLabel}>Disponible para viajes largos</Text>
                      <Text style={styles.toggleDesc}>Viajes inter-ciudades o más de 80 km</Text>
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
                      <Text style={styles.toggleLabel}>Fumo</Text>
                      <Text style={styles.toggleDesc}>Los pasajeros con condiciones de salud pueden evitar fumadores</Text>
                    </View>
                  </View>
                  <View style={[styles.toggleSwitch, smokes && styles.toggleSwitchOn]}>
                    <View style={[styles.toggleThumb, smokes && styles.toggleThumbOn]} />
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleStep7}
                accessibilityRole="button">
                <Text style={styles.primaryButtonText}>Revisar y enviar →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════════════════════════════
              PASO 8 — REVISIÓN Y ENVÍO
          ══════════════════════════════ */}
          {step === 8 && (
            <View>
              <View style={styles.reviewCard}>
                <Text style={styles.reviewTitle}>✅ Listo para enviar</Text>
                <Text style={styles.reviewDesc}>
                  Revisa que toda la información sea correcta antes de enviar tu solicitud.
                </Text>

                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Datos personales</Text>
                  <ReviewRow label="Nombre"        value={name} />
                  <ReviewRow label="Correo"        value={email} />
                  <ReviewRow label="Teléfono"      value={phone} />
                  <ReviewRow label="Cédula"        value={cedulaNumber} />
                  <ReviewRow label="Fecha de nac." value={dateOfBirth} />
                  <ReviewRow label="Dirección"     value={homeAddress} />
                  <ReviewRow label="Estado"        value={stateCode} />
                </View>

                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Licencia de conducir</Text>
                  <ReviewRow label="Licencia #"   value={licenseNumber} />
                  <ReviewRow label="Vencimiento"  value={licenseExpiry} />
                </View>

                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Vehículo</Text>
                  <ReviewRow label="Placa"     value={vehiclePlate.toUpperCase()} />
                  <ReviewRow label="Vehículo"  value={`${vehicleBrand} ${vehicleModel} ${vehicleYear}`} />
                  <ReviewRow label="Color"     value={vehicleColor} />
                  {vehicleVin ? <ReviewRow label="Serial" value={vehicleVin} /> : null}
                  <ReviewRow label="Asientos"       value={vehicleSeats} />
                  <ReviewRow label="Tipo de vehículo" value={
                    VEHICLE_TYPE_OPTIONS.find(o => o.key === vehicleType)?.label ?? vehicleType
                  } />
                </View>

                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Seguro</Text>
                  <ReviewRow label="Aseguradora" value={insuranceCompany} />
                  <ReviewRow label="Póliza #"    value={insurancePolicyNumber} />
                  <ReviewRow label="Vencimiento" value={insuranceExpiry} />
                </View>

                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Idiomas</Text>
                  <ReviewRow label="Idiomas" value={languages.map(l =>
                    LANGUAGE_OPTIONS.find(o => o.key === l)?.label ?? l
                  ).join(', ')} />
                </View>

                {specialEquipment.length > 0 && (
                  <View style={styles.reviewSection}>
                    <Text style={styles.reviewSectionTitle}>Equipamiento</Text>
                    <ReviewRow label="Equipamiento" value={specialEquipment.map(e =>
                      EQUIPMENT_OPTIONS.find(o => o.key === e)?.label ?? e
                    ).join(', ')} />
                  </View>
                )}

                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Preferencias</Text>
                  <ReviewRow label="Viajes largos"  value={longDistanceAvailable ? 'Sí' : 'No'} />
                  <ReviewRow label="Fumador"        value={smokes ? 'Sí' : 'No'} />
                  <ReviewRow
                    label="Música"
                    value={musicPreference === 'custom' && musicArtist
                      ? musicArtist
                      : MUSIC_OPTIONS.find(o => o.key === musicPreference)?.label ?? musicPreference}
                  />
                </View>

                <View style={styles.reviewSection}>
                  <Text style={styles.reviewSectionTitle}>Documentos subidos</Text>
                  {REQUIRED_DOCS.map(d => (
                    <ReviewRow key={d}
                      label={d.replace(/_/g, ' ')}
                      value={docs[d].uploaded ? '✓ Subido' : '✗ Pendiente'}
                      valueColor={docs[d].uploaded ? BRAND_COLORS.ACCENT : BRAND_COLORS.ALERT}
                    />
                  ))}
                </View>

                {CERTIFICATION_OPTIONS.some(c => docs[c.docType].uploaded) && (
                  <View style={styles.reviewSection}>
                    <Text style={styles.reviewSectionTitle}>Certificaciones</Text>
                    {CERTIFICATION_OPTIONS.filter(c => docs[c.docType].uploaded).map(c => (
                      <ReviewRow key={c.key}
                        label={c.label}
                        value="✓ Subido"
                        valueColor={BRAND_COLORS.ACCENT}
                      />
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  📋 Nuestro equipo revisará tu solicitud en 24-48 horas. Recibirás una notificación una vez aprobado.
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
                  : <Text style={styles.primaryButtonText}>Enviar solicitud</Text>
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
  safe: { flex: 1, backgroundColor: '#fff', paddingTop: 24 },
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

  vehicleTypeGrid: { flexDirection: 'row', gap: 10 },
  vehicleTypeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    gap: 4,
  },
  vehicleTypeCardSelected: {
    borderColor: BRAND_COLORS.PRIMARY,
    backgroundColor: BRAND_COLORS.PRIMARY + '12',
  },
  vehicleTypeEmoji: { fontSize: 30, marginBottom: 4 },
  vehicleTypeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
    fontFamily: 'Inter_700Bold',
  },
  vehicleTypeLabelSelected: { color: BRAND_COLORS.PRIMARY },
  vehicleTypeDesc: {
    fontSize: 11,
    color: '#aaa',
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  vehicleTypeCheck: {
    fontSize: 16,
    color: BRAND_COLORS.PRIMARY,
    fontWeight: '700',
    marginTop: 4,
  },

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
