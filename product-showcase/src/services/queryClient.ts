// React Query 配置
import { QueryClient } from '@tanstack/react-query';

// 查询键工厂 - 统一管理所有查询键
export const queryKeys = {
  // 产品相关
  products: ['products'] as const,
  productsList: (params: any) => ['products', 'list', params] as const,
  product: (id: string) => ['products', id] as const,
  productsByIds: (ids: string[]) => ['products', 'batch', ids.sort().join(',')] as const,
  
  // 搜索相关
  search: (query: string, params?: any) => ['search', query, params] as const,
  searchSuggestions: (query: string, limit?: number) => ['search', 'suggestions', query, limit] as const,
  
  // 筛选相关
  filter: (filters: object, searchQuery?: string) => ['filter', filters, searchQuery] as const,
  filterOptions: ['filter-options'] as const,
  
  // 推荐和聚合相关
  popular: (limit?: number) => ['products', 'popular', limit] as const,
  latest: (limit?: number) => ['products', 'latest', limit] as const,
  related: (productId: string, limit?: number) => ['products', 'related', productId, limit] as const,
  
  // 统计和分析
  stats: ['stats'] as const,
  categories: ['categories'] as const,
  
  // 用户相关
  favorites: ['user', 'favorites'] as const,
  compareList: ['user', 'compare'] as const,
  
  // 图片相关
  images: (productId: string) => ['images', 'product', productId] as const,
  imageStats: ['images', 'stats'] as const,
};

// 创建 Query Client 实例
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 缓存时间 - 数据在内存中保持的时间 (v5 改名为 gcTime)
      gcTime: 15 * 60 * 1000, // 15分钟
      
      // 数据新鲜度 - 数据被认为是新鲜的时间
      staleTime: 5 * 60 * 1000, // 5分钟
      
      // 重试配置 - 根据错误类型智能重试
      retry: (failureCount, error) => {
        // API错误（4xx）不重试
        if (error instanceof Error && error.name === 'ApiError') {
          return false;
        }
        
        // 网络错误或5xx错误重试，最多2次
        if (failureCount < 2) {
          return true;
        }
        
        return false;
      },
      
      // 重试延迟 - 指数退避算法
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // 窗口聚焦时重新获取配置
      refetchOnWindowFocus: false,
      
      // 网络重连时重新获取
      refetchOnReconnect: 'always',
      
      // 组件挂载时的重新获取策略
      refetchOnMount: true,
      
      // 网络恢复时重新获取
      refetchIntervalInBackground: false,
      
      // 自动后台重新获取（仅用于实时数据）
      refetchInterval: false,
    },
    mutations: {
      // 变更操作重试配置
      retry: 1,
      retryDelay: 1000,
      
      // 变更成功后自动失效相关查询
      onSuccess: () => {
        // 可以在这里添加全局的成功处理逻辑
      },
      
      onError: (error) => {
        // 全局变更错误处理
        console.error('Mutation error:', error);
      },
    },
  },
});

