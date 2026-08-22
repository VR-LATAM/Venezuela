// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Stack } from 'expo-router';

export default function PassengerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="categories" />
      <Stack.Screen name="home" />
      <Stack.Screen name="ride"     options={{ gestureEnabled: false }} />
      <Stack.Screen name="rating"   options={{ gestureEnabled: false }} />
      <Stack.Screen name="payments" />
      <Stack.Screen name="spending" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="history" />
      <Stack.Screen name="special-needs" />
      <Stack.Screen name="referrals" />
    </Stack>
  );
}
