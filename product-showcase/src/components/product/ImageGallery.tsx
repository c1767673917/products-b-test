import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassMinusIcon, 
  MagnifyingGlassPlusIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { ImageType, Product } from '../../types/product';
import { Button } from '../ui/Button';
import LazyImage from './LazyImage';

interface ImageGalleryProps {
  product: Product;
  className?: string;
  compact?: boolean;
}

interface ImageInfo {
  type: ImageType;
  url: string;
  label: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ product, className, compact = false }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 获取所有可用的图片
  const getAvailableImages = (): ImageInfo[] => {
    const imageTypeLabels: Record<ImageType, string> = {
      front: '正面图',
      back: '背面图',
      label: '标签图',
      package: '包装图',
      gift: '礼品图'
    };

    return (Object.keys(product.images) as ImageType[])
      .filter(type => product.images[type])
      .map(type => ({
        type,
        url: product.images[type]!,
        label: imageTypeLabels[type]
      }));
  };

  const availableImages = getAvailableImages();
  const currentImage = availableImages[currentImageIndex];

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreen) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevImage();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNextImage();
          break;
        case 'Escape':
          e.preventDefault();
          setIsFullscreen(false);
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
          e.preventDefault();
          handleZoomOut();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, currentImageIndex, zoomLevel]);

  const handlePrevImage = () => {
    setCurrentImageIndex(prev => 
      prev === 0 ? availableImages.length - 1 : prev - 1
    );
    setZoomLevel(1);
  };

  const handleNextImage = () => {
    setCurrentImageIndex(prev => 
      prev === availableImages.length - 1 ? 0 : prev + 1
    );
    setZoomLevel(1);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
  };

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index);
    setZoomLevel(1);
  };

  const handleFullscreen = () => {
    setIsFullscreen(true);
    setZoomLevel(1);
  };

  if (availableImages.length === 0) {
    return (
      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📷</div>
          <p>暂无图片</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* 主图显示区域 */}
      <div className="relative aspect-[4/3] sm:aspect-[3/2] lg:aspect-[4/3] xl:aspect-[3/2] bg-gray-100 rounded-lg overflow-hidden group shadow-sm">
        <LazyImage
          src={currentImage.url}
          alt={`${product.name} - ${currentImage.label}`}
          className="w-full h-full object-cover cursor-zoom-in transition-transform duration-200 group-hover:scale-105 will-change-transform"
          onClick={handleFullscreen}
        />
        
        {/* 图片导航按钮 */}
        {availableImages.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white"
              onClick={handlePrevImage}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white"
              onClick={handleNextImage}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* 图片类型标签 */}
        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
          {currentImage.label}
        </div>

        {/* 图片计数 */}
        {availableImages.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
            {currentImageIndex + 1} / {availableImages.length}
          </div>
        )}
      </div>

      {/* 缩略图导航 */}
      {availableImages.length > 1 && (
        <div className="mt-4 sm:mt-6 flex gap-2 sm:gap-3 overflow-x-auto pb-2">
          {availableImages.map((image, index) => (
            <motion.button
              key={image.type}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              style={{
                willChange: 'transform',
                backfaceVisibility: 'hidden'
              }}
              className={`relative flex-shrink-0 w-18 h-18 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-lg overflow-hidden border-2 transition-all duration-150 shadow-sm transform-gpu ${
                index === currentImageIndex
                  ? 'border-blue-500 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
              onClick={() => handleImageClick(index)}
            >
              <LazyImage
                src={image.url}
                alt={`${product.name} - ${image.label}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs px-1 py-1 text-center truncate">
                {image.label}
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* 全屏模态框 */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
            onClick={() => setIsFullscreen(false)}
          >
            {/* 工具栏 */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoomOut();
                }}
                disabled={zoomLevel <= 0.5}
              >
                <MagnifyingGlassMinusIcon className="h-4 w-4" />
              </Button>
              <span className="text-white text-sm min-w-[3rem] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoomIn();
                }}
                disabled={zoomLevel >= 3}
              >
                <MagnifyingGlassPlusIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={() => setIsFullscreen(false)}
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* 全屏图片 */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ 
                duration: 0.2,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              style={{
                willChange: 'transform, opacity',
                backfaceVisibility: 'hidden'
              }}
              className="relative max-w-[90vw] max-h-[90vh] transform-gpu"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.img
                src={currentImage.url}
                alt={`${product.name} - ${currentImage.label}`}
                className="max-w-full max-h-full object-contain"
                style={{ 
                  transform: `scale(${zoomLevel})`,
                  willChange: 'transform'
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              />
            </motion.div>

            {/* 全屏导航按钮 */}
            {availableImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="lg"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevImage();
                  }}
                >
                  <ChevronLeftIcon className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                  }}
                >
                  <ChevronRightIcon className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* 全屏图片信息 */}
            <div className="absolute bottom-4 left-4 text-white">
              <p className="text-lg font-medium">{product.name}</p>
              <p className="text-sm opacity-80">{currentImage.label}</p>
              {availableImages.length > 1 && (
                <p className="text-sm opacity-60">
                  {currentImageIndex + 1} / {availableImages.length}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageGallery;
