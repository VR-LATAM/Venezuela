// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// Layout del prestatario de servicios Comunidad

import { Stack } from 'expo-router';

export default function ProviderLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
    </Stack>
  );
}
