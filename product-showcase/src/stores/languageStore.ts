import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n';
import type { Product } from '../types/product';

// Supported languages
export type SupportedLanguage = 'en' | 'zh';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

// Language configuration
export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳'
  },
  {
    code: 'en', 
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸'
  }
];

// Multilingual field interface  
export interface MultilingualField {
  english?: string;
  chinese?: string;
  display?: string;
}

// Language store interface
interface LanguageState {
  // Current language
  currentLanguage: SupportedLanguage;
  isLanguageLoading: boolean;
  
  // Supported languages
  supportedLanguages: LanguageInfo[];
  
  // Actions
  changeLanguage: (language: SupportedLanguage) => Promise<void>;
  getCurrentLanguageInfo: () => LanguageInfo;
  getDisplayValue: (field: MultilingualField | string | undefined) => string;
  getProductDisplayValue: (field: MultilingualField | undefined, fallback?: string) => string;
  detectBrowserLanguage: () => SupportedLanguage;
}

// Helper function to get display value based on current language
const getDisplayValueForLanguage = (
  field: MultilingualField | string | undefined, 
  language: SupportedLanguage,
  fallback = '未知'
): string => {
  // Handle string values
  if (typeof field === 'string') {
    return field;
  }
  
  // Handle undefined/null
  if (!field) {
    return fallback;
  }
  
  // If display field exists, use it (existing system fallback)
  if (field.display) {
    return field.display;
  }
  
  // Apply language preference with fallback
  if (language === 'en') {
    return field.english || field.chinese || fallback;
  } else {
    return field.chinese || field.english || fallback;
  }
};

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentLanguage: 'zh', // Default to Chinese
      isLanguageLoading: false,
      supportedLanguages: SUPPORTED_LANGUAGES,

      // Change language
      changeLanguage: async (language: SupportedLanguage) => {
        const currentLang = get().currentLanguage;
        if (currentLang === language) return;

        set({ isLanguageLoading: true });
        
        try {
          // Change i18next language
          await i18n.changeLanguage(language);
          
          // Update store state  
          set({ 
            currentLanguage: language,
            isLanguageLoading: false 
          });

          // Update document lang attribute
          document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en-US';
          
          // Update document title if needed
          const titleKey = 'navigation:titles.home';
          if (i18n.exists(titleKey)) {
            document.title = i18n.t(titleKey);
          }
          
        } catch (error) {
          console.error('Failed to change language:', error);
          set({ isLanguageLoading: false });
        }
      },

      // Get current language info
      getCurrentLanguageInfo: () => {
        const currentLang = get().currentLanguage;
        return SUPPORTED_LANGUAGES.find(lang => lang.code === currentLang) || SUPPORTED_LANGUAGES[0];
      },

      // Get display value for current language
      getDisplayValue: (field: MultilingualField | string | undefined) => {
        const currentLang = get().currentLanguage;
        return getDisplayValueForLanguage(field, currentLang);
      },

      // Get product display value with specific fallback
      getProductDisplayValue: (field: MultilingualField | undefined, fallback = '未命名') => {
        const currentLang = get().currentLanguage;
        return getDisplayValueForLanguage(field, currentLang, fallback);
      },

      // Detect browser language
      detectBrowserLanguage: (): SupportedLanguage => {
        const browserLang = navigator.language.toLowerCase();
        if (browserLang.startsWith('zh')) {
          return 'zh';
        }
        return 'en';
      }
    }),
    {
      name: 'language-preferences',
      partialize: (state) => ({
        currentLanguage: state.currentLanguage
      })
    }
  )
);

// Selector hooks for convenience
export const useCurrentLanguage = () => useLanguageStore(state => state.currentLanguage);
export const useLanguageActions = () => useLanguageStore(state => ({
  changeLanguage: state.changeLanguage,
  getDisplayValue: state.getDisplayValue,
  getProductDisplayValue: state.getProductDisplayValue,
  getCurrentLanguageInfo: state.getCurrentLanguageInfo
}));
export const useLanguageInfo = () => useLanguageStore(state => ({
  currentLanguage: state.currentLanguage,
  supportedLanguages: state.supportedLanguages,
  isLanguageLoading: state.isLanguageLoading,
  languageInfo: state.getCurrentLanguageInfo()
}));