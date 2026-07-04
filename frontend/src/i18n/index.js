import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './fr.json';
import ar from './ar.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
];

const defaultLocale = import.meta.env.VITE_DEFAULT_LOCALE || 'fr';
const storedLocale = typeof window !== 'undefined' ? localStorage.getItem('copilote-hadj-lang') : null;

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    ar: { translation: ar },
  },
  lng: storedLocale || defaultLocale,
  fallbackLng: 'fr',
  interpolation: {
    escapeValue: false,
  },
});

export function applyDocumentDirection(lang) {
  const meta = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];
  document.documentElement.lang = meta.code;
  document.documentElement.dir = meta.dir;
}

i18n.on('languageChanged', (lang) => {
  applyDocumentDirection(lang);
  localStorage.setItem('copilote-hadj-lang', lang);
});

applyDocumentDirection(i18n.language);

export default i18n;
