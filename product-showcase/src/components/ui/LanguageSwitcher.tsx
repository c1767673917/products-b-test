import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, LanguageIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguageStore, useLanguageInfo, useLanguageActions, type SupportedLanguage } from '../../stores/languageStore';
import { cn } from '../../utils/cn';

interface LanguageSwitcherProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'dropdown' | 'buttons' | 'compact';
  size?: 'sm' | 'md' | 'lg';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className,
  showLabel = true,
  variant = 'dropdown',
  size = 'md'
}) => {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  
  const { currentLanguage, supportedLanguages, isLanguageLoading, languageInfo } = useLanguageInfo();
  const { changeLanguage } = useLanguageActions();

  const handleLanguageChange = async (language: SupportedLanguage) => {
    if (language === currentLanguage || isLanguageLoading) return;
    
    setIsOpen(false);
    await changeLanguage(language);
  };

  // Size variants
  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-2', 
    lg: 'text-lg px-4 py-3'
  };

  // Compact variant (just flags)
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center space-x-1', className)}>
        {supportedLanguages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            disabled={isLanguageLoading}
            className={cn(
              'relative rounded-md transition-all duration-200',
              sizeClasses[size],
              currentLanguage === lang.code
                ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-500'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800',
              isLanguageLoading && 'opacity-50 cursor-not-allowed'
            )}
            title={`${t('language.switch')} - ${lang.nativeName}`}
          >
            <span className="text-lg">{lang.flag}</span>
            {currentLanguage === lang.code && (
              <motion.div
                layoutId="activeLanguageIndicator"
                className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <CheckIcon className="w-3 h-3" />
              </motion.div>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Button variant (toggle between two languages)
  if (variant === 'buttons') {
    return (
      <div className={cn('flex items-center bg-gray-100 rounded-lg p-1', className)}>
        {supportedLanguages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            disabled={isLanguageLoading}
            className={cn(
              'relative flex items-center space-x-2 rounded-md transition-all duration-200',
              sizeClasses[size],
              currentLanguage === lang.code
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900',
              isLanguageLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span>{lang.flag}</span>
            {showLabel && <span>{lang.nativeName}</span>}
            {currentLanguage === lang.code && (
              <motion.div
                layoutId="activeLanguageBackground"
                className="absolute inset-0 bg-white rounded-md shadow-sm border"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                style={{ zIndex: -1 }}
              />
            )}
          </button>
        ))}
      </div>
    );
  }

  // Dropdown variant (default)
  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLanguageLoading}
        className={cn(
          'flex items-center space-x-2 bg-white border border-gray-300 rounded-md shadow-sm transition-colors duration-200',
          sizeClasses[size],
          'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          isLanguageLoading && 'opacity-50 cursor-not-allowed'
        )}
        aria-label={t('language.switch')}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <LanguageIcon className="w-5 h-5 text-gray-400" />
        <span className="text-lg">{languageInfo.flag}</span>
        {showLabel && (
          <span className="text-gray-700 font-medium">
            {languageInfo.nativeName}
          </span>
        )}
        <ChevronDownIcon 
          className={cn(
            'w-4 h-4 text-gray-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50"
            role="listbox"
          >
            <div className="py-1">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  disabled={isLanguageLoading}
                  className={cn(
                    'flex items-center justify-between w-full px-4 py-2 text-left transition-colors duration-150',
                    currentLanguage === lang.code
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100',
                    isLanguageLoading && 'opacity-50 cursor-not-allowed'
                  )}
                  role="option"
                  aria-selected={currentLanguage === lang.code}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{lang.flag}</span>
                    <div>
                      <div className="font-medium">{lang.nativeName}</div>
                      <div className="text-sm text-gray-500">{lang.name}</div>
                    </div>
                  </div>
                  {currentLanguage === lang.code && (
                    <CheckIcon className="w-5 h-5 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
            
            {/* Language switch status */}
            {isLanguageLoading && (
              <div className="border-t border-gray-200 px-4 py-2">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                  <span>{t('status.processing')}</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default LanguageSwitcher;