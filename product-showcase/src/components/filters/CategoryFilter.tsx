import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { cn } from '../../utils/cn';
import { useProductStore } from '../../stores/productStore';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export interface CategoryFilterProps {
  value: string[];
  onChange: (categories: string[]) => void;
  className?: string;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  value,
  onChange,
  className
}) => {
  const products = useProductStore(state => state.products);

  // 添加调试信息
  React.useEffect(() => {
    console.log('CategoryFilter: products 数组长度:', products.length);
    if (products.length > 0) {
      console.log('CategoryFilter: 第一个产品:', products[0]);
    }
  }, [products.length]);
  
  // 计算品类分布和层级结构
  const categoryData = useMemo(() => {
    console.log('CategoryFilter: 重新计算品类数据，products.length =', products.length);
    const categoryMap = new Map<string, { count: number; subcategories: Map<string, number> }>();

    products.forEach(product => {
      const primary = product.category.primary;
      const secondary = product.category.secondary;
      
      if (!categoryMap.has(primary)) {
        categoryMap.set(primary, { count: 0, subcategories: new Map() });
      }
      
      const categoryInfo = categoryMap.get(primary)!;
      categoryInfo.count++;
      
      if (secondary) {
        const currentCount = categoryInfo.subcategories.get(secondary) || 0;
        categoryInfo.subcategories.set(secondary, currentCount + 1);
      }
    });
    
    // 转换为数组并排序
    const result = Array.from(categoryMap.entries())
      .map(([name, info]) => ({
        name,
        count: info.count,
        subcategories: Array.from(info.subcategories.entries())
          .map(([subName, subCount]) => ({ name: subName, count: subCount }))
          .sort((a, b) => b.count - a.count)
      }))
      .sort((a, b) => b.count - a.count);

    console.log('CategoryFilter: 计算得到的品类数据:', result);
    return result;
  }, [products]);

  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set());

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCategoryChange = (categoryName: string, checked: boolean) => {
    if (checked) {
      onChange([...value, categoryName]);
    } else {
      onChange(value.filter(cat => cat !== categoryName));
    }
  };

  const isSelected = (categoryName: string) => value.includes(categoryName);

  const getPercentage = (count: number) => {
    return products.length > 0 ? (count / products.length * 100).toFixed(1) : '0';
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">商品品类</CardTitle>
        <div className="text-sm text-gray-600">
          {value.length > 0 ? `已选择 ${value.length} 个品类` : '选择商品品类'}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {categoryData.map((category) => {
            const isExpanded = expandedCategories.has(category.name);
            const hasSubcategories = category.subcategories.length > 0;
            
            return (
              <div key={category.name} className="border border-gray-200 rounded-lg">
                {/* 主品类 */}
                <div className="flex items-center p-3">
                  <label className="flex items-center flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected(category.name)}
                      onChange={(e) => handleCategoryChange(category.name, e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {category.name}
                        </span>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{category.count} 个</span>
                          <span>({getPercentage(category.count)}%)</span>
                        </div>
                      </div>
                    </div>
                  </label>
                  
                  {hasSubcategories && (
                    <button
                      onClick={() => toggleCategory(category.name)}
                      className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDownIcon className="w-4 h-4" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* 子品类 */}
                <AnimatePresence>
                  {isExpanded && hasSubcategories && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-gray-200 bg-gray-50"
                    >
                      <div className="p-3 space-y-2">
                        {category.subcategories.map((subcategory) => (
                          <div key={subcategory.name} className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 pl-4">
                              {subcategory.name}
                            </span>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <span>{subcategory.count} 个</span>
                              <span>({getPercentage(subcategory.count)}%)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* 选中的品类标签 */}
        {value.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-2">已选择的品类</div>
            <div className="flex flex-wrap gap-2">
              {value.map((categoryName) => {
                const categoryInfo = categoryData.find(cat => cat.name === categoryName);
                return (
                  <motion.div
                    key={categoryName}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                  >
                    <span>{categoryName}</span>
                    {categoryInfo && (
                      <span className="ml-1 text-blue-600">({categoryInfo.count})</span>
                    )}
                    <button
                      onClick={() => handleCategoryChange(categoryName, false)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
