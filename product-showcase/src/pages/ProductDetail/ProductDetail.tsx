import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, HeartIcon, ScaleIcon, ShareIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { Product } from '../../types/product';
import { useProductStore } from '../../stores/productStore';
import { useProductDetailData } from '../../hooks/useProducts';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Loading';
import { useToast } from '../../components/ui/ToastNotification';
import ImageGallery from '../../components/product/ImageGallery';
import ProductInfo from '../../components/product/ProductInfo';
import RelatedProducts from '../../components/product/RelatedProducts';
import { useAnimationPreferences } from '../../hooks/useAnimationPreferences';
import { useProductI18n } from '../../hooks/useProductI18n';
import { cn } from '../../utils/cn';
import {
  PAGE_TRANSITION_VARIANTS,
  ANIMATION_EASING,
  PERFORMANCE_CSS,
  GPU_ACCELERATED_CLASS,
  getResponsiveAnimationConfig,
} from '../../constants/animations';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['product', 'common']);
  const { showSuccess, showError, showInfo } = useToast();
  const { shouldEnableAnimation } = useAnimationPreferences();
  const { getProductName, getProductSpecification, getProductManufacturer, getProductOrigin } = useProductI18n();
  
  const { 
    favorites, 
    compareList,
    products: storeProducts,
    toggleFavorite, 
    addToCompare, 
    removeFromCompare
  } = useProductStore();
  
  // 使用React Query获取产品详情和相关产品
  const { product, relatedProducts, isLoading, isError, error } = useProductDetailData(id || '');
  
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  // 响应式动画配置
  const responsiveConfig = getResponsiveAnimationConfig(screenWidth);

  // 监听屏幕尺寸变化
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 处理产品数据加载
  useEffect(() => {
    if (isError && error) {
      showError(`${t('product:detail.errors.loadFailed')}: ${error.message}`);
      navigate('/products');
      return;
    }

    if (!id) {
      showError(t('product:detail.errors.invalidId'));
      navigate('/products');
      return;
    }

    // 如果React Query返回了产品数据，使用它
    if (product.data) {
      document.title = `${getProductName(product.data)} - ${t('product:detail.title')}`;
      preloadImages(product.data);
    }
    // 否则尝试从本地store查找（向后兼容）
    else if (storeProducts.length > 0) {
      const foundProduct = storeProducts.find(p => p.productId === id);
      if (foundProduct) {
        document.title = `${getProductName(foundProduct)} - ${t('product:detail.title')}`;
        preloadImages(foundProduct);
      }
    }
  }, [id, product.data, storeProducts, isError, error, navigate, showError, getProductName, t]);

  // 图片预加载函数
  const preloadImages = (product: Product) => {
    const imageUrls = product.images ? Object.values(product.images).filter(Boolean) : [];
    let loadedCount = 0;

    if (imageUrls.length === 0) {
      setImagesPreloaded(true);
      return;
    }

    imageUrls.forEach(url => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === imageUrls.length) {
          setImagesPreloaded(true);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === imageUrls.length) {
          setImagesPreloaded(true);
        }
      };
      img.src = url;
    });
  };

  // 清理页面标题
  useEffect(() => {
    return () => {
      document.title = t('product:detail.pageTitle');
    };
  }, [t]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleToggleFavorite = () => {
    const currentProduct = product.data || storeProducts.find(p => p.productId === id);
    if (currentProduct) {
      toggleFavorite(currentProduct.productId);
      const isFavorited = favorites.includes(currentProduct.productId);
      showSuccess(
        isFavorited ? t('product:detail.toast.favoriteRemoved') : t('product:detail.toast.favoriteAdded')
      );
    }
  };

  const handleToggleCompare = () => {
    const currentProduct = product.data || storeProducts.find(p => p.productId === id);
    if (currentProduct) {
      const isInCompare = compareList.includes(currentProduct.productId);
      if (isInCompare) {
        removeFromCompare(currentProduct.productId);
        showInfo(t('product:detail.toast.compareRemoved'));
      } else {
        if (compareList.length >= 4) {
          showError(t('product:detail.toast.compareLimit'));
          return;
        }
        addToCompare(currentProduct.productId);
        showSuccess(t('product:detail.toast.compareAdded'));
      }
    }
  };

  const handleShare = async () => {
    const currentProduct = product.data || storeProducts.find(p => p.productId === id);
    if (currentProduct) {
      try {
        await navigator.share({
          title: getProductName(currentProduct),
          text: t('product:detail.share.text', { productName: getProductName(currentProduct) }),
          url: window.location.href,
        });
      } catch (err) {
        // 如果不支持原生分享，复制链接到剪贴板
        navigator.clipboard.writeText(window.location.href);
        showSuccess(t('product:detail.share.linkCopied'));
      }
    }
  };

  // 获取当前产品数据
  const currentProduct = product.data || storeProducts.find(p => p.productId === id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">{t('product:detail.loading')}</p>
        </div>
      </div>
    );
  }

  if (!currentProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('product:detail.notFound.title')}</h2>
          <p className="text-gray-600 mb-6">{t('product:detail.notFound.message')}</p>
          <Button onClick={() => navigate('/products')}>
            {t('product:detail.notFound.backButton')}
          </Button>
        </div>
      </div>
    );
  }

  const isFavorited = favorites.includes(currentProduct.productId);
  const isInCompare = compareList.includes(currentProduct.productId);

  return (
    <motion.div
      variants={PAGE_TRANSITION_VARIANTS.slideUp}
      initial="initial"
      animate="in"
      exit="out"
      transition={{
        duration: responsiveConfig.duration,
        ease: ANIMATION_EASING.easeOut
      }}
      style={PERFORMANCE_CSS}
      className={cn("min-h-screen bg-gray-50", GPU_ACCELERATED_CLASS)}
    >
      {/* 导航栏 */}
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ 
          duration: responsiveConfig.duration, 
          delay: shouldEnableAnimation('enablePageTransitions') ? 0.1 : 0,
          ease: ANIMATION_EASING.easeOut
        }}
        className="bg-white shadow-sm border-b sticky top-0 z-10 backdrop-blur-sm bg-white/95"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="flex items-center space-x-1 sm:space-x-2"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{t('product:actions.back')}</span>
              </Button>
              <div className="text-sm text-gray-500 hidden md:block">
                <Link to="/products" className="hover:text-gray-700">
                  {t('product:detail.breadcrumb.list')}
                </Link>
                <span className="mx-2">/</span>
                <span className="text-gray-900 font-medium">{t('product:detail.breadcrumb.detail')}</span>
              </div>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleFavorite}
                className="flex items-center space-x-1 sm:space-x-2"
              >
                {isFavorited ? (
                  <HeartSolidIcon className="h-4 w-4 text-red-500" />
                ) : (
                  <HeartIcon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{isFavorited ? t('product:actions.favorited') : t('product:actions.favorite')}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleCompare}
                className="flex items-center space-x-1 sm:space-x-2"
              >
                <ScaleIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{isInCompare ? t('product:actions.compared') : t('product:actions.compare')}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="flex items-center space-x-1 sm:space-x-2"
              >
                <ShareIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{t('product:actions.share')}</span>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* 左侧：图片画廊 - 左右分屏动画优化 */}
          <motion.div
            variants={{
              hidden: { opacity: 0, x: -responsiveConfig.distance },
              visible: { 
                opacity: 1, 
                x: 0,
                transition: {
                  duration: responsiveConfig.duration,
                  delay: 0.1,
                  ease: ANIMATION_EASING.easeOut
                }
              }
            }}
            initial="hidden"
            animate="visible"
            style={PERFORMANCE_CSS}
            className={cn("lg:col-span-2 space-y-4 order-1", GPU_ACCELERATED_CLASS)}
          >
            <Card className="p-3 sm:p-4 lg:p-6 shadow-sm">
              {!imagesPreloaded && (
                <div className="aspect-[4/3] sm:aspect-[3/2] lg:aspect-[4/3] xl:aspect-[3/2] bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-center">
                    <Spinner size="md" />
                    <p className="text-sm text-gray-500 mt-2">{t('product:images.loadingImage')}</p>
                  </div>
                </div>
              )}
              <div className={imagesPreloaded ? 'block' : 'hidden'}>
                <ImageGallery product={currentProduct} />
              </div>
            </Card>
          </motion.div>

          {/* 右侧：产品信息 - 右侧滑入动画 */}
          <motion.div
            variants={{
              hidden: { opacity: 0, x: responsiveConfig.distance },
              visible: { 
                opacity: 1, 
                x: 0,
                transition: {
                  duration: responsiveConfig.duration,
                  delay: 0.2,
                  ease: ANIMATION_EASING.easeOut
                }
              }
            }}
            initial="hidden"
            animate="visible"
            style={PERFORMANCE_CSS}
            className={cn("lg:col-span-1 space-y-4 sm:space-y-6 order-2", GPU_ACCELERATED_CLASS)}
          >
            <Card className="p-4 sm:p-6 shadow-sm">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-4 leading-tight">
                {getProductName(currentProduct)}
              </h1>
              
              {/* 价格信息 */}
              <div className="mb-6">
                <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                  {currentProduct.price.discount ? (
                    <>
                      <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-600">
                        ¥{currentProduct.price.discount.toFixed(2)}
                      </span>
                      <span className="text-sm sm:text-base lg:text-lg text-gray-500 line-through">
                        ¥{currentProduct.price.normal.toFixed(2)}
                      </span>
                      {currentProduct.price.discountRate && (
                        <span className="bg-red-100 text-red-800 text-xs sm:text-sm font-medium px-2 py-1 rounded-full">
                          {currentProduct.price.discountRate.toFixed(0)}% OFF
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                      ¥{currentProduct.price.normal.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* 基本信息 */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-500">{t('product:fields.specification')}</span>
                    <p className="text-sm text-gray-900 break-words">{getProductSpecification(currentProduct) || t('product:detail.defaultValues.noData')}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-500">{t('product:fields.manufacturer')}</span>
                    <p className="text-sm text-gray-900 break-words">{getProductManufacturer(currentProduct) || t('product:detail.defaultValues.noData')}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-500">{t('product:fields.boxSpec')}</span>
                    <p className="text-sm text-gray-900 break-words">{currentProduct.boxSpec || t('product:detail.defaultValues.noData')}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* 详细信息面板 */}
            <div className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-thin product-detail-scroll">
              <ProductInfo product={currentProduct} />
            </div>
          </motion.div>
        </div>

        {/* 相关产品推荐 - 底部滑入动画 */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: responsiveConfig.distance * 1.5 },
            visible: { 
              opacity: 1, 
              y: 0,
              transition: {
                duration: responsiveConfig.duration,
                delay: 0.4,
                ease: ANIMATION_EASING.easeOut
              }
            }
          }}
          initial="hidden"
          animate="visible"
          style={PERFORMANCE_CSS}
          className={cn("mt-6 sm:mt-8 lg:mt-12 lg:col-span-3", GPU_ACCELERATED_CLASS)}
        >
          <RelatedProducts currentProduct={currentProduct} />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ProductDetail;
