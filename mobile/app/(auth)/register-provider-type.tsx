// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// Selección de tipo de prestatario antes del registro

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BRAND_COLORS } from '@vride/shared';

export type ProviderType = 'conductor' | 'tecnico' | 'proveedor' | 'negocio';

const PROVIDER_TYPES: {
  key: ProviderType;
  emoji: string;
  label: string;
  desc: string;
  services: string;
  color: string;
}[] = [
  {
    key: 'conductor',
    emoji: '🚗',
    label: 'Conductor',
    desc: 'Ofreces servicios de transporte de personas o carga.',
    services: 'Taxi · Moto · SUV · Carga · Encomienda · Plataforma',
    color: '#1D4ED8',
  },
  {
    key: 'tecnico',
    emoji: '🔧',
    label: 'Técnico',
    desc: 'Ofreces servicios técnicos especializados a domicilio.',
    services: 'Mecánico · Aire Acondicionado · Baterías · Cauchos',
    color: '#B45309',
  },
  {
    key: 'proveedor',
    emoji: '🚛',
    label: 'Proveedor',
    desc: 'Cuentas con un equipo o vehículo especializado.',
    services: 'Cisterna · Tanque Gas · Planta Eléctrica · Gasolina · Grúa · Mudanza',
    color: '#047857',
  },
  {
    key: 'negocio',
    emoji: '🏪',
    label: 'Taller',
    desc: 'Tienes un taller mecánico o establecimiento de reparación.',
    services: 'Taller Mecánico',
    color: '#7C3AED',
  },
];

export default function RegisterProviderTypeScreen() {
  const handleSelect = (type: ProviderType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (type === 'conductor') {
      router.push('/(auth)/register-driver');
    } else {
      router.push({ pathname: '/(auth)/register-provider', params: { providerType: type } });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← Atrás</Text>
        </TouchableOpacity>

        <Text style={styles.title}>¿Qué tipo de servicio ofreces?</Text>
        <Text style={styles.subtitle}>Selecciona la categoría que mejor describe lo que haces.</Text>

        <View style={styles.list}>
          {PROVIDER_TYPES.map(pt => (
            <TouchableOpacity
              key={pt.key}
              style={[styles.card, { borderColor: pt.color }]}
              onPress={() => handleSelect(pt.key)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardEmoji}>{pt.emoji}</Text>
                <Text style={[styles.cardLabel, { color: pt.color }]}>{pt.label}</Text>
              </View>
              <Text style={styles.cardDesc}>{pt.desc}</Text>
              <Text style={styles.cardServices}>{pt.services}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, paddingBottom: 40 },
  back: { marginBottom: 20 },
  backText: { color: BRAND_COLORS.PRIMARY, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 28, lineHeight: 20 },
  list: { gap: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  cardEmoji: { fontSize: 28 },
  cardLabel: { fontSize: 18, fontWeight: '700' },
  cardDesc: { fontSize: 13, color: '#444', marginBottom: 6, lineHeight: 19 },
  cardServices: { fontSize: 11, color: '#999', fontStyle: 'italic' },
});
