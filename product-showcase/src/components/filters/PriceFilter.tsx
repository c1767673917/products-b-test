import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider, PriceRangeQuickSelect } from '../ui/Slider';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { cn } from '../../utils/cn';
import { useProductStore } from '../../stores/productStore';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useProductI18n } from '../../hooks/useProductI18n';
import { useTranslation } from 'react-i18next';

export interface PriceFilterProps {
  value?: [number, number];
  onChange: (range: [number, number]) => void;
  className?: string;
  defaultCollapsed?: boolean;
  priceStats?: {
    min: number;
    max: number;
    distribution?: number[];
  };
}

export const PriceFilter: React.FC<PriceFilterProps> = ({
  value,
  onChange,
  className,
  defaultCollapsed = true,
  priceStats: propPriceStats
}) => {
  const { t } = useTranslation('product');
  const { currentLanguage } = useProductI18n();
  const products = useProductStore(state => state.products);
  const filters = useProductStore(state => state.filters);
  
  // 计算价格范围和分布
  const priceStats = useMemo(() => {
    // 优先使用传入的价格统计数据
    if (propPriceStats) {
      return propPriceStats;
    }
    
    // 否则从本地产品计算（作为后备方案）
    if (products.length === 0) return { min: 1.5, max: 450, distribution: [] };

    // 根据当前语言选择合适的价格
    const prices = products.map(p => {
      if (currentLanguage === 'en' && p.price.usd?.normal) {
        // 英文界面使用USD价格
        return p.price.usd.discount || p.price.usd.normal;
      } else {
        // 中文界面使用CNY价格
        return p.price.discount || p.price.normal;
      }
    });
    
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
  }, [products, propPriceStats, currentLanguage]);

  const currentRange = value || [priceStats.min, priceStats.max];
  const [showDistribution, setShowDistribution] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const formatPrice = (price: number) => {
    const useUSD = currentLanguage === 'en';
    const symbol = useUSD ? '$' : '¥';
    return `${symbol}${price.toFixed(price < 10 ? 1 : 0)}`;
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center space-x-2">
            <CardTitle className="text-base font-medium">{t('filters.priceRange')}</CardTitle>
            {!isCollapsed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDistribution(!showDistribution);
                }}
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                {showDistribution ? t('filters.hideDistribution') : t('filters.showDistribution')}
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-600">
              {formatPrice(currentRange[0])} - {formatPrice(currentRange[1])}
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
                  <div className="text-sm font-medium text-gray-700 mb-2">{t('filters.priceDistribution')}</div>
                  <div className="flex items-end justify-between h-16 bg-gray-50 rounded p-2">
                    {priceStats.distribution?.map((count, index) => {
                      const height = priceStats.distribution && priceStats.distribution.length > 0 
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
                          title={t('filters.productCount', { count })}
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
                  minPrice={priceStats.min}
                  maxPrice={priceStats.max}
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
                <div 
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 transition-colors rounded p-2 -m-2"
                  onClick={() => {
                    useProductStore.getState().setFilters({ 
                      showDiscountOnly: !filters.showDiscountOnly 
                    });
                  }}
                >
                  <input
                    type="checkbox"
                    checked={filters.showDiscountOnly}
                    onChange={(e) => {
                      e.stopPropagation();
                      useProductStore.getState().setFilters({ 
                        showDiscountOnly: e.target.checked 
                      });
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 pointer-events-none"
                  />
                  <span className="text-sm text-gray-700">{t('filters.showDiscountOnly')}</span>
                </div>
              </div>

              {/* 价格统计信息 */}
              <div className="pt-2 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">{t('filters.minPrice')}</div>
                    <div className="font-medium">{formatPrice(priceStats.min)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">{t('filters.maxPrice')}</div>
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
