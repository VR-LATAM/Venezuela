import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics    from 'expo-haptics';
import { BRAND_COLORS } from '@vride/shared';
import { apiClient }   from '../../src/services/apiClient';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const API_BASE = `${Constants.expoConfig?.extra?.apiUrl ?? process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000'}/api/v1`;

/* ── Tipos de ángulo ── */
type PhotoAngle = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

const ANGLE_LABEL: Record<PhotoAngle, string> = {
  front:  'Frente',
  back:   'Posterior',
  left:   'Lado izquierdo',
  right:  'Lado derecho',
  top:    'Superior (arriba)',
  bottom: 'Inferior (abajo)',
};

const ANGLE_EMOJI: Record<PhotoAngle, string> = {
  front:  '⬆️',
  back:   '⬇️',
  left:   '◀️',
  right:  '▶️',
  top:    '🔼',
  bottom: '🔽',
};

const SIX_ANGLES: PhotoAngle[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];

function getAngles(_serviceType: string): PhotoAngle[] {
  return SIX_ANGLES;
}

/* ── Pasos del flujo ── */
type Phase =
  | 'pickup_photos'    // 1. Fotos por ángulo al recoger
  | 'pickup_pin'       // 2. PIN del remitente
  | 'in_transit'       // 3. En camino
  | 'delivery_photos'  // 4. Fotos por ángulo al entregar
  | 'delivery_pin'     // 5. PIN del destinatario
  | 'returning'        // 6. Regresando (destinatario ausente)
  | 'return_photos'    // 7. Fotos por ángulo al devolver
  | 'return_pin'       // 8. PIN de devolución
  | 'done';

interface Props {
  rideId:         string;
  serviceType:    string;
  senderName:     string;
  recipientName:  string;
  pickupAddress:  string;
  dropoffAddress: string;
  currentStatus:  string;
  onComplete:     () => void;
}

