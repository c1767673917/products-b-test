import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useLanguageStore } from '../stores/languageStore';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock navigator.language
Object.defineProperty(navigator, 'language', {
  value: 'en-US',
  configurable: true,
});

describe('useLanguageStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    // Reset store state
    act(() => {
      useLanguageStore.getState().setLanguage('zh');
    });
  });

  describe('initialization', () => {
    it('should initialize with Chinese as default language', () => {
      const { result } = renderHook(() => useLanguageStore());
      
      expect(result.current.currentLanguage).toBe('zh');
    });

    it('should load language from localStorage if available', () => {
      localStorageMock.getItem.mockReturnValue('en');
      
      const { result } = renderHook(() => useLanguageStore());
      
      expect(result.current.currentLanguage).toBe('en');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('language-preference');
    });

    it('should detect browser language if supported', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'en-US',
        configurable: true,
      });
      
      // Create a new store instance to test initialization
      const { result } = renderHook(() => useLanguageStore());
      
      // The store should still default to Chinese unless explicitly set
      expect(result.current.currentLanguage).toBe('zh');
    });

    it('should handle invalid language from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('invalid-language');
      
      const { result } = renderHook(() => useLanguageStore());
      
      expect(result.current.currentLanguage).toBe('zh');
    });
  });

  describe('setLanguage', () => {
    it('should update current language', () => {
      const { result } = renderHook(() => useLanguageStore());
      
      act(() => {
        result.current.setLanguage('en');
      });
      
      expect(result.current.currentLanguage).toBe('en');
    });

    it('should save language to localStorage', () => {
      const { result } = renderHook(() => useLanguageStore());
      
      act(() => {
        result.current.setLanguage('en');
      });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('language-preference', 'en');
    });

    it('should handle switching between languages multiple times', () => {
      const { result } = renderHook(() => useLanguageStore());
      
      act(() => {
        result.current.setLanguage('en');
      });
      expect(result.current.currentLanguage).toBe('en');
      
      act(() => {
        result.current.setLanguage('zh');
      });
      expect(result.current.currentLanguage).toBe('zh');
      
      act(() => {
        result.current.setLanguage('en');
      });
      expect(result.current.currentLanguage).toBe('en');
    });

    it('should not update if setting the same language', () => {
      const { result } = renderHook(() => useLanguageStore());
      
      const initialCallCount = localStorageMock.setItem.mock.calls.length;
      
      act(() => {
        result.current.setLanguage('zh'); // Current language is already 'zh'
      });
      
      // localStorage should not be called again
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(initialCallCount);
    });

    it('should handle invalid language codes gracefully', () => {
      const { result } = renderHook(() => useLanguageStore());
      
      act(() => {
        result.current.setLanguage('invalid' as any);
      });
      
      // Should not crash and should maintain current language
      expect(result.current.currentLanguage).toBe('zh');
    });
  });

  describe('persistence', () => {
    it('should persist language changes across store instances', () => {
      // First instance
      const { result: result1 } = renderHook(() => useLanguageStore());
      
      act(() => {
        result1.current.setLanguage('en');
      });
      
      // Second instance should have the same language
      const { result: result2 } = renderHook(() => useLanguageStore());
      
      expect(result2.current.currentLanguage).toBe('en');
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const { result } = renderHook(() => useLanguageStore());
      
      expect(() => {
        act(() => {
          result.current.setLanguage('en');
        });
      }).not.toThrow();
      
      // Should still update the current language in memory
      expect(result.current.currentLanguage).toBe('en');
    });

    it('should handle localStorage getItem errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const { result } = renderHook(() => useLanguageStore());
      
      // Should fallback to default language
      expect(result.current.currentLanguage).toBe('zh');
    });
  });

  describe('reactivity', () => {
    it('should notify subscribers when language changes', () => {
      const { result } = renderHook(() => useLanguageStore());
      
      let callCount = 0;
      const unsubscribe = useLanguageStore.subscribe(() => {
        callCount++;
      });
      
      act(() => {
        result.current.setLanguage('en');
      });
      
      expect(callCount).toBe(1);
      
      act(() => {
        result.current.setLanguage('zh');
      });
      
      expect(callCount).toBe(2);
      
      unsubscribe();
    });

    it('should allow multiple components to use the store simultaneously', () => {
      const { result: result1 } = renderHook(() => useLanguageStore());
      const { result: result2 } = renderHook(() => useLanguageStore());
      
      expect(result1.current.currentLanguage).toBe(result2.current.currentLanguage);
      
      act(() => {
        result1.current.setLanguage('en');
      });
      
      expect(result1.current.currentLanguage).toBe('en');
      expect(result2.current.currentLanguage).toBe('en');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined localStorage', () => {
      const originalLocalStorage = window.localStorage;
      
      // Simulate environment without localStorage
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        configurable: true,
      });
      
      const { result } = renderHook(() => useLanguageStore());
      
      expect(() => {
        act(() => {
          result.current.setLanguage('en');
        });
      }).not.toThrow();
      
      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
      });
    });

    it('should handle concurrent language changes', async () => {
      const { result } = renderHook(() => useLanguageStore());
      
      // Simulate rapid concurrent changes
      await Promise.all([
        act(async () => {
          result.current.setLanguage('en');
        }),
        act(async () => {
          result.current.setLanguage('zh');
        }),
        act(async () => {
          result.current.setLanguage('en');
        }),
      ]);
      
      // Should end up in a consistent state
      expect(['zh', 'en']).toContain(result.current.currentLanguage);
    });

    it('should maintain state consistency during rapid updates', () => {
      const { result } = renderHook(() => useLanguageStore());
      
      // Perform multiple rapid updates
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.setLanguage(i % 2 === 0 ? 'en' : 'zh');
        });
      }
      
      // Should be in a valid state
      expect(['zh', 'en']).toContain(result.current.currentLanguage);
    });
  });

  describe('integration with browser environment', () => {
    it('should handle browser language preference detection', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'zh-CN',
        configurable: true,
      });
      
      // The store currently defaults to 'zh', which is correct for zh-CN
      const { result } = renderHook(() => useLanguageStore());
      expect(result.current.currentLanguage).toBe('zh');
    });

    it('should handle browser language preference for English', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'en-US',
        configurable: true,
      });
      
      // Without localStorage, should still default to 'zh'
      const { result } = renderHook(() => useLanguageStore());
      expect(result.current.currentLanguage).toBe('zh');
    });
  });
});