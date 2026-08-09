// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { router } from 'expo-router';
import { BRAND_COLORS } from '@vride/shared';

const contacts = [
  { icon: '📧', title: 'Soporte general', desc: 'Preguntas sobre viajes, tu cuenta o la app.', email: 'support@veronaride.app' },
  { icon: '🚗', title: 'Conviértete en conductor', desc: '¿Interesado en manejar con V-Ride Venezuela?', email: 'drivers@veronaride.app' },
  { icon: '🏢', title: 'Consultas empresariales', desc: 'Alianzas y transporte corporativo.', email: 'business@veronaride.app' },
];

const faqs = [
  { q: '¿Dónde está disponible V-Ride Venezuela?', a: 'Actualmente operamos en Venezuela, expandiéndonos a nuevas ciudades.' },
  { q: '¿Cómo se verifican los conductores?', a: 'Cada conductor pasa por una revisión de antecedentes, inspección de licencia y del vehículo.' },
  { q: '¿Puedo programar un viaje con anticipación?', a: 'Sí, hasta 7 días de antelación desde la app.' },
  { q: '¿Qué hago si necesito un vehículo accesible para silla de ruedas?', a: 'Selecciona "Accesible" al reservar y te asignaremos el vehículo adecuado.' },
];

export default function ContactScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contáctanos</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>Estamos aquí para ayudarte. Escríbenos en cualquier momento.</Text>

        {contacts.map(c => (
          <TouchableOpacity key={c.email} style={styles.card} onPress={() => Linking.openURL(`mailto:${c.email}`)}>
            <Text style={styles.cardIcon}>{c.icon}</Text>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{c.title}</Text>
              <Text style={styles.cardDesc}>{c.desc}</Text>
              <Text style={styles.cardEmail}>{c.email}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.faqTitle}>Preguntas frecuentes</Text>
        {faqs.map(({ q, a }) => (
          <View key={q} style={styles.faqItem}>
            <Text style={styles.faqQ}>{q}</Text>
            <Text style={styles.faqA}>{a}</Text>
          </View>
        ))}
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
  intro: { fontSize: 16, color: '#6b7280', marginBottom: 24, lineHeight: 24 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#f9fafb', borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: '#e5e7eb',
  },
  cardIcon: { fontSize: 28 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: BRAND_COLORS.TEXT, marginBottom: 2 },
  cardDesc: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  cardEmail: { fontSize: 14, color: BRAND_COLORS.PRIMARY, fontWeight: '600' },
  arrow: { fontSize: 18, color: '#9ca3af' },
  faqTitle: { fontSize: 18, fontWeight: '700', color: BRAND_COLORS.TEXT, marginTop: 8, marginBottom: 16 },
  faqItem: {
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 16, marginBottom: 16,
  },
  faqQ: { fontSize: 15, fontWeight: '600', color: '#1e40af', marginBottom: 6 },
  faqA: { fontSize: 14, color: '#374151', lineHeight: 22 },
});
