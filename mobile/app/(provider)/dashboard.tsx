// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// Dashboard del prestatario de servicios Comunidad

import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { BRAND_COLORS } from '@vride/shared';
import { useAuthStore } from '../../src/store/authStore';

const PROVIDER_TYPE_LABEL: Record<string, string> = {
  tecnico:   'Técnico especializado',
  proveedor: 'Proveedor de equipo',
  negocio:   'Taller / Negocio',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:   { label: 'En revisión',  color: '#92400E', bg: '#FEF3C7', icon: '⏳' },
  active:    { label: 'Activo',       color: '#065F46', bg: '#ECFDF5', icon: '✅' },
  suspended: { label: 'Suspendido',   color: '#7F1D1D', bg: '#FEE2E2', icon: '⛔' },
  rejected:  { label: 'Rechazado',    color: '#7F1D1D', bg: '#FEE2E2', icon: '✕' },
};

export default function ProviderDashboardScreen() {
  const { user, clearUser } = useAuthStore();
  const provider = (user as any)?.provider as Record<string, any> | null;

  const status     = (provider?.status as string) ?? 'pending';
  const statusCfg  = STATUS_CONFIG[status] ?? STATUS_CONFIG['pending']!;
  const typeLabel  = PROVIDER_TYPE_LABEL[(provider?.provider_type as string) ?? ''] ?? 'Prestatario';
  const memberFee  = provider?.membership_fee_usd ?? 20;
  const rating     = +(provider?.rating ?? 0);
  const totalSvc   = +(provider?.total_services ?? 0);

  const specialty = provider?.specialty || provider?.equipment || provider?.business_name || '';

  const handleLogout = async () => {
    Alert.alert('Cerrar sesión', '¿Deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('access_token');
          await SecureStore.deleteItemAsync('refresh_token');
          clearUser();
          router.replace('/(auth)/login-provider');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {user?.name?.split(' ')[0] ?? 'Prestatario'}</Text>
          <Text style={styles.typeLabel}>{typeLabel}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Estado de la afiliación */}
        <View style={[styles.statusCard, { backgroundColor: statusCfg.bg }]}>
          <Text style={styles.statusCardTitle}>Estado de tu afiliación</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusIcon}>{statusCfg.icon}</Text>
            <Text style={[styles.statusLabel, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
          {status === 'pending' && (
            <Text style={[styles.statusNote, { color: statusCfg.color }]}>
              El equipo de VERONA revisará tu solicitud en 24-48 horas. Te notificaremos por correo.
            </Text>
          )}
          {status === 'rejected' && provider?.rejection_reason && (
            <Text style={[styles.statusNote, { color: statusCfg.color }]}>
              Motivo: {provider.rejection_reason}
            </Text>
          )}
        </View>

        {/* Membresía */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Membresía</Text>
          <View style={styles.memberRow}>
            <View style={styles.memberItem}>
              <Text style={styles.memberAmount}>${memberFee}</Text>
              <Text style={styles.memberPeriod}>/ mes</Text>
            </View>
            <View style={styles.memberSep} />
            <View style={styles.memberItem}>
              <Text style={styles.memberExpLabel}>Vence</Text>
              <Text style={styles.memberExpValue}>
                {provider?.membership_expires_at
                  ? new Date(provider.membership_expires_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Estadísticas */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mis estadísticas</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{totalSvc}</Text>
              <Text style={styles.statLabel}>Servicios</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {rating > 0 ? `⭐ ${rating.toFixed(1)}` : '—'}
              </Text>
              <Text style={styles.statLabel}>Calificación</Text>
            </View>
          </View>
        </View>

        {/* Datos del registro */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Datos de tu registro</Text>
          {[
            { label: 'Nombre',       value: user?.name },
            { label: 'Correo',       value: user?.email },
            { label: 'Teléfono',     value: provider?.phone },
            { label: 'Estado',       value: provider?.state },
            { label: 'Especialidad', value: specialty || '—' },
          ].map(r => r.value ? (
            <View key={r.label} style={styles.dataRow}>
              <Text style={styles.dataLabel}>{r.label}</Text>
              <Text style={styles.dataValue}>{r.value}</Text>
            </View>
          ) : null)}
        </View>

        {/* Información */}
        <View style={[styles.card, styles.infoCard]}>
          <Text style={styles.infoTitle}>¿Cómo funciona?</Text>
          <Text style={styles.infoText}>
            1. VERONA aprueba tu registro y activa tu perfil.{'\n'}
            2. Cuando un usuario solicita tu servicio, recibes una notificación.{'\n'}
            3. Atiendes al cliente y registras el servicio completado.{'\n'}
            4. Renuevas tu membresía mensualmente ($20/mes).
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: BRAND_COLORS.PRIMARY, paddingHorizontal: 20, paddingVertical: 16,
    paddingTop: 20,
  },
  greeting:  { fontSize: 18, fontWeight: '700', color: '#fff' },
  typeLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14,
    paddingVertical: 7, borderRadius: 8,
  },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  scroll: { flex: 1, padding: 16 },

  statusCard: {
    borderRadius: 16, padding: 18, marginBottom: 14,
  },
  statusCardTitle: { fontSize: 12, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  statusRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  statusIcon: { fontSize: 24 },
  statusLabel:{ fontSize: 20, fontWeight: '800' },
  statusNote: { fontSize: 13, lineHeight: 19, marginTop: 4 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    marginBottom: 14, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05,
    shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },

  memberRow:   { flexDirection: 'row', alignItems: 'center' },
  memberItem:  { flex: 1, alignItems: 'center' },
  memberAmount:{ fontSize: 36, fontWeight: '800', color: BRAND_COLORS.TEXT },
  memberPeriod:{ fontSize: 13, color: '#888', marginTop: -4 },
  memberSep:   { width: 1, height: 50, backgroundColor: '#E2E8F0' },
  memberExpLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  memberExpValue: { fontSize: 15, fontWeight: '600', color: BRAND_COLORS.TEXT },

  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: {
    flex: 1, backgroundColor: '#F8F9FA', borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '800', color: BRAND_COLORS.TEXT },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },

  dataRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dataLabel: { fontSize: 13, color: '#888' },
  dataValue: { fontSize: 13, fontWeight: '600', color: '#111', flex: 1, textAlign: 'right' },

  infoCard:  { backgroundColor: '#EFF6FF' },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#1E40AF', marginBottom: 10 },
  infoText:  { fontSize: 13, color: '#1E40AF', lineHeight: 22 },
});
