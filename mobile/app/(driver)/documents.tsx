import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Image, Linking, Alert, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { driverMobileService, DocumentType } from '../../src/services/driverService';
import { BRAND_COLORS } from '@vride/shared';
import type { Driver } from '@vride/shared';

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  motorcycle: '🏍️ Moto',
  sedan:      '🚗 Sedán',
  suv:        '🚙 SUV',
  pickup:     '🛻 Pick-Up',
  plataforma: '🚛 Plataforma',
};

const LANGUAGE_LABEL: Record<string, string> = {
  spanish: 'Español', english: 'Inglés', portuguese: 'Portugués',
  french: 'Francés', mandarin: 'Mandarín', arabic: 'Árabe', sign_language: 'Lengua de señas',
};

const EQUIPMENT_LABEL: Record<string, string> = {
  wheelchair_ramp: 'Rampa para silla', baby_seat: 'Silla de bebé',
  oxygen_support: 'Soporte de oxígeno', hearing_loop: 'Bucle auditivo',
  visual_aid: 'Apoyo visual', dashcam: 'Dashcam', usb_charger: 'Cargador USB', wifi: 'WiFi',
};

const MUSIC_LABEL: Record<string, string> = {
  off: 'Sin música', any: 'Sin preferencia', pop: 'Pop', rock: 'Rock',
  latin: 'Reguetón/Latin', jazz: 'Jazz/Blues', classical: 'Clásica',
  salsa: 'Salsa/Merengue', gospel: 'Cristiana', hiphop: 'Hip Hop/R&B',
  news: 'Noticias/Radio', custom: 'Artista favorito',
};

interface EditState {
  licenseNumber: string;
  licenseExpiry: string;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColor: string;
  insuranceCompany: string;
  insurancePolicyNumber: string;
  insuranceExpiry: string;
}

