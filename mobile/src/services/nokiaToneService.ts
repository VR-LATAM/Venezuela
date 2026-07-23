// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Nokia SMS Tone Service
// Usa el archivo WAV pre-generado bundleado como asset estático.
// Metro lo incluye automáticamente al hacer require().
// ═══════════════════════════════════════════════════════════════

import { Audio } from 'expo-av';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const NOKIA_WAV = require('../../assets/nokia_tone.wav') as number;

let activeSound: Audio.Sound | null = null;
let audioModeSet = false;

async function ensureAudioMode(): Promise<void> {
  if (audioModeSet) return;
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    allowsRecordingIOS:   false,
  });
  audioModeSet = true;
}

export const nokiaToneService = {

  /** Precarga el asset para que la primera reproducción sea inmediata */
  async preload(): Promise<void> {
    try {
      await ensureAudioMode();
      const { sound } = await Audio.Sound.createAsync(NOKIA_WAV, { shouldPlay: false });
      // Guardamos temporalmente para tenerlo listo; lo descargamos si ya hay uno activo
      if (activeSound) {
        await activeSound.unloadAsync().catch(() => {});
      }
      activeSound = sound;
      console.log('[NokiaTone] preload OK');
    } catch (err) {
      console.error('[NokiaTone] preload FAILED:', err);
    }
  },

  async play(): Promise<void> {
    try {
      await ensureAudioMode();

      // Descargar sonido anterior si estaba activo
      if (activeSound) {
        await activeSound.stopAsync().catch(() => {});
        await activeSound.unloadAsync().catch(() => {});
        activeSound = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        NOKIA_WAV,
        { shouldPlay: true, volume: 1.0 },
      );
      activeSound = sound;
      console.log('[NokiaTone] reproduciendo Nokia tune');

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          if (activeSound === sound) activeSound = null;
        }
      });
    } catch (err) {
      console.error('[NokiaTone] play FAILED:', err);
    }
  },

  async stop(): Promise<void> {
    if (!activeSound) return;
    try {
      await activeSound.stopAsync();
      await activeSound.unloadAsync();
    } catch { /* ya terminó */ }
    activeSound = null;
  },
};
