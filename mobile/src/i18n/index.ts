// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Configuración i18n — react-i18next
// Detecta el idioma del sistema automáticamente
// Soporta cambio de idioma sin reiniciar la app
// ═══════════════════════════════════════════════════════════════

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import es from './locales/es.json';
import en from './locales/en.json';

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    lng: 'es',
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false, // React ya escapa el HTML
    },
  });

export default i18n;

// Helper para cambiar idioma (usado en configuración de perfil)
export function changeLanguage(language: 'es' | 'en'): void {
  i18n.changeLanguage(language);
}
