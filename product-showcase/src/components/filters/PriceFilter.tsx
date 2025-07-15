import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider, PriceRangeQuickSelect } from '../ui/Slider';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { cn } from '../../utils/cn';
import { useProductStore } from '../../stores/productStore';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export interface PriceFilterProps {
  value?: [number, number];
  onChange: (range: [number, number]) => void;
  className?: string;
  defaultCollapsed?: boolean;
}

export const PriceFilter: React.FC<PriceFilterProps> = ({
  value,
  onChange,
  className,
  defaultCollapsed = true
}) => {
  const products = useProductStore(state => state.products);
  const filters = useProductStore(state => state.filters);
  
  // 计算价格范围和分布
  const priceStats = useMemo(() => {
    if (products.length === 0) return { min: 1.5, max: 450, distribution: [] };

    const prices = products.map(p => p.price.discount || p.price.normal);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    
    // 创建价格分布直方图（10个区间）
    const bucketCount = 10;
    const bucketSize = (max - min) / bucketCount;
    const distribution = Array(bucketCount).fill(0);
    
    prices.forEach(price => {
      const bucketIndex = Math.min(Math.floor((price - min) / bucketSize), bucketCount - 1);
      distribution[bucketIndex]++;
    });

    return { min, max, distribution };
  }, [products]);

  const currentRange = value || [priceStats.min, priceStats.max];
  const [showDistribution, setShowDistribution] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const formatPrice = (price: number) => `¥${price.toFixed(price < 10 ? 1 : 0)}`;

  // 计算当前筛选范围内的产品数量
  const filteredCount = useMemo(() => {
    return products.filter(product => {
      const price = product.price.discount || product.price.normal;
      return price >= currentRange[0] && price <= currentRange[1];
    }).length;
  }, [products, currentRange]);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center space-x-2">
            <CardTitle className="text-base font-medium">价格区间</CardTitle>
            {!isCollapsed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDistribution(!showDistribution);
                }}
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                {showDistribution ? '隐藏分布' : '显示分布'}
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-600">
              {filteredCount} 个产品
            </div>
            {isCollapsed ? (
              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDownIcon className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <CardContent className="space-y-4 pt-0">
              {/* 价格分布图 */}
              {showDistribution && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
                  <div className="text-sm font-medium text-gray-700 mb-2">价格分布</div>
                  <div className="flex items-end justify-between h-16 bg-gray-50 rounded p-2">
                    {priceStats.distribution.map((count, index) => {
                      const height = priceStats.distribution.length > 0 
                        ? (count / Math.max(...priceStats.distribution)) * 100 
                        : 0;
                      
                      return (
                        <motion.div
                          key={index}
                          className="bg-blue-400 rounded-sm min-w-[4px] mx-0.5"
                          style={{ height: `${height}%` }}
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{ delay: index * 0.05 }}
                          title={`${count} 个产品`}
                        />
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* 快速选择按钮 */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">快速选择</div>
                <PriceRangeQuickSelect
                  currentRange={currentRange}
                  onSelect={onChange}
                />
              </div>

              {/* 价格滑块 */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-3">自定义范围</div>
                <Slider
                  min={priceStats.min}
                  max={priceStats.max}
                  step={0.5}
                  value={currentRange}
                  onChange={onChange}
                  formatValue={formatPrice}
                />
              </div>

              {/* 优惠价格选项 */}
              <div className="pt-2 border-t border-gray-200">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.showDiscountOnly}
                    onChange={(e) => {
                      useProductStore.getState().setFilters({ 
                        showDiscountOnly: e.target.checked 
                      });
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">只显示有优惠的产品</span>
                </label>
              </div>

              {/* 价格统计信息 */}
              <div className="pt-2 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">最低价格</div>
                    <div className="font-medium">{formatPrice(priceStats.min)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">最高价格</div>
                    <div className="font-medium">{formatPrice(priceStats.max)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
