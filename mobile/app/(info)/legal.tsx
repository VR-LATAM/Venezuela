// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { BRAND_COLORS } from '@vride/shared';

const sections = [
  { title: '1. Company Information', body: 'Verona Ride LLC\nState of incorporation: Texas, United States\nEmail: support@veronaride.app' },
  { title: '2. Nature of Service', body: 'Verona Ride operates a technology platform that connects passengers with independent transportation providers. Verona Ride is a technology intermediary and is not itself a transportation company. Drivers are independent contractors, not employees of Verona Ride LLC.' },
  { title: '3. Limitation of Liability', body: 'To the fullest extent permitted by applicable law, Verona Ride LLC shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service. Our total liability shall not exceed the amount you paid to Verona Ride in the three (3) months preceding the claim.' },
  { title: '4. Disclaimer of Warranties', body: 'The service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the service will be uninterrupted or error-free.' },
  { title: '5. User Responsibilities', body: 'By using Verona Ride, you agree to: provide accurate information, use the service only for lawful purposes, not misuse the platform, treat drivers with respect, and comply with all applicable laws.' },
  { title: '6. Driver Responsibilities', body: 'Drivers are independent contractors responsible for: holding a valid license and registration, maintaining adequate insurance, complying with transportation regulations, and ensuring the safety and quality of their services.' },
  { title: '7. Intellectual Property', body: 'All content on Verona Ride — including the logo, brand name, app design, and written content — is the exclusive property of Verona Ride LLC and is protected by U.S. intellectual property laws.' },
  { title: '8. Governing Law', body: 'This Legal Notice is governed by the laws of the State of Texas, United States, without regard to conflict of law provisions.' },
  { title: '9. Dispute Resolution', body: 'Disputes shall first be addressed through good-faith negotiation. If not resolved within 30 days, they shall be submitted to binding arbitration under the American Arbitration Association rules, in the State of Texas.' },
  { title: '10. Contact', body: 'For legal inquiries:\nVerona Ride LLC\nTexas, United States\nEmail: support@veronaride.app' },
];

export default function LegalScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Legal Notice</Text>
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
