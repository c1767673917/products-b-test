import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Squares2X2Icon,
  ListBulletIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import type { Product } from '../../types/product';
import ProductCard from '../../components/product/ProductCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Loading';
import { Pagination } from '../../components/ui';
import { FilterPanel } from '../../components/filters';
import { useUrlFilters, useFilterSummary } from '../../hooks/useUrlFilters';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../components/ui/ToastNotification';
import { cn } from '../../utils/cn';
import {
  useFilteredProducts,
  useProductUI,
  useProductActions
} from '../../stores/productStore';

const ProductList: React.FC = () => {
  const filteredProducts = useFilteredProducts();
  const {
    viewMode,
    sortOption,
    searchQuery,
    currentPage,
    itemsPerPage,
    showFilters,
    loading,
    error
  } = useProductUI();

  const {
    setViewMode,
    setSortOption,
    setSearchQuery,
    setCurrentPage,
    setItemsPerPage,
    setShowFilters,
    toggleFavorite,
    addToCompare,
    clearFilters,
    initializeData
  } = useProductActions();

  // URL筛选功能
  const { clearAllFilters, generateShareUrl } = useUrlFilters();
  const filterSummary = useFilterSummary();
  const { showSuccess, showError, showInfo } = useToast();

  // 本地搜索状态（用于即时UI反馈）
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);

  // 响应式检测
  const [isMobile, setIsMobile] = React.useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 防抖搜索效果
  useEffect(() => {
    if (debouncedSearchQuery !== searchQuery) {
      setSearchQuery(debouncedSearchQuery);
      setCurrentPage(1);
    }
  }, [debouncedSearchQuery, searchQuery, setSearchQuery, setCurrentPage]);

  // 初始化数据
  useEffect(() => {
    initializeData();
  }, [initializeData]);

  // 分页产品（filteredProducts已经在store中排序过了）

  const paginatedProducts = useMemo(() => {
    if (itemsPerPage === 0) {
      return filteredProducts; // 显示全部产品
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const totalPages = itemsPerPage === 0 ? 1 : Math.ceil(filteredProducts.length / itemsPerPage);

  // 处理产品操作
  const handleProductAction = (product: Product, action: 'favorite' | 'compare' | 'detail') => {
    switch (action) {
      case 'favorite':
        toggleFavorite(product.id);
        break;
      case 'compare':
        addToCompare(product.id);
        break;
      case 'detail':
        // TODO: 导航到详情页
        console.log('Navigate to detail:', product.name);
        break;
    }
  };

  // 处理搜索（本地状态更新，防抖后才真正搜索）
  const handleSearch = (query: string) => {
    setLocalSearchQuery(query);
  };

  // 处理排序
  const handleSort = (option: string) => {
    setSortOption(option as any);
    setCurrentPage(1);
  };

  // 处理分页
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 处理每页显示数量变化
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // 如果有错误，显示错误信息
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">加载失败</div>
          <div className="text-gray-500 text-sm">{error}</div>
          <Button
            onClick={() => initializeData()}
            className="mt-4"
          >
            重试
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部工具栏 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                产品展示 ({filteredProducts.length})
              </h1>
              {filterSummary.hasActiveFilters && (
                <div className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {filterSummary.activeFiltersCount} 个筛选条件
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* 搜索框 */}
              <div className="relative">
                <Input
                  type="text"
                  placeholder="搜索产品..."
                  value={localSearchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-64"
                  leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
                />
                {localSearchQuery !== searchQuery && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* 排序选择 */}
              <select
                value={sortOption}
                onChange={(e) => handleSort(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">按名称排序</option>
                <option value="price-asc">价格从低到高</option>
                <option value="price-desc">价格从高到低</option>
                <option value="collect-time">按采集时间</option>
              </select>

              {/* 分享按钮 */}
              {filterSummary.hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      const url = generateShareUrl();
                      await navigator.clipboard.writeText(url);
                      showSuccess('链接已复制', '筛选条件链接已复制到剪贴板');
                    } catch (error) {
                      showError('复制失败', '无法复制链接到剪贴板');
                    }
                  }}
                  leftIcon={<ShareIcon className="w-4 h-4" />}
                >
                  分享
                </Button>
              )}

              {/* 筛选按钮 */}
              <Button
                variant={showFilters ? "primary" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                leftIcon={<FunnelIcon className="w-4 h-4" />}
              >
                筛选
              </Button>

              {/* 视图切换 */}
              <div className="flex border border-gray-300 rounded-md">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded-l-md transition-colors",
                    viewMode === 'grid'
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Squares2X2Icon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded-r-md transition-colors border-l border-gray-300",
                    viewMode === 'list'
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <ListBulletIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={cn("flex gap-8", isMobile && "flex-col")}>
          {/* 筛选面板 */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={isMobile ? { height: 0, opacity: 0 } : { width: 0, opacity: 0 }}
                animate={isMobile ? { height: 'auto', opacity: 1 } : { width: 320, opacity: 1 }}
                exit={isMobile ? { height: 0, opacity: 0 } : { width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "overflow-hidden",
                  isMobile ? "w-full" : "flex-shrink-0"
                )}
              >
                <div className={cn(isMobile ? "w-full" : "w-80")}>
                  <FilterPanel
                    collapsible={!isMobile}
                    defaultCollapsed={false}
                    isMobile={isMobile}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 产品列表 */}
          <div className="flex-1">
            {paginatedProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg">没有找到匹配的产品</div>
                <div className="text-gray-400 text-sm mt-2">
                  尝试调整搜索条件或筛选器
                </div>
              </div>
            ) : (
              <>
                {/* 产品网格/列表 */}
                <motion.div
                  key={`page-${currentPage}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  layout
                  className={cn(
                    "gap-6",
                    viewMode === 'grid'
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                      : "space-y-4"
                  )}
                >
                  <AnimatePresence mode="popLayout">
                    {paginatedProducts.map((product, index) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{
                          duration: 0.2,
                          delay: index * 0.05,
                          ease: "easeOut"
                        }}
                      >
                        <ProductCard
                          product={product}
                          layout={viewMode}
                          onQuickAction={(action) => handleProductAction(product, action)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>

                {/* 分页 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="mt-8"
                >
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredProducts.length}
                    itemsPerPage={itemsPerPage}
                    itemsPerPageOptions={[0, 20, 100, 500]} // 添加0选项表示显示全部
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                    showItemsPerPageSelector={true}
                    showPageInfo={true}
                    disabled={loading}
                  />
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
