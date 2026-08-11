// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Pantalla de membresía semanal del conductor
// Muestra estado, instrucciones de pago y formulario de comprobante
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BRAND_COLORS } from '@vride/shared';
import { apiClient } from '../../src/services/apiClient';

type MembershipStatus = 'inactive' | 'pending_approval' | 'active' | 'suspended';

interface Plan {
  vehicle_type: string;
  price_usd:    number;
}

interface Membership {
  id:                string;
  status:            string;
  period_start:      string;
  period_end:        string;
  payment_method:    string | null;
  payment_reference: string | null;
  submitted_at:      string | null;
  rejection_reason:  string | null;
  amount_usd:        number;
  vehicle_type:      string;
}

interface StatusData {
  status:            MembershipStatus;
  expires:           string | null;
  currentPeriod:   { start: string; end: string };
  nextPaymentDate:   string;
  currentMembership: Membership | null;
  history:           Membership[];
  plans:             Plan[];
}

const PAYMENT_METHODS = [
  { key: 'zelle',      label: 'Zelle' },
  { key: 'wire',       label: 'Transferencia bancaria' },
  { key: 'pago_movil', label: 'Pago Móvil' },
  { key: 'efectivo',   label: 'Efectivo al administrador' },
] as const;

const STATUS_CONFIG: Record<MembershipStatus, { color: string; bg: string; icon: string; label: string }> = {
  active:           { color: '#15803D', bg: '#F0FFF4', icon: '✅', label: 'Membresía activa' },
  pending_approval: { color: '#B45309', bg: '#FFFBEB', icon: '⏳', label: 'Pendiente de aprobación' },
  inactive:         { color: '#475569', bg: '#F8FAFC', icon: '⚪', label: 'Sin membresía activa' },
  suspended:        { color: '#DC2626', bg: '#FEF2F2', icon: '🚫', label: 'Cuenta suspendida' },
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function MembershipScreen() {
  const [data, setData]               = useState<StatusData | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [membership, setMembership]   = useState<Membership | null>(null);

  const [vehicleType, setVehicleType] = useState<string>('');
  const [method, setMethod]           = useState<string>('');
  const [reference, setReference]     = useState('');
  const [submitting, setSubmitting]   = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get<{ success: boolean; data: StatusData }>('/membership/status');
      setData(res.data);
      setMembership(res.data.currentMembership);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el estado de membresía.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleInitiate = async () => {
    if (!vehicleType) {
      Alert.alert('Selecciona tu tipo de vehículo', 'Elige Moto, Sedán o SUV para continuar.');
      return;
    }
    try {
      const { data: res } = await apiClient.post<{ success: boolean; data: { membership: Membership } }>('/membership/initiate', { vehicle_type: vehicleType });
      setMembership(res.data.membership);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert('Error', 'No se pudo iniciar el trámite.');
    }
  };

  const handleSubmit = async () => {
    if (!membership) return;
    if (!method) {
      Alert.alert('Falta información', 'Selecciona el método de pago.');
      return;
    }
    if (!reference.trim()) {
      Alert.alert('Falta información', 'Ingresa el número de referencia o confirmación.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/membership/submit', {
        membership_id:     membership.id,
        payment_method:    method,
        payment_reference: reference.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '¡Comprobante enviado!',
        'Tu comprobante fue enviado. Un administrador lo revisará y activará tu membresía en breve.',
        [{ text: 'Entendido', onPress: load }]
      );
    } catch {
      Alert.alert('Error', 'No se pudo enviar el comprobante. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  const st = STATUS_CONFIG[data?.status ?? 'inactive'];
  const needsPayment = data?.status === 'inactive' || data?.status === 'suspended';
  const canSubmit    = membership?.status === 'pending_payment' || membership?.status === 'rejected';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Membresía semanal</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Estado actual */}
        <View style={[styles.statusCard, { backgroundColor: st.bg, borderColor: st.color + '40' }]}>
          <Text style={styles.statusIcon}>{st.icon}</Text>
          <Text style={[styles.statusLabel, { color: st.color }]}>{st.label}</Text>
          {data?.status === 'active' && data.expires && (
            <Text style={styles.statusSub}>Válida hasta el {formatDate(data.expires)}</Text>
          )}
          {data?.status === 'pending_approval' && (
            <Text style={styles.statusSub}>Un administrador revisará tu comprobante pronto</Text>
          )}
          {data?.status === 'suspended' && (
            <Text style={styles.statusSub}>Renueva tu membresía para volver a recibir viajes</Text>
          )}
        </View>

        {/* Período actual */}
        {data && (
          <View style={styles.periodCard}>
            <Text style={styles.periodTitle}>Período actual</Text>
            <Text style={styles.periodDates}>
              {formatDate(data.currentPeriod.start)} → {formatDate(data.currentPeriod.end)}
            </Text>
            <Text style={styles.periodSub}>
              Próximo pago: viernes {formatDate(data.nextPaymentDate)}
            </Text>
          </View>
        )}

        {/* Tarifas */}
        <View style={styles.plansCard}>
          <Text style={styles.plansTitle}>Tarifas de membresía</Text>
          {data?.plans.map(p => (
            <View key={p.vehicle_type} style={styles.planRow}>
              <Text style={styles.planVehicle}>
                {p.vehicle_type === 'moto' ? '🏍️  Moto' :
                 p.vehicle_type === 'sedan' ? '🚗  Sedán' : '🚙  SUV'}
              </Text>
              <Text style={styles.planPrice}>${p.price_usd.toFixed(2)} / semana</Text>
            </View>
          ))}
        </View>

        {/* Instrucciones de pago — solo si necesita pagar */}
        {(needsPayment || canSubmit) && (
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>💳  Cómo pagar tu membresía</Text>
            <Text style={styles.instructionsText}>
              Realiza tu pago <Text style={styles.bold}>en dólares (USD)</Text> a la cuenta de VERONA Ride Venezuela mediante cualquiera de estos métodos:
            </Text>

            <View style={styles.bankInfo}>
              <Text style={styles.bankTitle}>Zelle</Text>
              <Text style={styles.bankDetail}>zelle@veronaride.com</Text>
            </View>

            <View style={styles.bankInfo}>
              <Text style={styles.bankTitle}>Transferencia bancaria (USA / Panamá / Aruba)</Text>
              <Text style={styles.bankDetail}>Banco: [por confirmar con administración]</Text>
              <Text style={styles.bankDetail}>Titular: VERONA Ride Venezuela LLC</Text>
            </View>

            <View style={styles.bankInfo}>
              <Text style={styles.bankTitle}>Pago Móvil</Text>
              <Text style={styles.bankDetail}>Banco: [por confirmar con administración]</Text>
            </View>

            <Text style={[styles.instructionsText, { marginTop: 8, color: '#DC2626', fontWeight: '600' }]}>
              ⚠️  El pago debe realizarse todos los viernes. Si no renuevas, tu cuenta se suspende automáticamente.
            </Text>
          </View>
        )}

        {/* Formulario de comprobante */}
        {needsPayment && !membership && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Selecciona tu tipo de vehículo</Text>
            <View style={styles.methodsGrid}>
              {[
                { key: 'moto',  label: '🏍️  Moto',  price: '$15' },
                { key: 'sedan', label: '🚗  Sedán', price: '$25' },
                { key: 'suv',   label: '🚙  SUV',   price: '$35' },
              ].map(v => (
                <TouchableOpacity
                  key={v.key}
                  style={[styles.methodBtn, vehicleType === v.key && styles.methodBtnActive]}
                  onPress={() => setVehicleType(v.key)}
                >
                  <Text style={[styles.methodBtnText, vehicleType === v.key && styles.methodBtnTextActive]}>
                    {v.label}
                  </Text>
                  <Text style={[styles.methodBtnText, vehicleType === v.key && styles.methodBtnTextActive, { fontSize: 11 }]}>
                    {v.price}/sem
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.initiateBtn, !vehicleType && styles.submitBtnDisabled]}
              onPress={handleInitiate}
              disabled={!vehicleType}
            >
              <Text style={styles.initiateBtnText}>Continuar con el pago</Text>
            </TouchableOpacity>
          </View>
        )}

        {canSubmit && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Enviar comprobante de pago</Text>
            {membership?.amount_usd && (
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Monto a pagar</Text>
                <Text style={styles.amountValue}>${membership.amount_usd.toFixed(2)} USD</Text>
              </View>
            )}

            {/* Método de pago */}
            <Text style={styles.fieldLabel}>Método de pago</Text>
            <View style={styles.methodsGrid}>
              {PAYMENT_METHODS.map(m => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.methodBtn, method === m.key && styles.methodBtnActive]}
                  onPress={() => setMethod(m.key)}
                >
                  <Text style={[styles.methodBtnText, method === m.key && styles.methodBtnTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Referencia */}
            <Text style={styles.fieldLabel}>Número de referencia / confirmación</Text>
            <TextInput
              style={styles.input}
              value={reference}
              onChangeText={setReference}
              placeholder="Ej: 123456789"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
            />

            {/* Botón enviar */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>Enviar comprobante</Text>
              }
            </TouchableOpacity>

            {membership?.rejection_reason && (
              <View style={styles.rejectionBox}>
                <Text style={styles.rejectionLabel}>Motivo del rechazo anterior:</Text>
                <Text style={styles.rejectionText}>{membership.rejection_reason}</Text>
              </View>
            )}
          </View>
        )}

        {/* Historial */}
        {(data?.history?.length ?? 0) > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Historial de membresías</Text>
            {data!.history.map(h => (
              <View key={h.id} style={styles.historyRow}>
                <View>
                  <Text style={styles.historyPeriod}>
                    {formatDate(h.period_start)} — {formatDate(h.period_end)}
                  </Text>
                  <Text style={styles.historyMethod}>{h.payment_method ?? '—'}</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={styles.historyAmount}>${h.amount_usd}</Text>
                  <View style={[
                    styles.historyStatusPill,
                    { backgroundColor:
                        h.status === 'active'           ? '#BBF7D0' :
                        h.status === 'pending_approval' ? '#FDE68A' :
                        h.status === 'rejected'         ? '#FECACA' : '#E2E8F0'
                    }
                  ]}>
                    <Text style={styles.historyStatusText}>
                      {h.status === 'active'           ? 'Activa'    :
                       h.status === 'pending_approval' ? 'Pendiente' :
                       h.status === 'rejected'         ? 'Rechazada' :
                       h.status === 'expired'          ? 'Vencida'   : h.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#fff', paddingTop: 24 },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#F8F9FA' },
  backBtnText: { fontSize: 22, color: BRAND_COLORS.TEXT },
  title:       { fontSize: 18, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  scroll:      { padding: 16, gap: 16 },

  statusCard: {
    borderRadius: 16, borderWidth: 1, padding: 20, alignItems: 'center', gap: 6,
  },
  statusIcon:  { fontSize: 36 },
  statusLabel: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  statusSub:   { fontSize: 14, color: '#64748B', textAlign: 'center', fontFamily: 'Inter_400Regular' },

  periodCard: {
    backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, gap: 4,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  periodTitle: { fontSize: 12, fontWeight: '700', color: '#888', letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: 'Inter_700Bold' },
  periodDates: { fontSize: 18, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  periodSub:   { fontSize: 13, color: '#64748B', fontFamily: 'Inter_400Regular' },

  plansCard:   { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  plansTitle:  { fontSize: 14, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  planRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planVehicle: { fontSize: 15, color: BRAND_COLORS.TEXT, fontFamily: 'Inter_400Regular' },
  planPrice:   { fontSize: 15, fontWeight: '700', color: BRAND_COLORS.PRIMARY, fontFamily: 'Inter_700Bold' },

  instructionsCard: { backgroundColor: '#FFF8F0', borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: '#FED7AA' },
  instructionsTitle:{ fontSize: 15, fontWeight: '700', color: '#92400E', fontFamily: 'Inter_700Bold' },
  instructionsText: { fontSize: 14, color: '#78350F', fontFamily: 'Inter_400Regular', lineHeight: 20 },
  bold:             { fontWeight: '700' },
  bankInfo:         { backgroundColor: '#fff', borderRadius: 10, padding: 12, gap: 4 },
  bankTitle:        { fontSize: 13, fontWeight: '700', color: '#1E293B', fontFamily: 'Inter_700Bold' },
  bankDetail:       { fontSize: 13, color: '#475569', fontFamily: 'Inter_400Regular' },

  initiateBtn: {
    backgroundColor: BRAND_COLORS.PRIMARY, borderRadius: 14, height: 54,
    justifyContent: 'center', alignItems: 'center',
  },
  initiateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  formCard:   { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 20, gap: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  formTitle:  { fontSize: 16, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  amountRow:  { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12 },
  amountLabel:{ fontSize: 14, color: '#1E40AF', fontFamily: 'Inter_400Regular' },
  amountValue:{ fontSize: 18, fontWeight: '800', color: '#1E40AF', fontFamily: 'Inter_700Bold' },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#475569', fontFamily: 'Inter_600SemiBold' },
  methodsGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodBtn:  {
    borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fff',
  },
  methodBtnActive:    { borderColor: BRAND_COLORS.PRIMARY, backgroundColor: '#EFF6FF' },
  methodBtnText:      { fontSize: 13, color: '#475569', fontFamily: 'Inter_400Regular' },
  methodBtnTextActive:{ color: BRAND_COLORS.PRIMARY, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  input: {
    borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: '#1E293B', backgroundColor: '#fff',
    fontFamily: 'Inter_400Regular',
  },

  submitBtn: {
    backgroundColor: BRAND_COLORS.PRIMARY, borderRadius: 14, height: 54,
    justifyContent: 'center', alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#CBD5E1' },
  submitBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  rejectionBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, gap: 4 },
  rejectionLabel:{ fontSize: 12, fontWeight: '700', color: '#DC2626', fontFamily: 'Inter_700Bold' },
  rejectionText: { fontSize: 13, color: '#7F1D1D', fontFamily: 'Inter_400Regular' },

  historySection: { gap: 10 },
  historyTitle:   { fontSize: 16, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  historyPeriod:     { fontSize: 14, fontWeight: '600', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_600SemiBold' },
  historyMethod:     { fontSize: 12, color: '#888', fontFamily: 'Inter_400Regular', marginTop: 2 },
  historyRight:      { alignItems: 'flex-end', gap: 4 },
  historyAmount:     { fontSize: 15, fontWeight: '700', color: BRAND_COLORS.TEXT, fontFamily: 'Inter_700Bold' },
  historyStatusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  historyStatusText: { fontSize: 12, fontWeight: '600', color: '#1E293B', fontFamily: 'Inter_600SemiBold' },
});
