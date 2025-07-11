// 缓存管理相关的自定义 Hooks
import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys, queryUtils } from '../services/queryClient';

// 缓存状态类型
interface CacheStatus {
  size: number;
  queries: number;
  mutations: number;
  isOnline: boolean;
}

// 缓存管理 Hook
export const useCacheManager = () => {
  const queryClient = useQueryClient();
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({
    size: 0,
    queries: 0,
    mutations: 0,
    isOnline: navigator.onLine,
  });

  // 更新缓存状态
  const updateCacheStatus = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const mutationCache = queryClient.getMutationCache();
    
    setCacheStatus({
      size: cache.getAll().length,
      queries: cache.getAll().length,
      mutations: mutationCache.getAll().length,
      isOnline: navigator.onLine,
    });
  }, [queryClient]);

  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = () => {
      setCacheStatus(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setCacheStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 监听缓存变化
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      updateCacheStatus();
    });

    updateCacheStatus();
    return unsubscribe;
  }, [queryClient, updateCacheStatus]);

  // 清除所有缓存
  const clearAllCache = useCallback(() => {
    queryClient.clear();
    updateCacheStatus();
  }, [queryClient, updateCacheStatus]);

  // 清除过期缓存
  const clearStaleCache = useCallback(() => {
    queryClient.getQueryCache().clear();
    updateCacheStatus();
  }, [queryClient, updateCacheStatus]);

  // 预加载核心数据
  const preloadCoreData = useCallback(async () => {
    await Promise.all([
      queryUtils.prefetchProducts(),
      queryUtils.prefetchStats(),
      queryUtils.prefetchFilterOptions(),
    ]);
    updateCacheStatus();
  }, [updateCacheStatus]);

  return {
    cacheStatus,
    clearAllCache,
    clearStaleCache,
    preloadCoreData,
    updateCacheStatus,
  };
};

// 离线缓存 Hook
export const useOfflineCache = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 获取离线可用的数据
  const getOfflineData = useCallback(() => {
    const products = queryClient.getQueryData(queryKeys.products);
    const stats = queryClient.getQueryData(queryKeys.stats);
    const filterOptions = queryClient.getQueryData(queryKeys.filterOptions);

    return {
      products,
      stats,
      filterOptions,
      hasOfflineData: !!(products && stats && filterOptions),
    };
  }, [queryClient]);

  return {
    isOffline,
    getOfflineData,
  };
};

// 智能预加载 Hook
export const useSmartPreload = () => {
  const queryClient = useQueryClient();

  // 预加载产品详情（基于用户行为）
  const preloadProduct = useCallback((productId: string) => {
    queryUtils.prefetchProduct(productId);
  }, []);

  // 预加载相关产品
  const preloadRelatedProducts = useCallback((productId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.related(productId),
      queryFn: async () => {
        const { apiService } = await import('../services/apiService');
        const response = await apiService.getRelatedProducts(productId);
        return response.data;
      },
    });
  }, [queryClient]);

  // 基于用户浏览历史预加载
  const preloadBasedOnHistory = useCallback((viewedProductIds: string[]) => {
    // 预加载最近查看的产品的相关产品
    viewedProductIds.slice(-3).forEach(productId => {
      preloadRelatedProducts(productId);
    });
  }, [preloadRelatedProducts]);

  // 预加载热门内容
  const preloadPopularContent = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.popular(8),
      queryFn: async () => {
        const { apiService } = await import('../services/apiService');
        const response = await apiService.getPopularProducts(8);
        return response.data;
      },
    });
  }, [queryClient]);

  return {
    preloadProduct,
    preloadRelatedProducts,
    preloadBasedOnHistory,
    preloadPopularContent,
  };
};

// 缓存性能监控 Hook
export const useCachePerformance = () => {
  const [metrics, setMetrics] = useState({
    hitRate: 0,
    missRate: 0,
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    let totalQueries = 0;
    let cacheHits = 0;
    let cacheMisses = 0;

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'queryAdded') {
        totalQueries++;
        
        // 检查是否是缓存命中
        const query = event.query;
        if (query.state.data !== undefined && query.state.dataUpdatedAt > 0) {
          cacheHits++;
        } else {
          cacheMisses++;
        }

        setMetrics({
          totalQueries,
          cacheHits,
          cacheMisses,
          hitRate: totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0,
          missRate: totalQueries > 0 ? (cacheMisses / totalQueries) * 100 : 0,
        });
      }
    });

    return unsubscribe;
  }, [queryClient]);

  return metrics;
};

// 自动缓存清理 Hook
export const useAutoCacheCleanup = (options: {
  maxCacheSize?: number;
  cleanupInterval?: number;
  maxAge?: number;
} = {}) => {
  const {
    maxCacheSize = 100,
    cleanupInterval = 5 * 60 * 1000, // 5分钟
    maxAge = 30 * 60 * 1000, // 30分钟
  } = options;

  const queryClient = useQueryClient();

  useEffect(() => {
    const cleanup = () => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();

      // 如果缓存大小超过限制，清理最旧的查询
      if (queries.length > maxCacheSize) {
        const sortedQueries = queries
          .sort((a, b) => (a.state.dataUpdatedAt || 0) - (b.state.dataUpdatedAt || 0))
          .slice(0, queries.length - maxCacheSize);

        sortedQueries.forEach(query => {
          cache.remove(query);
        });
      }

      // 清理过期的查询
      const now = Date.now();
      queries.forEach(query => {
        const lastUpdated = query.state.dataUpdatedAt || 0;
        if (now - lastUpdated > maxAge) {
          cache.remove(query);
        }
      });
    };

    const interval = setInterval(cleanup, cleanupInterval);
    return () => clearInterval(interval);
  }, [queryClient, maxCacheSize, cleanupInterval, maxAge]);
};
