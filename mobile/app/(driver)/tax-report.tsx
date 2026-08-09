// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Reporte de impuestos 1099 del conductor
// Muestra ganancias anuales para declaración fiscal (IRS Form 1099-NEC)
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { BRAND_COLORS } from '@vride/shared';
import { apiClient } from '../../src/services/apiClient';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

interface TaxReport {
  year: number;
  total_gross_earnings: number;
  platform_commission: number;
  net_earnings: number;
  total_tips: number;
  total_rides: number;
  requires_1099: boolean;
  monthly_breakdown: Array<{ month: number; earned: string; rides: string }>;
}

export default function TaxReportScreen() {
  const currentYear = new Date().getFullYear();
  const [year, setYear]       = useState(currentYear);
  const [report, setReport]   = useState<TaxReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (y: number) => {
    setLoading(true);
    try {
      const r = await apiClient.get('/driver/tax-report', { params: { year: y } });
      setReport(r.data.data);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el informe fiscal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(year); }, [year]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Informe fiscal</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Year selector */}
        <View style={styles.yearRow}>
          <TouchableOpacity
            style={styles.yearBtn}
            onPress={() => setYear(y => y - 1)}
            disabled={year <= currentYear - 3}
          >
            <Text style={styles.yearBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.yearLabel}>{year}</Text>
          <TouchableOpacity
            style={styles.yearBtn}
            onPress={() => setYear(y => y + 1)}
            disabled={year >= currentYear}
          >
            <Text style={styles.yearBtnText}>›</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={BRAND_COLORS.PRIMARY} style={{ marginTop: 40 }} />
        ) : report ? (
          <>
            {/* 1099 alert */}
            {report.requires_1099 ? (
              <View style={styles.alertBox}>
                <Text style={styles.alertIcon}>📋</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>Informe fiscal anual requerido</Text>
                  <Text style={styles.alertText}>
                    Tus ganancias superan el umbral de declaración para el año {year}. Conserva este informe para tu declaración.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={[styles.alertBox, { backgroundColor: '#F0FFF4', borderColor: '#86EFAC' }]}>
                <Text style={styles.alertIcon}>✅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertTitle, { color: '#15803D' }]}>Por debajo del umbral de declaración</Text>
                  <Text style={[styles.alertText, { color: '#166534' }]}>
                    Ganancias menores al umbral para {year}. No se requiere declaración obligatoria.
                  </Text>
                </View>
              </View>
            )}

            {/* Summary cards */}
            <View style={styles.cardsRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.scValue}>${report.net_earnings.toFixed(2)}</Text>
                <Text style={styles.scLabel}>Ganancias netas</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.scValue, { color: '#22C55E' }]}>${report.total_tips.toFixed(2)}</Text>
                <Text style={styles.scLabel}>Propinas recibidas</Text>
              </View>
            </View>

            {/* Breakdown table */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Desglose completo</Text>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Ganancias brutas (viajes)</Text>
                <Text style={styles.rowValue}>${report.total_gross_earnings.toFixed(2)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Comisión de la plataforma</Text>
                <Text style={[styles.rowValue, { color: '#DC2626' }]}>-${report.platform_commission.toFixed(2)}</Text>
              </View>
              <View style={[styles.row, styles.rowTotal]}>
                <Text style={styles.rowTotalLabel}>Ganancias netas</Text>
                <Text style={styles.rowTotalValue}>${report.net_earnings.toFixed(2)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Propinas (sin comisión)</Text>
                <Text style={[styles.rowValue, { color: '#22C55E' }]}>+${report.total_tips.toFixed(2)}</Text>
              </View>
              <View style={[styles.row, { borderBottomWidth: 0 }]}>
                <Text style={styles.rowLabel}>Total de viajes completados</Text>
                <Text style={styles.rowValue}>{report.total_rides}</Text>
              </View>
            </View>

            {/* Monthly chart */}
            {report.monthly_breakdown.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ganancias mensuales</Text>
                {report.monthly_breakdown.map(m => {
                  const earned = parseFloat(m.earned);
                  const max = Math.max(...report.monthly_breakdown.map(x => parseFloat(x.earned)), 1);
                  const pct = earned / max;
                  return (
                    <View key={m.month} style={styles.monthRow}>
                      <Text style={styles.monthName}>{MONTHS[m.month - 1]}</Text>
                      <View style={styles.barBg}>
                        <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` as any }]} />
                      </View>
                      <Text style={styles.monthValue}>${earned.toFixed(0)}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* IRS note */}
            <View style={styles.irsNote}>
              <Text style={styles.irsText}>
                ⚠️ Este informe es solo de referencia. Para efectos fiscales oficiales, consulta a un contador o asesora fiscal. Las regulaciones tributarias venezolanas pueden aplicar según tu actividad económica.
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F8FAFC', paddingTop: 24 },
  header:        { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn:       { padding: 4, marginRight: 8 },
  backBtnText:   { fontSize: 28, color: BRAND_COLORS.PRIMARY, lineHeight: 32 },
  headerTitle:   { flex: 1, fontSize: 20, fontWeight: '700', color: '#1E293B' },
  scroll:        { padding: 16, paddingBottom: 40, gap: 14 },
  yearRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 4 },
  yearBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  yearBtnText:   { fontSize: 22, color: '#475569', fontWeight: '600' },
  yearLabel:     { fontSize: 26, fontWeight: '800', color: '#1E293B' },
  alertBox:      { flexDirection: 'row', backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: '#FDE68A' },
  alertIcon:     { fontSize: 28 },
  alertTitle:    { fontSize: 15, fontWeight: '700', color: '#B45309', marginBottom: 3 },
  alertText:     { fontSize: 13, color: '#92400E', lineHeight: 18 },
  cardsRow:      { flexDirection: 'row', gap: 12 },
  summaryCard:   { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 18, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  scValue:       { fontSize: 26, fontWeight: '900', color: BRAND_COLORS.PRIMARY, marginBottom: 4 },
  scLabel:       { fontSize: 12, color: '#64748B', fontWeight: '600' },
  section:       { backgroundColor: '#fff', borderRadius: 14, padding: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 14 },
  row:           { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowLabel:      { fontSize: 14, color: '#475569' },
  rowValue:      { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  rowTotal:      { borderTopWidth: 2, borderTopColor: '#E2E8F0', marginTop: 4 },
  rowTotalLabel: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  rowTotalValue: { fontSize: 18, fontWeight: '900', color: BRAND_COLORS.PRIMARY },
  monthRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  monthName:     { fontSize: 12, fontWeight: '600', color: '#64748B', width: 30 },
  barBg:         { flex: 1, height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' },
  barFill:       { height: 10, backgroundColor: BRAND_COLORS.PRIMARY, borderRadius: 5 },
  monthValue:    { fontSize: 12, fontWeight: '600', color: '#1E293B', width: 50, textAlign: 'right' },
  irsNote:       { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  irsText:       { fontSize: 12, color: '#64748B', lineHeight: 18 },
});
