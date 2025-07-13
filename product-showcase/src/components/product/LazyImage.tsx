import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean; // 高优先级图片立即加载
  sizes?: string; // 响应式图片尺寸
  quality?: number; // 图片质量 (1-100)
  blur?: boolean; // 是否启用模糊占位符
  retryCount?: number; // 重试次数
  loadingStrategy?: 'lazy' | 'eager'; // 加载策略
}

// 图片缓存管理
class ImageCache {
  private static cache = new Map<string, HTMLImageElement>();
  private static preloadQueue = new Set<string>();

  static preload(src: string): Promise<void> {
    if (this.cache.has(src) || this.preloadQueue.has(src)) {
      return Promise.resolve();
    }

    this.preloadQueue.add(src);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(src, img);
        this.preloadQueue.delete(src);
        resolve();
      };
      img.onerror = () => {
        this.preloadQueue.delete(src);
        reject();
      };
      img.src = src;
    });
  }

  static get(src: string): HTMLImageElement | undefined {
    return this.cache.get(src);
  }

  static clear(): void {
    this.cache.clear();
    this.preloadQueue.clear();
  }

  static getStats() {
    return {
      cached: this.cache.size,
      preloading: this.preloadQueue.size
    };
  }
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  placeholder = '/placeholder-image.svg',
  onLoad,
  onError,
  priority = false,
  sizes,
  quality = 85,
  blur = true,
  retryCount = 3,
  loadingStrategy = 'lazy'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority || loadingStrategy === 'eager');
  const [hasError, setHasError] = useState(false);
  const [retries, setRetries] = useState(0);
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 优化的图片URL生成
  const getOptimizedSrc = useCallback((originalSrc: string) => {
    // 如果是本地图片或已经是优化过的URL，直接返回
    if (originalSrc.startsWith('/') || originalSrc.includes('?')) {
      return originalSrc;
    }

    // 这里可以集成图片CDN的优化参数
    const params = new URLSearchParams();
    if (quality < 100) params.set('q', quality.toString());
    if (sizes) params.set('w', '800'); // 默认宽度，实际应用中可以根据sizes计算

    return params.toString() ? `${originalSrc}?${params.toString()}` : originalSrc;
  }, [quality, sizes]);

  const optimizedSrc = getOptimizedSrc(src);

  // 设置Intersection Observer
  useEffect(() => {
    if (priority || loadingStrategy === 'eager') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          setLoadStartTime(performance.now());
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: priority ? '200px' : '100px' // 高优先级图片提前更多加载
      }
    );

    observerRef.current = observer;

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [priority, loadingStrategy]);

  // 预加载高优先级图片
  useEffect(() => {
    if (priority) {
      ImageCache.preload(optimizedSrc).catch(() => {
        // 预加载失败不影响正常流程
      });
    }
  }, [priority, optimizedSrc]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);

    // 记录加载性能
    if (loadStartTime) {
      const loadTime = performance.now() - loadStartTime;
      console.debug(`Image loaded in ${loadTime.toFixed(2)}ms:`, src);
    }

    onLoad?.();
  }, [loadStartTime, src, onLoad]);

  const handleError = useCallback(() => {
    if (retries < retryCount) {
      // 重试加载
      setTimeout(() => {
        setRetries(prev => prev + 1);
        setHasError(false);
      }, Math.pow(2, retries) * 1000); // 指数退避
    } else {
      setHasError(true);
      onError?.();
    }
  }, [retries, retryCount, onError]);

  const imageSrc = hasError ? placeholder : optimizedSrc;

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
      {isInView && (
        <>
          <motion.img
            src={imageSrc}
            alt={alt}
            sizes={sizes}
            onLoad={handleLoad}
            onError={handleError}
            initial={{ opacity: 0, scale: blur ? 1.05 : 1 }}
            animate={{
              opacity: isLoaded ? 1 : 0,
              scale: isLoaded ? 1 : (blur ? 1.05 : 1)
            }}
            transition={{ 
              duration: 0.2, 
              ease: [0.25, 0.46, 0.45, 0.94] // 优化的贝塞尔曲线
            }}
            style={{
              willChange: 'opacity, transform', // 启用硬件加速
              backfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d'
            }}
            className={cn(
              "w-full h-full object-cover transition-all duration-200 transform-gpu",
              !isLoaded && blur && "blur-sm"
            )}
            loading={loadingStrategy}
            decoding="async"
          />

          {/* 加载占位符 */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              {retries > 0 && (
                <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded">
                  重试 {retries}/{retryCount}
                </div>
              )}
            </div>
          )}

          {/* 错误状态 */}
          {hasError && (
            <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center text-gray-500">
              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm">图片加载失败</span>
            </div>
          )}
        </>
      )}

      {/* 未进入视口时的占位符 */}
      {!isInView && (
        <div className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center">
          {priority && (
            <div className="text-xs text-gray-400">优先加载</div>
          )}
        </div>
      )}
    </div>
  );
};

// 图片预加载Hook
export const useImagePreloader = () => {
  const preloadImages = useCallback(async (urls: string[]) => {
    const promises = urls.map(url => ImageCache.preload(url));
    const results = await Promise.allSettled(promises);

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return { successful, failed, total: urls.length };
  }, []);

  const preloadImagesInBatches = useCallback(async (
    urls: string[],
    batchSize: number = 5,
    delay: number = 100
  ) => {
    const batches = [];
    for (let i = 0; i < urls.length; i += batchSize) {
      batches.push(urls.slice(i, i + batchSize));
    }

    const results = [];
    for (const batch of batches) {
      const result = await preloadImages(batch);
      results.push(result);

      // 批次间延迟，避免过度占用网络资源
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return results.reduce((acc, curr) => ({
      successful: acc.successful + curr.successful,
      failed: acc.failed + curr.failed,
      total: acc.total + curr.total
    }), { successful: 0, failed: 0, total: 0 });
  }, [preloadImages]);

  const getCacheStats = useCallback(() => {
    return ImageCache.getStats();
  }, []);

  const clearCache = useCallback(() => {
    ImageCache.clear();
  }, []);

  return {
    preloadImages,
    preloadImagesInBatches,
    getCacheStats,
    clearCache
  };
};

// 导出ImageCache供外部使用
export { ImageCache };

export default LazyImage;
