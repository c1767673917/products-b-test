import { useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FilterState, SortOption, ViewMode } from '../types/product';
import { useProductStore } from '../stores/productStore';

export const useUrlFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, searchQuery, sortOption, viewMode, setFilters, setSearchQuery, setSortOption, setViewMode } = useProductStore();

  // 从URL参数解析筛选条件
  const parseFiltersFromUrl = useCallback((): Partial<FilterState> => {
    const urlFilters: Partial<FilterState> = {};

    // 解析价格区间
    const priceRange = searchParams.get('priceRange');
    if (priceRange) {
      const [min, max] = priceRange.split(',').map(Number);
      if (!isNaN(min) && !isNaN(max)) {
        urlFilters.priceRange = [min, max];
      }
    }

    // 解析品类
    const categories = searchParams.get('categories');
    if (categories) {
      urlFilters.categories = categories.split(',').filter(Boolean);
    }

    // 解析产地
    const locations = searchParams.get('locations');
    if (locations) {
      urlFilters.locations = locations.split(',').filter(Boolean);
    }

    // 解析平台
    const platforms = searchParams.get('platforms');
    if (platforms) {
      urlFilters.platforms = platforms.split(',').filter(Boolean);
    }

    // 解析优惠筛选
    const showDiscountOnly = searchParams.get('showDiscountOnly');
    if (showDiscountOnly !== null) {
      urlFilters.showDiscountOnly = showDiscountOnly === 'true';
    }

    return urlFilters;
  }, [searchParams]);

  // 将筛选条件同步到URL
  const syncFiltersToUrl = useCallback(() => {
    const params = new URLSearchParams();

    // 添加搜索查询
    if (searchQuery) {
      params.set('q', searchQuery);
    }

    // 添加排序选项
    if (sortOption !== 'name') {
      params.set('sort', sortOption);
    }

    // 添加视图模式
    if (viewMode !== 'grid') {
      params.set('view', viewMode);
    }

    // 添加价格区间
    if (filters.priceRange) {
      params.set('priceRange', filters.priceRange.join(','));
    }

    // 添加品类
    if (filters.categories.length > 0) {
      params.set('categories', filters.categories.join(','));
    }

    // 添加产地
    if (filters.locations.length > 0) {
      params.set('locations', filters.locations.join(','));
    }

    // 添加平台
    if (filters.platforms.length > 0) {
      params.set('platforms', filters.platforms.join(','));
    }

    // 添加优惠筛选
    if (filters.showDiscountOnly) {
      params.set('showDiscountOnly', 'true');
    }

    // 更新URL（不触发页面刷新）
    setSearchParams(params, { replace: true });
  }, [filters, searchQuery, sortOption, viewMode, setSearchParams]);

  // 从URL初始化筛选条件
  const initializeFromUrl = useCallback(() => {
    const urlFilters = parseFiltersFromUrl();
    
    // 设置搜索查询
    const q = searchParams.get('q');
    if (q && q !== searchQuery) {
      setSearchQuery(q);
    }

    // 设置排序选项
    const sort = searchParams.get('sort') as SortOption;
    if (sort && sort !== sortOption) {
      setSortOption(sort);
    }

    // 设置视图模式
    const view = searchParams.get('view') as ViewMode;
    if (view && view !== viewMode) {
      setViewMode(view);
    }

    // 设置筛选条件
    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters);
    }
  }, [searchParams, parseFiltersFromUrl, searchQuery, sortOption, viewMode, setSearchQuery, setSortOption, setViewMode, setFilters]);

  // 监听store变化，同步到URL
  useEffect(() => {
    syncFiltersToUrl();
  }, [syncFiltersToUrl]);

  // 组件挂载时从URL初始化
  useEffect(() => {
    initializeFromUrl();
  }, []); // 只在组件挂载时执行一次

  // 清空筛选条件（包括URL）
  const clearAllFilters = useCallback(() => {
    useProductStore.getState().clearFilters();
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // 生成分享链接
  const generateShareUrl = useCallback(() => {
    const currentUrl = new URL(window.location.href);
    return currentUrl.toString();
  }, []);

  return {
    initializeFromUrl,
    clearAllFilters,
    generateShareUrl
  };
};

// 筛选条件摘要hook
export const useFilterSummary = () => {
  const filters = useProductStore(state => state.filters);
  const searchQuery = useProductStore(state => state.searchQuery);
  const filteredProducts = useProductStore(state => state.filteredProducts);
  const products = useProductStore(state => state.products);

  const summary = {
    hasActiveFilters: !!(
      filters.priceRange ||
      filters.categories.length > 0 ||
      filters.locations.length > 0 ||
      filters.platforms.length > 0 ||
      filters.showDiscountOnly ||
      searchQuery
    ),
    activeFiltersCount: [
      filters.priceRange,
      filters.categories.length > 0,
      filters.locations.length > 0,
      filters.platforms.length > 0,
      filters.showDiscountOnly,
      searchQuery
    ].filter(Boolean).length,
    totalProducts: products.length,
    filteredProducts: filteredProducts.length,
    filteringRatio: products.length > 0 ? (filteredProducts.length / products.length) : 0
  };

  return summary;
};
