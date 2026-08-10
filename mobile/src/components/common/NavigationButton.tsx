// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Botón de navegación — abre Waze o Google Maps con el destino
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import {
  TouchableOpacity, Text, StyleSheet, Linking, Alert, Platform, ViewStyle,
} from 'react-native';

interface Props {
  lat?: number | null;
  lng?: number | null;
  address?: string;
  label?: string;
  style?: ViewStyle;
}

function isValidCoord(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v);
}

export function NavigationButton({ lat, lng, address, label = 'Navigate', style }: Props) {
  const hasCoords = isValidCoord(lat) && isValidCoord(lng);

  const openWaze = async () => {
    if (hasCoords) {
      const url = `waze://?ll=${lat},${lng}&navigate=yes`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) { Linking.openURL(url); return; }
    }
    if (address) {
      const encoded = encodeURIComponent(address);
      const webUrl = hasCoords
        ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
        : `https://waze.com/ul?q=${encoded}&navigate=yes`;
      Linking.openURL(webUrl);
    }
  };

  const openGoogleMaps = async () => {
    if (hasCoords) {
      const appUrl = Platform.select({
        ios:     `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
        android: `google.navigation:q=${lat},${lng}`,
      }) ?? `https://maps.google.com/?daddr=${lat},${lng}`;

      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) { Linking.openURL(appUrl); return; }
    }

    // Fallback: use address string in web URL
    const query = address
      ? encodeURIComponent(address)
      : (hasCoords ? `${lat},${lng}` : '');
    if (query) {
      Linking.openURL(`https://maps.google.com/?q=${query}`);
    }
  };

  const handlePress = () => {
    Alert.alert('Open navigation', 'Choose your navigation app:', [
      { text: 'Waze',        onPress: openWaze },
      { text: 'Google Maps', onPress: openGoogleMaps },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <TouchableOpacity style={[styles.btn, style]} onPress={handlePress} activeOpacity={0.8}>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn:   { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1A2E', borderRadius: 10, paddingHorizontal: 8 },
  label: { color: '#fff', fontWeight: '700', fontSize: 11 },
});
