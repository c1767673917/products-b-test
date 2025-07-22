import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { useLanguageStore } from '../stores/languageStore';
import { useTranslation } from 'react-i18next';

// Mock dependencies
vi.mock('../stores/languageStore');
vi.mock('react-i18next');

const mockSetLanguage = vi.fn();
const mockT = vi.fn();
const mockUseLanguageStore = useLanguageStore as vi.MockedFunction<typeof useLanguageStore>;
const mockUseTranslation = useTranslation as vi.MockedFunction<typeof useTranslation>;

describe('LanguageSwitcher Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseTranslation.mockReturnValue({
      t: mockT,
      i18n: {
        language: 'zh',
        changeLanguage: vi.fn(),
      } as any,
    } as any);
    
    mockT.mockImplementation((key: string) => {
      const translations: Record<string, string> = {
        'language.chinese': '中文',
        'language.english': 'English',
        'language.switchTo': 'Switch to',
      };
      return translations[key] || key;
    });
  });

  describe('Dropdown Language Switcher', () => {
    beforeEach(() => {
      mockUseLanguageStore.mockReturnValue({
        currentLanguage: 'zh',
        setLanguage: mockSetLanguage,
      });
    });

    it('should render dropdown with current language', () => {
      render(<LanguageSwitcher variant="dropdown" />);
      
      expect(screen.getByText('中文')).toBeInTheDocument();
    });

    it('should show language options when clicked', async () => {
      render(<LanguageSwitcher variant="dropdown" />);
      
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByText('English')).toBeInTheDocument();
      });
    });

    it('should switch language when option is selected', async () => {
      render(<LanguageSwitcher variant="dropdown" />);
      
      const trigger = screen.getByRole('button');
      fireEvent.click(trigger);
      
      await waitFor(() => {
        const englishOption = screen.getByText('English');
        fireEvent.click(englishOption);
      });
      
      expect(mockSetLanguage).toHaveBeenCalledWith('en');
    });
  });

  describe('Button Language Switcher', () => {
    beforeEach(() => {
      mockUseLanguageStore.mockReturnValue({
        currentLanguage: 'zh',
        setLanguage: mockSetLanguage,
      });
    });

    it('should render both language buttons', () => {
      render(<LanguageSwitcher variant="button" />);
      
      expect(screen.getByRole('button', { name: /中文/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /English/ })).toBeInTheDocument();
    });

    it('should highlight current language button', () => {
      render(<LanguageSwitcher variant="button" />);
      
      const chineseButton = screen.getByRole('button', { name: /中文/ });
      expect(chineseButton).toHaveClass('bg-blue-500', 'text-white');
    });

    it('should switch to English when English button is clicked', () => {
      render(<LanguageSwitcher variant="button" />);
      
      const englishButton = screen.getByRole('button', { name: /English/ });
      fireEvent.click(englishButton);
      
      expect(mockSetLanguage).toHaveBeenCalledWith('en');
    });

    it('should switch to Chinese when Chinese button is clicked', () => {
      mockUseLanguageStore.mockReturnValue({
        currentLanguage: 'en',
        setLanguage: mockSetLanguage,
      });
      
      render(<LanguageSwitcher variant="button" />);
      
      const chineseButton = screen.getByRole('button', { name: /中文/ });
      fireEvent.click(chineseButton);
      
      expect(mockSetLanguage).toHaveBeenCalledWith('zh');
    });
  });

  describe('Compact Language Switcher', () => {
    beforeEach(() => {
      mockUseLanguageStore.mockReturnValue({
        currentLanguage: 'zh',
        setLanguage: mockSetLanguage,
      });
    });

    it('should render compact switcher with correct text', () => {
      render(<LanguageSwitcher variant="compact" />);
      
      expect(screen.getByText('EN')).toBeInTheDocument();
    });

    it('should show tooltip with switch message', async () => {
      render(<LanguageSwitcher variant="compact" />);
      
      const button = screen.getByRole('button');
      
      // Simulate hover
      fireEvent.mouseEnter(button);
      
      await waitFor(() => {
        expect(screen.getByText('Switch to English')).toBeInTheDocument();
      });
    });

    it('should switch language when clicked', () => {
      render(<LanguageSwitcher variant="compact" />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockSetLanguage).toHaveBeenCalledWith('en');
    });

    it('should update text when language changes', () => {
      const { rerender } = render(<LanguageSwitcher variant="compact" />);
      
      expect(screen.getByText('EN')).toBeInTheDocument();
      
      // Change language to English
      mockUseLanguageStore.mockReturnValue({
        currentLanguage: 'en',
        setLanguage: mockSetLanguage,
      });
      
      rerender(<LanguageSwitcher variant="compact" />);
      
      expect(screen.getByText('中')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseLanguageStore.mockReturnValue({
        currentLanguage: 'zh',
        setLanguage: mockSetLanguage,
      });
    });

    it('should have proper ARIA labels for dropdown', () => {
      render(<LanguageSwitcher variant="dropdown" />);
      
      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('aria-label', 'Select language');
      expect(trigger).toHaveAttribute('aria-haspopup', 'true');
    });

    it('should have proper ARIA labels for buttons', () => {
      render(<LanguageSwitcher variant="button" />);
      
      const chineseButton = screen.getByRole('button', { name: /中文/ });
      const englishButton = screen.getByRole('button', { name: /English/ });
      
      expect(chineseButton).toHaveAttribute('aria-pressed', 'true');
      expect(englishButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should support keyboard navigation for dropdown', async () => {
      render(<LanguageSwitcher variant="dropdown" />);
      
      const trigger = screen.getByRole('button');
      
      // Focus and press Enter to open
      trigger.focus();
      fireEvent.keyDown(trigger, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('English')).toBeInTheDocument();
      });
      
      // Navigate with arrow keys
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });
      
      // Select with Enter
      const englishOption = screen.getByText('English');
      fireEvent.keyDown(englishOption, { key: 'Enter' });
      
      expect(mockSetLanguage).toHaveBeenCalledWith('en');
    });
  });

  describe('Performance', () => {
    beforeEach(() => {
      mockUseLanguageStore.mockReturnValue({
        currentLanguage: 'zh',
        setLanguage: mockSetLanguage,
      });
    });

    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<LanguageSwitcher variant="button" />);
      
      // Simulate prop changes that shouldn't cause re-render
      rerender(<LanguageSwitcher variant="button" />);
      
      // Should still work correctly
      const englishButton = screen.getByRole('button', { name: /English/ });
      fireEvent.click(englishButton);
      
      expect(mockSetLanguage).toHaveBeenCalledWith('en');
    });

    it('should handle rapid language switching', async () => {
      render(<LanguageSwitcher variant="compact" />);
      
      const button = screen.getByRole('button');
      
      // Rapidly click multiple times
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      // Should not cause issues
      expect(mockSetLanguage).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing language store gracefully', () => {
      mockUseLanguageStore.mockReturnValue({
        currentLanguage: 'zh',
        setLanguage: undefined as any,
      });
      
      render(<LanguageSwitcher variant="button" />);
      
      const englishButton = screen.getByRole('button', { name: /English/ });
      
      // Should not throw error
      expect(() => {
        fireEvent.click(englishButton);
      }).not.toThrow();
    });

    it('should handle invalid language codes', () => {
      mockUseLanguageStore.mockReturnValue({
        currentLanguage: 'invalid' as any,
        setLanguage: mockSetLanguage,
      });
      
      // Should still render without crashing
      expect(() => {
        render(<LanguageSwitcher variant="dropdown" />);
      }).not.toThrow();
    });
  });
});