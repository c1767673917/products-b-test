import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronDownIcon, 
  TagIcon,
  MapPinIcon,
  BuildingStorefrontIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import { Product } from '../../types/product';
import { Card } from '../ui/Card';

interface ProductInfoProps {
  product: Product;
  className?: string;
  compact?: boolean;
}

interface InfoSection {
  title: string;
  icon: React.ReactNode;
  items: Array<{
    label: string;
    value: string | number | undefined;
    type?: 'text' | 'price' | 'date' | 'link';
  }>;
}

const SECTION_STORAGE_KEY = 'product-info-sections-state';

const ProductInfo: React.FC<ProductInfoProps> = ({ product, className, compact = false }) => {
  // 从 localStorage 加载状态，默认全部展开
  const loadSectionsState = (): Set<string> => {
    try {
      const saved = localStorage.getItem(SECTION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return new Set(parsed);
      }
    } catch (error) {
      console.warn('Failed to load sections state from localStorage:', error);
    }
    // 默认全部展开
    return new Set(['price', 'origin', 'category', 'sales']);
  };

  const [expandedSections, setExpandedSections] = useState<Set<string>>(loadSectionsState);

  // 保存状态到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(Array.from(expandedSections)));
    } catch (error) {
      console.warn('Failed to save sections state to localStorage:', error);
    }
  }, [expandedSections]);

  const toggleSection = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
  };

  const formatValue = (value: string | number | undefined, type: string = 'text'): string => {
    if (value === undefined || value === null || value === '') {
      return '暂无';
    }

    switch (type) {
      case 'price':
        return `¥${Number(value).toFixed(2)}`;
      case 'date':
        return new Date(Number(value)).toLocaleDateString('zh-CN');
      case 'link':
        return value.toString();
      default:
        return value.toString();
    }
  };

  const sections: InfoSection[] = [
    {
      title: '价格信息',
      icon: <TagIcon className="h-5 w-5" />,
      items: [
        { label: '正常售价', value: product.price.normal, type: 'price' },
        { label: '优惠价格', value: product.price.discount, type: 'price' },
        {
          label: '折扣率',
          value: product.price.discountRate
            ? `${product.price.discountRate.toFixed(1)}%`
            : undefined
        },
        {
          label: '节省金额',
          value: product.price.discount
            ? product.price.normal - product.price.discount
            : undefined,
          type: 'price'
        },
      ]
    },
    {
      title: '分类信息',
      icon: <CubeIcon className="h-5 w-5" />,
      items: [
        { label: '一级品类', value: product.category.primary.display },
        { label: '二级品类', value: product.category.secondary?.display },
      ]
    },
    {
      title: '销售信息',
      icon: <BuildingStorefrontIcon className="h-5 w-5" />,
      items: [
        { label: '采集平台', value: product.platform.display },
        { label: '生产商', value: product.manufacturer },
        { label: '商品链接', value: product.link, type: 'link' },
      ]
    },
    {
      title: '产地信息',
      icon: <MapPinIcon className="h-5 w-5" />,
      items: [
        { label: '国家', value: product.origin.country },
        { label: '省份', value: product.origin.province },
        { label: '城市', value: product.origin.city },
      ]
    }
  ];

  const renderValue = (item: InfoSection['items'][0]) => {
    const value = formatValue(item.value, item.type);
    
    if (item.type === 'link' && item.value) {
      return (
        <a
          href={item.value.toString()}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all"
        >
          查看链接
        </a>
      );
    }

    if (item.type === 'price' && item.value) {
      return (
        <span className="font-medium text-green-600">
          {value}
        </span>
      );
    }

    return (
      <span className={value === '暂无' ? 'text-gray-400' : 'text-gray-900'}>
        {value}
      </span>
    );
  };

  return (
    <div className={className}>
      <div className="space-y-3">
        {sections.map((section, index) => {
          // 使用固定的 key 映射来确保状态记忆正确
          const sectionKeyMap: { [key: string]: string } = {
            '价格信息': 'price',
            '产地信息': 'origin',
            '分类信息': 'category',
            '销售信息': 'sales'
          };
          const sectionKey = sectionKeyMap[section.title];
          const isExpanded = expandedSections.has(sectionKey);
          
          return (
            <Card key={sectionKey} className="overflow-hidden">
              <button
                onClick={() => toggleSection(sectionKey)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <div className="text-blue-600">
                    {section.icon}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {section.title}
                  </h3>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                </motion.div>
              </button>
              
              <motion.div
                initial={false}
                animate={{
                  height: isExpanded ? 'auto' : 0,
                  opacity: isExpanded ? 1 : 0
                }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {section.items.map((item, itemIndex) => (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: itemIndex * 0.05 }}
                        className="flex flex-col space-y-1"
                      >
                        <span className="text-sm font-medium text-gray-500">
                          {item.label}
                        </span>
                        <div className="text-sm">
                          {renderValue(item)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ProductInfo;
