import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/authStore';

const API_BASE = `${
  Constants.expoConfig?.extra?.apiUrl ??
  process.env['EXPO_PUBLIC_API_URL'] ??
  'http://localhost:3000'
}/api/v1`;

export function usePhotoUpload() {
  const [uploading, setUploading] = useState(false);
  const { setUser, user } = useAuthStore();

  const uploadAsset = async (asset: ImagePicker.ImagePickerAsset): Promise<string | null> => {
    setUploading(true);
    try {
      const token = await SecureStore.getItemAsync('access_token');
      const url   = `${API_BASE}/user/photo`;
      console.log('[Photo] uri=', asset.uri);
      console.log('[Photo] url=', url);
      console.log('[Photo] token=', token ? token.slice(0, 20) + '...' : 'NULL');

      const formData = new FormData();
      formData.append('photo', {
        uri:  asset.uri,
        name: `photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as any);

      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token ?? ''}` },
        body: formData,
      });

      console.log('[Photo] status=', response.status);

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        console.log('[Photo] body=', text);
        let detail = `HTTP ${response.status}`;
        try { detail = JSON.parse(text)?.detail ?? JSON.parse(text)?.error ?? detail; } catch {}
        Alert.alert('Error al subir foto', `${response.status}: ${detail}`);
        return null;
      }

      const body = await response.json();
      if (user) setUser({ ...user, photo_url: body.photoUrl });
      return body.photoUrl as string;
    } catch (err: any) {
      console.log('[Photo] catch error=', String(err));
      Alert.alert('Error al subir foto', err?.message ?? String(err));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const fromCamera = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara para tomar la foto.');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
    });
    if (result.canceled || !result.assets[0]) return null;
    return uploadAsset(result.assets[0]);
  };

  const fromGallery = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para elegir la foto.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
    });
    if (result.canceled || !result.assets[0]) return null;
    return uploadAsset(result.assets[0]);
  };

  const pickAndUpload = (): Promise<string | null> =>
    new Promise((resolve) => {
      Alert.alert(
        'Foto de perfil',
        'Elige cómo agregar tu foto',
        [
          { text: '📷 Tomar foto',        onPress: () => fromCamera().then(resolve)  },
          { text: '🖼️ Elegir de galería', onPress: () => fromGallery().then(resolve) },
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
        ]
      );
    });

  return { pickAndUpload, uploading };
}
