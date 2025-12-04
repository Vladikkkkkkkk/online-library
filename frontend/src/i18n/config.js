import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ukTranslations from './locales/uk.json';
import enTranslations from './locales/en.json';

i18n

  .use(LanguageDetector)

  .use(initReactI18next)

  .init({
    resources: {
      uk: {
        translation: ukTranslations,
      },
      en: {
        translation: enTranslations,
      },
    },
    fallbackLng: 'uk',
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false, 
    },
    detection: {

      order: ['localStorage', 'navigator'],

      lookupLocalStorage: 'i18nextLng',

      caches: ['localStorage'],
    },
  });

export default i18n;

