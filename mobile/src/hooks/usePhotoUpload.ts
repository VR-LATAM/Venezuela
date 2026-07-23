// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { apiClient } from '../services/apiClient';
import { useAuthStore } from '../store/authStore';

export function usePhotoUpload() {
  const [uploading, setUploading] = useState(false);
  const { setUser, user } = useAuthStore();

  const pickAndUpload = async (): Promise<string | null> => {
    // Pedir permiso a la galería
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto.');
      return null;
    }

    // Abrir galería
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return null;

    const asset = result.assets[0];
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('photo', {
        uri:  asset.uri,
        name: `photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as any);

      const { data } = await apiClient.post<{ photoUrl: string }>(
        '/user/photo',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          transformRequest: [(d: any) => d], // evitar que axios serialice el FormData a JSON
        }
      );

      // Actualizar el store local con la nueva URL
      if (user) setUser({ ...user, photo_url: data.photoUrl });

      return data.photoUrl;
    } catch {
      Alert.alert('Error', 'No se pudo subir la foto. Intenta de nuevo.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { pickAndUpload, uploading };
}
