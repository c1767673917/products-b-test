import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronDownIcon, 
  ChevronUpIcon,
  TagIcon,
  MapPinIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  SparklesIcon,
  UserIcon,
  CalendarIcon,
  LinkIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { Product } from '../../types/product';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

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

const ProductInfo: React.FC<ProductInfoProps> = ({ product, className, compact = false }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic', 'price'])
  );

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

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const sections: InfoSection[] = [
    {
      title: '基本信息',
      icon: <InformationCircleIcon className="h-5 w-5" />,
      items: [
        { label: '产品名称', value: product.name },
        { label: '产品序号', value: product.sequence },
        { label: '记录ID', value: product.recordId },
        { label: '产品ID', value: product.id },
      ]
    },
    {
      title: '价格信息',
      icon: <TagIcon className="h-5 w-5" />,
      items: [
        { label: '正常售价', value: product.price.normal, type: 'price' },
        { label: '优惠价格', value: product.price.discount, type: 'price' },
        { 
          label: '折扣率', 
          value: product.price.discountRate 
            ? `${(product.price.discountRate * 100).toFixed(1)}%` 
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
        { label: '一级品类', value: product.category.primary },
        { label: '二级品类', value: product.category.secondary },
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
    },
    {
      title: '商品规格',
      icon: <CubeIcon className="h-5 w-5" />,
      items: [
        { label: '规格', value: product.specification },
        { label: '口味', value: product.flavor },
        { label: '包装规格', value: product.boxSpec },
      ]
    },
    {
      title: '销售信息',
      icon: <BuildingStorefrontIcon className="h-5 w-5" />,
      items: [
        { label: '采集平台', value: product.platform },
        { label: '生产商', value: product.manufacturer },
        { label: '商品链接', value: product.link, type: 'link' },
      ]
    },
    {
      title: '其他信息',
      icon: <SparklesIcon className="h-5 w-5" />,
      items: [
        { label: '采集时间', value: formatDate(product.collectTime) },
        { label: '备注', value: product.notes },
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
      <div className="space-y-4">
        {sections.map((section, index) => {
          const sectionKey = section.title.toLowerCase().replace(/\s+/g, '-');
          const isExpanded = expandedSections.has(sectionKey);
          
          return (
            <Card key={sectionKey} className="overflow-hidden">
              <button
                onClick={() => toggleSection(sectionKey)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-blue-600">
                    {section.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {section.title}
                  </h3>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
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
                <div className="px-6 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* 价格分析卡片 */}
      {product.price.discount && (
        <Card className="mt-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TagIcon className="h-5 w-5 text-green-600 mr-2" />
            价格分析
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                ¥{product.price.normal.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">原价</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ¥{product.price.discount.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">现价</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                ¥{(product.price.normal - product.price.discount).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">节省</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {product.price.discountRate
                  ? `${product.price.discountRate.toFixed(0)}%`
                  : `${Math.round((1 - product.price.discount / product.price.normal) * 100)}%`
                }
              </div>
              <div className="text-sm text-gray-600">折扣</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ProductInfo;
