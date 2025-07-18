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
  XMarkIcon
} from '@heroicons/react/24/outline';
import type { Product, FilterState } from '../../types/product';
import ProductCard from '../../components/product/ProductCard';
import ProductDetailPanel from '../../components/product/ProductDetailPanel';
import ResponsiveProductGrid from '../../components/product/ResponsiveProductGrid';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Loading';
import { Pagination } from '../../components/ui';
import { FilterPanel } from '../../components/filters';
import { useProducts, useFilterProducts, useRefreshProducts } from '../../hooks/useProducts';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../components/ui/ToastNotification';
import { ScrollReveal, ScrollStagger, ScrollProgress } from '../../components/ui/ScrollAnimations';
import { useProductStore } from '../../stores/productStore';
import { usePanelPreferences } from '../../hooks/usePanelPreferences';

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
  const [favorites, setFavorites] = useState<string[]>([]);
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
    maxColumns: viewMode === 'grid' ? (isDetailPanelOpen ? 6 : 5) : 1, // 未打开详情页时默认最大5列
    gap: viewMode === 'grid' ? 16 : 16,
    padding: 64, // 容器左右padding
    maxCardWidth: viewMode === 'grid' ? 220 : 600 // 调整为更合理的最大卡片宽度
  }), [viewMode, isDetailPanelOpen]);

  // 使用新的实时响应式网格 hook
  const {
    getResponsiveGridClass,
    columns,
    cardWidth,
    availableWidth,
    debug
  } = useRealTimeResponsiveGrid(
    dimensions.width, // 使用原始容器宽度
    realTimePanelWidth, // 使用实时面板宽度
    isDetailPanelOpen, // 面板状态
    gridOptions
  );


  // React Query hooks
  const productsQuery = useProducts();
  const filterQuery = useFilterProducts(filters, searchQuery);
  const refreshMutation = useRefreshProducts();

  // ProductStore hooks
  const setProducts = useProductStore(state => state.setProducts);
  const storeProducts = useProductStore(state => state.products);

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
      console.log('  - data length:', productsQuery.data?.length || 0);
      console.log('  - error:', productsQuery.error);
    }

    if (productsQuery.data && productsQuery.data.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('同步产品数据到 ProductStore:', productsQuery.data.length, '个产品');
      }
      setProducts(productsQuery.data);
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

  // 获取要显示的产品数据
  const displayProducts = useMemo(() => {
    let products = filterQuery.data || productsQuery.data || [];

    // 排序
    switch (sortOption) {
      case 'name':
        products = [...products].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price-asc':
        products = [...products].sort((a, b) => {
          const priceA = a.price.discount || a.price.normal;
          const priceB = b.price.discount || b.price.normal;
          return priceA - priceB;
        });
        break;
      case 'price-desc':
        products = [...products].sort((a, b) => {
          const priceA = a.price.discount || a.price.normal;
          const priceB = b.price.discount || b.price.normal;
          return priceB - priceA;
        });
        break;
      case 'collect-time':
        products = [...products].sort((a, b) => b.collectTime - a.collectTime);
        break;
    }

    return products;
  }, [filterQuery.data, productsQuery.data, sortOption]);

  // 分页产品 - 如果itemsPerPage为0则显示全部
  const paginatedProducts = useMemo(() => {
    if (itemsPerPage === 0) {
      return displayProducts; // 显示全部产品
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    return displayProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [displayProducts, currentPage, itemsPerPage]);

  // 获取当前选中的产品
  const selectedProduct = selectedProductId 
    ? displayProducts.find(p => p.id === selectedProductId) || null
    : null;

  // 获取产品导航信息
  const getProductNavigation = () => {
    if (!selectedProductId) return { prev: false, next: false };
    
    const currentIndex = displayProducts.findIndex(p => p.id === selectedProductId);
    return {
      prev: currentIndex > 0,
      next: currentIndex < displayProducts.length - 1
    };
  };

  const canNavigate = getProductNavigation();

  // 处理产品导航
  const handleProductNavigation = (direction: 'prev' | 'next') => {
    if (!selectedProductId) return;
    
    const currentIndex = displayProducts.findIndex(p => p.id === selectedProductId);
    let newIndex = currentIndex;
    
    if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'next' && currentIndex < displayProducts.length - 1) {
      newIndex = currentIndex + 1;
    }
    
    if (newIndex !== currentIndex) {
      setSelectedProductId(displayProducts[newIndex].id);
    }
  };

  // 关闭详情面板
  const handleCloseDetailPanel = () => {
    setIsDetailPanelOpen(false);
    setSelectedProductId(null);
  };

  const totalPages = itemsPerPage === 0 ? 1 : Math.ceil(displayProducts.length / itemsPerPage);

  // 处理产品操作
  const handleProductAction = (product: Product, action: 'favorite' | 'compare' | 'detail') => {
    switch (action) {
      case 'favorite':
        setFavorites(prev => 
          prev.includes(product.id) 
            ? prev.filter(id => id !== product.id)
            : [...prev, product.id]
        );
        showSuccess(
          favorites.includes(product.id) ? '已取消收藏' : '已添加到收藏'
        );
        break;
      case 'detail':
        setSelectedProductId(product.id);
        setIsDetailPanelOpen(true);
        break;
      case 'compare':
        if (compareList.length >= 4) {
          showError('最多只能对比4个产品');
          return;
        }
        if (compareList.includes(product.id)) {
          showInfo('该产品已在对比列表中');
          return;
        }
        setCompareList(prev => [...prev, product.id]);
        showSuccess('已添加到对比列表');
        break;
    }
  };

  // 处理分页
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 处理每页显示数量变化
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    if (newItemsPerPage === 0) {
      // 显示全部时，重置到第一页
      setCurrentPage(1);
    } else {
      // 计算切换后应该在哪一页，尽量保持当前显示的第一个项目位置
      const currentFirstItem = (currentPage - 1) * itemsPerPage + 1;
      const newPage = Math.ceil(currentFirstItem / newItemsPerPage);
      setCurrentPage(newPage);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 处理筛选变化
  const handleFiltersChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  // 清空筛选
  const handleClearFilters = () => {
    setFilters(initialFilters);
    setSearchQuery('');
    setLocalSearchQuery('');
    setCurrentPage(1);
    showInfo('筛选条件已清空');
  };

  // 刷新数据
  const handleRefresh = () => {
    refreshMutation.mutate(undefined, {
      onSuccess: () => {
        showSuccess('数据刷新成功');
      },
      onError: (error) => {
        showError(`刷新失败: ${error.message}`);
      }
    });
  };

  // 分享功能
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      showSuccess('链接已复制到剪贴板');
    }).catch(() => {
      showError('复制失败');
    });
  };

  // 加载状态
  const isLoading = productsQuery.isLoading || filterQuery.isLoading || refreshMutation.isPending;
  const error = productsQuery.error || filterQuery.error;

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
    <div className="min-h-screen bg-gray-50 flex flex-row">
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 滚动进度条 */}
        <ScrollProgress />

        {/* 页面导航 */}
        <PageNavigation title="Product display" />

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
                  {!isMobile && <span className="ml-1">刷新</span>}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                >
                  <ShareIcon className="h-4 w-4" />
                  {!isMobile && <span className="ml-1">分享</span>}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <FunnelIcon className="h-4 w-4" />
                  {!isMobile && <span className="ml-1">筛选</span>}
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

        {/* 主要内容区域 */}
        <div
          ref={containerRef}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full"
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
                        <h2 className="text-lg font-semibold text-gray-900">筛选条件</h2>
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
                        placeholder="搜索产品名称、品类、口味..."
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
                      <option value="name">按名称排序</option>
                      <option value="price-asc">价格从低到高</option>
                      <option value="price-desc">价格从高到低</option>
                      <option value="collect-time">按采集时间</option>
                    </select>
                  </div>

                  {/* 结果统计 */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>
                      共找到 {displayProducts.length} 个产品
                      {searchQuery && ` (搜索: "${searchQuery}")`}
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
                  <p className="text-gray-500">没有找到符合条件的产品</p>
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    className="mt-4"
                  >
                    清空筛选条件
                  </Button>
                </div>
              ) : (
                <>
                  <ScrollStagger staggerDelay={0.05}>
                    {viewMode === 'grid' ? (
                      <ResponsiveProductGrid
                        gridClass={getResponsiveGridClass()}
                        columns={columns}
                        cardWidth={cardWidth}
                      >
                        {paginatedProducts.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            layout={viewMode}
                            onQuickAction={(action) => handleProductAction(product, action)}
                            isFavorited={favorites.includes(product.id)}
                            isInCompare={compareList.includes(product.id)}
                          />
                        ))}
                      </ResponsiveProductGrid>
                    ) : (
                      <motion.div
                        className="mb-8 grid grid-cols-1 gap-4"
                      >
                        <AnimatePresence>
                          {paginatedProducts.map((product) => (
                            <ProductCard
                              key={product.id}
                              product={product}
                              layout={viewMode}
                              onQuickAction={(action) => handleProductAction(product, action)}
                              isFavorited={favorites.includes(product.id)}
                              isInCompare={compareList.includes(product.id)}
                            />
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </ScrollStagger>

                  {/* 分页 */}
                  <ScrollReveal direction="up" delay={0.3}>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={displayProducts.length}
                      itemsPerPage={itemsPerPage}
                      itemsPerPageOptions={[0, 20, 100, 500]} // 添加0选项表示显示全部
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
  );
};
