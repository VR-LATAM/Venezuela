// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// Hook de Google Sign-In usando expo-auth-session + Firebase

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { getFirebaseAuth } from '../services/authService';

WebBrowser.maybeCompleteAuthSession();

export interface SocialAuthResult {
  firebaseToken: string;
  name: string;
  email: string;
}

export function useGoogleAuth() {
  const [request, , promptAsync] = Google.useAuthRequest({
    webClientId:     process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'],
    iosClientId:     process.env['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'],
    androidClientId: process.env['EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'],
  });

  const signIn = async (): Promise<SocialAuthResult | null> => {
    const result = await promptAsync();
    if (result.type !== 'success' || !result.authentication) return null;

    const { idToken, accessToken } = result.authentication;
    const credential = GoogleAuthProvider.credential(idToken ?? null, accessToken);
    const { user } = await signInWithCredential(getFirebaseAuth(), credential);
    const firebaseToken = await user.getIdToken();

    return {
      firebaseToken,
      name:  user.displayName ?? '',
      email: user.email ?? '',
    };
  };

  return { signIn, ready: !!request };
}
