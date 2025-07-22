import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLanguageInfo, useLanguageActions } from '../../stores/languageStore';
import { useTranslation } from 'react-i18next';

// Mock dependencies
vi.mock('../../stores/languageStore');
vi.mock('react-i18next');

const mockChangeLanguage = vi.fn();
const mockT = vi.fn((key: string) => key);
const mockUseLanguageInfo = useLanguageInfo as vi.MockedFunction<typeof useLanguageInfo>;
const mockUseLanguageActions = useLanguageActions as vi.MockedFunction<typeof useLanguageActions>;
const mockUseTranslation = useTranslation as vi.MockedFunction<typeof useTranslation>;

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseTranslation.mockReturnValue({
      t: mockT,
      i18n: {} as any,
      ready: true
    });

    mockUseLanguageInfo.mockReturnValue({
      currentLanguage: 'zh',
      supportedLanguages: [
        { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
        { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' }
      ],
      isLanguageLoading: false,
      languageInfo: { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' }
    });

    mockUseLanguageActions.mockReturnValue({
      changeLanguage: mockChangeLanguage,
      getDisplayValue: vi.fn(),
      getProductDisplayValue: vi.fn(),
      getCurrentLanguageInfo: vi.fn()
    });
  });

  describe('Dropdown variant', () => {
    it('should render without infinite loops', () => {
      expect(() => {
        render(<LanguageSwitcher variant="dropdown" />);
      }).not.toThrow();
    });

    it('should display current language', () => {
      render(<LanguageSwitcher variant="dropdown" />);
      expect(screen.getByText('🇨🇳')).toBeInTheDocument();
      expect(screen.getByText('中文')).toBeInTheDocument();
    });

    it('should handle language change without errors', async () => {
      render(<LanguageSwitcher variant="dropdown" />);
      
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);
      
      await waitFor(() => {
        const englishOption = screen.getByText('English');
        fireEvent.click(englishOption);
      });
      
      expect(mockChangeLanguage).toHaveBeenCalledWith('en');
    });
  });

  describe('Buttons variant', () => {
    it('should render without infinite loops', () => {
      expect(() => {
        render(<LanguageSwitcher variant="buttons" />);
      }).not.toThrow();
    });

    it('should render both language buttons', () => {
      render(<LanguageSwitcher variant="buttons" />);
      expect(screen.getByText('🇨🇳')).toBeInTheDocument();
      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
    });
  });

  describe('Compact variant', () => {
    it('should render without infinite loops', () => {
      expect(() => {
        render(<LanguageSwitcher variant="compact" />);
      }).not.toThrow();
    });

    it('should render flag buttons', () => {
      render(<LanguageSwitcher variant="compact" />);
      expect(screen.getByText('🇨🇳')).toBeInTheDocument();
      expect(screen.getByText('🇺🇸')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should handle language change errors gracefully', async () => {
      mockChangeLanguage.mockRejectedValueOnce(new Error('Network error'));
      
      render(<LanguageSwitcher variant="dropdown" />);
      
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);
      
      await waitFor(() => {
        const englishOption = screen.getByText('English');
        fireEvent.click(englishOption);
      });
      
      // Should not throw error, just log it
      expect(mockChangeLanguage).toHaveBeenCalledWith('en');
    });

    it('should prevent multiple rapid language changes', async () => {
      mockUseLanguageInfo.mockReturnValue({
        currentLanguage: 'zh',
        supportedLanguages: [
          { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
          { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' }
        ],
        isLanguageLoading: true, // Loading state
        languageInfo: { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' }
      });

      render(<LanguageSwitcher variant="dropdown" />);
      
      const trigger = screen.getByRole('button');
      expect(trigger).toBeDisabled();
    });
  });
});
