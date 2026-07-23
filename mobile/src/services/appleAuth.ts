// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// Apple Sign-In — solo iOS. Usa dynamic require() para no crashear en Android.

import { Platform } from 'react-native';
import { OAuthProvider, signInWithCredential } from 'firebase/auth';
import { getFirebaseAuth } from './authService';
import type { SocialAuthResult } from '../hooks/useGoogleAuth';

export const isAppleSignInAvailable = Platform.OS === 'ios';

export async function signInWithApple(): Promise<SocialAuthResult | null> {
  if (Platform.OS !== 'ios') return null;

  // Dynamic imports — solo se cargan en iOS para evitar crash en Android
  const AppleAuthentication = require('expo-apple-authentication');
  const Crypto = require('expo-crypto');

  const nonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    nonce,
  );

  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!appleCredential.identityToken) return null;

  const provider = new OAuthProvider('apple.com');
  const firebaseCredential = provider.credential({
    idToken:  appleCredential.identityToken,
    rawNonce: nonce,
  });

  const { user } = await signInWithCredential(getFirebaseAuth(), firebaseCredential);
  const firebaseToken = await user.getIdToken();

  const fullName = appleCredential.fullName;
  const name = fullName
    ? [fullName.givenName, fullName.familyName].filter(Boolean).join(' ')
    : user.displayName ?? '';

  return {
    firebaseToken,
    name,
    email: appleCredential.email ?? user.email ?? '',
  };
}

// Componente del botón de Apple — cargado dinámicamente para no crashear en Android
export function getAppleButtonComponent() {
  if (Platform.OS !== 'ios') return null;
  return require('expo-apple-authentication').AppleAuthenticationButton;
}

export const AppleButtonType = Platform.OS === 'ios'
  ? require('expo-apple-authentication').AppleAuthenticationButtonType
  : null;

export const AppleButtonStyle = Platform.OS === 'ios'
  ? require('expo-apple-authentication').AppleAuthenticationButtonStyle
  : null;
