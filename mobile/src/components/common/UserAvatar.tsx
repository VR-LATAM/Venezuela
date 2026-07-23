// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { BRAND_COLORS } from '@vride/shared';

interface Props {
  name?: string | null;
  photoUrl?: string | null;
  size?: number;
  backgroundColor?: string;
}

export function UserAvatar({ name, photoUrl, size = 52, backgroundColor }: Props) {
  const [imgError, setImgError] = useState(false);
  const initial  = (name ?? '?').charAt(0).toUpperCase();
  const radius   = size / 2;
  const fontSize = Math.round(size * 0.38);
  const bg       = backgroundColor ?? BRAND_COLORS.PRIMARY;

  if (photoUrl && !imgError) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[styles.base, { width: size, height: size, borderRadius: radius }]}
        onError={() => setImgError(true)}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: radius, backgroundColor: bg }]}>
      <Text style={{ fontSize, fontWeight: '700', color: '#fff' }}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
