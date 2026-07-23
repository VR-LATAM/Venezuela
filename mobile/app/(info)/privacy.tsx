// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { BRAND_COLORS } from '@vride/shared';

const sections = [
  { title: '1. Introduction', body: 'Verona Ride LLC ("Verona Ride", "we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services.' },
  { title: '2. Information We Collect', body: 'We collect: full name, email address, phone number, date of birth and government-issued ID (drivers), profile photo, payment information (processed by Stripe — we never store card numbers), GPS location data during trips, and optional mobility/disability preferences if you choose to provide them.' },
  { title: '3. How We Use Your Information', body: 'We use your information to: provide and improve our service, match passengers with drivers, process payments and issue receipts, send trip updates and safety alerts, respond to support requests, comply with legal obligations, and detect and prevent fraud.' },
  { title: '4. Sharing of Information', body: 'Limited trip details are shared between matched passengers and drivers. We work with trusted service providers (Stripe, Google Maps, Firebase) under strict confidentiality agreements. We may share information with legal authorities when required by law. We do not sell your personal information.' },
  { title: '5. Data Retention', body: 'We keep your data while your account is active or as needed to provide our service. Trip records are retained for up to 7 years for legal and accounting purposes. You may request account deletion by contacting us.' },
  { title: '6. Security', body: 'We use industry-standard security measures including encrypted data transmission (HTTPS/TLS), secure cloud infrastructure, and strict access controls.' },
  { title: '7. Your Rights', body: 'Depending on your state, you may have the right to access, correct, or delete your personal data, and to opt out of certain data uses. To exercise these rights, contact support@veronaride.app.' },
  { title: '8. Children\'s Privacy', body: 'Our service is not directed to children under 18. We do not knowingly collect personal information from anyone under 18 years of age.' },
  { title: '9. Contact', body: 'Questions? Contact us at:\nVerona Ride LLC\nTexas, United States\nEmail: support@veronaride.app' },
];

export default function PrivacyScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated: April 24, 2025</Text>
        {sections.map(s => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
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
  updated: { fontSize: 13, color: '#9ca3af', marginBottom: 24 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 10 },
  sectionBody: { fontSize: 15, lineHeight: 24, color: '#374151' },
});
