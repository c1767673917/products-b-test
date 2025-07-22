import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTranslation } from 'react-i18next';
import { useProductI18n } from '../hooks/useProductI18n';
import { useCurrentLanguage, useLanguageActions } from '../stores/languageStore';
import type { Product } from '../types/product';

// Mock dependencies
vi.mock('react-i18next');
vi.mock('../stores/languageStore');

const mockT = vi.fn();
const mockUseTranslation = useTranslation as vi.MockedFunction<typeof useTranslation>;
const mockUseCurrentLanguage = useCurrentLanguage as vi.MockedFunction<typeof useCurrentLanguage>;
const mockUseLanguageActions = useLanguageActions as vi.MockedFunction<typeof useLanguageActions>;

const mockGetProductDisplayValue = vi.fn();

describe('useProductI18n', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseTranslation.mockReturnValue({
      t: mockT,
      i18n: {
        language: 'zh',
        changeLanguage: vi.fn(),
      } as any,
    } as any);
    
    mockUseCurrentLanguage.mockReturnValue('zh');
    
    mockUseLanguageActions.mockReturnValue({
      getProductDisplayValue: mockGetProductDisplayValue,
    });
    
    mockT.mockImplementation((key: string) => key);
    
    // Default mock for getProductDisplayValue
    mockGetProductDisplayValue.mockImplementation((field: any, fallback = '') => {
      if (typeof field === 'string') return field;
      if (!field) return fallback;
      
      const currentLang = mockUseCurrentLanguage.mock.results[0]?.value || 'zh';
      
      if (currentLang === 'en') {
        return field.english || field.chinese || fallback;
      }
      return field.chinese || field.english || fallback;
    });
  });

  describe('with Chinese language preference', () => {
    beforeEach(() => {
      mockUseCurrentLanguage.mockReturnValue('zh');
    });

    it('should return Chinese name when available (prioritizing language over display)', () => {
      const { result } = renderHook(() => useProductI18n());

      const mockProduct: Product = {
        productId: 'test-1',
        name: { chinese: '测试产品', english: 'Test Product', display: 'Test Product' },
        category: { primary: { chinese: '食品', english: 'Food', display: 'Food' } },
      } as Product;

      const name = result.current.getProductName(mockProduct);
      expect(name).toBe('测试产品');
    });

    it('should fallback to English name when Chinese is not available', () => {
      const { result } = renderHook(() => useProductI18n());
      
      const mockProduct: Product = {
        productId: 'test-1',
        name: { english: 'Test Product', display: 'Test Product' },
        category: { primary: { english: 'Food', display: 'Food' } },
      } as Product;

      const name = result.current.getProductName(mockProduct);
      expect(name).toBe('Test Product');
    });

    it('should use fallback when neither language is available', () => {
      mockT.mockReturnValue('Unknown Product');
      const { result } = renderHook(() => useProductI18n());
      
      const mockProduct: Product = {
        productId: 'test-1',
        name: { display: '' },
        category: { primary: { display: '' } },
      } as Product;

      const name = result.current.getProductName(mockProduct);
      expect(name).toBe('Unknown Product');
      expect(mockT).toHaveBeenCalledWith('common.unknown');
    });

    it('should handle string values (legacy format)', () => {
      const { result } = renderHook(() => useProductI18n());
      
      const mockProduct: Product = {
        productId: 'test-1',
        name: '测试产品' as any,
        category: { primary: '食品' as any },
      } as Product;

      const name = result.current.getProductName(mockProduct);
      expect(name).toBe('测试产品');
    });
  });

  describe('with English language preference', () => {
    beforeEach(() => {
      mockUseCurrentLanguage.mockReturnValue('en');
    });

    it('should return English name when available (prioritizing language over display)', () => {
      const { result } = renderHook(() => useProductI18n());

      const mockProduct: Product = {
        productId: 'test-1',
        name: { chinese: '测试产品', english: 'Test Product', display: '测试产品' },
        category: { primary: { chinese: '食品', english: 'Food', display: '食品' } },
      } as Product;

      const name = result.current.getProductName(mockProduct);
      expect(name).toBe('Test Product');
    });

    it('should fallback to Chinese name when English is not available', () => {
      const { result } = renderHook(() => useProductI18n());

      const mockProduct: Product = {
        productId: 'test-1',
        name: { chinese: '测试产品', display: '测试产品' },
        category: { primary: { chinese: '食品', display: '食品' } },
      } as Product;

      const name = result.current.getProductName(mockProduct);
      expect(name).toBe('测试产品');
    });

    it('should prioritize language preference over display field', () => {
      const { result } = renderHook(() => useProductI18n());

      // Test case where display field has English but user prefers English
      const mockProduct: Product = {
        productId: 'test-1',
        name: { chinese: '测试产品', english: 'Test Product', display: '测试产品' },
        category: { primary: { chinese: '食品', english: 'Food', display: '食品' } },
      } as Product;

      const name = result.current.getProductName(mockProduct);
      // Should return English name because current language is 'en', not the display field
      expect(name).toBe('Test Product');
    });
  });

  describe('getProductCategory', () => {
    beforeEach(() => {
      mockUseCurrentLanguage.mockReturnValue('zh');
    });

    it('should return primary category by default', () => {
      const { result } = renderHook(() => useProductI18n());
      
      const mockProduct: Product = {
        productId: 'test-1',
        name: { chinese: '测试产品', display: '测试产品' },
        category: { 
          primary: { chinese: '食品', english: 'Food', display: '食品' },
          secondary: { chinese: '零食', english: 'Snacks', display: '零食' }
        },
      } as Product;

      const category = result.current.getProductCategory(mockProduct);
      expect(category).toBe('食品');
    });

    it('should return secondary category when specified', () => {
      const { result } = renderHook(() => useProductI18n());
      
      const mockProduct: Product = {
        productId: 'test-1',
        name: { chinese: '测试产品', display: '测试产品' },
        category: { 
          primary: { chinese: '食品', english: 'Food', display: '食品' },
          secondary: { chinese: '零食', english: 'Snacks', display: '零食' }
        },
      } as Product;

      const category = result.current.getProductCategory(mockProduct, 'secondary');
      expect(category).toBe('零食');
    });

    it('should handle undefined secondary category', () => {
      mockT.mockReturnValue('Unknown Category');
      const { result } = renderHook(() => useProductI18n());
      
      const mockProduct: Product = {
        productId: 'test-1',
        name: { chinese: '测试产品', display: '测试产品' },
        category: { 
          primary: { chinese: '食品', english: 'Food', display: '食品' }
        },
      } as Product;

      const category = result.current.getProductCategory(mockProduct, 'secondary');
      expect(category).toBe('Unknown Category');
      expect(mockT).toHaveBeenCalledWith('common.unknown');
    });
  });

  describe('getProductSpecification', () => {
    beforeEach(() => {
      mockUseCurrentLanguage.mockReturnValue('zh');
    });

    it('should return localized specification', () => {
      const { result } = renderHook(() => useProductI18n());
      
      const mockProduct: Product = {
        productId: 'test-1',
        name: { chinese: '测试产品', display: '测试产品' },
        category: { primary: { chinese: '食品', display: '食品' } },
        specification: { chinese: '500克', english: '500g', display: '500克' },
      } as Product;

      const spec = result.current.getProductSpecification(mockProduct);
      expect(spec).toBe('500克');
    });

    it('should handle undefined specification', () => {
      const { result } = renderHook(() => useProductI18n());
      
      const mockProduct: Product = {
        productId: 'test-1',
        name: { chinese: '测试产品', display: '测试产品' },
        category: { primary: { chinese: '食品', display: '食品' } },
      } as Product;

      const spec = result.current.getProductSpecification(mockProduct);
      expect(spec).toBe('');
    });
  });

  describe('getProductOrigin', () => {
    beforeEach(() => {
      mockUseCurrentLanguage.mockReturnValue('zh');
    });

    it('should format complete origin information', () => {
      const { result } = renderHook(() => useProductI18n());
      
      const mockProduct: Product = {
        productId: 'test-1',
        name: { chinese: '测试产品', display: '测试产品' },
        category: { primary: { chinese: '食品', display: '食品' } },
        origin: {
          country: { chinese: '中国', english: 'China', display: '中国' },
          province: { chinese: '北京', english: 'Beijing', display: '北京' },
          city: { chinese: '海淀区', english: 'Haidian', display: '海淀区' },
        },
      } as Product;

      const origin = result.current.getProductOrigin(mockProduct);
      expect(origin).toBe('中国 · 北京 · 海淀区');
    });

    it('should handle partial origin information', () => {
      const { result } = renderHook(() => useProductI18n());
      
      const mockProduct: Product = {
        productId: 'test-1',
        name: { chinese: '测试产品', display: '测试产品' },
        category: { primary: { chinese: '食品', display: '食品' } },
        origin: {
          country: { chinese: '中国', english: 'China', display: '中国' },
          province: { chinese: '北京', english: 'Beijing', display: '北京' },
        },
      } as Product;

      const origin = result.current.getProductOrigin(mockProduct);
      expect(origin).toBe('中国 · 北京');
    });

    it('should handle empty origin', () => {
      mockT.mockReturnValue('Unknown Origin');
      const { result } = renderHook(() => useProductI18n());
      
      const mockProduct: Product = {
        productId: 'test-1',
        name: { chinese: '测试产品', display: '测试产品' },
        category: { primary: { chinese: '食品', display: '食品' } },
        origin: {},
      } as Product;

      const origin = result.current.getProductOrigin(mockProduct);
      expect(origin).toBe('Unknown Origin');
      expect(mockT).toHaveBeenCalledWith('common.unknown');
    });
  });

  describe('getProductPlatform', () => {
    beforeEach(() => {
      mockUseCurrentLanguage.mockReturnValue('zh');
    });

    it('should return localized platform', () => {
      const { result } = renderHook(() => useProductI18n());
      
      const mockProduct: Product = {
        productId: 'test-1',
        name: { chinese: '测试产品', display: '测试产品' },
        category: { primary: { chinese: '食品', display: '食品' } },
        platform: { chinese: '淘宝', english: 'Taobao', display: '淘宝' },
      } as Product;

      const platform = result.current.getProductPlatform(mockProduct);
      expect(platform).toBe('淘宝');
    });

    it('should handle undefined platform', () => {
      mockT.mockReturnValue('All Platforms');
      const { result } = renderHook(() => useProductI18n());
      
      const mockProduct: Product = {
        productId: 'test-1',
        name: { chinese: '测试产品', display: '测试产品' },
        category: { primary: { chinese: '食品', display: '食品' } },
      } as Product;

      const platform = result.current.getProductPlatform(mockProduct);
      expect(platform).toBe('All Platforms');
      expect(mockT).toHaveBeenCalledWith('filters.allPlatforms');
    });
  });

  describe('getProductManufacturer', () => {
    beforeEach(() => {
      mockUseCurrentLanguage.mockReturnValue('zh');
    });

    it('should return localized manufacturer', () => {
      const { result } = renderHook(() => useProductI18n());
      
      const mockProduct: Product = {
        productId: 'test-1',
        name: { chinese: '测试产品', display: '测试产品' },
        category: { primary: { chinese: '食品', display: '食品' } },
        manufacturer: { chinese: '测试公司', english: 'Test Company', display: '测试公司' },
      } as Product;

      const manufacturer = result.current.getProductManufacturer(mockProduct);
      expect(manufacturer).toBe('测试公司');
    });

    it('should handle undefined manufacturer', () => {
      const { result } = renderHook(() => useProductI18n());
      
      const mockProduct: Product = {
        productId: 'test-1',
        name: { chinese: '测试产品', display: '测试产品' },
        category: { primary: { chinese: '食品', display: '食品' } },
      } as Product;

      const manufacturer = result.current.getProductManufacturer(mockProduct);
      expect(manufacturer).toBe('');
    });
  });

  describe('getProductFlavor', () => {
    beforeEach(() => {
      mockUseCurrentLanguage.mockReturnValue('zh');
    });

    it('should return localized flavor', () => {
      const { result } = renderHook(() => useProductI18n());
      
      const mockProduct: Product = {
        productId: 'test-1',
        name: { chinese: '测试产品', display: '测试产品' },
        category: { primary: { chinese: '食品', display: '食品' } },
        flavor: { chinese: '原味', english: 'Original', display: '原味' },
      } as Product;

      const flavor = result.current.getProductFlavor(mockProduct);
      expect(flavor).toBe('原味');
    });

    it('should handle undefined flavor', () => {
      const { result } = renderHook(() => useProductI18n());
      
      const mockProduct: Product = {
        productId: 'test-1',
        name: { chinese: '测试产品', display: '测试产品' },
        category: { primary: { chinese: '食品', display: '食品' } },
      } as Product;

      const flavor = result.current.getProductFlavor(mockProduct);
      expect(flavor).toBe('');
    });
  });

  describe('formatCurrency', () => {
    beforeEach(() => {
      mockUseCurrentLanguage.mockReturnValue('zh');
    });

    it('should format currency in Chinese locale', () => {
      const { result } = renderHook(() => useProductI18n());
      
      const formatted = result.current.formatCurrency(1234.56);
      expect(formatted).toBe('¥1,234.56');
    });

    it('should format currency in English locale', () => {
      mockUseCurrentLanguage.mockReturnValue('en');
      const { result } = renderHook(() => useProductI18n());
      
      const formatted = result.current.formatCurrency(1234.56);
      expect(formatted).toBe('¥1,234.56');
    });

    it('should handle zero value', () => {
      const { result } = renderHook(() => useProductI18n());
      
      const formatted = result.current.formatCurrency(0);
      expect(formatted).toBe('¥0.00');
    });

    it('should handle negative value', () => {
      const { result } = renderHook(() => useProductI18n());
      
      const formatted = result.current.formatCurrency(-123.45);
      expect(formatted).toBe('-¥123.45');
    });
  });

  describe('formatNumber', () => {
    beforeEach(() => {
      mockUseCurrentLanguage.mockReturnValue('zh');
    });

    it('should format number in Chinese locale', () => {
      const { result } = renderHook(() => useProductI18n());
      
      const formatted = result.current.formatNumber(1234567);
      expect(formatted).toBe('1,234,567');
    });

    it('should format decimal number', () => {
      const { result } = renderHook(() => useProductI18n());
      
      const formatted = result.current.formatNumber(1234.567);
      expect(formatted).toBe('1,234.567');
    });
  });
});