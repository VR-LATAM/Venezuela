// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { router } from 'expo-router';
import { BRAND_COLORS } from '@vride/shared';

const contacts = [
  { icon: '📧', title: 'General Support', desc: 'Questions about rides, your account, or the app.', email: 'support@veronaride.app' },
  { icon: '🚗', title: 'Become a Driver', desc: 'Interested in driving with Verona Ride?', email: 'drivers@veronaride.app' },
  { icon: '🏢', title: 'Business Inquiries', desc: 'Partnerships and corporate transportation.', email: 'business@veronaride.app' },
];

const faqs = [
  { q: 'Where is Verona Ride available?', a: 'Currently operating in Texas, expanding to other states.' },
  { q: 'How are drivers verified?', a: 'Every driver undergoes a background check, DMV review, and vehicle inspection.' },
  { q: 'Can I schedule a ride in advance?', a: 'Yes, up to 7 days in advance from the app.' },
  { q: 'What if I need a wheelchair-accessible vehicle?', a: 'Select "Accessible" when booking and we\'ll match you with the right vehicle.' },
];

export default function ContactScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>We're here to help. Reach out anytime.</Text>

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

        <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
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
  container: { flex: 1, backgroundColor: '#fff' },
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
