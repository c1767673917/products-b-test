// 使用React Query的产品列表页面
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Squares2X2Icon,
  ListBulletIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ShareIcon,
  ArrowPathIcon,
  XMarkIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import type { Product, FilterState } from '../../types/product';
import ProductCard from '../../components/product/ProductCard';
import ProductDetailPanel from '../../components/product/ProductDetailPanel';
import ResponsiveProductGrid from '../../components/product/ResponsiveProductGrid';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Loading';
import { Pagination } from '../../components/ui';
import { FilterPanel } from '../../components/filters';
import { useProducts, useFilterProducts, useRefreshProducts, useStats } from '../../hooks/useProducts';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../components/ui/ToastNotification';
import { ScrollReveal, ScrollStagger, ScrollProgress } from '../../components/ui/ScrollAnimations';
import { useProductStore } from '../../stores/productStore';
import { usePanelPreferences } from '../../hooks/usePanelPreferences';
import { useProductListGlobalFavorites, useGlobalFavoriteProductIds, useGlobalFavorites } from '../../hooks/useGlobalFavorites';
import { VirtualGrid, VirtualList } from '../../components/ui/VirtualGrid';
import { convertPriceRangeForAPI } from '../../utils/priceConversion';

import { useRealTimeResponsiveGrid } from '../../hooks/useRealTimeResponsiveGrid';
import { useContainerDimensions } from '../../hooks/useContainerDimensions';
import { PageNavigation } from '../../components/layout/PageNavigation';
import { cn } from '../../utils/cn';

// 初始筛选状态
const initialFilters: FilterState = {
  priceRange: undefined,
  categories: [],
  locations: [],
  platforms: [],
  showDiscountOnly: false
};

