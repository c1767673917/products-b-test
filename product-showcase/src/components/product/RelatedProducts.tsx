import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Product } from '../../types/product';
import { useProductStore } from '../../stores/productStore';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import ProductCard from './ProductCard';

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
  const { products } = useProductStore();
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 4;

  // 推荐策略
  const strategies: RecommendationStrategy[] = [
    {
      name: '同品类推荐',
      description: '相同品类的产品',
      getScore: (product, current) => {
        let score = 0;
        if (product.category.primary === current.category.primary) score += 50;
        if (product.category.secondary === current.category.secondary) score += 30;
        return score;
      }
    },
    {
      name: '价格相近',
      description: '价格区间相似的产品',
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
      name: '同平台推荐',
      description: '来自相同平台的产品',
      getScore: (product, current) => {
        return product.platform === current.platform ? 20 : 0;
      }
    },
    {
      name: '同产地推荐',
      description: '来自相同产地的产品',
      getScore: (product, current) => {
        let score = 0;
        if (product.origin.province === current.origin.province) score += 15;
        if (product.origin.city === current.origin.city) score += 10;
        return score;
      }
    },
    {
      name: '优惠产品',
      description: '有优惠的产品',
      getScore: (product, current) => {
        return product.price.discount ? 10 : 0;
      }
    }
  ];

  // 计算相关产品
  const relatedProducts = useMemo(() => {
    if (!products.length) return [];

    // 过滤掉当前产品
    const otherProducts = products.filter(p => p.id !== currentProduct.id);

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
    
    if (scoreDetails['同品类推荐'] >= 50) {
      reasons.push('同品类');
    } else if (scoreDetails['同品类推荐'] >= 30) {
      reasons.push('相似品类');
    }
    
    if (scoreDetails['价格相近'] >= 40) {
      reasons.push('价格相近');
    } else if (scoreDetails['价格相近'] >= 20) {
      reasons.push('价格相似');
    }
    
    if (scoreDetails['同平台推荐'] > 0) {
      reasons.push('同平台');
    }
    
    if (scoreDetails['同产地推荐'] > 0) {
      reasons.push('同产地');
    }
    
    if (scoreDetails['优惠产品'] > 0) {
      reasons.push('有优惠');
    }

    return reasons.length > 0 ? reasons.join(' · ') : '相关推荐';
  };

  if (relatedProducts.length === 0) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <div className="text-gray-500">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium mb-2">暂无相关产品</h3>
          <p className="text-sm">没有找到与当前产品相关的推荐商品</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">相关产品推荐</h3>
          <p className="text-sm text-gray-600 mt-1">
            基于品类、价格、平台等因素为您推荐 {relatedProducts.length} 个相关产品
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
            key={product.id}
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
            <span>推荐算法说明</span>
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
