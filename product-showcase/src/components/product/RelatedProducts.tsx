import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Product } from '../../types/product';
import { useProductStore } from '../../stores/productStore';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import ProductCard from './ProductCard';
import { useProductI18n } from '../../hooks/useProductI18n';

interface RelatedProductsProps {
  currentProduct: Product;
  className?: string;
  compact?: boolean;
}

interface RecommendationStrategy {
  name: string;
  description: string;
  getScore: (product: Product, currentProduct: Product) => number;
}

const RelatedProducts: React.FC<RelatedProductsProps> = ({ 
  currentProduct, 
  className,
  compact = false
}) => {
  const { t } = useTranslation('product');
  const { products } = useProductStore();
  const { getLocalizedValue } = useProductI18n();
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 4;

  // 使用i18n hooks获取本地化值
  const { getProductPlatform } = useProductI18n();

  // 推荐策略
  const strategies: RecommendationStrategy[] = [
    {
      name: t('related.algorithm.strategies.category'),
      description: t('related.algorithm.strategies.categoryDesc'),
      getScore: (product, current) => {
        let score = 0;
        if (product.category.primary === current.category.primary) score += 50;
        if (product.category.secondary === current.category.secondary) score += 30;
        return score;
      }
    },
    {
      name: t('related.algorithm.strategies.price'),
      description: t('related.algorithm.strategies.priceDesc'),
      getScore: (product, current) => {
        const currentPrice = current.price.discount || current.price.normal;
        const productPrice = product.price.discount || product.price.normal;
        const priceDiff = Math.abs(currentPrice - productPrice);
        const priceRatio = priceDiff / currentPrice;
        
        if (priceRatio <= 0.2) return 40; // 价格差异在20%以内
        if (priceRatio <= 0.5) return 20; // 价格差异在50%以内
        return 0;
      }
    },
    {
      name: t('related.algorithm.strategies.platform'),
      description: t('related.algorithm.strategies.platformDesc'),
      getScore: (product, current) => {
        const productPlatform = getProductPlatform({ platform: product.platform } as Product);
        const currentPlatform = getProductPlatform({ platform: current.platform } as Product);
        return productPlatform === currentPlatform ? 20 : 0;
      }
    },
    {
      name: t('related.algorithm.strategies.origin'),
      description: t('related.algorithm.strategies.originDesc'),
      getScore: (product, current) => {
        let score = 0;
        const productProvince = getLocalizedValue(product.origin?.province, '');
        const currentProvince = getLocalizedValue(current.origin?.province, '');
        const productCity = getLocalizedValue(product.origin?.city, '');
        const currentCity = getLocalizedValue(current.origin?.city, '');

        if (productProvince && currentProvince && productProvince === currentProvince) score += 15;
        if (productCity && currentCity && productCity === currentCity) score += 10;
        return score;
      }
    },
    {
      name: t('related.algorithm.strategies.discount'),
      description: t('related.algorithm.strategies.discountDesc'),
      getScore: (product, current) => {
        return product.price.discount ? 10 : 0;
      }
    }
  ];

  // 计算相关产品
  const relatedProducts = useMemo(() => {
    if (!products.length) return [];

    // 过滤掉当前产品
    const otherProducts = products.filter(p => p.productId !== currentProduct.productId);

    // 计算每个产品的推荐分数
    const scoredProducts = otherProducts.map(product => {
      let totalScore = 0;
      const scoreDetails: Record<string, number> = {};

      strategies.forEach(strategy => {
        const score = strategy.getScore(product, currentProduct);
        scoreDetails[strategy.name] = score;
        totalScore += score;
      });

      return {
        product,
        score: totalScore,
        scoreDetails
      };
    });

    // 按分数排序并返回前12个
    return scoredProducts
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .filter(item => item.score > 0); // 只返回有相关性的产品
  }, [products, currentProduct, strategies]);

  const totalPages = Math.ceil(relatedProducts.length / itemsPerPage);
  const currentItems = relatedProducts.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  const getRecommendationReason = (scoreDetails: Record<string, number>): string => {
    const reasons: string[] = [];

    if (scoreDetails[t('related.algorithm.strategies.category')] >= 50) {
      reasons.push(t('related.reasons.sameCategory'));
    } else if (scoreDetails[t('related.algorithm.strategies.category')] >= 30) {
      reasons.push(t('related.reasons.similarCategory'));
    }

    if (scoreDetails[t('related.algorithm.strategies.price')] >= 40) {
      reasons.push(t('related.reasons.similarPrice'));
    } else if (scoreDetails[t('related.algorithm.strategies.price')] >= 20) {
      reasons.push(t('related.reasons.nearPrice'));
    }

    if (scoreDetails[t('related.algorithm.strategies.platform')] > 0) {
      reasons.push(t('related.reasons.samePlatform'));
    }

    if (scoreDetails[t('related.algorithm.strategies.origin')] > 0) {
      reasons.push(t('related.reasons.sameOrigin'));
    }

    if (scoreDetails[t('related.algorithm.strategies.discount')] > 0) {
      reasons.push(t('related.reasons.hasDiscount'));
    }

    return reasons.length > 0 ? reasons.join(' · ') : t('related.reasons.related');
  };

  if (relatedProducts.length === 0) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <div className="text-gray-500">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium mb-2">{t('related.noProducts.title')}</h3>
          <p className="text-sm">{t('related.noProducts.message')}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{t('related.title')}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {t('related.subtitle', { count: relatedProducts.length })}
          </p>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 0}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages - 1}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {currentItems.map(({ product, scoreDetails }, index) => (
          <motion.div
            key={product.productId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            <ProductCard
              product={product}
              layout="grid"
              className="h-full"
            />
            
            {/* 推荐原因标签 */}
            <div className="absolute top-2 left-2 z-10">
              <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                {getRecommendationReason(scoreDetails)}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 推荐策略说明 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <details className="group">
          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 flex items-center">
            <span>{t('related.algorithm.title')}</span>
            <ChevronRightIcon className="h-4 w-4 ml-1 transform group-open:rotate-90 transition-transform" />
          </summary>
          <div className="mt-3 text-xs text-gray-500 space-y-1">
            {strategies.map(strategy => (
              <div key={strategy.name} className="flex justify-between">
                <span>{strategy.name}:</span>
                <span>{strategy.description}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </Card>
  );
};

export default RelatedProducts;