// 查询客户端工具函数集合
export const queryUtils = {
  // =========================
  // 预取 (Prefetch) 操作
  // =========================
  
  // 预取产品列表
  prefetchProducts: (params: any = {}) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.productsList(params),
      queryFn: async () => {
        const { apiService } = await import('./apiService');
        const response = await apiService.getProducts(params);
        return response.data;
      },
      staleTime: 3 * 60 * 1000, // 3分钟新鲜度
    });
  },

  // 预取产品详情
  prefetchProduct: (id: string) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.product(id),
      queryFn: async () => {
        const { apiService } = await import('./apiService');
        const response = await apiService.getProductById(id);
        return response.data;
      },
      staleTime: 10 * 60 * 1000, // 产品详情缓存更长时间
    });
  },

  // 预取搜索结果
  prefetchSearch: (query: string, params: any = {}) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.search(query, params),
      queryFn: async () => {
        const { apiService } = await import('./apiService');
        const response = await apiService.searchProducts(query);
        return response.data;
      },
      staleTime: 2 * 60 * 1000, // 搜索结果2分钟新鲜度
    });
  },

  // 预取统计数据
  prefetchStats: () => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.stats,
      queryFn: async () => {
        const { apiService } = await import('./apiService');
        const response = await apiService.getStats();
        return response.data;
      },
      staleTime: 15 * 60 * 1000, // 统计数据长期缓存
    });
  },

  // 预取筛选选项
  prefetchFilterOptions: () => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.filterOptions,
      queryFn: async () => {
        const { apiService } = await import('./apiService');
        const response = await apiService.getFilterOptions();
        return response.data;
      },
      staleTime: 30 * 60 * 1000, // 筛选选项长期缓存
    });
  },

  // 预取分类数据
  prefetchCategories: () => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.categories,
      queryFn: async () => {
        const { apiService } = await import('./apiService');
        const response = await apiService.getFilterOptions();
        return response.data.categories;
      },
      staleTime: 30 * 60 * 1000,
    });
  },

  // =========================
  // 失效 (Invalidate) 操作
  // =========================
  
  // 使产品相关数据失效
  invalidateProducts: () => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.products,
    });
  },

  // 使特定产品数据失效
  invalidateProduct: (id: string) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.product(id),
    });
  },

  // 使搜索结果失效
  invalidateSearch: (query?: string) => {
    if (query) {
      return queryClient.invalidateQueries({
        queryKey: queryKeys.search(query),
      });
    }
    return queryClient.invalidateQueries({
      queryKey: ['search'],
    });
  },

  // 使筛选结果失效
  invalidateFilter: () => {
    return queryClient.invalidateQueries({
      queryKey: ['filter'],
    });
  },

  // 使统计数据失效
  invalidateStats: () => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.stats,
    });
  },

  // 使筛选选项失效
  invalidateFilterOptions: () => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.filterOptions,
    });
  },

  // =========================
  // 缓存操作
  // =========================
  
  // 获取缓存的产品列表
  getCachedProducts: (params: any = {}) => {
    return queryClient.getQueryData(queryKeys.productsList(params));
  },

  // 获取缓存的产品详情
  getCachedProduct: (id: string) => {
    return queryClient.getQueryData(queryKeys.product(id));
  },

  // 获取缓存的搜索结果
  getCachedSearch: (query: string, params: any = {}) => {
    return queryClient.getQueryData(queryKeys.search(query, params));
  },

  // 设置产品列表到缓存
  setProductsData: (params: any, data: any) => {
    queryClient.setQueryData(queryKeys.productsList(params), data);
  },

  // 设置产品详情到缓存
  setProductData: (id: string, data: any) => {
    queryClient.setQueryData(queryKeys.product(id), data);
  },

  // 设置搜索结果到缓存
  setSearchData: (query: string, params: any, data: any) => {
    queryClient.setQueryData(queryKeys.search(query, params), data);
  },

  // =========================
  // 查询状态管理
  // =========================
  
  // 移除特定查询缓存
  removeQuery: (queryKey: any[]) => {
    queryClient.removeQueries({ queryKey });
  },

  // 取消正在进行的查询
  cancelQueries: (queryKey: any[]) => {
    return queryClient.cancelQueries({ queryKey });
  },

  // 清除所有缓存
  clearAll: () => {
    return queryClient.clear();
  },

  // 获取查询状态
  getQueryState: (queryKey: any[]) => {
    return queryClient.getQueryState(queryKey);
  },

  // 重置查询
  resetQueries: (queryKey: any[]) => {
    return queryClient.resetQueries({ queryKey });
  },

  // =========================
  // 高级功能
  // =========================
  
  // 批量预取热门内容（首页优化）
  prefetchHomepageData: async () => {
    const prefetchPromises = [
      queryUtils.prefetchProducts({ page: 1, limit: 20 }),
      queryUtils.prefetchStats(),
      queryUtils.prefetchFilterOptions(),
      queryUtils.prefetchProducts({ page: 1, limit: 10, sortBy: 'collect-time' }), // 最新产品
    ];
    
    try {
      await Promise.allSettled(prefetchPromises);
      console.log('Homepage data prefetched successfully');
    } catch (error) {
      console.warn('Some homepage data prefetch failed:', error);
    }
  },

  // 智能预取相关产品
  prefetchRelatedProducts: (productId: string, currentProduct?: any) => {
    if (currentProduct?.category?.primary) {
      // 基于当前产品分类预取相关产品
      return queryUtils.prefetchProducts({
        category: currentProduct.category.primary,
        limit: 8,
        exclude: productId
      });
    }
    
    return queryUtils.prefetchProducts({ limit: 8 });
  },

  // 性能监控 - 获取缓存使用情况
  getCacheStats: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.isActive()).length,
      staleQueries: queries.filter(q => q.isStale()).length,
      invalidQueries: queries.filter(q => q.isInvalidated()).length,
      cacheSize: JSON.stringify(cache).length,
    };
  },

  // 清理过期缓存
  cleanupStaleCache: () => {
    const cache = queryClient.getQueryCache();
    const staleQueries = cache.getAll().filter(q => q.isStale());
    
    staleQueries.forEach(query => {
      if (!query.isActive()) {
        cache.remove(query);
      }
    });
    
    return staleQueries.length;
  },
};


