import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { cn } from '../../utils/cn';
import { useProductStore } from '../../stores/productStore';
import { useProductI18n } from '../../hooks/useProductI18n';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export interface CategoryFilterProps {
  value: string[];
  onChange: (categories: string[]) => void;
  className?: string;
  defaultCollapsed?: boolean;
  options?: { value: string; label: string; count: number; }[];
  loading?: boolean;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  value,
  onChange,
  className,
  defaultCollapsed = true,
  options,
  loading = false
}) => {
  const products = useProductStore(state => state.products);
  const { getProductCategory } = useProductI18n();
  const { t } = useTranslation('product');

  // 添加调试信息
  React.useEffect(() => {
    console.log('CategoryFilter: options:', options);
    console.log('CategoryFilter: loading:', loading);
    console.log('CategoryFilter: products 数组长度:', products.length);
    if (products.length > 0) {
      console.log('CategoryFilter: 第一个产品:', products[0]);
    }
  }, [options, loading, products.length]);
  
  // 计算品类分布和层级结构
  const categoryData = useMemo(() => {
    // 优先使用传入的options数据
    if (options && options.length > 0) {
      const totalProductsWithCategory = options.reduce((sum, option) => sum + option.count, 0);
      return {
        categories: options.map(option => ({
          name: option.label,
          count: option.count,
          subcategories: [] // 后端API暂不支持子分类，后续可扩展
        })),
        totalProductsWithCategory
      };
    }

    // 回退到本地数据计算
    console.log('CategoryFilter: 使用本地数据计算品类，products.length =', products.length);
    const categoryMap = new Map<string, { count: number; subcategories: Map<string, number> }>();
    const processedProducts = new Set<string>(); // 跟踪已处理的商品，避免重复计算总数

    products.forEach(product => {
      const primary = getProductCategory(product, 'primary');
      const secondary = product.category?.secondary ? getProductCategory(product, 'secondary') : undefined;

      if (!categoryMap.has(primary)) {
        categoryMap.set(primary, { count: 0, subcategories: new Map() });
      }

      const categoryInfo = categoryMap.get(primary)!;
      categoryInfo.count++;
      
      // 记录有品类信息的商品
      if (primary) {
        processedProducts.add(product.productId);
      }

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
    console.log('CategoryFilter: 有品类信息的商品总数:', processedProducts.size);
    
    return {
      categories: result,
      totalProductsWithCategory: processedProducts.size
    };
  }, [options, products]);

  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

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
    const totalProducts = categoryData.totalProductsWithCategory || products.length;
    return totalProducts > 0 ? (count / totalProducts * 100).toFixed(1) : '0';
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <CardTitle className="text-base font-medium">{t('filters.categories.title')}</CardTitle>
          <div className="flex items-center space-x-2">
            {loading ? (
              <div className="text-sm text-gray-500">{t('filters.categories.loading')}</div>
            ) : (
              <div className="text-sm text-gray-600">
                {value.length > 0
                  ? t('filters.categories.selected', { count: value.length })
                  : t('filters.categories.total', { count: categoryData.categories?.length || 0 })
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
                  <div className="text-sm text-gray-500">{t('filters.categories.loading')}</div>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {(categoryData.categories || []).map((category) => {
                  const isExpanded = expandedCategories.has(category.name);
                  const hasSubcategories = category.subcategories.length > 0;
                  
                  return (
                    <div key={category.name} className="border border-gray-200 rounded-lg">
                      {/* 主品类 */}
                      <div
                        className="flex items-start p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleCategoryChange(category.name, !isSelected(category.name))}
                      >
                        <div className="flex items-start flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected(category.name)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleCategoryChange(category.name, e.target.checked);
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 pointer-events-none"
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-gray-900 text-left">
                                {category.name}
                              </span>
                              <div className="flex items-center space-x-2 text-xs text-gray-500 flex-shrink-0 ml-2">
                                <span>{t('filters.productCount', { count: category.count })}</span>
                                <span>({getPercentage(category.count)}%)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {hasSubcategories && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategory(category.name);
                            }}
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
                                    <span>{t('filters.productCount', { count: subcategory.count })}</span>
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
              )}

              {/* 选中的品类标签 */}
              {value.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm font-medium text-gray-700 mb-2">{t('filters.categories.selectedCategories')}</div>
                  <div className="flex flex-wrap gap-2">
                    {value.map((categoryName) => {
                      const categoryInfo = (categoryData.categories || []).find(cat => cat.name === categoryName);
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
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
