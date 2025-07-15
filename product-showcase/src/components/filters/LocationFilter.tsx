import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { cn } from '../../utils/cn';
import { useProductStore } from '../../stores/productStore';
import { MagnifyingGlassIcon, MapPinIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export interface LocationFilterProps {
  value: string[];
  onChange: (locations: string[]) => void;
  className?: string;
  defaultCollapsed?: boolean;
}

export const LocationFilter: React.FC<LocationFilterProps> = ({
  value,
  onChange,
  className,
  defaultCollapsed = true
}) => {
  const products = useProductStore(state => state.products);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // 计算产地分布
  const locationData = useMemo(() => {
    const locationMap = new Map<string, { count: number; cities: Set<string> }>();
    
    products.forEach(product => {
      const province = product.origin.province;
      const city = product.origin.city;
      
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
    return Array.from(locationMap.entries())
      .map(([name, info]) => ({
        name,
        count: info.count,
        cities: Array.from(info.cities).sort()
      }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  // 筛选产地数据
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locationData;
    
    const query = searchQuery.toLowerCase();
    return locationData.filter(location => 
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
    return products.length > 0 ? (count / products.length * 100).toFixed(1) : '0';
  };

  // 获取热门产地（前5个）
  const topLocations = locationData.slice(0, 5);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <CardTitle className="text-base font-medium">产地筛选</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-600">
              {value.length > 0 ? `已选择 ${value.length} 个产地` : `共 ${locationData.length} 个产地`}
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
            <CardContent className="pt-0">
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
                  列表
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
                  地图
                </button>
              </div>

              {/* 搜索框 */}
              <div className="mb-4">
                <Input
                  placeholder="搜索省份或城市..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
                  className="w-full"
                />
              </div>

              {/* 热门产地快速选择 */}
              {!searchQuery && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">热门产地</div>
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
                      <div className="text-sm">地图视图</div>
                      <div className="text-xs mt-1">功能开发中...</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 选中的产地标签 */}
              {value.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm font-medium text-gray-700 mb-2">已选择的产地</div>
                  <div className="flex flex-wrap gap-2">
                    {value.map((locationName) => {
                      const locationInfo = locationData.find(loc => loc.name === locationName);
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
                  <div className="text-sm">未找到匹配的产地</div>
                  <div className="text-xs mt-1">尝试使用其他关键词搜索</div>
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
