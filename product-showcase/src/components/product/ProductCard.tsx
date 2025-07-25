import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HeartIcon, EyeIcon, ScaleIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import type { ProductCardProps, ImageType } from '../../types/product';
import { cn } from '../../utils/cn';
import LazyImage from './LazyImage';
import { useAnimationPreferences } from '../../hooks/useAnimationPreferences';
import { useProductI18n } from '../../hooks/useProductI18n';
import { calculateDiscountRate, formatDiscountRate } from '../../utils/discountCalculation';
import {
  PRODUCT_CARD_VARIANTS,
  ANIMATION_DURATION,
  ANIMATION_EASING,
  PERFORMANCE_CSS,
  GPU_ACCELERATED_CLASS,
} from '../../constants/animations';

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onImageHover,
  onQuickAction,
  layout = 'grid',
  className,
  isFavorited = false
}) => {
  const [currentImageType, setCurrentImageType] = useState<ImageType>('front');
  const { preferences, getAnimationConfig } = useAnimationPreferences();
  const navigate = useNavigate();
  const { t } = useTranslation('product');
  
  // Use i18n hooks
  const {
    getProductName,
    getProductCategory,
    getProductPlatform,
    getProductFlavor,
    getProductOrigin,
    getFormattedPrice,
    getLocalizedValue
  } = useProductI18n();

  // 获取当前显示的图片
  const getCurrentImage = () => {
    // 添加空值检查，防止 product.images 为 undefined 或 null
    if (!product.images || typeof product.images !== 'object') {
      return '/placeholder-image.svg';
    }

    // 获取当前图片类型的数据
    const currentImageData = product.images[currentImageType];
    const frontImageData = product.images.front;

    // 提取URL的辅助函数
    const extractUrl = (imageData: any): string => {
      if (!imageData) return '';

      // 新的对象结构
      if (typeof imageData === 'object' && 'url' in imageData) {
        return imageData.url || '';
      }

      // 旧的字符串结构
      if (typeof imageData === 'string') {
        return imageData;
      }

      return '';
    };

    // 尝试获取当前类型的图片URL
    let imageUrl = extractUrl(currentImageData);

    // 如果当前类型没有图片，尝试使用正面图片
    if (!imageUrl) {
      imageUrl = extractUrl(frontImageData);
    }

    // 如果仍然没有有效URL，使用占位符
    return imageUrl || '/placeholder-image.svg';
  };

  // 获取可用的图片类型
  const getAvailableImages = (): ImageType[] => {
    // 添加空值检查，防止 product.images 为 undefined 或 null
    if (!product.images || typeof product.images !== 'object') {
      return [];
    }
    return (Object.keys(product.images) as ImageType[]).filter(
      key => product.images?.[key]
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

  // 处理查看详情 - 优先使用右侧面板显示，保持左右分屏布局
  const handleViewDetail = () => {
    if (onQuickAction) {
      // 如果有 onQuickAction 回调，优先使用右侧详情面板
      onQuickAction('detail');
    } else {
      // 如果没有 onQuickAction 回调（如相关产品），使用路由导航作为备用方案
      navigate(`/products/${product.productId}`);
    }
  };

  // 使用统一的折扣计算工具函数
  const discountRate = calculateDiscountRate(product);
  const availableImages = getAvailableImages();

  if (layout === 'list') {
    return (
      <motion.div
        variants={PRODUCT_CARD_VARIANTS}
        initial="hidden"
        animate="visible"
        exit="exit"
        whileHover={preferences.reduceMotion ? {} : { y: -2, scale: 1.01 }}
        whileTap={preferences.reduceMotion ? {} : "tap"}
        transition={getAnimationConfig(ANIMATION_DURATION.normal)}
        style={PERFORMANCE_CSS}
        className={cn(
          "bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300",
          "border border-gray-200 p-3 sm:p-4 cursor-pointer",
          GPU_ACCELERATED_CLASS,
          className
        )}
        onClick={handleViewDetail}
      >
        <div className="flex gap-3 sm:gap-4">
          {/* 图片区域 */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
            <LazyImage
              src={getCurrentImage()}
              alt={getProductName(product)}
              className="w-full h-full object-cover rounded-md"
            />
            {discountRate > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium"
              >
                -{formatDiscountRate(discountRate, true, 1)}
              </motion.div>
            )}
          </div>

          {/* 信息区域 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-1 line-clamp-2 leading-tight">
                  {getProductName(product)}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {getProductCategory(product, 'primary')}
                  </span>
                  {product.category.secondary && (
                    <span className="text-xs text-gray-500 hidden sm:inline">
                      {getProductCategory(product, 'secondary')}
                    </span>
                  )}
                </div>
                {/* 口味和规格信息 */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {product.flavor && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 truncate">
                      {getProductFlavor(product)}
                    </span>
                  )}
                  {product.specification && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 truncate">
                      {getLocalizedValue(product.specification)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {product.price.discount ? (
                    <>
                      <span className="text-lg sm:text-xl font-bold text-red-600">
                        {getFormattedPrice(product).discountPrice}
                      </span>
                      <span className="text-sm text-gray-500 line-through">
                        {getFormattedPrice(product).normalPrice}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg sm:text-xl font-bold text-gray-900">
                      {getFormattedPrice(product).normalPrice}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {getProductPlatform(product)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {getProductOrigin(product)}
                </div>
              </div>

              {/* 快速操作按钮 */}
              <div className="flex flex-col sm:flex-row gap-1 ml-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleFavorite}
                  className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                  title={t('actions.favorite')}
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
                  title={t('actions.compare')}
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
                  title={t('actions.viewDetails')}
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
      variants={PRODUCT_CARD_VARIANTS}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={preferences.reduceMotion ? {} : 'hover'}
      whileTap={preferences.reduceMotion ? {} : "tap"}
      transition={{
        duration: getAnimationConfig(ANIMATION_DURATION.normal).duration,
        ease: ANIMATION_EASING.easeOut
      }}
      style={PERFORMANCE_CSS}
      className={cn(
        "bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-200",
        "border border-gray-200 overflow-hidden cursor-pointer group",
        "h-full flex flex-col",
        GPU_ACCELERATED_CLASS,
        className
      )}
      onClick={handleViewDetail}
    >
      {/* 图片区域 */}
      <div className="relative aspect-square overflow-hidden">
        <LazyImage
          src={getCurrentImage()}
          alt={getProductName(product)}
          className={cn(
            "w-full h-full object-cover transition-transform duration-200",
            preferences.reduceMotion ? "" : "group-hover:scale-105"
          )}
        />

        {/* 折扣标签 */}
        {discountRate > 0 && (
          <motion.div
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: -12 }}
            className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm"
          >
            -{formatDiscountRate(discountRate, true, 1)}
          </motion.div>
        )}

        {/* 快速操作按钮 */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 transform-gpu">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={handleFavorite}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-sm will-change-transform"
            title={t('actions.favorite')}
          >
            {isFavorited ? (
              <HeartSolidIcon className="w-4 h-4 text-red-500" />
            ) : (
              <HeartIcon className="w-4 h-4 text-gray-600" />
            )}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={handleCompare}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-sm will-change-transform"
            title={t('actions.compare')}
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
          {getProductName(product)}
        </h3>

        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            {product.price.discount ? (
              <>
                <span className="text-base sm:text-lg font-bold text-red-600">
                  {getFormattedPrice(product).discountPrice}
                </span>
                <span className="text-xs sm:text-sm text-gray-500 line-through">
                  {getFormattedPrice(product).normalPrice}
                </span>
              </>
            ) : (
              <span className="text-base sm:text-lg font-bold text-gray-900">
                {getFormattedPrice(product).normalPrice}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 truncate max-w-full">
            {getProductCategory(product, 'primary')}
          </span>
        </div>

        {/* 口味和规格信息 */}
        <div className="flex flex-wrap items-center gap-2 mb-2 flex-shrink-0">
          {product.flavor && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 truncate">
              {getProductFlavor(product)}
            </span>
          )}
          {product.specification && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 truncate">
              {getLocalizedValue(product.specification)}
            </span>
          )}
        </div>

        {/* 产地信息 */}
        <div className="mt-auto pt-2 text-xs text-gray-500 flex-shrink-0">
          {getProductOrigin(product)}
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
