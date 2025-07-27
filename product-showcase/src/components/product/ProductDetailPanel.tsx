import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  HeartIcon,
  ScaleIcon,
  ShareIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { Product } from '../../types/product';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Loading';
import OptimizedImageGallery from './OptimizedImageGallery';
import ProductInfo from './ProductInfo';
import RelatedProducts from './RelatedProducts';
import ResizableHandle from '../ui/ResizableHandle';
import { useToast } from '../ui/ToastNotification';
import { useProductStore } from '../../stores/productStore';
import { usePanelPreferences } from '../../hooks/usePanelPreferences';
import { useProductI18n } from '../../hooks/useProductI18n';

interface ProductDetailPanelProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  canNavigate?: {
    prev: boolean;
    next: boolean;
  };
  onWidthChange?: (width: number) => void; // 实时宽度变化回调
}

const ProductDetailPanel: React.FC<ProductDetailPanelProps> = ({
  product,
  isOpen,
  onClose,
  onNavigate,
  canNavigate,
  onWidthChange
}) => {
  const { t } = useTranslation('product');
  const { showSuccess, showError, showInfo } = useToast();
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  const { preferences, setPanelWidth } = usePanelPreferences();
  const [currentWidth, setCurrentWidth] = useState(preferences.width);

  // 使用i18n hooks获取本地化值
  const {
    getProductName,
    getLocalizedValue,
    getFormattedPrice
  } = useProductI18n();

  const {
    favorites,
    compareList,
    toggleFavorite,
    addToCompare,
    removeFromCompare
  } = useProductStore();

  // 处理面板宽度调整
  const handleWidthChange = (newWidth: number) => {
    setCurrentWidth(newWidth);
    setPanelWidth(newWidth);
  };

  // 处理拖拽过程中的实时宽度变化
  const handleWidthResizing = (newWidth: number) => {
    setCurrentWidth(newWidth);
    // 通知父组件实时宽度变化
    if (onWidthChange) {
      onWidthChange(newWidth);
    }
  };

  // 同步偏好设置的宽度
  useEffect(() => {
    setCurrentWidth(preferences.width);
  }, [preferences.width]);

  // 预加载图片
  useEffect(() => {
    if (product) {
      setIsImageLoading(true);
      setImagesPreloaded(false);
      preloadImages(product);
    }
  }, [product]);

  const preloadImages = (product: Product) => {
    const imageUrls = Object.values(product.images).filter(Boolean);
    if (imageUrls.length === 0) {
      setImagesPreloaded(true);
      setIsImageLoading(false);
      return;
    }

    let loadedCount = 0;
    imageUrls.forEach(url => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === imageUrls.length) {
          setImagesPreloaded(true);
          setIsImageLoading(false);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === imageUrls.length) {
          setImagesPreloaded(true);
          setIsImageLoading(false);
        }
      };
      img.src = url;
    });
  };

  const handleToggleFavorite = () => {
    if (product) {
      toggleFavorite(product.productId);
      const isFavorited = favorites.includes(product.productId);
      showSuccess(
        isFavorited ? t('detail.toast.favoriteRemoved') : t('detail.toast.favoriteAdded')
      );
    }
  };

  const handleToggleCompare = () => {
    if (product) {
      const isInCompare = compareList.includes(product.productId);
      if (isInCompare) {
        removeFromCompare(product.productId);
        showInfo(t('detail.toast.compareRemoved'));
      } else {
        if (compareList.length >= 4) {
          showError(t('detail.toast.compareLimit'));
          return;
        }
        addToCompare(product.productId);
        showSuccess(t('detail.toast.compareAdded'));
      }
    }
  };

  const handleShare = async () => {
    if (product) {
      const productName = getProductName(product);
      try {
        await navigator.share({
          title: productName,
          text: t('detail.share.text', { productName }),
          url: window.location.href,
        });
      } catch {
        navigator.clipboard.writeText(window.location.href);
        showSuccess(t('detail.share.linkCopied'));
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft' && canNavigate?.prev) {
      onNavigate?.('prev');
    } else if (e.key === 'ArrowRight' && canNavigate?.next) {
      onNavigate?.('next');
    }
  };

  if (!product) return null;

  const isFavorited = favorites.includes(product.productId);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ 
            type: 'tween', 
            duration: 0.25, // 减少动画时间
            ease: [0.25, 0.46, 0.45, 0.94] // 优化的贝塞尔曲线
          }}
          style={{
            willChange: 'transform', // 启用硬件加速
            backfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
            width: `${currentWidth}px`
          }}
          className="sticky top-0 h-screen bg-white border-l border-gray-200 z-40 flex flex-col transform-gpu"
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          {/* 左侧拖拽手柄 */}
          <ResizableHandle
            onResize={handleWidthChange}
            onResizing={handleWidthResizing}
            minWidth={300}
            maxWidth={Math.min(800, window.innerWidth * 0.8)}
          />
          {/* 头部操作栏 */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center space-x-2">
              {/* 导航按钮 */}
              {onNavigate && (
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate('prev')}
                    disabled={!canNavigate?.prev}
                    className="p-1"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate('next')}
                    disabled={!canNavigate?.next}
                    className="p-1"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <h2 className="text-lg font-semibold text-gray-900 truncate max-w-xs">
                {t('detail.title')}
              </h2>
            </div>

            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleFavorite}
                className="flex items-center space-x-1"
              >
                {isFavorited ? (
                  <HeartSolidIcon className="h-4 w-4 text-red-500" />
                ) : (
                  <HeartIcon className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleCompare}
                className="flex items-center space-x-1"
              >
                <ScaleIcon className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="flex items-center space-x-1"
              >
                <ShareIcon className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="flex items-center space-x-1"
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-scroll-container overflow-y-auto scrollbar-thin product-detail-scroll">
            <div className="p-4 space-y-4">
              {/* 产品名称和价格 */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: 0.05,
                  duration: 0.2,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                style={{
                  willChange: 'transform, opacity',
                  backfaceVisibility: 'hidden'
                }}
                className="transform-gpu"
              >
                <h1 className="text-xl font-bold text-gray-900 mb-3 leading-tight">
                  {getProductName(product)}
                </h1>
                
                <div className="mb-4">
                  <div className="flex flex-wrap items-baseline gap-2">
                    {product.price.discount ? (
                      <>
                        <span className="text-2xl font-bold text-red-600">
                          {getFormattedPrice(product).discountPrice}
                        </span>
                        <span className="text-base text-gray-500 line-through">
                          {getFormattedPrice(product).normalPrice}
                        </span>
                        {product.price.discountRate && (
                          <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded">
                            {product.price.discountRate.toFixed(0)}% OFF
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-gray-900">
                        {getFormattedPrice(product).normalPrice}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* 图片画廊 - 提前显示 */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: 0.1,
                  duration: 0.2,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                style={{
                  willChange: 'transform, opacity',
                  backfaceVisibility: 'hidden'
                }}
                className="transform-gpu"
              >
                <Card className="p-3">
                  {isImageLoading && (
                    <div className="aspect-[4/5] bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                      <div className="text-center">
                        <Spinner size="sm" />
                        <p className="text-xs text-gray-500 mt-2">图片加载中...</p>
                      </div>
                    </div>
                  )}
                  <div className={imagesPreloaded ? 'block' : 'hidden'}>
                    <OptimizedImageGallery
                      product={product}
                      compact
                      containerWidth={currentWidth - 60} // 减去padding和边距
                    />
                  </div>
                </Card>
              </motion.div>

              {/* 基本信息 */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: 0.15,
                  duration: 0.2,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                style={{
                  willChange: 'transform, opacity',
                  backfaceVisibility: 'hidden'
                }}
                className="transform-gpu"
              >
                <Card className="p-4">
                  <h3 className="text-base font-semibold mb-3">{t('detail.basicInfo.title')}</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-500">{t('fields.specification')}</span>
                      <p className="text-gray-900 break-words">{getLocalizedValue(product.specification, t('detail.defaultValues.noData'))}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">{t('fields.flavor')}</span>
                      <p className="text-gray-900 break-words">{getLocalizedValue(product.flavor, t('detail.defaultValues.noData'))}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">{t('fields.boxSpec')}</span>
                      <p className="text-gray-900 break-words">{product.boxSpec || t('detail.defaultValues.noData')}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* 详细信息 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <ProductInfo product={product} compact />
              </motion.div>

              {/* 相关产品推荐 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <RelatedProducts currentProduct={product} compact />
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProductDetailPanel;