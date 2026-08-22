// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// Pantalla intermedia — selección de categoría de servicio

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useUser } from '../../src/store/authStore';
import { BRAND_COLORS } from '@vride/shared';

type Category = 'taxi' | 'encomienda' | 'carga' | 'comunidad';

const CATEGORIES: { key: Category; emoji: string; label: string; desc: string; color: string }[] = [
  { key: 'taxi',       emoji: '🚗', label: 'Taxi',       desc: 'Moto, Sedán, SUV, Por Hora, Ida y Vuelta', color: '#1D4ED8' },
  { key: 'encomienda', emoji: '📦', label: 'Encomienda', desc: 'Envíos con trazabilidad y seguridad',       color: '#B45309' },
  { key: 'carga',      emoji: '🚚', label: 'Carga',      desc: 'Pick-Up, Plataforma, F-350, NPR 400+',     color: '#047857' },
  { key: 'comunidad',  emoji: '🤝', label: 'Comunidad',  desc: 'Grúa, Mecánico, Agua, Planta y más',      color: '#7C3AED' },
];

export default function CategoriesScreen() {
  const user = useUser();
  const firstName = user?.full_name?.split(' ')[0] ?? 'Cliente';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  const handleSelect = (category: Category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/(passenger)/home', params: { category } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting}, {firstName} 👋</Text>
          <Text style={styles.question}>¿Qué necesitas hoy?</Text>
        </View>

        {/* Grid de categorías */}
        <View style={styles.grid}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.card, { borderColor: cat.color }]}
              onPress={() => handleSelect(cat.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.cardEmoji}>{cat.emoji}</Text>
              <Text style={[styles.cardLabel, { color: cat.color }]}>{cat.label}</Text>
              <Text style={styles.cardDesc}>{cat.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
    marginTop: 12,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  question: {
    fontSize: 16,
    color: '#666',
    fontWeight: '400',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  card: {
    width: '47%',
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
  cardEmoji: {
    fontSize: 36,
    marginBottom: 10,
  },
  cardLabel: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 12,
    color: '#888',
    lineHeight: 17,
  },
});
