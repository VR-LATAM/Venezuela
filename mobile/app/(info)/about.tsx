// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { BRAND_COLORS } from '@vride/shared';

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nosotros</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />

        <Text style={styles.tagline}>Una nueva forma de moverse en Venezuela</Text>

        <Text style={styles.body}>
          VERONA Ride Venezuela es una nueva plataforma de transporte que nació con una visión
          diferente: no venimos a competir con nadie. Creemos que el mercado tiene espacio para
          todos, y nuestra única ambición es ofrecer una experiencia de transporte más justa,
          cómoda y confiable.
        </Text>

        <Text style={styles.body}>
          Nos enfocamos en dos cosas: que los pasajeros lleguen a su destino de forma segura y
          tranquila, y que los conductores tengan una herramienta que realmente trabaje para
          ellos — sin comisiones abusivas, con transparencia y con respeto.
        </Text>

        <Text style={styles.body}>
          Somos una plataforma joven, con ganas de crecer junto a nuestros usuarios y de
          demostrar que se puede hacer transporte de otra manera.
        </Text>

        <View style={styles.card}>
          {[
            { icon: '🤝', text: 'Sin competencia — solo queremos ser la mejor opción' },
            { icon: '💰', text: 'Conductores que conservan el 100% de sus ganancias' },
            { icon: '🛡️', text: 'Conductores verificados y capacitados' },
            { icon: '📞', text: 'Soporte disponible y botón SOS en cada viaje' },
          ].map(({ icon, text }) => (
            <View key={text} style={styles.cardRow}>
              <Text style={styles.cardIcon}>{icon}</Text>
              <Text style={styles.cardText}>{text}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.version}>Versión 1.0.0 · © 2025 VERONA Ride Venezuela</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 24 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20,
    paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: { marginRight: 16 },
  backText: { fontSize: 17, color: BRAND_COLORS.PRIMARY, fontWeight: '500' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: BRAND_COLORS.TEXT },
  content: { padding: 24, paddingBottom: 48 },
  logo: { width: '100%', height: 120, marginBottom: 8 },
  tagline: { textAlign: 'center', fontSize: 16, color: '#6b7280', marginBottom: 28, fontStyle: 'italic' },
  body: { fontSize: 16, lineHeight: 26, color: '#374151', marginBottom: 18 },
  card: {
    backgroundColor: '#f0f7ff', borderRadius: 16, padding: 20,
    marginTop: 8, marginBottom: 28, gap: 14,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardIcon: { fontSize: 22 },
  cardText: { fontSize: 15, color: '#1e40af', flex: 1, lineHeight: 22 },
  version: { textAlign: 'center', fontSize: 13, color: '#9ca3af' },
});
