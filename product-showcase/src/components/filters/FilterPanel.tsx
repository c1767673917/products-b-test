import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { PriceFilter } from './PriceFilter';
import { CategoryFilter } from './CategoryFilter';
import { LocationFilter } from './LocationFilter';
import { PlatformFilter } from './PlatformFilter';
import { cn } from '../../utils/cn';
import { useProductStore, FilterState } from '../../stores/productStore';
import { 
  FunnelIcon, 
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

export interface FilterPanelProps {
  filters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
  onClearFilters?: () => void;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  isMobile?: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters: propFilters,
  onFiltersChange: propOnFiltersChange,
  onClearFilters: propOnClearFilters,
  className,
  collapsible = true,
  defaultCollapsed = false,
  isMobile = false
}) => {
  // 优先使用props，如果没有则使用store
  const storeFilters = useProductStore(state => state.filters);
  const storeSetFilters = useProductStore(state => state.setFilters);
  const storeClearFilters = useProductStore(state => state.clearFilters);
  const filteredProducts = useProductStore(state => state.filteredProducts);
  const products = useProductStore(state => state.products);

  const filters = propFilters || storeFilters;
  const setFilters = propOnFiltersChange || storeSetFilters;
  const clearFilters = propOnClearFilters || storeClearFilters;
  
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // 计算活跃筛选器数量
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filters.priceRange) count++;
    if (filters.categories.length > 0) count++;
    if (filters.locations.length > 0) count++;
    if (filters.platforms.length > 0) count++;
    if (filters.showDiscountOnly) count++;
    return count;
  }, [filters]);

  const hasActiveFilters = activeFiltersCount > 0;

  const handlePriceChange = (range: [number, number]) => {
    setFilters({ priceRange: range });
  };

  const handleCategoryChange = (categories: string[]) => {
    setFilters({ categories });
  };

  const handleLocationChange = (locations: string[]) => {
    setFilters({ locations });
  };

  const handlePlatformChange = (platforms: string[]) => {
    setFilters({ platforms });
  };

  const handleClearFilters = () => {
    clearFilters();
  };

  return (
    <div className={cn('w-full', className)}>
      {/* 筛选器头部 - 仅在非移动端显示 */}
      {!isMobile && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FunnelIcon className="w-5 h-5 text-gray-600" />
                <CardTitle className="text-lg font-semibold">筛选器</CardTitle>
                {hasActiveFilters && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full"
                  >
                    {activeFiltersCount}
                  </motion.div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-red-600 hover:text-red-700"
                >
                  <XMarkIcon className="w-4 h-4 mr-1" />
                  清空
                </Button>
              )}
              
              {collapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                >
                  {isCollapsed ? (
                    <ChevronDownIcon className="w-4 h-4" />
                  ) : (
                    <ChevronUpIcon className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* 筛选结果摘要 */}
          <div className="text-sm text-gray-600">
            显示 {filteredProducts.length} / {products.length} 个产品
            {hasActiveFilters && (
              <span className="ml-2 text-blue-600">
                (已应用 {activeFiltersCount} 个筛选条件)
              </span>
            )}
          </div>
        </CardHeader>
      </Card>
      )}

      {/* 筛选器内容 */}
      <AnimatePresence>
        {(!isCollapsed || isMobile) && (
          <motion.div
            initial={{ opacity: 0, height: isMobile ? 'auto' : 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: isMobile ? 'auto' : 0 }}
            transition={{ duration: isMobile ? 0.2 : 0.3 }}
            className={cn(
              'space-y-4',
              isMobile && 'space-y-6'
            )}
          >
            {/* 价格筛选器 */}
            <motion.div
              initial={{ opacity: 0, y: isMobile ? 10 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: isMobile ? 0.05 : 0.1 }}
              className={isMobile ? 'bg-gray-50 p-4 rounded-lg' : ''}
            >
              <PriceFilter
                value={filters.priceRange}
                onChange={handlePriceChange}
                defaultCollapsed={true}
              />
            </motion.div>

            {/* 品类筛选器 */}
            <motion.div
              initial={{ opacity: 0, y: isMobile ? 10 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: isMobile ? 0.1 : 0.2 }}
              className={isMobile ? 'bg-gray-50 p-4 rounded-lg' : ''}
            >
              <CategoryFilter
                value={filters.categories}
                onChange={handleCategoryChange}
                defaultCollapsed={true}
              />
            </motion.div>

            {/* 产地筛选器 */}
            <motion.div
              initial={{ opacity: 0, y: isMobile ? 10 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: isMobile ? 0.15 : 0.3 }}
              className={isMobile ? 'bg-gray-50 p-4 rounded-lg' : ''}
            >
              <LocationFilter
                value={filters.locations}
                onChange={handleLocationChange}
                defaultCollapsed={true}
              />
            </motion.div>

            {/* 平台筛选器 */}
            <motion.div
              initial={{ opacity: 0, y: isMobile ? 10 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: isMobile ? 0.2 : 0.4 }}
              className={isMobile ? 'bg-gray-50 p-4 rounded-lg' : ''}
            >
              <PlatformFilter
                value={filters.platforms}
                onChange={handlePlatformChange}
                defaultCollapsed={true}
              />
            </motion.div>

            {/* 筛选器操作按钮 */}
            {!isMobile && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-between pt-4"
              >
                <div className="text-sm text-gray-600">
                  {hasActiveFilters ? (
                    <span>筛选结果: {filteredProducts.length} 个产品</span>
                  ) : (
                    <span>未应用任何筛选条件</span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearFilters}
                    >
                      <AdjustmentsHorizontalIcon className="w-4 h-4 mr-1" />
                      重置筛选
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {/* 移动端底部操作区 */}
            {isMobile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="sticky bottom-0 bg-white border-t p-4 -mx-4 -mb-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-gray-600">
                    {hasActiveFilters ? (
                      <span>筛选结果: {filteredProducts.length} 个产品</span>
                    ) : (
                      <span>共 {products.length} 个产品</span>
                    )}
                  </div>
                  {hasActiveFilters && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full"
                    >
                      {activeFiltersCount}
                    </motion.div>
                  )}
                </div>

                <div className="flex gap-3">
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleClearFilters}
                      className="flex-1"
                    >
                      清空筛选
                    </Button>
                  )}
                  <Button
                    variant="default"
                    size="lg"
                    onClick={() => {
                      // 关闭移动端筛选面板的逻辑将在父组件处理
                      const event = new CustomEvent('closeMobileFilter');
                      window.dispatchEvent(event);
                    }}
                    className="flex-1"
                  >
                    查看结果
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 活跃筛选条件摘要（折叠时显示） */}
      {isCollapsed && hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  已应用 {activeFiltersCount} 个筛选条件，显示 {filteredProducts.length} 个产品
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-red-600 hover:text-red-700"
                >
                  清空筛选
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};
