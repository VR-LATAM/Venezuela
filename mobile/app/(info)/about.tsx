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
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Us</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />

        <Text style={styles.tagline}>Accessible Transport for All</Text>

        <Text style={styles.body}>
          Verona Ride was founded with a simple but powerful mission: to ensure that seniors and people
          with disabilities have access to safe, dignified, and reliable transportation — no matter where
          they are in the United States.
        </Text>

        <Text style={styles.body}>
          Our platform connects passengers who need accessible transport with trained, background-verified
          drivers. Every vehicle in our network is equipped to accommodate mobility devices, and every
          driver receives specific training in elder and disability care.
        </Text>

        <Text style={styles.body}>
          We are a family-owned company built on values of trust, respect, and community. The name
          Verona Ride reflects our commitment to a reliable and premium experience for every rider —
          because everyone deserves to move freely.
        </Text>

        <Text style={styles.body}>
          Headquartered in Texas, we are expanding nationally to serve communities that have historically
          been underserved by traditional rideshare platforms.
        </Text>

        <View style={styles.card}>
          {[
            { icon: '♿', text: 'Accessible vehicles for all mobility needs' },
            { icon: '🛡️', text: 'Background-verified, trained drivers' },
            { icon: '📍', text: 'Nationwide coverage, starting in Texas' },
            { icon: '📞', text: '24/7 emergency support and SOS button' },
          ].map(({ icon, text }) => (
            <View key={text} style={styles.cardRow}>
              <Text style={styles.cardIcon}>{icon}</Text>
              <Text style={styles.cardText}>{text}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.version}>Version 1.0.0 · © 2025 Verona Ride LLC</Text>
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
