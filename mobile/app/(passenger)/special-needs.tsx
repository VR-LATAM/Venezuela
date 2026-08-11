// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Pantalla: Perfil de necesidades especiales del pasajero
// Accesible desde el home del pasajero
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, ScrollView, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { passengerMobileService } from '../../src/services/passengerService';
import { PassengerSpecialNeeds, SpecialNeedsCategory } from '@vride/shared';
import { BRAND_COLORS } from '@vride/shared';

// ─────────────────────────────────────
// Opciones de categoría
// ─────────────────────────────────────
const CATEGORIES: { key: SpecialNeedsCategory; label: string; emoji: string; desc: string }[] = [
  { key: 'none',              label: 'Sin necesidades especiales', emoji: '✅', desc: 'Pasajero estándar' },
  { key: 'pregnant',          label: 'Mujer embarazada',           emoji: '🤰', desc: 'Necesita cuidado y comodidad extra' },
  { key: 'wheelchair',        label: 'Usuario de silla de ruedas', emoji: '♿', desc: 'Requiere vehículo accesible para silla de ruedas' },
  { key: 'visual_impairment', label: 'Discapacidad visual',        emoji: '👁️', desc: 'Ciego o baja visión' },
  { key: 'hearing_impairment',label: 'Discapacidad auditiva',      emoji: '🦻', desc: 'Sordo o hipoacúsico' },
  { key: 'elderly',           label: 'Adulto mayor',               emoji: '👴', desc: 'Pasajero de la tercera edad' },
  { key: 'minor',             label: 'Menor de edad',              emoji: '🧒', desc: 'Pasajero menor de 18 años' },
  { key: 'medical',           label: 'Paciente médico',            emoji: '🏥', desc: 'Condición médica o equipo especial' },
];

const COMM_METHODS: { key: string; label: string }[] = [
  { key: 'verbal',        label: 'Comunicación verbal' },
  { key: 'text',          label: 'Texto / mensajes escritos' },
  { key: 'sign_language', label: 'Lenguaje de señas' },
  { key: 'lip_reading',   label: 'Lectura de labios' },
];

