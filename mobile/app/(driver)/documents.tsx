import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Image, Linking, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { driverMobileService } from '../../src/services/driverService';
import { BRAND_COLORS } from '@vride/shared';
import type { Driver } from '@vride/shared';

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  motorcycle: 'Moto',
  sedan:      'Sedán',
  suv:        'SUV',
  scheduled:  'Programado',
  hourly:     'Por hora',
};

const LANGUAGE_LABEL: Record<string, string> = {
  spanish:      'Español',
  english:      'Inglés',
  portuguese:   'Portugués',
  french:       'Francés',
  mandarin:     'Mandarín',
  arabic:       'Árabe',
  sign_language:'Lengua de señas',
};

const EQUIPMENT_LABEL: Record<string, string> = {
  wheelchair_ramp: 'Rampa para silla',
  baby_seat:       'Silla de bebé',
  oxygen_support:  'Soporte de oxígeno',
  hearing_loop:    'Bucle auditivo',
  visual_aid:      'Apoyo visual',
  dashcam:         'Dashcam instalada',
  usb_charger:     'Cargador USB',
  wifi:            'WiFi en vehículo',
};

const MUSIC_LABEL: Record<string, string> = {
  off:       'Sin música',
  any:       'Sin preferencia',
  pop:       'Pop',
  rock:      'Rock',
  latin:     'Reguetón/Latin',
  jazz:      'Jazz/Blues',
  classical: 'Clásica',
  salsa:     'Salsa/Merengue',
  gospel:    'Cristiana',
  hiphop:    'Hip Hop/R&B',
  news:      'Noticias/Radio',
  custom:    'Artista favorito',
};

