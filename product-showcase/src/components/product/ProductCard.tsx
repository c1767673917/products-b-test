import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HeartIcon, EyeIcon, ScaleIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import type { ProductCardProps, ImageType } from '../../types/product';
import { cn } from '../../utils/cn';
import LazyImage from './LazyImage';

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onImageHover,
  onQuickAction,
  layout = 'grid',
  className,
  isFavorited = false
}) => {
  const [currentImageType, setCurrentImageType] = useState<ImageType>('front');

  // 获取当前显示的图片
  const getCurrentImage = () => {
    return product.images[currentImageType] || product.images.front || '/placeholder-image.svg';
  };

  // 获取可用的图片类型
  const getAvailableImages = (): ImageType[] => {
    return (Object.keys(product.images) as ImageType[]).filter(
      key => product.images[key]
    );
  };

  // 处理图片悬停
  const handleImageHover = (imageType: ImageType) => {
    setCurrentImageType(imageType);
    onImageHover?.(imageType);
  };

  // 处理收藏
  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAction?.('favorite');
  };

  // 处理对比
  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickAction?.('compare');
  };

  // 处理查看详情
  const handleViewDetail = () => {
    onQuickAction?.('detail');
  };

  // 计算折扣率
  const getDiscountRate = () => {
    if (product.price.discount && product.price.normal) {
      return Math.round((1 - product.price.discount / product.price.normal) * 100);
    }
    return 0;
  };

  const discountRate = getDiscountRate();
  const availableImages = getAvailableImages();

  if (layout === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ y: -2, scale: 1.01 }}
        className={cn(
          "bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300",
          "border border-gray-200 p-3 sm:p-4 cursor-pointer",
          className
        )}
        onClick={handleViewDetail}
      >
        <div className="flex gap-3 sm:gap-4">
          {/* 图片区域 */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
            <LazyImage
              src={getCurrentImage()}
              alt={product.name}
              className="w-full h-full object-cover rounded-md"
            />
            {discountRate > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium"
              >
                -{discountRate}%
              </motion.div>
            )}
          </div>

          {/* 信息区域 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-1 line-clamp-2 leading-tight">
                  {product.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {product.category.primary}
                  </span>
                  {product.category.secondary && (
                    <span className="text-xs text-gray-500 hidden sm:inline">
                      {product.category.secondary}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {product.price.discount ? (
                    <>
                      <span className="text-lg sm:text-xl font-bold text-red-600">
                        ¥{product.price.discount.toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-500 line-through">
                        ¥{product.price.normal.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg sm:text-xl font-bold text-gray-900">
                      ¥{product.price.normal.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {product.origin.province} · {product.platform}
                </div>
              </div>

              {/* 快速操作按钮 */}
              <div className="flex flex-col sm:flex-row gap-1 ml-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleFavorite}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                  title="收藏"
                >
                  {isFavorited ? (
                    <HeartSolidIcon className="w-4 h-4 text-red-500" />
                  ) : (
                    <HeartIcon className="w-4 h-4 text-gray-400" />
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleCompare}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                  title="对比"
                >
                  <ScaleIcon className="w-4 h-4 text-gray-400" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetail();
                  }}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                  title="查看详情"
                >
                  <EyeIcon className="w-4 h-4 text-gray-400" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // 网格布局
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300",
        "border border-gray-200 overflow-hidden cursor-pointer group",
        "h-full flex flex-col", // 确保卡片高度一致
        className
      )}
      onClick={handleViewDetail}
    >
      {/* 图片区域 */}
      <div className="relative aspect-square overflow-hidden">
        <LazyImage
          src={getCurrentImage()}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* 折扣标签 */}
        {discountRate > 0 && (
          <motion.div
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: -12 }}
            className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm"
          >
            -{discountRate}%
          </motion.div>
        )}

        {/* 快速操作按钮 */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleFavorite}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-sm"
            title="收藏"
          >
            {isFavorited ? (
              <HeartSolidIcon className="w-4 h-4 text-red-500" />
            ) : (
              <HeartIcon className="w-4 h-4 text-gray-600" />
            )}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleCompare}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-sm"
            title="对比"
          >
            <ScaleIcon className="w-4 h-4 text-gray-600" />
          </motion.button>
        </div>

        {/* 图片切换指示器 */}
        {availableImages.length > 1 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {availableImages.map((imageType) => (
              <motion.button
                key={imageType}
                whileHover={{ scale: 1.2 }}
                onMouseEnter={() => handleImageHover(imageType)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  currentImageType === imageType ? "bg-white" : "bg-white/50"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* 信息区域 */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm sm:text-base leading-tight flex-shrink-0">
          {product.name}
        </h3>

        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            {product.price.discount ? (
              <>
                <span className="text-base sm:text-lg font-bold text-red-600">
                  ¥{product.price.discount.toFixed(2)}
                </span>
                <span className="text-xs sm:text-sm text-gray-500 line-through">
                  ¥{product.price.normal.toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-base sm:text-lg font-bold text-gray-900">
                ¥{product.price.normal.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 truncate max-w-full">
            {product.category.primary}
          </span>
          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
            {product.origin.province}
          </span>
        </div>

        {product.specification && (
          <div className="mt-auto text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {product.specification}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ProductCard;