export default function DriverDocumentsScreen() {
  const [driver, setDriver]     = useState<Driver | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [edit, setEdit]         = useState<EditState>({
    licenseNumber: '', licenseExpiry: '',
    vehiclePlate: '', vehicleBrand: '', vehicleModel: '', vehicleYear: '', vehicleColor: '',
    insuranceCompany: '', insurancePolicyNumber: '', insuranceExpiry: '',
  });
  const [uploadingDoc, setUploadingDoc] = useState<DocumentType | null>(null);

  const loadProfile = async () => {
    try {
      const p = await driverMobileService.getProfile();
      setDriver(p);
      setEdit({
        licenseNumber:        p.license_number        ?? '',
        licenseExpiry:        p.license_expiry        ?? '',
        vehiclePlate:         p.vehicle_plate         ?? '',
        vehicleBrand:         p.vehicle_brand         ?? '',
        vehicleModel:         p.vehicle_model         ?? '',
        vehicleYear:          p.vehicle_year?.toString() ?? '',
        vehicleColor:         p.vehicle_color         ?? '',
        insuranceCompany:     p.insurance_company     ?? '',
        insurancePolicyNumber: p.insurance_policy_number ?? '',
        insuranceExpiry:      p.insurance_expiry      ?? '',
      });
    } catch {
      Alert.alert('Error', 'No se pudo cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadProfile(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await driverMobileService.updateProfile({
        licenseNumber:        edit.licenseNumber.trim()        || undefined,
        licenseExpiry:        edit.licenseExpiry.trim()        || undefined,
        vehiclePlate:         edit.vehiclePlate.trim().toUpperCase() || undefined,
        vehicleBrand:         edit.vehicleBrand.trim()         || undefined,
        vehicleModel:         edit.vehicleModel.trim()         || undefined,
        vehicleYear:          edit.vehicleYear ? parseInt(edit.vehicleYear, 10) : undefined,
        vehicleColor:         edit.vehicleColor.trim()         || undefined,
        insuranceCompany:     edit.insuranceCompany.trim()     || undefined,
        insurancePolicyNumber: edit.insurancePolicyNumber.trim() || undefined,
        insuranceExpiry:      edit.insuranceExpiry.trim()      || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditMode(false);
      void loadProfile();
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const pickAndUpload = useCallback(async (docType: DocumentType) => {
    Alert.alert('Subir foto', 'Elige una opción', [
      {
        text: '📷 Tomar foto',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { Alert.alert('', 'Se necesita acceso a la cámara'); return; }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'] as any,
            allowsEditing: false,
            quality: 0.85,
            cameraType: docType === 'selfie' ? ('front' as any) : ('back' as any),
          });
          if (result.canceled || !result.assets[0]) return;
          await doUpload(docType, result.assets[0].uri, result.assets[0].mimeType ?? 'image/jpeg');
        },
      },
      {
        text: '📎 Elegir de galería',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) { Alert.alert('', 'Se necesita acceso a la galería'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'] as any,
            allowsEditing: false,
            quality: 0.85,
          });
          if (result.canceled || !result.assets[0]) return;
          await doUpload(docType, result.assets[0].uri, result.assets[0].mimeType ?? 'image/jpeg');
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, []);

  const doUpload = async (docType: DocumentType, uri: string, mimeType: string) => {
    setUploadingDoc(docType);
    try {
      await driverMobileService.uploadDocument(docType, uri, mimeType);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('', 'Documento actualizado correctamente');
      void loadProfile();
    } catch (err: any) {
      Alert.alert('Error al subir', err?.message ?? 'Intenta de nuevo');
    } finally {
      setUploadingDoc(null);
    }
  };

  const openUrl = (url?: string | null) => {
    if (!url) { Alert.alert('', 'Documento no disponible'); return; }
    Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir'));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header onBack={() => router.back()} editMode={false} saving={false} onEdit={() => {}} onSave={() => {}} />
        <View style={styles.center}><ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} /></View>
      </SafeAreaView>
    );
  }

  if (!driver) return null;

  const vehicleLabel = (driver.services ?? [])
    .map(s => VEHICLE_TYPE_LABEL[s] ?? s).join(', ') || '— Sin configurar';

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        onBack={() => router.back()}
        editMode={editMode}
        saving={saving}
        onEdit={() => setEditMode(true)}
        onSave={handleSave}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── IDENTIDAD ── */}
        <SectionHeader title="Identidad" emoji="🪪" />
        <InfoRow label="Nombre"        value={driver.name} />
        <InfoRow label="Correo"        value={driver.email} />
        <InfoRow label="Teléfono"      value={driver.phone ?? '—'} />
        <InfoRow label="Cédula"        value={(driver as any).ssn_last4 ?? '—'} />
        <InfoRow label="Fecha de nac." value={(driver as any).date_of_birth ?? '—'} />
        <InfoRow label="Dirección"     value={(driver as any).home_address ?? '—'} />
        <InfoRow label="Estado"        value={driver.state_code ?? '—'} />

        {/* ── LICENCIA ── */}
        <SectionHeader title="Licencia de conducir" emoji="📋" />
        <EditableRow label="Número"      value={edit.licenseNumber}  field="licenseNumber"  editMode={editMode} onChange={v => setEdit(p => ({...p, licenseNumber: v}))}   placeholder="Nro. de licencia" />
        <EditableRow label="Vencimiento" value={edit.licenseExpiry}  field="licenseExpiry"  editMode={editMode} onChange={v => setEdit(p => ({...p, licenseExpiry: v}))}   placeholder="MM/AAAA" keyboard="numbers-and-punctuation" />
        <DocRow label="Frente"  url={driver.license_front_url} docType="license_front" uploading={uploadingDoc === 'license_front'} onView={() => openUrl(driver.license_front_url)} onUpload={() => pickAndUpload('license_front')} />
        <DocRow label="Dorso"   url={driver.license_back_url}  docType="license_back"  uploading={uploadingDoc === 'license_back'}  onView={() => openUrl(driver.license_back_url)}  onUpload={() => pickAndUpload('license_back')} />

        {/* ── VEHÍCULO ── */}
        <SectionHeader title="Vehículo" emoji="🚗" />
        <InfoRow label="Tipo" value={vehicleLabel} />
        <EditableRow label="Placa"   value={edit.vehiclePlate}  field="vehiclePlate"  editMode={editMode} onChange={v => setEdit(p => ({...p, vehiclePlate: v.toUpperCase()}))} placeholder="ABC-1234" autoCapitalize="characters" />
        <EditableRow label="Marca"   value={edit.vehicleBrand}  field="vehicleBrand"  editMode={editMode} onChange={v => setEdit(p => ({...p, vehicleBrand: v}))}  placeholder="Toyota" />
        <EditableRow label="Modelo"  value={edit.vehicleModel}  field="vehicleModel"  editMode={editMode} onChange={v => setEdit(p => ({...p, vehicleModel: v}))}  placeholder="Corolla" />
        <EditableRow label="Año"     value={edit.vehicleYear}   field="vehicleYear"   editMode={editMode} onChange={v => setEdit(p => ({...p, vehicleYear: v}))}   placeholder="2020" keyboard="number-pad" />
        <EditableRow label="Color"   value={edit.vehicleColor}  field="vehicleColor"  editMode={editMode} onChange={v => setEdit(p => ({...p, vehicleColor: v}))}  placeholder="Blanco" />
        {driver.vehicle_vin   && <InfoRow label="VIN"      value={driver.vehicle_vin} />}
        {driver.vehicle_seats && <InfoRow label="Asientos" value={driver.vehicle_seats.toString()} />}
        <DocRow label="Frente"    url={driver.vehicle_photo_front_url}  docType="vehicle_front"    uploading={uploadingDoc === 'vehicle_front'}    onView={() => openUrl(driver.vehicle_photo_front_url)}  onUpload={() => pickAndUpload('vehicle_front')} />
        <DocRow label="Trasera"   url={driver.vehicle_photo_back_url}   docType="vehicle_back"     uploading={uploadingDoc === 'vehicle_back'}     onView={() => openUrl(driver.vehicle_photo_back_url)}   onUpload={() => pickAndUpload('vehicle_back')} />
        <DocRow label="Izquierda" url={driver.vehicle_photo_left_url}   docType="vehicle_left"     uploading={uploadingDoc === 'vehicle_left'}     onView={() => openUrl(driver.vehicle_photo_left_url)}   onUpload={() => pickAndUpload('vehicle_left')} />
        <DocRow label="Derecha"   url={driver.vehicle_photo_right_url}  docType="vehicle_right"    uploading={uploadingDoc === 'vehicle_right'}    onView={() => openUrl(driver.vehicle_photo_right_url)}  onUpload={() => pickAndUpload('vehicle_right')} />
        <DocRow label="Interior"  url={driver.vehicle_interior_url}     docType="vehicle_interior" uploading={uploadingDoc === 'vehicle_interior'} onView={() => openUrl(driver.vehicle_interior_url)}     onUpload={() => pickAndUpload('vehicle_interior')} />

        {/* ── SEGURO ── */}
        <SectionHeader title="Seguro" emoji="🛡️" />
        <EditableRow label="Aseguradora" value={edit.insuranceCompany}      field="insuranceCompany"      editMode={editMode} onChange={v => setEdit(p => ({...p, insuranceCompany: v}))}      placeholder="Mapfre, Seguros Caracas…" />
        <EditableRow label="Póliza #"    value={edit.insurancePolicyNumber} field="insurancePolicyNumber" editMode={editMode} onChange={v => setEdit(p => ({...p, insurancePolicyNumber: v}))} placeholder="Nro. de póliza" />
        <EditableRow label="Vencimiento" value={edit.insuranceExpiry}       field="insuranceExpiry"       editMode={editMode} onChange={v => setEdit(p => ({...p, insuranceExpiry: v}))}       placeholder="MM/AAAA" keyboard="numbers-and-punctuation" />
        <DocRow label="Documento" url={driver.insurance_doc_url} docType="insurance" uploading={uploadingDoc === 'insurance'} onView={() => openUrl(driver.insurance_doc_url)} onUpload={() => pickAndUpload('insurance')} />

        {/* ── CÉDULA ── */}
        <SectionHeader title="Cédula de identidad" emoji="🪪" />
        <DocRow label="Frente de cédula" url={(driver as any).cedula_front_url} docType={'cedula_front' as DocumentType} uploading={uploadingDoc === ('cedula_front' as DocumentType)} onView={() => openUrl((driver as any).cedula_front_url)} onUpload={() => pickAndUpload('cedula_front' as DocumentType)} />

        {/* ── SELFIE ── */}
        <SectionHeader title="Foto de verificación" emoji="🤳" />
        <DocRow label="Selfie" url={driver.photo_url} docType="selfie" uploading={uploadingDoc === 'selfie'} onView={() => openUrl(driver.photo_url)} onUpload={() => pickAndUpload('selfie')} />

        {/* ── CERTIFICACIONES ── */}
        {driver.certifications && Object.keys(driver.certifications).length > 0 && (
          <>
            <SectionHeader title="Certificaciones" emoji="🏅" />
            {Object.entries(driver.certifications).map(([key, val]: [string, any]) => (
              <InfoRow key={key} label={key.replace(/_/g, ' ')}
                value={val?.verified ? '✓ Verificado' : 'Pendiente revisión'}
                valueColor={val?.verified ? BRAND_COLORS.ACCENT : '#F59E0B'} />
            ))}
          </>
        )}

        {/* ── PREFERENCIAS ── */}
        <SectionHeader title="Preferencias" emoji="⚙️" />
        {(driver.languages ?? []).length > 0 && (
          <InfoRow label="Idiomas" value={(driver.languages ?? []).map(l => LANGUAGE_LABEL[l] ?? l).join(', ')} />
        )}
        {(driver.special_equipment ?? []).length > 0 && (
          <InfoRow label="Equipamiento" value={(driver.special_equipment ?? []).map(e => EQUIPMENT_LABEL[e] ?? e).join(', ')} />
        )}
        <InfoRow label="Música" value={
          driver.music_preference === 'custom' && driver.music_artist
            ? driver.music_artist
            : MUSIC_LABEL[driver.music_preference] ?? driver.music_preference ?? '—'
        } />
        <InfoRow label="Viajes largos" value={driver.long_distance_available ? 'Sí' : 'No'} />
        <InfoRow label="Fumador"       value={driver.smokes ? 'Sí' : 'No'} />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Componentes helper ───────────────────────────────────────────

function Header({ onBack, editMode, saving, onEdit, onSave }: {
  onBack: () => void; editMode: boolean; saving: boolean; onEdit: () => void; onSave: () => void;
}) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Mis documentos</Text>
      {editMode ? (
        <TouchableOpacity onPress={onSave} style={styles.editBtn} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color={BRAND_COLORS.PRIMARY} />
            : <Text style={styles.editBtnText}>Guardar</Text>
          }
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
          <Text style={styles.editBtnText}>Editar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function SectionHeader({ title, emoji }: { title: string; emoji: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionEmoji}>{emoji}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : {}]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function EditableRow({ label, value, editMode, onChange, placeholder, keyboard, autoCapitalize }: {
  label: string; value: string; field: string; editMode: boolean;
  onChange: (v: string) => void; placeholder?: string;
  keyboard?: 'default' | 'number-pad' | 'numbers-and-punctuation';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  if (!editMode) {
    return <InfoRow label={label} value={value || '—'} />;
  }
  return (
    <View style={styles.editRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TextInput
        style={styles.editInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#aaa"
        keyboardType={keyboard ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'words'}
      />
    </View>
  );
}

function DocRow({ label, url, uploading, onView, onUpload }: {
  label: string; url?: string | null; docType: DocumentType;
  uploading: boolean; onView: () => void; onUpload: () => void;
}) {
  const uploaded = !!url;
  return (
    <View style={styles.docRow}>
      <View style={styles.docInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.docStatus, { color: uploaded ? BRAND_COLORS.ACCENT : '#ccc' }]}>
          {uploaded ? '✓ Subido' : 'No subido'}
        </Text>
      </View>
      {uploaded && (
        <TouchableOpacity onPress={onView}>
          <Image source={{ uri: url! }} style={styles.docThumb} />
        </TouchableOpacity>
      )}
      <TouchableOpacity style={[styles.uploadBtn, uploading && styles.uploadBtnLoading]} onPress={onUpload} disabled={uploading}>
        {uploading
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={styles.uploadBtnText}>{uploaded ? 'Cambiar' : '📷 Subir'}</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff', paddingTop: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  backText: { fontSize: 24, color: BRAND_COLORS.PRIMARY },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: BRAND_COLORS.PRIMARY + '15', minWidth: 60, alignItems: 'center' },
  editBtnText: { fontSize: 14, color: BRAND_COLORS.PRIMARY, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 24, marginBottom: 8, paddingBottom: 6,
    borderBottomWidth: 2, borderBottomColor: BRAND_COLORS.PRIMARY + '30',
  },
  sectionEmoji: { fontSize: 18 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: BRAND_COLORS.PRIMARY, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: 'Inter_700Bold' },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 12 },
  rowLabel: { fontSize: 14, color: '#888', fontFamily: 'Inter_400Regular', flex: 1 },
  rowValue: { fontSize: 14, color: BRAND_COLORS.TEXT, fontWeight: '500', fontFamily: 'Inter_500Medium', flex: 2, textAlign: 'right' },

  editRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 12 },
  editInput: { flex: 2, height: 38, borderWidth: 1.5, borderColor: BRAND_COLORS.PRIMARY + '60', borderRadius: 8, paddingHorizontal: 10, fontSize: 14, color: BRAND_COLORS.TEXT, backgroundColor: '#FAFAFA', fontFamily: 'Inter_400Regular' },

  docRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 10 },
  docInfo: { flex: 1 },
  docStatus: { fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' },
  docThumb: { width: 48, height: 48, borderRadius: 6, backgroundColor: '#f0f0f0' },
  uploadBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: BRAND_COLORS.PRIMARY, minWidth: 70, alignItems: 'center' },
  uploadBtnLoading: { backgroundColor: '#ccc' },
  uploadBtnText: { color: '#fff', fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
});
