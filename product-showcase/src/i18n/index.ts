import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from '../locales/en/common.json';
import enProduct from '../locales/en/product.json';
import enNavigation from '../locales/en/navigation.json';
import zhCommon from '../locales/zh/common.json';
import zhProduct from '../locales/zh/product.json';
import zhNavigation from '../locales/zh/navigation.json';

// Define resources using imported JSON files
export const resources = {
  en: {
    common: enCommon,
    product: enProduct,
    navigation: enNavigation
  },
  zh: {
    common: zhCommon,
    product: zhProduct,
    navigation: zhNavigation
  }
} as const;

// Configure language detection
const languageDetector = new LanguageDetector();

// Initialize i18next
i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh', // Default to Chinese as most content is Chinese
    lng: undefined, // Let the detector decide
    
    // Namespace configuration
    defaultNS: 'common',
    ns: ['common', 'product', 'navigation'],
    
    // Detection configuration
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    
    // Interpolation configuration
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // React specific options
    react: {
      useSuspense: false, // Disable suspense for now
    },
    
    // Debug mode (disable in production)
    debug: process.env.NODE_ENV === 'development',
  });

export default i18n;