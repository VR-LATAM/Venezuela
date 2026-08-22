// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register-passenger" />
      <Stack.Screen name="register-provider-type" />
      <Stack.Screen name="register-provider" />
      <Stack.Screen name="register-driver" />
      <Stack.Screen name="verify-email" />
    </Stack>
  );
}
