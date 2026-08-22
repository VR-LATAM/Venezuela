// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// Formulario específico por tipo de servicio de Comunidad

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
} from 'react-native';
import { BRAND_COLORS } from '@vride/shared';
import type { ServiceType } from '@vride/shared';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type ServiceMode = 'ahora' | 'programar';

export interface ComunidadFormData {
  mode:          ServiceMode;
  scheduledDate: string;
  scheduledTime: string;
  fields:        Record<string, string>;
}

interface FieldDef {
  key:         string;
  label:       string;
  placeholder: string;
  keyboard?:   'default' | 'numeric' | 'phone-pad';
  options?:    string[];
}

interface ServiceConfig {
  modes:  ServiceMode[];
  fields: FieldDef[];
}

// ─── Configuración por servicio ───────────────────────────────────────────────

const SERVICE_CONFIG: Partial<Record<ServiceType, ServiceConfig>> = {
  grua: {
    modes: ['ahora'],
    fields: [
      { key: 'vehicleType', label: 'Tipo de vehículo',   placeholder: 'Carro, moto, camión...' },
      { key: 'brandModel',  label: 'Marca y modelo',      placeholder: 'Toyota Corolla 2019' },
      { key: 'issue',       label: '¿Qué pasó?',          placeholder: 'Accidente, avería, sin gasolina...' },
    ],
  },
  mecanico: {
    modes: ['ahora'],
    fields: [
      { key: 'vehicleType', label: 'Tipo de vehículo',     placeholder: 'Carro, moto...' },
      { key: 'brandModel',  label: 'Marca y modelo',        placeholder: 'Ford Fiesta 2018' },
      { key: 'issue',       label: 'Descripción de la falla', placeholder: 'No enciende, humo, ruido extraño...' },
    ],
  },
  baterias: {
    modes: ['ahora'],
    fields: [
      { key: 'brandModel', label: 'Marca y modelo del vehículo', placeholder: 'Toyota Corolla 2019' },
      { key: 'batteryType', label: 'Tipo de batería (si lo sabes)', placeholder: 'Ej: 12V 60Ah' },
    ],
  },
  cauchos: {
    modes: ['ahora'],
    fields: [
      { key: 'size',     label: 'Medida del caucho',       placeholder: 'Ej: 195/65 R15' },
      { key: 'quantity', label: 'Cantidad',                 placeholder: '1, 2, 4...', keyboard: 'numeric' },
      { key: 'service',  label: 'Tipo de servicio',         options: ['Inflado', 'Cambio', 'Reparación pinchada'] },
    ],
  },
  gasolina: {
    modes: ['ahora'],
    fields: [
      { key: 'liters',    label: 'Litros requeridos',    placeholder: 'Ej: 20', keyboard: 'numeric' },
      { key: 'fuelType',  label: 'Tipo de combustible',  options: ['Gasolina 91', 'Gasolina 95', 'Diésel'] },
    ],
  },
  planta_electrica: {
    modes: ['ahora', 'programar'],
    fields: [
      { key: 'hours', label: 'Horas requeridas',       placeholder: 'Ej: 4 horas', keyboard: 'numeric' },
      { key: 'kva',   label: 'Capacidad necesaria (KVA)', placeholder: 'Ej: 10 KVA', keyboard: 'numeric' },
    ],
  },
  cisterna: {
    modes: ['ahora', 'programar'],
    fields: [
      { key: 'liters', label: 'Cantidad de agua',    placeholder: 'Ej: 5000 litros', keyboard: 'numeric' },
      { key: 'use',    label: 'Tipo de uso',          options: ['Doméstico', 'Comercial', 'Industrial', 'Construcción'] },
    ],
  },
  tanque_gas: {
    modes: ['programar'],
    fields: [
      { key: 'size',     label: 'Tamaño del cilindro', options: ['18 kg', '27 kg', '43 kg'] },
      { key: 'quantity', label: 'Cantidad de cilindros', placeholder: '1, 2...', keyboard: 'numeric' },
    ],
  },
  aire_acondicionado: {
    modes: ['programar'],
    fields: [
      { key: 'brand',  label: 'Marca del equipo',        placeholder: 'Ej: Carrier, LG, Samsung' },
      { key: 'btu',    label: 'Toneladas / BTU',          placeholder: 'Ej: 1 tonelada / 12.000 BTU' },
      { key: 'issue',  label: 'Descripción del problema', placeholder: 'No enfría, gotea, hace ruido...' },
    ],
  },
  mudanza: {
    modes: ['programar'],
    fields: [
      { key: 'rooms',    label: 'Número de habitaciones', placeholder: 'Ej: 3', keyboard: 'numeric' },
      { key: 'floors',   label: 'Piso de origen',         placeholder: 'Ej: 2', keyboard: 'numeric' },
      { key: 'elevator', label: '¿Hay ascensor?',         options: ['Sí', 'No'] },
      { key: 'notes',    label: 'Notas adicionales',      placeholder: 'Muebles grandes, frágiles...' },
    ],
  },
  taller_mecanico: {
    modes: ['programar'],
    fields: [
      { key: 'vehicleType', label: 'Tipo de vehículo',       placeholder: 'Carro, camioneta, moto...' },
      { key: 'brandModel',  label: 'Marca y modelo',          placeholder: 'Ford Explorer 2020' },
      { key: 'issue',       label: 'Descripción del problema', placeholder: 'Revisión general, frenos, motor...' },
      { key: 'needsTow',    label: '¿Necesitas grúa para llegar al taller?', options: ['Sí', 'No'] },
    ],
  },
};

