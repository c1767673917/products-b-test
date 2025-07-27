import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { cn } from '../../utils/cn';
import { useProductStore } from '../../stores/productStore';
import { useProductI18n } from '../../hooks/useProductI18n';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon, MapPinIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export interface LocationFilterProps {
  value: string[];
  onChange: (locations: string[]) => void;
  className?: string;
  defaultCollapsed?: boolean;
  options?: { value: string; label: string; count: number; }[];
  loading?: boolean;
}

export const LocationFilter: React.FC<LocationFilterProps> = ({
  value,
  onChange,
  className,
  defaultCollapsed = true,
  options,
  loading = false
}) => {
  const products = useProductStore(state => state.products);
  const { getLocalizedValue } = useProductI18n();
  const { t } = useTranslation('product');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // 计算产地分布
  const locationData = useMemo(() => {
    // 优先使用传入的options数据
    if (options && options.length > 0) {
      const totalProductsWithLocation = options.reduce((sum, option) => sum + option.count, 0);
      return {
        locations: options.map(option => ({
          name: option.label,
          count: option.count,
          cities: [] // 后端API暂不支持城市详情，后续可扩展
        })),
        totalProductsWithLocation
      };
    }

    // 回退到本地数据计算
    const locationMap = new Map<string, { count: number; cities: Set<string> }>();
    const processedProducts = new Set<string>(); // 跟踪已处理的商品，避免重复计算总数

    products.forEach(product => {
      const province = getLocalizedValue(product.origin?.province, '');
      const city = getLocalizedValue(product.origin?.city, '');

      if (!province) return;
      
      // 记录有产地信息的商品
      processedProducts.add(product.id);

      // 处理复合产地（如"浙江/四川"）
      const provinces = province.split('/').map(p => p.trim()).filter(p => p);

      provinces.forEach(prov => {
        if (!locationMap.has(prov)) {
          locationMap.set(prov, { count: 0, cities: new Set() });
        }

        const locationInfo = locationMap.get(prov)!;
        locationInfo.count++;

        if (city) {
          locationInfo.cities.add(city);
        }
      });
    });
    
    // 转换为数组并排序
    const result = Array.from(locationMap.entries())
      .map(([name, info]) => ({
        name,
        count: info.count,
        cities: Array.from(info.cities).sort()
      }))
      .sort((a, b) => b.count - a.count);
      
    return {
      locations: result,
      totalProductsWithLocation: processedProducts.size
    };
  }, [options, products]);

  // 筛选产地数据
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locationData.locations || [];
    
    const query = searchQuery.toLowerCase();
    return (locationData.locations || []).filter(location => 
      location.name.toLowerCase().includes(query) ||
      location.cities.some(city => city.toLowerCase().includes(query))
    );
  }, [locationData, searchQuery]);

  const handleLocationChange = (locationName: string, checked: boolean) => {
    if (checked) {
      onChange([...value, locationName]);
    } else {
      onChange(value.filter(loc => loc !== locationName));
    }
  };

  const isSelected = (locationName: string) => value.includes(locationName);

  const getPercentage = (count: number) => {
    const totalProducts = locationData.totalProductsWithLocation || products.length;
    return totalProducts > 0 ? (count / totalProducts * 100).toFixed(1) : '0';
  };

  // 获取热门产地（前5个）
  const topLocations = (locationData.locations || []).slice(0, 5);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <CardTitle className="text-base font-medium">{t('filters.locations.title')}</CardTitle>
          <div className="flex items-center space-x-2">
            {loading ? (
              <div className="text-sm text-gray-500">{t('filters.locations.loading')}</div>
            ) : (
              <div className="text-sm text-gray-600">
                {value.length > 0
                  ? t('filters.locations.selected', { count: value.length })
                  : t('filters.locations.total', { count: (locationData.locations || []).length })
                }
              </div>
            )}
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
            <CardContent className="pt-0">
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="text-sm text-gray-500">加载筛选选项中...</div>
                </div>
              ) : (
                <>
                  {/* 视图模式切换 */}
                  <div className="flex items-center justify-end space-x-2 mb-4">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'px-2 py-1 text-xs rounded transition-colors',
                    viewMode === 'list' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {t('filters.locations.viewMode.list')}
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={cn(
                    'px-2 py-1 text-xs rounded transition-colors',
                    viewMode === 'map'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {t('filters.locations.viewMode.map')}
                </button>
              </div>

              {/* 搜索框 */}
              <div className="mb-4">
                <Input
                  placeholder={t('filters.locations.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
                  className="w-full"
                />
              </div>

              {/* 热门产地快速选择 */}
              {!searchQuery && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">{t('filters.locations.popularOrigins')}</div>
                  <div className="flex flex-wrap gap-2">
                    {topLocations.map((location) => (
                      <motion.button
                        key={location.name}
                        onClick={() => handleLocationChange(location.name, !isSelected(location.name))}
                        className={cn(
                          'px-3 py-1.5 text-sm rounded-full border transition-colors',
                          isSelected(location.name)
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:text-blue-600'
                        )}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {location.name} ({location.count})
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* 产地列表 */}
              <AnimatePresence mode="wait">
                {viewMode === 'list' && (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2 max-h-64 overflow-y-auto"
                  >
                    {filteredLocations.map((location) => (
                      <div 
                        key={location.name} 
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                        onClick={() => handleLocationChange(location.name, !isSelected(location.name))}
                      >
                        <div className="flex items-center flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected(location.name)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleLocationChange(location.name, e.target.checked);
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 pointer-events-none"
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <MapPinIcon className="w-4 h-4 text-gray-400 mr-1" />
                                <span className="text-sm font-medium text-gray-900">
                                  {location.name}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <span>{location.count} 个产品</span>
                                <span>({getPercentage(location.count)}%)</span>
                              </div>
                            </div>
                            {location.cities.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                城市: {location.cities.slice(0, 3).join(', ')}
                                {location.cities.length > 3 && ` 等${location.cities.length}个城市`}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {viewMode === 'map' && (
                  <motion.div
                    key="map"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-64 bg-gray-100 rounded-lg flex items-center justify-center"
                  >
                    <div className="text-center text-gray-500">
                      <MapPinIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <div className="text-sm">{t('filters.locations.viewMode.map')}</div>
                      <div className="text-xs mt-1">功能开发中...</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 选中的产地标签 */}
              {value.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm font-medium text-gray-700 mb-2">{t('filters.locations.selectedOrigins')}</div>
                  <div className="flex flex-wrap gap-2">
                    {value.map((locationName) => {
                      const locationInfo = (locationData.locations || []).find(loc => loc.name === locationName);
                      return (
                        <motion.div
                          key={locationName}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs"
                        >
                          <MapPinIcon className="w-3 h-3 mr-1" />
                          <span>{locationName}</span>
                          {locationInfo && (
                            <span className="ml-1 text-green-600">({locationInfo.count})</span>
                          )}
                          <button
                            onClick={() => handleLocationChange(locationName, false)}
                            className="ml-1 text-green-600 hover:text-green-800"
                          >
                            ×
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 无搜索结果 */}
              {searchQuery && filteredLocations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MapPinIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <div className="text-sm">{t('filters.locations.noResults')}</div>
                </div>
              )}
                </>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