export const ProductListWithQuery: React.FC = () => {
  // 翻译
  const { t, i18n } = useTranslation(['navigation', 'product', 'common']);
  const currentLanguage = i18n.language;

  // 路由状态
  const location = useLocation();

  // 本地状态
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOption, setSortOption] = useState<'name' | 'price-asc' | 'price-desc' | 'collect-time'>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20); // 默认每页20个，这样可以看到分页
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [realTimePanelWidth, setRealTimePanelWidth] = useState(400); // 实时面板宽度
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);
  const { showSuccess, showError, showInfo } = useToast();
  const { preferences } = usePanelPreferences();
  const { containerRef, dimensions } = useContainerDimensions();

  // 响应式检测 - 需要在其他地方使用前先声明
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 初始化实时面板宽度
  useEffect(() => {
    setRealTimePanelWidth(preferences.width);
  }, [preferences.width]);

  // 处理面板宽度实时变化
  const handlePanelWidthChange = useCallback((width: number) => {
    setRealTimePanelWidth(width);
  }, []);



  // 使用useMemo稳定options对象，避免每次重新创建
  const gridOptions = useMemo(() => ({
    minCardWidth: viewMode === 'grid' ? 180 : 300,
    gap: viewMode === 'grid' ? 16 : 16,
  }), [viewMode]);

  // 使用重构后的、更简单的响应式网格 hook
  const { columns } = useRealTimeResponsiveGrid(
    dimensions.width,
    gridOptions
  );


  // React Query hooks - 传递分页参数到后端
  const apiParams = useMemo(() => {
    // 转换价格范围（如果需要）
    const convertedPriceRange = filters.priceRange 
      ? convertPriceRangeForAPI(filters.priceRange, currentLanguage)
      : undefined;
    
    return {
      page: currentPage,
      limit: itemsPerPage,
      sortBy: sortOption.includes('price') ? 'price' :
             sortOption === 'collect-time' ? 'time' : 'name',
      sortOrder: sortOption === 'price-desc' ? 'desc' : 'asc',
      search: searchQuery || undefined,
      lang: currentLanguage, // 添加语言参数
      // 筛选参数
      ...(filters.categories.length > 0 && { category: filters.categories.join(',') }),
      ...(filters.platforms.length > 0 && { platform: filters.platforms.join(',') }),
      ...(filters.locations.length > 0 && { province: filters.locations.join(',') }),
      ...(convertedPriceRange && {
        priceMin: convertedPriceRange[0],
        priceMax: convertedPriceRange[1]
      })
    };
  }, [currentPage, itemsPerPage, sortOption, searchQuery, filters, currentLanguage]);

  const productsQuery = useProducts(apiParams);
  const refreshMutation = useRefreshProducts();
  const statsQuery = useStats();

  // ProductStore hooks
  const setProducts = useProductStore(state => state.setProducts);
  const storeProducts = useProductStore(state => state.products);

  // 全局收藏功能hooks
  const { favoriteProductIds, isLoading: isFavoritesLoading } = useGlobalFavoriteProductIds();

  // 获取收藏产品的详细信息（当启用收藏筛选时）
  const favoritesQuery = useGlobalFavorites({
    limit: 1000, // 获取所有收藏
    populate: true // 需要完整的产品信息
  });

  // 监控 ProductStore 状态变化 (仅开发环境)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('ProductStore products 数组长度变化:', storeProducts.length);
    }
  }, [storeProducts.length]);

  // 同步 React Query 数据到 ProductStore
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('ProductListWithQuery: React Query 状态变化');
      console.log('  - isLoading:', productsQuery.isLoading);
      console.log('  - isError:', productsQuery.isError);
      console.log('  - data:', productsQuery.data);
      console.log('  - error:', productsQuery.error);
    }

    if (productsQuery.data) {
      // 处理新的分页API格式
      let productsToSync = [];
      let paginationToSync = undefined;
      
      if (typeof productsQuery.data === 'object' && 'products' in productsQuery.data) {
        // 新格式：{ products: [], pagination: {...} }
        productsToSync = productsQuery.data.products || [];
        paginationToSync = productsQuery.data.pagination;
      } else if (Array.isArray(productsQuery.data)) {
        // 旧格式：直接是产品数组
        productsToSync = productsQuery.data;
      }
      
      if (productsToSync.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('同步产品数据到 ProductStore:', productsToSync.length, '个产品');
        }
        setProducts(productsToSync, paginationToSync);
      }
    }
  }, [productsQuery.data, productsQuery.isLoading, productsQuery.isError, productsQuery.error, setProducts]);

  // 防抖搜索效果
  useEffect(() => {
    if (debouncedSearchQuery !== searchQuery) {
      setSearchQuery(debouncedSearchQuery);
      setCurrentPage(1);
    }
  }, [debouncedSearchQuery, searchQuery]);

  // 监听移动端筛选面板关闭事件
  useEffect(() => {
    const handleCloseMobileFilter = () => {
      setShowFilters(false);
    };

    window.addEventListener('closeMobileFilter', handleCloseMobileFilter);
    return () => {
      window.removeEventListener('closeMobileFilter', handleCloseMobileFilter);
    };
  }, []);

  // 获取要显示的产品数据 - 直接使用后端返回的数据，无需前端排序
  const displayProducts = useMemo(() => {
    if (!productsQuery.data) return [];

    // 处理新的分页API格式
    if (typeof productsQuery.data === 'object' && 'products' in productsQuery.data) {
      return productsQuery.data.products || [];
    }

    // 兼容旧格式：直接返回产品数组
    return Array.isArray(productsQuery.data) ? productsQuery.data : [];
  }, [productsQuery.data]);

  // 应用收藏筛选 - 修复：获取所有收藏的产品，而不是仅筛选当前页面
  const filteredProducts = useMemo(() => {
    if (!showFavoritesOnly) {
      return displayProducts;
    }

    // 如果正在加载收藏数据，显示当前页面产品
    if (isFavoritesLoading || favoritesQuery.isLoading) {
      return displayProducts;
    }

    // 从收藏列表中获取完整的产品信息
    if (favoritesQuery.data?.favorites) {
      // 如果收藏数据包含完整的产品信息，直接返回产品对象
      if (favoritesQuery.data.favorites.length > 0 && favoritesQuery.data.favorites[0].product) {
        return favoritesQuery.data.favorites
          .map((fav: any) => fav.product)
          .filter(Boolean); // 过滤掉空值
      }
      // 否则，根据产品ID筛选当前页面的产品
      const favoriteIds = favoritesQuery.data.favorites
        .map((fav: any) => fav.productId)
        .filter(Boolean);
      return displayProducts.filter(product =>
        favoriteIds.includes(product.productId)
      );
    }

    // 回退方案：如果收藏查询失败，仍然筛选当前页面
    return displayProducts.filter(product =>
      favoriteProductIds.includes(product.productId)
    );
  }, [displayProducts, showFavoritesOnly, favoriteProductIds, isFavoritesLoading, favoritesQuery.data, favoritesQuery.isLoading]);

  // 收藏功能hooks - 基于筛选后的产品
  const productIds = useMemo(() =>
    filteredProducts?.map(p => p.productId) || [],
    [filteredProducts]
  );
  const {
    favoriteMap,
    countMap,
    toggleFavorite,
    getFavoriteStatus,
    getFavoriteCount,
    isToggling
  } = useProductListGlobalFavorites(productIds);

  // 获取后端返回的分页信息
  const paginationInfo = useMemo(() => {
    // 检查是否是新的API格式（带分页信息）
    const response = productsQuery.data;
    if (response && typeof response === 'object' && 'products' in response && 'pagination' in response) {
      return {
        products: response.products,
        pagination: response.pagination
      };
    }
    // 兼容旧格式（直接返回产品数组）
    return {
      products: Array.isArray(response) ? response : [],
      pagination: {
        page: currentPage,
        limit: itemsPerPage,
        total: Array.isArray(response) ? response.length : 0,
        totalPages: Array.isArray(response) ? Math.ceil(response.length / itemsPerPage) : 1,
        hasNext: false,
        hasPrev: false
      }
    };
  }, [productsQuery.data, currentPage, itemsPerPage]);

  // 使用后端分页数据
  const actualProducts = paginationInfo.products;
  const actualPagination = paginationInfo.pagination;

  // 如果启用了收藏筛选，对收藏产品进行前端分页；否则使用后端分页的产品数据
  const paginatedProducts = useMemo(() => {
    if (!showFavoritesOnly) {
      return actualProducts;
    }

    // 对收藏产品进行前端分页
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  }, [showFavoritesOnly, actualProducts, filteredProducts, currentPage, itemsPerPage]);

  // 获取当前选中的产品
  const selectedProduct = selectedProductId
    ? actualProducts.find((p: Product) => p.productId === selectedProductId) || null
    : null;

  // 获取产品导航信息
  const getProductNavigation = () => {
    if (!selectedProductId) return { prev: false, next: false };

    const currentIndex = actualProducts.findIndex((p: Product) => p.productId === selectedProductId);
    return {
      prev: currentIndex > 0,
      next: currentIndex < actualProducts.length - 1
    };
  };

  const canNavigate = getProductNavigation();

  // 处理产品导航
  const handleProductNavigation = (direction: 'prev' | 'next') => {
    if (!selectedProductId) return;

    const currentIndex = actualProducts.findIndex((p: Product) => p.productId === selectedProductId);
    let newIndex = currentIndex;

    if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'next' && currentIndex < actualProducts.length - 1) {
      newIndex = currentIndex + 1;
    }
    
    if (newIndex !== currentIndex) {
      setSelectedProductId(actualProducts[newIndex].productId);
    }
  };

  // 关闭详情面板
  const handleCloseDetailPanel = () => {
    setIsDetailPanelOpen(false);
    setSelectedProductId(null);
  };

  // 计算分页信息 - 收藏筛选时使用收藏产品总数，否则使用后端分页信息
  const paginationData = useMemo(() => {
    if (!showFavoritesOnly) {
      return actualPagination;
    }

    // 收藏筛选时的分页信息
    const totalFavorites = filteredProducts.length;
    const totalPages = Math.ceil(totalFavorites / itemsPerPage);

    return {
      page: currentPage,
      limit: itemsPerPage,
      total: totalFavorites,
      totalPages: totalPages,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
    };
  }, [showFavoritesOnly, actualPagination, filteredProducts.length, itemsPerPage, currentPage]);

  const totalPages = paginationData.totalPages;

  // 处理产品操作
  const handleProductAction = (product: Product, action: 'favorite' | 'compare' | 'detail') => {
    switch (action) {
      case 'favorite':
        toggleFavorite(product.productId);
        break;
      case 'detail':
        setSelectedProductId(product.productId);
        setIsDetailPanelOpen(true);
        break;
      case 'compare':
        if (compareList.length >= 4) {
          showError(t('product:detail.toast.compareLimit'));
          return;
        }
        if (compareList.includes(product.productId)) {
          showInfo(t('product:detail.toast.compareAdded'));
          return;
        }
        setCompareList(prev => [...prev, product.productId]);
        showSuccess(t('product:detail.toast.compareAdded'));
        break;
    }
  };

  // 处理分页 - 更新当前页码，useProducts会自动重新请求数据
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 处理每页显示数量变化 - 更新每页数量，useProducts会自动重新请求数据
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    // 修复bug：当选择的值大于100时，会被错误地重置为100
    // 直接使用用户选择的值
    setItemsPerPage(newItemsPerPage);
    // 重置到第一页
    setCurrentPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 处理筛选变化 - 更新筛选条件，useProducts会自动重新请求数据
  const handleFiltersChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  // 清空筛选 - 重置所有筛选条件，useProducts会自动重新请求数据
  const handleClearFilters = () => {
    setFilters(initialFilters);
    setSearchQuery('');
    setLocalSearchQuery('');
    setCurrentPage(1);
    showInfo(t('navigation:search.clearFilters'));
  };

  // 刷新数据
  const handleRefresh = () => {
    refreshMutation.mutate(apiParams, {
      onSuccess: () => {
        showSuccess(t('common:status.success'));
      },
      onError: (error) => {
        showError(`${t('common:actions.refresh')} ${t('common:status.failed')}: ${error.message}`);
      }
    });
  };

  // 分享功能
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      showSuccess(t('product:actions.copyLink'));
    }).catch(() => {
      showError('复制失败');
    });
  };

  // 加载状态
  const isLoading = productsQuery.isLoading || refreshMutation.isPending;
  const error = productsQuery.error;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">加载失败: {error.message}</p>
          <Button onClick={() => window.location.reload()}>重新加载</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 滚动进度条 */}
      <ScrollProgress />

      {/* 页面导航 */}

      {/* 顶部工具栏 */}
      <div className="bg-white shadow-sm border-b sticky top-12 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-end h-12">
            {/* 右侧：操作按钮 */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <ArrowPathIcon className="h-4 w-4" />
                {!isMobile && <span className="ml-1">{t('common:actions.refresh')}</span>}
              </Button>

              <Button
                variant={showFavoritesOnly ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setShowFavoritesOnly(!showFavoritesOnly);
                  // 切换收藏筛选时重置到第一页
                  setCurrentPage(1);
                }}
                disabled={isFavoritesLoading}
                className={showFavoritesOnly ? "bg-red-500 hover:bg-red-600 text-white" : ""}
              >
                <HeartIcon className={`h-4 w-4 ${showFavoritesOnly ? 'text-white' : 'text-red-500'}`} />
                {!isMobile && (
                  <span className="ml-1">
                    {showFavoritesOnly ? t('product:filters.showAll') : t('product:filters.favoritesOnly')}
                    {favoriteProductIds.length > 0 && ` (${favoriteProductIds.length})`}
                  </span>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
              >
                <ShareIcon className="h-4 w-4" />
                {!isMobile && <span className="ml-1">{t('common:actions.share')}</span>}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <FunnelIcon className="h-4 w-4" />
                {!isMobile && <span className="ml-1">{t('common:actions.filter')}</span>}
              </Button>

              {/* 视图切换 */}
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Squares2X2Icon className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none"
                >
                  <ListBulletIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 - 使用 Flexbox 实现左右布局 */}
      <div className="flex-1 flex flex-row max-w-7xl mx-auto w-full gap-1">
        <div
          ref={containerRef}
          className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8"
        >
          <div
            className={cn(
              "flex flex-col lg:flex-row gap-8",
              isDetailPanelOpen && isMobile ? "hidden" : ""
            )}
          >
            {/* 桌面端筛选面板 */}
            <AnimatePresence>
              {showFilters && !isMobile && (
                <motion.div
                  initial={{ opacity: 0, x: -300 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -300 }}
                  transition={{
                    type: 'tween',
                    duration: 0.2,
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }}
                  style={{
                    willChange: 'transform, opacity',
                    backfaceVisibility: 'hidden'
                  }}
                  className="lg:w-80 flex-shrink-0 transform-gpu"
                >
                  <FilterPanel
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    onClearFilters={handleClearFilters}
                    totalCount={statsQuery.data?.totalProducts}
                    filteredCount={paginationData.total}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* 移动端筛选面板 - 底部抽屉 */}
            <AnimatePresence>
              {showFilters && isMobile && (
                <>
                  {/* 背景遮罩 */}
                  <motion.div
                    key="mobile-filter-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 z-40"
                    onClick={() => setShowFilters(false)}
                  />

                  {/* 底部抽屉 */}
                  <motion.div
                    key="mobile-filter-drawer"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{
                      type: 'tween',
                      duration: 0.2,
                      ease: [0.25, 0.46, 0.45, 0.94]
                    }}
                    style={{
                      willChange: 'transform',
                      backfaceVisibility: 'hidden'
                    }}
                    className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 max-h-[80vh] overflow-hidden transform-gpu"
                  >
                    {/* 抽屉头部 */}
                    <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-2xl">
                      <div className="flex items-center space-x-2">
                        <FunnelIcon className="w-5 h-5 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-900">{t('common:actions.filter')}</h2>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearFilters}
                          className="text-red-600 hover:text-red-700"
                        >
                          清空
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowFilters(false)}
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    {/* 拖拽指示器 */}
                    <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-300 rounded-full"></div>

                    {/* 筛选内容 */}
                    <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-4">
                      <FilterPanel
                        filters={filters}
                        onFiltersChange={handleFiltersChange}
                        onClearFilters={handleClearFilters}
                        isMobile={true}
                        totalCount={statsQuery.data?.totalProducts}
                        filteredCount={paginationData.total}
                      />
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* 主内容区域 */}
            <div className="flex-1 min-w-0">
              {/* 搜索和排序栏 */}
              <ScrollReveal direction="down" delay={0.2}>
                <div className="mb-6 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder={t('navigation:search.detailedPlaceholder')}
                        value={localSearchQuery}
                        onChange={(e) => setLocalSearchQuery(e.target.value)}
                        leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
                      />
                    </div>
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value as 'name' | 'price-asc' | 'price-desc' | 'collect-time')}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="name">{t('product:sorting.name')}</option>
                      <option value="price-asc">{t('product:sorting.priceAsc')}</option>
                      <option value="price-desc">{t('product:sorting.priceDesc')}</option>
                      <option value="collect-time">{t('product:sorting.collectTime')}</option>
                    </select>
                  </div>

                  {/* 结果统计 */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>
                      {t('navigation:search.resultsCountWithRange', {
                        count: paginationData.total,
                        start: (paginationData.page - 1) * paginationData.limit + 1,
                        end: Math.min(paginationData.page * paginationData.limit, paginationData.total)
                      })}
                      {searchQuery && ` (${t('navigation:search.searchBy')}: "${searchQuery}")`}
                    </span>
                    {isLoading && <Spinner size="sm" />}
                  </div>
                </div>
              </ScrollReveal>


              {/* 产品网格 */}
              {isLoading && paginatedProducts.length === 0 ? (
                <div className="flex justify-center py-12">
                  <Spinner />
                </div>
              ) : paginatedProducts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">{t('navigation:search.noProductsFound')}</p>
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    className="mt-4"
                  >
                    {t('navigation:search.clearFilters')}
                  </Button>
                </div>
              ) : (
                <>
                  {viewMode === 'grid' ? (
                    <div
                      className="grid w-full"
                      style={{
                        gridTemplateColumns: `repeat(${columns}, 1fr)`,
                        gap: `${gridOptions.gap}px`
                      }}
                    >
                      {paginatedProducts.map((product: Product) => (
                        <ProductCard
                          key={product.productId}
                          product={product}
                          layout="grid"
                          onQuickAction={(action) => handleProductAction(product, action)}
                          isFavorited={getFavoriteStatus(product.productId)}
                          isInCompare={compareList.includes(product.productId)}
                          favoriteCount={getFavoriteCount(product.productId)}
                          isToggling={isToggling}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col" style={{ gap: `${gridOptions.gap}px` }}>
                      {paginatedProducts.map((product: Product) => (
                        <ProductCard
                          key={product.productId}
                          product={product}
                          layout="list"
                          onQuickAction={(action) => handleProductAction(product, action)}
                          isFavorited={getFavoriteStatus(product.productId)}
                          isInCompare={compareList.includes(product.productId)}
                          favoriteCount={getFavoriteCount(product.productId)}
                          isToggling={isToggling}
                        />
                      ))}
                    </div>
                  )}

                  {/* 分页 */}
                  <ScrollReveal direction="up" delay={0.3}>
                    <Pagination
                      currentPage={paginationData.page}
                      totalPages={paginationData.totalPages}
                      totalItems={paginationData.total}
                      itemsPerPage={itemsPerPage} // 使用组件自身的状态，而不是后端返回的limit
                      itemsPerPageOptions={[20, 50, 100, 200, 1000]}
                      onPageChange={handlePageChange}
                      onItemsPerPageChange={handleItemsPerPageChange}
                      showItemsPerPageSelector={true}
                      showPageInfo={true}
                      disabled={isLoading}
                    />
                  </ScrollReveal>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 产品详情面板 */}
        <ProductDetailPanel
          product={selectedProduct}
          isOpen={isDetailPanelOpen}
          onClose={handleCloseDetailPanel}
          onNavigate={handleProductNavigation}
          canNavigate={canNavigate}
          onWidthChange={handlePanelWidthChange}
        />
      </div>
    </div>
  );
};