// ─── Selector de fecha ────────────────────────────────────────────────────────

function DateSelector({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const options: { label: string; value: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const label = i === 0 ? 'Hoy' : i === 1 ? 'Mañana'
      : d.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short' });
    const val = d.toISOString().split('T')[0]!;
    options.push({ label, value: val });
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
      {options.map(o => (
        <TouchableOpacity
          key={o.value}
          style={[styles.chip, value === o.value && styles.chipActive]}
          onPress={() => onChange(o.value)}
        >
          <Text style={[styles.chipText, value === o.value && styles.chipTextActive]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Selector de hora ─────────────────────────────────────────────────────────

const TIME_SLOTS = [
  '07:00','08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00',
];

function TimeSelector({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
      {TIME_SLOTS.map(t => (
        <TouchableOpacity
          key={t}
          style={[styles.chip, value === t && styles.chipActive]}
          onPress={() => onChange(t)}
        >
          <Text style={[styles.chipText, value === t && styles.chipTextActive]}>{t}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Selector de opciones (chips) ─────────────────────────────────────────────

function OptionsSelector({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.optionsRow}>
      {options.map(o => (
        <TouchableOpacity
          key={o}
          style={[styles.chip, value === o && styles.chipActive]}
          onPress={() => onChange(o)}
        >
          <Text style={[styles.chipText, value === o && styles.chipTextActive]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  serviceType: ServiceType;
  onChange:    (data: ComunidadFormData) => void;
}

export default function ComunidadForm({ serviceType, onChange }: Props) {
  const config = SERVICE_CONFIG[serviceType];
  if (!config) return null;

  const defaultMode: ServiceMode = config.modes.includes('ahora') ? 'ahora' : 'programar';

  const [mode, setMode]               = useState<ServiceMode>(defaultMode);
  const [scheduledDate, setDate]      = useState('');
  const [scheduledTime, setTime]      = useState('');
  const [fields, setFields]           = useState<Record<string, string>>({});

  const update = (newFields: Record<string, string>, newMode?: ServiceMode, newDate?: string, newTime?: string) => {
    const m = newMode ?? mode;
    const d = newDate ?? scheduledDate;
    const t = newTime ?? scheduledTime;
    onChange({ mode: m, scheduledDate: d, scheduledTime: t, fields: newFields });
  };

  const setField = (key: string, val: string) => {
    const next = { ...fields, [key]: val };
    setFields(next);
    update(next);
  };

  const handleMode = (m: ServiceMode) => {
    setMode(m);
    update(fields, m);
  };

  const handleDate = (d: string) => {
    setDate(d);
    update(fields, undefined, d);
  };

  const handleTime = (t: string) => {
    setTime(t);
    update(fields, undefined, undefined, t);
  };

  return (
    <View style={styles.container}>

      {/* ── Modo: Ahora / Programar ── */}
      {config.modes.length > 1 && (
        <View style={styles.modeRow}>
          {config.modes.map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => handleMode(m)}
            >
              <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                {m === 'ahora' ? '⚡ Ahora' : '📅 Programar'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Modo único (badge informativo) ── */}
      {config.modes.length === 1 && (
        <View style={styles.modeBadge}>
          <Text style={styles.modeBadgeText}>
            {config.modes[0] === 'ahora' ? '⚡ Servicio inmediato' : '📅 Solo con cita previa'}
          </Text>
        </View>
      )}

      {/* ── Fecha y hora (si es programado) ── */}
      {mode === 'programar' && (
        <>
          <Text style={styles.fieldLabel}>📅 Fecha</Text>
          <DateSelector value={scheduledDate} onChange={handleDate} />
          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>⏰ Hora</Text>
          <TimeSelector value={scheduledTime} onChange={handleTime} />
        </>
      )}

      {/* ── Campos específicos del servicio ── */}
      {config.fields.map(f => (
        <View key={f.key} style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{f.label}</Text>
          {f.options
            ? <OptionsSelector options={f.options} value={fields[f.key] ?? ''} onChange={v => setField(f.key, v)} />
            : (
              <TextInput
                style={styles.input}
                value={fields[f.key] ?? ''}
                onChangeText={v => setField(f.key, v)}
                placeholder={f.placeholder}
                placeholderTextColor="#aaa"
                keyboardType={f.keyboard ?? 'default'}
              />
            )
          }
        </View>
      ))}

    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { gap: 10, marginTop: 8 },
  modeRow:          { flexDirection: 'row', gap: 10 },
  modeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#fafafa',
  },
  modeBtnActive:    { backgroundColor: BRAND_COLORS.PRIMARY, borderColor: BRAND_COLORS.PRIMARY },
  modeBtnText:      { fontSize: 14, fontWeight: '600', color: '#555' },
  modeBtnTextActive:{ color: '#fff' },
  modeBadge: {
    backgroundColor: '#F0F9FF', borderRadius: 8, paddingVertical: 8,
    paddingHorizontal: 12, alignSelf: 'flex-start',
  },
  modeBadgeText:    { fontSize: 13, color: '#0369A1', fontWeight: '600' },
  fieldContainer:   { gap: 6 },
  fieldLabel:       { fontSize: 12, fontWeight: '600', color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 10,
    padding: 11, fontSize: 14, color: '#111', backgroundColor: '#fafafa',
  },
  optionsRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fafafa',
  },
  chipActive:       { backgroundColor: BRAND_COLORS.PRIMARY, borderColor: BRAND_COLORS.PRIMARY },
  chipText:         { fontSize: 13, color: '#555', fontWeight: '600' },
  chipTextActive:   { color: '#fff' },
});