export default function DriverDocumentsScreen() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    driverMobileService.getProfile()
      .then(setDriver)
      .catch(() => Alert.alert('Error', 'No se pudo cargar el perfil'))
      .finally(() => setLoading(false));
  }, []);

  const openUrl = (url?: string | null) => {
    if (!url) { Alert.alert('', 'Documento no disponible'); return; }
    Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir el documento'));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mis documentos</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  if (!driver) return null;

  const vehicleLabel = (driver.services ?? [])
    .map(s => VEHICLE_TYPE_LABEL[s] ?? s)
    .join(', ') || '—';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis documentos</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── IDENTIDAD ── */}
        <SectionHeader title="Identidad" emoji="🪪" />
        <InfoRow label="Nombre"            value={driver.name} />
        <InfoRow label="Correo"            value={driver.email} />
        <InfoRow label="Teléfono"          value={driver.phone ?? '—'} />
        <InfoRow label="Cédula"            value={(driver as any).ssn_last4 ?? '—'} />
        <InfoRow label="Fecha de nac."     value={(driver as any).date_of_birth ?? '—'} />
        <InfoRow label="Dirección"         value={(driver as any).home_address ?? '—'} />
        <InfoRow label="Estado"            value={driver.state_code ?? '—'} />

        {/* ── LICENCIA ── */}
        <SectionHeader title="Licencia de conducir" emoji="🪪" />
        <InfoRow label="Número"      value={driver.license_number ?? '—'} />
        <InfoRow label="Vencimiento" value={driver.license_expiry ?? '—'} />
        <DocRow  label="Frente"      url={driver.license_front_url} onPress={() => openUrl(driver.license_front_url)} />
        <DocRow  label="Dorso"       url={driver.license_back_url}  onPress={() => openUrl(driver.license_back_url)} />

        {/* ── VEHÍCULO ── */}
        <SectionHeader title="Vehículo" emoji="🚗" />
        <InfoRow label="Tipo"     value={vehicleLabel} />
        <InfoRow label="Placa"    value={driver.vehicle_plate ?? '—'} />
        <InfoRow label="Marca"    value={driver.vehicle_brand ?? '—'} />
        <InfoRow label="Modelo"   value={driver.vehicle_model ?? '—'} />
        <InfoRow label="Año"      value={driver.vehicle_year?.toString() ?? '—'} />
        <InfoRow label="Color"    value={driver.vehicle_color ?? '—'} />
        {driver.vehicle_vin   && <InfoRow label="VIN"     value={driver.vehicle_vin} />}
        {driver.vehicle_seats && <InfoRow label="Asientos" value={driver.vehicle_seats.toString()} />}
        <DocRow label="Frente"   url={driver.vehicle_photo_front_url}  onPress={() => openUrl(driver.vehicle_photo_front_url)} />
        <DocRow label="Trasera"  url={driver.vehicle_photo_back_url}   onPress={() => openUrl(driver.vehicle_photo_back_url)} />
        <DocRow label="Izquierda" url={driver.vehicle_photo_left_url}  onPress={() => openUrl(driver.vehicle_photo_left_url)} />
        <DocRow label="Derecha"  url={driver.vehicle_photo_right_url}  onPress={() => openUrl(driver.vehicle_photo_right_url)} />
        <DocRow label="Interior" url={driver.vehicle_interior_url}     onPress={() => openUrl(driver.vehicle_interior_url)} />

        {/* ── SEGURO ── */}
        <SectionHeader title="Seguro" emoji="🛡️" />
        <InfoRow label="Aseguradora" value={driver.insurance_company ?? '—'} />
        <InfoRow label="Póliza #"    value={driver.insurance_policy_number ?? '—'} />
        <InfoRow label="Vencimiento" value={driver.insurance_expiry ?? '—'} />
        <DocRow  label="Documento"   url={driver.insurance_doc_url} onPress={() => openUrl(driver.insurance_doc_url)} />

        {/* ── CERTIFICACIONES ── */}
        {driver.certifications && Object.keys(driver.certifications).length > 0 && (
          <>
            <SectionHeader title="Certificaciones" emoji="🏅" />
            {Object.entries(driver.certifications).map(([key, val]: [string, any]) => (
              <InfoRow
                key={key}
                label={key.replace(/_/g, ' ')}
                value={val?.verified ? '✓ Verificado' : 'Pendiente revisión'}
                valueColor={val?.verified ? BRAND_COLORS.ACCENT : '#F59E0B'}
              />
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
        <InfoRow label="Música"        value={
          driver.music_preference === 'custom' && driver.music_artist
            ? driver.music_artist
            : MUSIC_LABEL[driver.music_preference] ?? driver.music_preference ?? '—'
        } />
        <InfoRow label="Viajes largos" value={driver.long_distance_available ? 'Sí' : 'No'} />
        <InfoRow label="Fumador"       value={driver.smokes ? 'Sí' : 'No'} />

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
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
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : {}]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function DocRow({ label, url, onPress }: { label: string; url?: string | null; onPress: () => void }) {
  const uploaded = !!url;
  return (
    <TouchableOpacity style={styles.docRow} onPress={onPress} disabled={!uploaded}>
      <View style={styles.docInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.docStatus, { color: uploaded ? BRAND_COLORS.ACCENT : '#ccc' }]}>
          {uploaded ? '✓ Subido — toca para ver' : 'No subido'}
        </Text>
      </View>
      {uploaded && (
        <Image source={{ uri: url! }} style={styles.docThumb} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff', paddingTop: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  backText: { fontSize: 24, color: BRAND_COLORS.PRIMARY },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_700Bold',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: BRAND_COLORS.PRIMARY + '30',
  },
  sectionEmoji: { fontSize: 18 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND_COLORS.PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: 'Inter_700Bold',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 12,
  },
  rowLabel: {
    fontSize: 14,
    color: '#888',
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  rowValue: {
    fontSize: 14,
    color: BRAND_COLORS.TEXT,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
    flex: 2,
    textAlign: 'right',
  },

  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 12,
  },
  docInfo: { flex: 1 },
  docStatus: { fontSize: 12, marginTop: 2, fontFamily: 'Inter_400Regular' },
  docThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
});
