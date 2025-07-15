import React, { useState, useEffect, useCallback } from 'react';
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

interface OptimizedImageGalleryProps {
  product: Product;
  className?: string;
  compact?: boolean;
  containerWidth?: number;
}

interface ImageInfo {
  type: ImageType;
  url: string;
  label: string;
}

const OptimizedImageGallery: React.FC<OptimizedImageGalleryProps> = ({ 
  product, 
  className, 
  compact = false,
  containerWidth = 400
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imageColumns, setImageColumns] = useState(2);

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

  // 根据容器宽度和图片数量动态计算列数
  const calculateColumns = useCallback((width: number) => {
    const imageCount = availableImages.length;

    // 根据图片数量优化列数计算
    if (imageCount === 1) return 1;
    if (imageCount === 2) {
      // 2张图片时：宽度足够就显示2列，否则1列
      return width >= 400 ? 2 : 1;
    }

    // 3张及以上图片的原有逻辑
    if (width < 300) return 1;
    if (width < 500) return 2;
    if (width < 700) return 3;
    return Math.min(4, imageCount);
  }, [availableImages.length]);

  useEffect(() => {
    setImageColumns(calculateColumns(containerWidth));
  }, [containerWidth, calculateColumns]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreen || selectedImageIndex === null) return;
      
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
          setSelectedImageIndex(null);
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
  }, [isFullscreen, selectedImageIndex, zoomLevel]);

  const handlePrevImage = () => {
    if (selectedImageIndex === null) return;
    setSelectedImageIndex(prev => 
      prev === 0 ? availableImages.length - 1 : prev! - 1
    );
    setZoomLevel(1);
  };

  const handleNextImage = () => {
    if (selectedImageIndex === null) return;
    setSelectedImageIndex(prev => 
      prev === availableImages.length - 1 ? 0 : prev! + 1
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
    setSelectedImageIndex(index);
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
      {/* 图片网格 */}
      <div
        className="grid gap-2 sm:gap-3 rounded-lg overflow-hidden shadow-sm"
        style={{
          gridTemplateColumns: `repeat(${imageColumns}, 1fr)`,
          // 优化容器高度计算：只有1张图片时使用固定比例，其他情况自动适应
          aspectRatio: imageColumns === 1 ? '4/5' : 'auto'
        }}
      >
        {availableImages.map((image, index) => (
          <motion.div
            key={image.type}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="relative group cursor-pointer overflow-hidden rounded-lg bg-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200"
            style={{
              // 优化图片项高度计算：根据列数动态调整宽高比
              aspectRatio: imageColumns === 1 ? '4/5' : imageColumns === 2 ? '4/3' : '1/1'
            }}
            onClick={() => handleImageClick(index)}
          >
            <LazyImage
              src={image.url}
              alt={`${product.name} - ${image.label}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* 图片标签 */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <span className="text-white text-xs font-medium truncate block">
                {image.label}
              </span>
            </div>

            {/* 悬停放大提示 */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 rounded-full p-2">
                <MagnifyingGlassPlusIcon className="h-4 w-4 text-gray-700" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 全屏模态框 */}
      <AnimatePresence>
        {isFullscreen && selectedImageIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
            onClick={() => {
              setIsFullscreen(false);
              setSelectedImageIndex(null);
            }}
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
                onClick={() => {
                  setIsFullscreen(false);
                  setSelectedImageIndex(null);
                }}
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* 全屏图片 */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-[90vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.img
                src={availableImages[selectedImageIndex].url}
                alt={`${product.name} - ${availableImages[selectedImageIndex].label}`}
                className="max-w-full max-h-full object-contain"
                style={{ transform: `scale(${zoomLevel})` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
              <p className="text-sm opacity-80">{availableImages[selectedImageIndex].label}</p>
              <p className="text-sm opacity-60">
                {selectedImageIndex + 1} / {availableImages.length}
              </p>
            </div>

            {/* 缩略图导航 */}
            {availableImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[80vw] overflow-x-auto pb-2">
                {availableImages.map((image, index) => (
                  <motion.button
                    key={image.type}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-colors ${
                      index === selectedImageIndex
                        ? 'border-white'
                        : 'border-white/30 hover:border-white/60'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex(index);
                      setZoomLevel(1);
                    }}
                  >
                    <img
                      src={image.url}
                      alt={`${product.name} - ${image.label}`}
                      className="w-full h-full object-cover"
                    />
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OptimizedImageGallery;