export default function SpecialNeedsScreen() {
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [categories, setCategories] = useState<SpecialNeedsCategory[]>(['none']);

  // Mobility
  const [needsPhysicalHelp,      setNeedsPhysicalHelp]      = useState(false);
  const [usesWheelchair,         setUsesWheelchair]          = useState(false);
  const [usesWalker,             setUsesWalker]              = useState(false);
  const [usesCane,               setUsesCane]                = useState(false);
  const [needsRamp,              setNeedsRamp]               = useState(false);
  const [travelingWithCompanion, setTravelingWithCompanion]  = useState(false);

  // Visual / hearing
  const [guideDog,              setGuideDog]              = useState(false);
  const [commMethod,            setCommMethod]            = useState('verbal');

  // Medical
  const [carriesMedEquipment,   setCarriesMedEquipment]   = useState(false);
  const [medEquipmentDetails,   setMedEquipmentDetails]   = useState('');

  // Minor
  const [needsBabySeat,         setNeedsBabySeat]         = useState(false);
  const [canTravelAlone,        setCanTravelAlone]        = useState(true);

  // Emergency & instructions
  const [emergencyName,         setEmergencyName]         = useState('');
  const [emergencyPhone,        setEmergencyPhone]        = useState('');
  const [specialInstructions,   setSpecialInstructions]   = useState('');

  // Cargar perfil actual
  useEffect(() => {
    passengerMobileService.getProfile()
      .then(profile => {
        const sn = profile.special_needs ?? {};
        const saved = sn.categories as SpecialNeedsCategory[] | undefined;
        setCategories(saved?.length ? saved : [(sn.category as SpecialNeedsCategory) ?? 'none']);
        setNeedsPhysicalHelp(sn.needs_physical_help ?? false);
        setUsesWheelchair(sn.uses_wheelchair ?? false);
        setUsesWalker(sn.uses_walker ?? false);
        setUsesCane(sn.uses_cane ?? false);
        setNeedsRamp(sn.needs_ramp ?? false);
        setTravelingWithCompanion(sn.traveling_with_companion ?? false);
        setGuideDog(sn.guide_dog ?? false);
        setCommMethod(sn.communication_method ?? 'verbal');
        setCarriesMedEquipment(sn.carries_medical_equipment ?? false);
        setMedEquipmentDetails(sn.medical_equipment_details ?? '');
        setNeedsBabySeat(sn.needs_baby_seat ?? false);
        setCanTravelAlone(sn.can_travel_alone ?? true);
        setEmergencyName(sn.emergency_contact_name ?? '');
        setEmergencyPhone(sn.emergency_contact_phone ?? '');
        setSpecialInstructions(sn.special_instructions ?? '');
      })
      .catch(() => {/* perfil nuevo, valores por defecto */})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const primary = categories.find(c => c !== 'none') ?? 'none';
      const payload: Partial<PassengerSpecialNeeds> = {
        category:   primary,
        categories,
        needs_physical_help:      needsPhysicalHelp,
        uses_wheelchair:          usesWheelchair,
        uses_walker:              usesWalker,
        uses_cane:                usesCane,
        needs_ramp:               needsRamp,
        traveling_with_companion: travelingWithCompanion,
        guide_dog:                guideDog,
        communication_method:     commMethod as PassengerSpecialNeeds['communication_method'],
        carries_medical_equipment: carriesMedEquipment,
        medical_equipment_details: medEquipmentDetails.trim() || undefined,
        needs_baby_seat:          needsBabySeat,
        can_travel_alone:         canTravelAlone,
        emergency_contact_name:   emergencyName.trim() || undefined,
        emergency_contact_phone:  emergencyPhone.trim() || undefined,
        special_instructions:     specialInstructions.trim() || undefined,
      };

      await passengerMobileService.updateSpecialNeeds(payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Guardado', 'Tu perfil ha sido actualizado correctamente.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'No se pudo guardar tu perfil. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const has = (cat: SpecialNeedsCategory) => categories.includes(cat);
  const toggleCategory = (cat: SpecialNeedsCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (cat === 'none') { setCategories(['none']); return; }
    setCategories(prev => {
      const without = prev.filter(c => c !== 'none');
      return without.includes(cat) ? (without.filter(c => c !== cat) || ['none']) : [...without, cat];
    });
  };

  // Mostrar secciones adicionales según las categorías seleccionadas
  const showMobility   = (['wheelchair', 'elderly', 'pregnant', 'medical'] as SpecialNeedsCategory[]).some(has);
  const showVisual     = has('visual_impairment');
  const showHearing    = has('hearing_impairment');
  const showMedical    = has('medical');
  const showMinor      = has('minor');
  const showCommMethod = has('visual_impairment') || has('hearing_impairment');

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Perfil de necesidades especiales</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.hint}>
          Esta información ayuda a los conductores a prepararse para tu viaje y brindarte un mejor servicio.
          Es confidencial y solo se comparte con tu conductor asignado.
        </Text>

        {/* Categorías — selección múltiple */}
        <Text style={styles.sectionTitle}>Selecciona todo lo que aplique</Text>
        {CATEGORIES.map(cat => {
          const selected = has(cat.key);
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.catCard, selected && styles.catCardSelected]}
              onPress={() => toggleCategory(cat.key)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
            >
              <Text style={styles.catEmoji}>{cat.emoji}</Text>
              <View style={styles.catInfo}>
                <Text style={[styles.catLabel, selected && styles.catLabelSelected]}>
                  {cat.label}
                </Text>
                <Text style={styles.catDesc}>{cat.desc}</Text>
              </View>
              <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                {selected && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Movilidad */}
        {showMobility && (
          <>
            <Text style={styles.sectionTitle}>Asistencia de movilidad</Text>
            <ToggleRow label="Necesito ayuda para subir/bajar del vehículo"
              value={needsPhysicalHelp} onChange={setNeedsPhysicalHelp} />
            <ToggleRow label="Uso silla de ruedas"
              value={usesWheelchair} onChange={v => { setUsesWheelchair(v); if (v) setNeedsRamp(true); }} />
            <ToggleRow label="Uso andador/rollator"
              value={usesWalker} onChange={setUsesWalker} />
            <ToggleRow label="Uso bastón"
              value={usesCane} onChange={setUsesCane} />
            <ToggleRow label="Necesito rampa para silla de ruedas"
              value={needsRamp} onChange={setNeedsRamp} />
            <ToggleRow label="Viajaré con un acompañante"
              value={travelingWithCompanion} onChange={setTravelingWithCompanion} />
          </>
        )}

        {/* Visual */}
        {showVisual && (
          <>
            <Text style={styles.sectionTitle}>Discapacidad visual</Text>
            <ToggleRow label="Viajo con un perro guía"
              value={guideDog} onChange={setGuideDog} />
            <ToggleRow label="Necesito que el conductor me guíe al/del vehículo"
              value={needsPhysicalHelp} onChange={setNeedsPhysicalHelp} />
          </>
        )}

        {/* Hearing */}
        {showHearing && (
          <>
            <Text style={styles.sectionTitle}>Discapacidad auditiva</Text>
          </>
        )}

        {/* Método de comunicación */}
        {showCommMethod && (
          <>
            <Text style={styles.sectionTitle}>Método de comunicación preferido</Text>
            {COMM_METHODS.map(m => {
              const sel = commMethod === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.commOption, sel && styles.commOptionSelected]}
                  onPress={() => { setCommMethod(m.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[styles.commLabel, sel && styles.commLabelSelected]}>{m.label}</Text>
                  {sel && <Text style={styles.catCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Médico */}
        {showMedical && (
          <>
            <Text style={styles.sectionTitle}>Equipo médico</Text>
            <ToggleRow label="Llevo equipo médico (tanque de oxígeno, suero, etc.)"
              value={carriesMedEquipment} onChange={setCarriesMedEquipment} />
            {carriesMedEquipment && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Describe el equipo</Text>
                <TextInput
                  style={styles.input}
                  value={medEquipmentDetails}
                  onChangeText={setMedEquipmentDetails}
                  placeholder="Ej. tanque de oxígeno portátil"
                  placeholderTextColor="#aaa"
                  maxLength={200}
                />
              </View>
            )}
          </>
        )}

        {/* Menor */}
        {showMinor && (
          <>
            <Text style={styles.sectionTitle}>Pasajero menor de edad</Text>
            <ToggleRow label="Necesita silla de bebé / asiento elevador"
              value={needsBabySeat} onChange={setNeedsBabySeat} />
            <ToggleRow label="Puede viajar sin acompañante adulto"
              value={canTravelAlone} onChange={setCanTravelAlone} />
          </>
        )}

        {/* Elderly - can travel alone */}
        {has('elderly') && (
          <>
            <Text style={styles.sectionTitle}>Independencia</Text>
            <ToggleRow label="Puede viajar sin acompañante"
              value={canTravelAlone} onChange={setCanTravelAlone} />
          </>
        )}

        {/* Contacto de emergencia */}
        {!has('none') && categories.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Contacto de emergencia</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nombre del contacto</Text>
              <TextInput style={styles.input} value={emergencyName}
                onChangeText={setEmergencyName}
                autoCapitalize="words" placeholder="Nombre completo" placeholderTextColor="#aaa" />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Teléfono del contacto</Text>
              <TextInput style={styles.input} value={emergencyPhone}
                onChangeText={setEmergencyPhone}
                keyboardType="phone-pad" placeholder="(0412) 123-4567" placeholderTextColor="#aaa" />
            </View>
          </>
        )}

        {/* Instrucciones especiales */}
        <Text style={styles.sectionTitle}>Instrucciones especiales para el conductor</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={specialInstructions}
          onChangeText={setSpecialInstructions}
          placeholder="Cualquier información adicional que el conductor deba saber..."
          placeholderTextColor="#aaa"
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>Guardar perfil</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────
// Componente Toggle reutilizable
// ─────────────────────────────────────
function ToggleRow({ label, value, onChange }: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={v => { onChange(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        trackColor={{ false: '#E0E0E0', true: BRAND_COLORS.PRIMARY }}
        thumbColor="#fff"
      />
    </View>
  );
}

// ─────────────────────────────────────
// Estilos
// ─────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff', paddingTop: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: { width: 44, justifyContent: 'center' },
  backText: { fontSize: 24, color: BRAND_COLORS.PRIMARY },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_700Bold',
  },
  scroll: { padding: 20, paddingBottom: 48 },
  hint: {
    fontSize: 14,
    color: '#666',
    lineHeight: 21,
    marginBottom: 20,
    fontFamily: 'Inter_400Regular',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 12,
    fontFamily: 'Inter_600SemiBold',
  },

  // Categorías
  catCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    marginBottom: 10,
    gap: 12,
  },
  catCardSelected: {
    borderColor: BRAND_COLORS.PRIMARY,
    backgroundColor: BRAND_COLORS.PRIMARY + '10',
  },
  catEmoji: { fontSize: 24 },
  catInfo: { flex: 1 },
  catLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND_COLORS.TEXT,
    fontFamily: 'Inter_600SemiBold',
  },
  catLabelSelected: { color: BRAND_COLORS.PRIMARY },
  catDesc: { fontSize: 13, color: '#888', marginTop: 2, fontFamily: 'Inter_400Regular' },
  catCheck: { fontSize: 18, color: BRAND_COLORS.PRIMARY },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    borderColor: '#D0D0D0', backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxSelected: { borderColor: BRAND_COLORS.PRIMARY, backgroundColor: BRAND_COLORS.PRIMARY },
  checkboxMark: { fontSize: 14, color: '#fff', fontWeight: '700' },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  toggleLabel: {
    flex: 1,
    fontSize: 15,
    color: BRAND_COLORS.TEXT,
    marginRight: 12,
    fontFamily: 'Inter_400Regular',
  },

  // Communication method
  commOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
  },
  commOptionSelected: {
    borderColor: BRAND_COLORS.PRIMARY,
    backgroundColor: BRAND_COLORS.PRIMARY + '10',
  },
  commLabel: { fontSize: 15, color: BRAND_COLORS.TEXT, fontFamily: 'Inter_400Regular' },
  commLabelSelected: { color: BRAND_COLORS.PRIMARY, fontFamily: 'Inter_600SemiBold' },

  // Campos de texto
  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: BRAND_COLORS.TEXT,
    marginBottom: 6,
    fontFamily: 'Inter_500Medium',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: BRAND_COLORS.TEXT,
    backgroundColor: '#FAFAFA',
    fontFamily: 'Inter_400Regular',
  },
  textArea: {
    height: 110,
    marginBottom: 14,
  },

  // Botón guardar
  saveBtn: {
    height: 56,
    backgroundColor: BRAND_COLORS.PRIMARY,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
