// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Stack } from 'expo-router';

export default function InfoLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="about" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="legal" />
      <Stack.Screen name="contact" />
    </Stack>
  );
}
