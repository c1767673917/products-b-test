import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, HeartIcon, ScaleIcon, ShareIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { Product } from '../../types/product';
import { useProductStore } from '../../stores/productStore';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Loading';
import { useToast } from '../../components/ui/ToastNotification';
import ImageGallery from '../../components/product/ImageGallery';
import ProductInfo from '../../components/product/ProductInfo';
import RelatedProducts from '../../components/product/RelatedProducts';
import { useAnimationPreferences } from '../../hooks/useAnimationPreferences';
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
  const { showToast } = useToast();
  const { shouldEnableAnimation } = useAnimationPreferences();
  
  const { 
    products, 
    favorites, 
    compareList,
    toggleFavorite, 
    addToCompare, 
    removeFromCompare,
    isLoading 
  } = useProductStore();
  
  const [product, setProduct] = useState<Product | null>(null);
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

  useEffect(() => {
    if (id && products.length > 0) {
      const foundProduct = products.find(p => p.id === id);
      if (foundProduct) {
        setProduct(foundProduct);
        // 设置页面标题
        document.title = `${foundProduct.name} - 产品详情`;
        // 预加载图片
        preloadImages(foundProduct);
      } else {
        showToast('产品未找到', 'error');
        navigate('/products');
      }
    }
  }, [id, products, navigate, showToast]);

  // 图片预加载函数
  const preloadImages = (product: Product) => {
    const imageUrls = Object.values(product.images).filter(Boolean);
    let loadedCount = 0;

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
      document.title = '产品展示系统';
    };
  }, []);

  const handleBack = () => {
    navigate(-1);
  };

  const handleToggleFavorite = () => {
    if (product) {
      toggleFavorite(product.id);
      const isFavorited = favorites.includes(product.id);
      showToast(
        isFavorited ? '已取消收藏' : '已添加到收藏',
        isFavorited ? 'info' : 'success'
      );
    }
  };

  const handleToggleCompare = () => {
    if (product) {
      const isInCompare = compareList.includes(product.id);
      if (isInCompare) {
        removeFromCompare(product.id);
        showToast('已从对比列表移除', 'info');
      } else {
        if (compareList.length >= 4) {
          showToast('对比列表最多只能添加4个产品', 'warning');
          return;
        }
        addToCompare(product.id);
        showToast('已添加到对比列表', 'success');
      }
    }
  };

  const handleShare = async () => {
    if (product) {
      try {
        await navigator.share({
          title: product.name,
          text: `查看这个产品：${product.name}`,
          url: window.location.href,
        });
      } catch (err) {
        // 如果不支持原生分享，复制链接到剪贴板
        navigator.clipboard.writeText(window.location.href);
        showToast('链接已复制到剪贴板', 'success');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">正在加载产品信息...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">产品未找到</h2>
          <p className="text-gray-600 mb-6">抱歉，您访问的产品不存在或已被删除</p>
          <Button onClick={() => navigate('/products')}>
            返回产品列表
          </Button>
        </div>
      </div>
    );
  }

  const isFavorited = favorites.includes(product.id);
  const isInCompare = compareList.includes(product.id);

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
                <span className="hidden sm:inline">返回</span>
              </Button>
              <div className="text-sm text-gray-500 hidden md:block">
                <Link to="/products" className="hover:text-gray-700">
                  产品列表
                </Link>
                <span className="mx-2">/</span>
                <span className="text-gray-900 font-medium">产品详情</span>
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
                <span className="hidden sm:inline">{isFavorited ? '已收藏' : '收藏'}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleCompare}
                className="flex items-center space-x-1 sm:space-x-2"
              >
                <ScaleIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{isInCompare ? '已对比' : '对比'}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="flex items-center space-x-1 sm:space-x-2"
              >
                <ShareIcon className="h-4 w-4" />
                <span className="hidden sm:inline">分享</span>
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
                    <p className="text-sm text-gray-500 mt-2">图片加载中...</p>
                  </div>
                </div>
              )}
              <div className={imagesPreloaded ? 'block' : 'hidden'}>
                <ImageGallery product={product} />
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
                {product.name}
              </h1>
              
              {/* 价格信息 */}
              <div className="mb-6">
                <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                  {product.price.discount ? (
                    <>
                      <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-600">
                        ¥{product.price.discount.toFixed(2)}
                      </span>
                      <span className="text-sm sm:text-base lg:text-lg text-gray-500 line-through">
                        ¥{product.price.normal.toFixed(2)}
                      </span>
                      {product.price.discountRate && (
                        <span className="bg-red-100 text-red-800 text-xs sm:text-sm font-medium px-2 py-1 rounded-full">
                          {(product.price.discountRate * 100).toFixed(0)}% OFF
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                      ¥{product.price.normal.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* 基本信息 */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-500">品类</span>
                    <p className="text-sm text-gray-900 break-words">
                      {product.category.primary}
                      {product.category.secondary && ` / ${product.category.secondary}`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-500">产地</span>
                    <p className="text-sm text-gray-900">
                      {product.origin.province}
                      {product.origin.city && ` ${product.origin.city}`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-500">平台</span>
                    <p className="text-sm text-gray-900">{product.platform}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium text-gray-500">规格</span>
                    <p className="text-sm text-gray-900 break-words">{product.specification || '暂无'}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* 详细信息面板 */}
            <div className="lg:sticky lg:top-20">
              <ProductInfo product={product} />
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
          <RelatedProducts currentProduct={product} />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ProductDetail;
