import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n';

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

  // 防抖相关
  lastChangeTime: number;

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
      lastChangeTime: 0,

      // Change language - 使用稳定的引用和防抖
      changeLanguage: async (language: SupportedLanguage) => {
        const state = get();
        const now = Date.now();

        // 防抖：如果距离上次切换不到500ms，则忽略
        if (now - state.lastChangeTime < 500) {
          return;
        }

        if (state.currentLanguage === language || state.isLanguageLoading) return;

        set({
          isLanguageLoading: true,
          lastChangeTime: now
        });

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
          set({
            isLanguageLoading: false,
            // 保持当前语言不变
            currentLanguage: state.currentLanguage
          });
          throw error; // 重新抛出错误以便上层处理
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
export const useLanguageActions = () => {
  const changeLanguage = useLanguageStore(state => state.changeLanguage);
  const getDisplayValue = useLanguageStore(state => state.getDisplayValue);
  const getProductDisplayValue = useLanguageStore(state => state.getProductDisplayValue);
  const getCurrentLanguageInfo = useLanguageStore(state => state.getCurrentLanguageInfo);

  return React.useMemo(() => ({
    changeLanguage,
    getDisplayValue,
    getProductDisplayValue,
    getCurrentLanguageInfo
  }), [changeLanguage, getDisplayValue, getProductDisplayValue, getCurrentLanguageInfo]);
};
export const useLanguageInfo = () => {
  const currentLanguage = useLanguageStore(state => state.currentLanguage);
  const supportedLanguages = useLanguageStore(state => state.supportedLanguages);
  const isLanguageLoading = useLanguageStore(state => state.isLanguageLoading);

  // Use React.useMemo to cache the result and prevent infinite loops
  return React.useMemo(() => {
    const languageInfo = SUPPORTED_LANGUAGES.find(lang => lang.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

    return {
      currentLanguage,
      supportedLanguages,
      isLanguageLoading,
      languageInfo
    };
  }, [currentLanguage, supportedLanguages, isLanguageLoading]);
};