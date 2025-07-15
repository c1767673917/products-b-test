import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { cn } from '../../utils/cn';
import { useProductStore } from '../../stores/productStore';
import { 
  BuildingStorefrontIcon, 
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  ShoppingBagIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

export interface PlatformFilterProps {
  value: string[];
  onChange: (platforms: string[]) => void;
  className?: string;
  defaultCollapsed?: boolean;
}

// 平台图标映射
const getPlatformIcon = (platform: string): React.ComponentType<React.SVGProps<SVGSVGElement>> => {
  const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
    '大润发': BuildingStorefrontIcon,
    '山姆APP': DevicePhoneMobileIcon,
    '盒马APP': DevicePhoneMobileIcon,
    '猫超': GlobeAltIcon,
    '胖东来': BuildingStorefrontIcon,
    '天猫旗舰店': GlobeAltIcon,
    '零食很忙': ShoppingBagIcon,
  };
  
  return iconMap[platform] || BuildingStorefrontIcon;
};

// 平台颜色映射
const getPlatformColor = (platform: string) => {
  const colorMap: Record<string, string> = {
    '大润发': 'blue',
    '山姆APP': 'green',
    '盒马APP': 'orange',
    '猫超': 'red',
    '胖东来': 'purple',
    '天猫旗舰店': 'pink',
    '零食很忙': 'indigo',
  };
  
  return colorMap[platform] || 'gray';
};

export const PlatformFilter: React.FC<PlatformFilterProps> = ({
  value,
  onChange,
  className,
  defaultCollapsed = true
}) => {
  const products = useProductStore(state => state.products);
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  
  // 计算平台分布
  const platformData = useMemo(() => {
    const platformMap = new Map<string, number>();
    
    products.forEach(product => {
      const platform = product.platform;
      platformMap.set(platform, (platformMap.get(platform) || 0) + 1);
    });
    
    // 转换为数组并排序
    return Array.from(platformMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: products.length > 0 ? (count / products.length * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  const handlePlatformChange = (platformName: string, checked: boolean) => {
    if (checked) {
      onChange([...value, platformName]);
    } else {
      onChange(value.filter(platform => platform !== platformName));
    }
  };

  const isSelected = (platformName: string) => value.includes(platformName);

  const handleSelectAll = () => {
    if (value.length === platformData.length) {
      onChange([]);
    } else {
      onChange(platformData.map(p => p.name));
    }
  };

  const isAllSelected = value.length === platformData.length;
  const isPartialSelected = value.length > 0 && value.length < platformData.length;

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <CardTitle className="text-base font-medium">采集平台</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-600">
              {value.length > 0 ? `已选择 ${value.length} 个平台` : `共 ${platformData.length} 个平台`}
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
              {/* 全选选项 */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors rounded p-2 -m-2"
                  onClick={handleSelectAll}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isPartialSelected;
                      }}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectAll();
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 pointer-events-none"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900">
                      全部平台 ({platformData.reduce((sum, p) => sum + p.count, 0)} 个产品)
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectAll();
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    {isAllSelected ? '取消全选' : '全选'}
                  </button>
                </div>
              </div>

              {/* 平台列表 */}
              <div className="space-y-3">
                {platformData.map((platform) => {
                  const IconComponent = getPlatformIcon(platform.name);
                  const color = getPlatformColor(platform.name);
                  const selected = isSelected(platform.name);
                  
                  return (
                    <motion.div
                      key={platform.name}
                      className={cn(
                        'border rounded-lg p-3 transition-all cursor-pointer',
                        selected 
                          ? 'border-blue-300 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handlePlatformChange(platform.name, !selected)}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handlePlatformChange(platform.name, e.target.checked);
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 pointer-events-none"
                        />
                        
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <IconComponent className={`w-5 h-5 text-${color}-500 mr-2`} />
                              <span className="text-sm font-medium text-gray-900">
                                {platform.name}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">
                                {platform.count} 个产品
                              </div>
                              <div className="text-xs text-gray-500">
                                {platform.percentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          
                          {/* 进度条 */}
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <motion.div
                                className={`h-2 rounded-full bg-${color}-500`}
                                initial={{ width: 0 }}
                                animate={{ width: `${platform.percentage}%` }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* 选中的平台标签 */}
              {value.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm font-medium text-gray-700 mb-2">已选择的平台</div>
                  <div className="flex flex-wrap gap-2">
                    {value.map((platformName) => {
                      const platformInfo = platformData.find(p => p.name === platformName);
                      const IconComponent = getPlatformIcon(platformName);
                      const color = getPlatformColor(platformName);
                      
                      return (
                        <motion.div
                          key={platformName}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className={`flex items-center bg-${color}-100 text-${color}-800 px-2 py-1 rounded-full text-xs`}
                        >
                          <IconComponent className="w-3 h-3 mr-1" />
                          <span>{platformName}</span>
                          {platformInfo && (
                            <span className={`ml-1 text-${color}-600`}>({platformInfo.count})</span>
                          )}
                          <button
                            onClick={() => handlePlatformChange(platformName, false)}
                            className={`ml-1 text-${color}-600 hover:text-${color}-800`}
                          >
                            ×
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 平台统计摘要 */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm font-medium text-gray-700 mb-2">平台统计</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">总平台数</div>
                    <div className="font-medium">{platformData.length} 个</div>
                  </div>
                  <div>
                    <div className="text-gray-500">最大平台</div>
                    <div className="font-medium">
                      {platformData[0]?.name} ({platformData[0]?.count})
                    </div>
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
