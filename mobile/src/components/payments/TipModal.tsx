// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Modal de propina post-viaje: 10%, 15%, 20%, personalizado
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { BRAND_COLORS } from '@vride/shared';
import { apiClient } from '../../services/apiClient';

interface Props {
  visible: boolean;
  rideId: string;
  driverName: string;
  rideTotal: number;
  onClose: () => void;
  onSuccess: (amount: number) => void;
}

const TIP_PRESETS = [
  { label: '10%', factor: 0.10 },
  { label: '15%', factor: 0.15 },
  { label: '20%', factor: 0.20 },
];

export function TipModal({ visible, rideId, driverName, rideTotal, onClose, onSuccess }: Props) {
  const [selectedFactor, setSelectedFactor] = useState<number | null>(null);
  const [customAmount, setCustomAmount]     = useState('');
  const [submitting, setSubmitting]         = useState(false);

  const getAmount = (): number => {
    if (customAmount) return Math.round(parseFloat(customAmount) * 100) / 100;
    if (selectedFactor !== null) return Math.round(rideTotal * selectedFactor * 100) / 100;
    return 0;
  };

  const handleSend = async () => {
    const amount = getAmount();
    if (!amount || amount <= 0) {
      Alert.alert('Seleccionar monto', 'Por favor elige un monto de propina');
      return;
    }
    if (amount > 100) {
      Alert.alert('Monto excesivo', 'La propina máxima es $100');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post(`/ride/${rideId}/tip`, { amount });
      onSuccess(amount);
    } catch {
      Alert.alert('Error', 'No se pudo procesar la propina. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const tipAmount = getAmount();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>¿Dejar propina para {driverName}?</Text>
          <Text style={styles.sub}>Las propinas van 100% a tu conductor.</Text>

          {/* Preset buttons */}
          <View style={styles.presets}>
            {TIP_PRESETS.map(p => {
              const amt = Math.round(rideTotal * p.factor * 100) / 100;
              const active = selectedFactor === p.factor && !customAmount;
              return (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.preset, active && styles.presetActive]}
                  onPress={() => { setSelectedFactor(p.factor); setCustomAmount(''); }}
                >
                  <Text style={[styles.presetPct, active && styles.presetPctActive]}>{p.label}</Text>
                  <Text style={[styles.presetAmt, active && styles.presetAmtActive]}>${amt.toFixed(2)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom amount */}
          <View style={styles.customRow}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.customInput}
              value={customAmount}
              onChangeText={v => { setCustomAmount(v); setSelectedFactor(null); }}
              keyboardType="decimal-pad"
              placeholder="Monto personalizado"
              placeholderTextColor="#94A3B8"
              maxLength={6}
            />
          </View>

          {/* Total */}
          {tipAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Monto de propina</Text>
              <Text style={styles.totalValue}>${tipAmount.toFixed(2)}</Text>
            </View>
          )}

          {/* Actions */}
          <TouchableOpacity
            style={[styles.sendBtn, (!tipAmount || submitting) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!tipAmount || submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.sendBtnText}>Enviar propina ${tipAmount > 0 ? tipAmount.toFixed(2) : ''}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.skipBtn}>
            <Text style={styles.skipBtnText}>No, gracias</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:            { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  title:            { fontSize: 22, fontWeight: '800', color: '#1E293B', marginBottom: 4, textAlign: 'center' },
  sub:              { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24 },
  presets:          { flexDirection: 'row', gap: 10, marginBottom: 16 },
  preset:           { flex: 1, borderRadius: 14, borderWidth: 2, borderColor: '#E2E8F0', padding: 14, alignItems: 'center' },
  presetActive:     { borderColor: BRAND_COLORS.PRIMARY, backgroundColor: '#EFF6FF' },
  presetPct:        { fontSize: 18, fontWeight: '700', color: '#334155', marginBottom: 4 },
  presetPctActive:  { color: BRAND_COLORS.PRIMARY },
  presetAmt:        { fontSize: 14, color: '#64748B' },
  presetAmtActive:  { color: BRAND_COLORS.PRIMARY },
  customRow:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, marginBottom: 16 },
  dollarSign:       { fontSize: 20, color: '#475569', fontWeight: '600', marginRight: 4 },
  customInput:      { flex: 1, fontSize: 18, padding: 12, color: '#1E293B', fontWeight: '600' },
  totalRow:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, backgroundColor: '#F0FFF4', borderRadius: 10, padding: 14 },
  totalLabel:       { fontSize: 15, color: '#166534', fontWeight: '600' },
  totalValue:       { fontSize: 18, color: '#15803D', fontWeight: '800' },
  sendBtn:          { backgroundColor: BRAND_COLORS.PRIMARY, borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  sendBtnDisabled:  { backgroundColor: '#CBD5E1' },
  sendBtnText:      { color: '#fff', fontSize: 17, fontWeight: '700' },
  skipBtn:          { alignItems: 'center', padding: 8 },
  skipBtnText:      { color: '#94A3B8', fontSize: 15 },
});
