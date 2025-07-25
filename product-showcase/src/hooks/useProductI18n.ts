import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageActions, useCurrentLanguage, type MultilingualField } from '../stores/languageStore';
import type { Product } from '../types/product';

// Hook for product internationalization
export const useProductI18n = () => {
  const { t } = useTranslation('product');
  const currentLanguage = useCurrentLanguage();
  const { getProductDisplayValue } = useLanguageActions();

  // Get localized product field value
  const getLocalizedValue = (field: MultilingualField | string | undefined, fallback?: string): string => {
    if (typeof field === 'string') {
      return field;
    }

    if (!field) {
      return fallback || t('common.unknown');
    }

    // Apply language preference first (prioritize user's language choice)
    if (currentLanguage === 'en') {
      // For English: prefer English, fallback to Chinese, then display, then fallback
      return field.english || field.chinese || field.display || fallback || t('common.unknown');
    } else {
      // For Chinese: prefer Chinese, fallback to English, then display, then fallback
      return field.chinese || field.english || field.display || fallback || t('common.unknown');
    }
  };

  // Get localized product name
  const getProductName = (product: Product): string => {
    if (!product || !product.name) {
      return t('fields.name');
    }
    return getLocalizedValue(product.name, t('fields.name'));
  };

  // Get localized category
  const getProductCategory = (product: Product, level: 'primary' | 'secondary' = 'primary'): string => {
    // 防御性编程：检查product和category是否存在
    if (!product || !product.category) {
      return level === 'primary' ? t('filters.allCategories') : t('common.unknown');
    }

    const categoryField = level === 'primary' ? product.category.primary : product.category.secondary;
    const fallback = level === 'primary' ? t('filters.allCategories') : '';
    return getLocalizedValue(categoryField, fallback);
  };

  // Get localized platform
  const getProductPlatform = (product: Product): string => {
    if (!product || !product.platform) {
      return t('filters.allPlatforms');
    }
    return getLocalizedValue(product.platform, t('filters.allPlatforms'));
  };

  // Get localized flavor
  const getProductFlavor = (product: Product): string => {
    return getLocalizedValue(product.flavor, '');
  };

  // Get localized specification
  const getProductSpecification = (product: Product): string => {
    return getLocalizedValue(product.specification, '');
  };

  // Get localized manufacturer
  const getProductManufacturer = (product: Product): string => {
    return getLocalizedValue(product.manufacturer, '');
  };

  // Get localized origin display (updated to support multilingual)
  const getProductOrigin = (product: Product): string => {
    const country = getLocalizedValue(product.origin.country, '');
    const province = getLocalizedValue(product.origin.province, '');
    const city = product.origin.city ? getLocalizedValue(product.origin.city, '') : '';
    
    const parts = [country, province, city].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : t('common.unknown');
  };

  // Format currency based on current language
  const formatCurrency = (amount: number): string => {
    // Use simple formatting to ensure consistent output across environments
    const formattedNumber = new Intl.NumberFormat(currentLanguage === 'en' ? 'en-US' : 'zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(amount));

    const sign = amount < 0 ? '-' : '';
    return `${sign}¥${formattedNumber}`;
  };

  // Get formatted price with localization
  const getFormattedPrice = (product: Product): {
    normalPrice: string;
    discountPrice?: string;
    hasDiscount: boolean;
    formattedNormal: string;
    formattedDiscount?: string;
  } => {
    const hasDiscount = product.price.discount !== undefined && product.price.discount < product.price.normal;

    return {
      normalPrice: `¥${product.price.normal.toFixed(2)}`,
      discountPrice: hasDiscount ? `¥${product.price.discount!.toFixed(2)}` : undefined,
      hasDiscount,
      formattedNormal: formatCurrency(product.price.normal),
      formattedDiscount: hasDiscount ? formatCurrency(product.price.discount!) : undefined
    };
  };

  // Format numbers based on locale
  const formatNumber = (num: number, options?: Intl.NumberFormatOptions): string => {
    const locale = currentLanguage === 'en' ? 'en-US' : 'zh-CN';
    return new Intl.NumberFormat(locale, options).format(num);
  };

  // Format date based on locale
  const formatDate = (date: Date | number | string): string => {
    const dateObj = new Date(date);
    const locale = currentLanguage === 'en' ? 'en-US' : 'zh-CN';
    
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(dateObj);
  };

  // Format relative time (e.g., "2 days ago")
  const formatRelativeTime = (date: Date | number | string): string => {
    const dateObj = new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
    
    const locale = currentLanguage === 'en' ? 'en-US' : 'zh-CN';
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    
    if (diffInSeconds < 60) {
      return rtf.format(-diffInSeconds, 'second');
    } else if (diffInSeconds < 3600) {
      return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    } else if (diffInSeconds < 86400) {
      return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    } else {
      return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    }
  };

  // Get product search text (for client-side filtering)
  const getSearchableText = (product: Product): string => {
    const name = getProductName(product);
    const category = getProductCategory(product);
    const platform = getProductPlatform(product);
    const flavor = getProductFlavor(product);
    const specification = getProductSpecification(product);
    const manufacturer = getProductManufacturer(product);
    const origin = getProductOrigin(product);
    
    return [
      name,
      category,
      platform,
      flavor,
      specification,
      manufacturer,
      origin
    ].filter(Boolean).join(' ').toLowerCase();
  };

  return {
    getLocalizedValue,
    getProductName,
    getProductCategory,
    getProductPlatform,
    getProductFlavor,
    getProductSpecification,
    getProductManufacturer,
    getProductOrigin,
    getFormattedPrice,
    formatCurrency,
    formatNumber,
    formatDate,
    formatRelativeTime,
    getSearchableText,
    currentLanguage
  };
};

// Hook for localized sorting options
export const useSortingI18n = () => {
  const { t } = useTranslation('product');
  
  const sortingOptions = useMemo(() => [
    { value: 'name', label: t('sorting.name') },
    { value: 'price-asc', label: t('sorting.priceAsc') },
    { value: 'price-desc', label: t('sorting.priceDesc') },
    { value: 'collect-time', label: t('sorting.collectTime') }
  ], [t]);

  return { sortingOptions };
};

// Hook for localized filter labels
export const useFilterI18n = () => {
  const { t } = useTranslation('product');

  const filterLabels = useMemo(() => ({
    categories: t('filters.allCategories'),
    platforms: t('filters.allPlatforms'),  
    locations: t('filters.allLocations'),
    priceRange: t('filters.priceRange'),
    showDiscountOnly: t('filters.showDiscountOnly'),
    sortBy: t('filters.sortBy'),
    filterBy: t('filters.filterBy'),
    clearFilters: t('filters.clearFilters'),
    applyFilters: t('filters.applyFilters')
  }), [t]);

  return { filterLabels };
};