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
        <Text style={styles.headerTitle}>Acerca de</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />

        <Text style={styles.tagline}>Transporte accesible para todos</Text>

        <Text style={styles.body}>
          V-Ride Venezuela nació con una misión simple pero poderosa: garantizar que los adultos mayores
          y personas con discapacidad tengan acceso a un transporte seguro, digno y confiable — donde
          quieran que estén en Venezuela.
        </Text>

        <Text style={styles.body}>
          Nuestra plataforma conecta pasajeros que necesitan transporte accesible con conductores
          capacitados y con antecedentes verificados. Cada vehículo de nuestra red está equipado para
          acomodar dispositivos de movilidad, y cada conductor recibe capacitación específica en
          atención a adultos mayores y personas con discapacidad.
        </Text>

        <Text style={styles.body}>
          Somos una empresa familiar construida sobre valores de confianza, respeto y comunidad. El
          nombre V-Ride refleja nuestro compromiso con una experiencia confiable y de calidad para
          cada usuario — porque todos merecen moverse con libertad.
        </Text>

        <Text style={styles.body}>
          Con sede en Venezuela, nos expandimos para atender a comunidades que históricamente han sido
          desatendidas por las plataformas de transporte tradicionales.
        </Text>

        <View style={styles.card}>
          {[
            { icon: '♿', text: 'Vehículos accesibles para todas las necesidades de movilidad' },
            { icon: '🛡️', text: 'Conductores verificados y capacitados' },
            { icon: '📍', text: 'Cobertura nacional en Venezuela' },
            { icon: '📞', text: 'Soporte de emergencia 24/7 y botón SOS' },
          ].map(({ icon, text }) => (
            <View key={text} style={styles.cardRow}>
              <Text style={styles.cardIcon}>{icon}</Text>
              <Text style={styles.cardText}>{text}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.version}>Versión 1.0.0 · © 2025 Verona Group Venezuela</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
