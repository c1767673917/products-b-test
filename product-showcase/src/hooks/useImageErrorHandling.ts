import { useState, useCallback } from 'react';
import { apiService } from '../services/apiService';

// 图片错误处理状态
interface ImageErrorState {
  hasError: boolean;
  retryCount: number;
  isRetrying: boolean;
  lastError?: string;
}

// 图片信息类型
interface ImageInfo {
  url: string;
  imageId?: string;
  objectName?: string;
  lastUpdated?: string;
}

/**
 * 图片错误处理和重试Hook
 * 提供图片加载失败时的自动修复和重试机制
 */
export const useImageErrorHandling = (
  productId: string,
  imageType: string,
  maxRetries: number = 2
) => {
  const [errorState, setErrorState] = useState<ImageErrorState>({
    hasError: false,
    retryCount: 0,
    isRetrying: false
  });

  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);

  /**
   * 处理图片加载错误
   */
  const handleImageError = useCallback(async (originalSrc: string) => {
    console.warn(`图片加载失败: ${originalSrc}`, { productId, imageType });

    setErrorState(prev => ({
      ...prev,
      hasError: true,
      lastError: `图片加载失败: ${originalSrc}`
    }));

    // 如果还有重试次数，尝试修复
    if (errorState.retryCount < maxRetries) {
      await attemptImageRepair();
    }
  }, [productId, imageType, errorState.retryCount, maxRetries]);

  /**
   * 尝试修复图片
   */
  const attemptImageRepair = useCallback(async () => {
    if (errorState.isRetrying) return;

    setErrorState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1
    }));

    try {
      console.log(`尝试修复图片 (第${errorState.retryCount + 1}次)`, { productId, imageType });

      // 从后端重新获取图片信息
      const response = await apiService.getProductImage(productId, imageType);
      
      if (response.success && response.data) {
        const newImageInfo: ImageInfo = {
          url: response.data.url,
          imageId: response.data.imageId,
          objectName: response.data.objectName,
          lastUpdated: response.data.lastUpdated
        };

        setImageInfo(newImageInfo);
        
        // 重置错误状态
        setErrorState({
          hasError: false,
          retryCount: 0,
          isRetrying: false
        });

        console.log('图片修复成功', { productId, imageType, newUrl: newImageInfo.url });
        return newImageInfo.url;

      } else {
        throw new Error(response.message || '获取图片信息失败');
      }

    } catch (error) {
      console.error('图片修复失败', { productId, imageType, error });
      
      setErrorState(prev => ({
        ...prev,
        isRetrying: false,
        lastError: error instanceof Error ? error.message : '修复失败'
      }));

      return null;
    }
  }, [productId, imageType, errorState.retryCount, errorState.isRetrying]);

  /**
   * 手动重试
   */
  const manualRetry = useCallback(async () => {
    setErrorState({
      hasError: false,
      retryCount: 0,
      isRetrying: false
    });

    return await attemptImageRepair();
  }, [attemptImageRepair]);

  /**
   * 重置错误状态
   */
  const resetError = useCallback(() => {
    setErrorState({
      hasError: false,
      retryCount: 0,
      isRetrying: false
    });
    setImageInfo(null);
  }, []);

  /**
   * 获取当前应该使用的图片URL
   */
  const getCurrentImageUrl = useCallback((originalUrl: string): string => {
    // 如果有修复后的图片信息，使用新的URL
    if (imageInfo && imageInfo.url) {
      return imageInfo.url;
    }

    // 如果有错误且超过重试次数，返回占位符
    if (errorState.hasError && errorState.retryCount >= maxRetries) {
      return '/placeholder-image.svg';
    }

    // 否则使用原始URL
    return originalUrl;
  }, [imageInfo, errorState, maxRetries]);

  /**
   * 检查是否应该显示错误状态
   */
  const shouldShowError = errorState.hasError && errorState.retryCount >= maxRetries && !errorState.isRetrying;

  /**
   * 检查是否正在重试
   */
  const isRetrying = errorState.isRetrying;

  /**
   * 获取错误信息
   */
  const getErrorMessage = () => {
    if (shouldShowError) {
      return errorState.lastError || '图片加载失败';
    }
    return null;
  };

  return {
    // 状态
    hasError: errorState.hasError,
    isRetrying,
    shouldShowError,
    retryCount: errorState.retryCount,
    
    // 数据
    imageInfo,
    
    // 方法
    handleImageError,
    attemptImageRepair,
    manualRetry,
    resetError,
    getCurrentImageUrl,
    getErrorMessage
  };
};

/**
 * 批量图片错误处理Hook
 * 用于处理产品的多个图片类型
 */
export const useBatchImageErrorHandling = (
  productId: string,
  imageTypes: string[] = ['front', 'back', 'label', 'package', 'gift']
) => {
  const imageHandlers = imageTypes.reduce((handlers, imageType) => {
    handlers[imageType] = useImageErrorHandling(productId, imageType);
    return handlers;
  }, {} as Record<string, ReturnType<typeof useImageErrorHandling>>);

  /**
   * 获取指定类型的图片处理器
   */
  const getImageHandler = (imageType: string) => {
    return imageHandlers[imageType];
  };

  /**
   * 检查是否有任何图片正在重试
   */
  const isAnyRetrying = Object.values(imageHandlers).some(handler => handler.isRetrying);

  /**
   * 获取错误统计
   */
  const getErrorStats = () => {
    const handlers = Object.values(imageHandlers);
    return {
      total: handlers.length,
      hasError: handlers.filter(h => h.hasError).length,
      retrying: handlers.filter(h => h.isRetrying).length,
      failed: handlers.filter(h => h.shouldShowError).length
    };
  };

  /**
   * 重试所有失败的图片
   */
  const retryAllFailed = async () => {
    const failedHandlers = Object.values(imageHandlers).filter(h => h.shouldShowError);
    
    const results = await Promise.allSettled(
      failedHandlers.map(handler => handler.manualRetry())
    );

    return results.map((result, index) => ({
      imageType: imageTypes[index],
      success: result.status === 'fulfilled' && result.value !== null,
      error: result.status === 'rejected' ? result.reason : null
    }));
  };

  /**
   * 重置所有错误状态
   */
  const resetAllErrors = () => {
    Object.values(imageHandlers).forEach(handler => handler.resetError());
  };

  return {
    // 单个处理器
    getImageHandler,
    
    // 批量状态
    isAnyRetrying,
    getErrorStats,
    
    // 批量操作
    retryAllFailed,
    resetAllErrors
  };
};

export default useImageErrorHandling;