export default function EncomiendaCustody({
  rideId, serviceType, senderName, recipientName,
  pickupAddress, dropoffAddress, currentStatus, onComplete,
}: Props) {
  const angles   = getAngles(serviceType);
  const isCargo  = angles.length > 2;

  const [phase,        setPhase]        = useState<Phase>('pickup_photos');
  const [angleIndex,   setAngleIndex]   = useState(0);          // ángulo actual dentro de la fase de fotos
  const [takenPhotos,  setTakenPhotos]  = useState<Partial<Record<PhotoAngle, string>>>({}); // uri local por ángulo
  const [pin,          setPin]          = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  /* Determinar fase inicial según estado del viaje */
  useEffect(() => {
    if (currentStatus === 'in_progress')         setPhase('delivery_photos');
    if (currentStatus === 'returning_to_sender') setPhase('return_photos');
  }, [currentStatus]);

  /* Cuando cambia la fase de fotos, resetear ángulo y fotos tomadas */
  const startPhotoPhase = useCallback((newPhase: Phase) => {
    setPhase(newPhase);
    setAngleIndex(0);
    setTakenPhotos({});
    setError('');
  }, []);

  /* ── Tomar foto con la cámara ── */
  async function takePhoto(): Promise<string | null> {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsEditing: false,
    });
    if (result.canceled) return null;
    return result.assets[0]?.uri ?? null;
  }

  /* ── Subir una foto al backend ── */
  async function uploadPhoto(uri: string, folder: string, angle: PhotoAngle): Promise<string> {
    const token = await SecureStore.getItemAsync('access_token');
    const formData = new FormData();
    formData.append('photo', { uri, name: `${folder}_${angle}.jpg`, type: 'image/jpeg' } as any);
    formData.append('folder', folder);
    formData.append('angle', angle);
    const res = await fetch(`${API_BASE}/rides/${rideId}/custody/upload-photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token ?? ''}` },
      body: formData,
    });
    if (!res.ok) throw new Error(`Error al subir foto: ${res.status}`);
    const body = await res.json() as { url: string };
    return body.url;
  }

  /* ── Foto de un ángulo (genérico) ── */
  async function handleTakeAnglePhoto(
    apiPath: string,
    folder: string,
    onAllDone: () => void,
  ) {
    setError('');
    const angle = angles[angleIndex];
    const uri   = await takePhoto();
    if (!uri) return;

    setLoading(true);
    try {
      const url  = await uploadPhoto(uri, folder, angle);
      const resp = await apiClient.post(apiPath, { angle, photo_url: url });

      setTakenPhotos(prev => ({ ...prev, [angle]: uri }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const missing: PhotoAngle[] = resp.data?.data?.missing ?? [];
      if (missing.length === 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onAllDone();
      } else {
        const nextIdx = angleIndex + 1;
        setAngleIndex(nextIdx < angles.length ? nextIdx : angleIndex);
      }
    } catch { setError('Error al subir la foto. Intenta de nuevo.'); }
    finally  { setLoading(false); }
  }

  /* ── Flujo PICKUP ── */
  function handlePickupAnglePhoto() {
    handleTakeAnglePhoto(
      `/ride/${rideId}/custody/pickup-photo`,
      'pickup',
      () => setPhase('pickup_pin'),
    );
  }

  async function handleVerifyPickup() {
    if (pin.length !== 4) { setError('Ingresa los 4 dígitos del PIN.'); return; }
    setError(''); setLoading(true);
    try {
      await apiClient.post(`/ride/${rideId}/custody/verify-pickup`, { pin });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPin('');
      setPhase('in_transit');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'PIN incorrecto. Inténtalo de nuevo.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setLoading(false); }
  }

  /* ── Flujo DELIVERY ── */
  function handleDeliveryAnglePhoto() {
    handleTakeAnglePhoto(
      `/ride/${rideId}/custody/delivery-photo`,
      'delivery',
      () => setPhase('delivery_pin'),
    );
  }

  async function handleVerifyDelivery() {
    if (pin.length !== 4) { setError('Ingresa los 4 dígitos del PIN.'); return; }
    setError(''); setLoading(true);
    try {
      await apiClient.post(`/ride/${rideId}/custody/verify-delivery`, { pin });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPin('');
      setPhase('done');
      setTimeout(onComplete, 1500);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'PIN incorrecto. Pídele el código al destinatario.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setLoading(false); }
  }

  /* ── Destinatario no estaba ── */
  function handleNotHomePressed() {
    Alert.alert(
      '¿El destinatario no está?',
      `El paquete será devuelto a ${senderName}.\n\nSe cobrará la tarifa completa del servicio y el remitente recibirá un nuevo código de devolución.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, devolver', style: 'destructive', onPress: confirmNotHome },
      ]
    );
  }

  async function confirmNotHome() {
    setError(''); setLoading(true);
    try {
      await apiClient.post(`/ride/${rideId}/custody/recipient-not-home`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setPhase('returning');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Error. Intenta de nuevo.');
    } finally { setLoading(false); }
  }

  /* ── Flujo RETURN ── */
  function handleReturnAnglePhoto() {
    handleTakeAnglePhoto(
      `/ride/${rideId}/custody/return-photo`,
      'return',
      () => setPhase('return_pin'),
    );
  }

  async function handleVerifyReturn() {
    if (pin.length !== 4) { setError('Ingresa los 4 dígitos del nuevo código.'); return; }
    setError(''); setLoading(true);
    try {
      await apiClient.post(`/ride/${rideId}/custody/verify-return`, { pin });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPin('');
      setPhase('done');
      setTimeout(onComplete, 1500);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'PIN incorrecto. Pídele el nuevo código al remitente.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setLoading(false); }
  }

  /* ── Render helper: Checklist de ángulos ── */
  function AngleChecklist() {
    return (
      <View style={styles.checklist}>
        {angles.map((a, i) => {
          const done    = !!takenPhotos[a];
          const current = i === angleIndex;
          return (
            <View key={a} style={[styles.angleRow, current && styles.angleRowActive]}>
              <Text style={styles.angleEmoji}>{done ? '✅' : current ? '📸' : '⬜'}</Text>
              <View>
                <Text style={[styles.angleLabel, done && styles.angleDone, current && styles.angleCurrent]}>
                  {ANGLE_EMOJI[a]} {ANGLE_LABEL[a]}
                </Text>
                {current && !done && (
                  <Text style={styles.angleHint}>← Toma esta foto ahora</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  /* ── Render helper: Input PIN ── */
  function PinInput() {
    return (
      <View style={styles.pinContainer}>
        <TextInput
          style={styles.pinInput}
          value={pin}
          onChangeText={t => { setPin(t.replace(/\D/g, '').slice(0, 4)); setError(''); }}
          keyboardType="number-pad"
          maxLength={4}
          placeholder="• • • •"
          placeholderTextColor="#ccc"
          secureTextEntry
        />
      </View>
    );
  }

  /* ── RENDER PRINCIPAL ── */
  if (phase === 'pickup_photos') {
    const angle = angles[angleIndex];
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.icon}>📸</Text>
        <Text style={styles.title}>Fotos al recoger</Text>
        <Text style={styles.subtitle}>
          {isCargo
            ? `Documenta la carga desde ${angles.length} ángulos antes de recibirla de ${senderName}.`
            : `Toma ${angles.length} fotos del paquete antes de recibirlo de ${senderName}.`}
        </Text>

        <AngleChecklist />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.nextAngle}>
          Ahora: {ANGLE_EMOJI[angle]} {ANGLE_LABEL[angle]}
        </Text>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handlePickupAnglePhoto}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Tomar foto — {ANGLE_LABEL[angle]}</Text>}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (phase === 'pickup_pin') {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.icon}>🔐</Text>
        <Text style={styles.title}>Código de recogida</Text>
        <Text style={styles.subtitle}>
          ✅ Todas las fotos tomadas ({angles.length}/{angles.length}){'\n\n'}
          Pídele a {senderName} su código de 4 dígitos e ingrésalo aquí.
        </Text>
        <PinInput />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleVerifyPickup}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verificar código</Text>}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (phase === 'in_transit') {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>🚗</Text>
        <Text style={styles.title}>En camino al destino</Text>
        <Text style={styles.subtitle}>
          Entrega {isCargo ? 'la carga' : 'el paquete'} a: {recipientName}{'\n\n'}
          📍 {dropoffAddress}
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => startPhotoPhase('delivery_photos')}>
          <Text style={styles.btnText}>Llegué al destino</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'delivery_photos') {
    const angle = angles[angleIndex];
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.icon}>📸</Text>
        <Text style={styles.title}>Fotos al entregar</Text>
        <Text style={styles.subtitle}>
          Documenta {isCargo ? 'la carga' : 'el paquete'} antes de entregarlo a {recipientName}.
        </Text>

        <AngleChecklist />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.nextAngle}>
          Ahora: {ANGLE_EMOJI[angle]} {ANGLE_LABEL[angle]}
        </Text>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleDeliveryAnglePhoto}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Tomar foto — {ANGLE_LABEL[angle]}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnAlt} onPress={handleNotHomePressed} disabled={loading}>
          <Text style={styles.btnAltText}>El destinatario no estaba</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (phase === 'delivery_pin') {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.icon}>🔑</Text>
        <Text style={styles.title}>Código de entrega</Text>
        <Text style={styles.subtitle}>
          ✅ Todas las fotos tomadas ({angles.length}/{angles.length}){'\n\n'}
          Pídele a {recipientName} su código de 4 dígitos e ingrésalo aquí.
        </Text>
        <PinInput />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleVerifyDelivery}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Confirmar entrega</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnAlt} onPress={handleNotHomePressed} disabled={loading}>
          <Text style={styles.btnAltText}>El destinatario no estaba</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (phase === 'returning') {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>↩️</Text>
        <Text style={styles.title}>Regresando al remitente</Text>
        <Text style={styles.subtitle}>
          {senderName} recibió un nuevo código de devolución por notificación.{'\n\n'}
          📍 {pickupAddress}
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => startPhotoPhase('return_photos')}>
          <Text style={styles.btnText}>Llegué con el remitente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'return_photos') {
    const angle = angles[angleIndex];
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.icon}>📸</Text>
        <Text style={styles.title}>Fotos de devolución</Text>
        <Text style={styles.subtitle}>
          Documenta {isCargo ? 'la carga' : 'el paquete'} antes de devolverlo a {senderName}.
        </Text>

        <AngleChecklist />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.nextAngle}>
          Ahora: {ANGLE_EMOJI[angle]} {ANGLE_LABEL[angle]}
        </Text>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleReturnAnglePhoto}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Tomar foto — {ANGLE_LABEL[angle]}</Text>}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (phase === 'return_pin') {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.icon}>🔐</Text>
        <Text style={styles.title}>Código de devolución</Text>
        <Text style={styles.subtitle}>
          ✅ Todas las fotos tomadas ({angles.length}/{angles.length}){'\n\n'}
          Pídele a {senderName} el NUEVO código que recibió por notificación.
        </Text>
        <PinInput />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleVerifyReturn}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Confirmar devolución</Text>}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  /* phase === 'done' */
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✅</Text>
      <Text style={styles.title}>Servicio completado</Text>
      <View style={styles.doneBox}>
        <Text style={styles.doneText}>
          La cadena de custodia fue registrada exitosamente con {angles.length * 2}+ fotos y PINs verificados.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1, backgroundColor: '#fff',
    alignItems: 'center', padding: 24, paddingTop: 32,
  },
  icon:     { fontSize: 52, marginBottom: 12 },
  title:    { fontSize: 22, fontWeight: '700', color: '#1A1A1A', textAlign: 'center',
               marginBottom: 10, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22,
               marginBottom: 24, fontFamily: 'Inter_400Regular' },

  checklist: { width: '100%', marginBottom: 20, gap: 8 },
  angleRow:  {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 10, backgroundColor: '#F5F5F5',
  },
  angleRowActive: { backgroundColor: '#EDF5FF', borderWidth: 1.5, borderColor: BRAND_COLORS.PRIMARY },
  angleEmoji: { fontSize: 20, marginTop: 1 },
  angleLabel: { fontSize: 15, color: '#888', fontFamily: 'Inter_400Regular' },
  angleDone:  { color: '#1F7A4A', fontWeight: '600' },
  angleCurrent: { color: BRAND_COLORS.PRIMARY, fontWeight: '700' },
  angleHint:  { fontSize: 12, color: BRAND_COLORS.PRIMARY, marginTop: 2 },

  nextAngle: {
    fontSize: 16, fontWeight: '700', color: '#1A1A1A',
    marginBottom: 16, textAlign: 'center',
  },

  pinContainer: { marginBottom: 20, width: '100%', alignItems: 'center' },
  pinInput: {
    fontSize: 32, letterSpacing: 16, textAlign: 'center',
    width: 200, height: 64, borderWidth: 2, borderColor: BRAND_COLORS.PRIMARY,
    borderRadius: 14, color: '#1A1A1A', backgroundColor: '#F8F8F8',
  },

  error: { color: '#C0392B', fontSize: 14, textAlign: 'center', marginBottom: 12 },

  btn: {
    backgroundColor: BRAND_COLORS.PRIMARY, height: 56, borderRadius: 14,
    width: '100%', justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  btnAlt: {
    height: 50, borderRadius: 14, width: '100%', justifyContent: 'center',
    alignItems: 'center', borderWidth: 2, borderColor: '#C0392B', marginBottom: 8,
  },
  btnAltText: { color: '#C0392B', fontSize: 15, fontWeight: '600' },

  doneBox: {
    backgroundColor: '#E2F0EB', borderRadius: 14, padding: 20,
    marginTop: 16, width: '100%',
  },
  doneText: { color: '#1F7A4A', fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
