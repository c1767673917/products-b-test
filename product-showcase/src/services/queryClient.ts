// React Query 配置
import { QueryClient } from '@tanstack/react-query';

// 查询键工厂
export const queryKeys = {
  // 产品相关
  products: ['products'] as const,
  product: (id: string) => ['products', id] as const,
  productsByIds: (ids: string[]) => ['products', 'batch', ids.sort().join(',')] as const,
  
  // 搜索相关
  search: (query: string, limit?: number) => ['search', query, limit] as const,
  
  // 筛选相关
  filter: (filters: object, searchQuery?: string) => ['filter', filters, searchQuery] as const,
  
  // 推荐相关
  popular: (limit?: number) => ['products', 'popular', limit] as const,
  latest: (limit?: number) => ['products', 'latest', limit] as const,
  related: (productId: string, limit?: number) => ['products', 'related', productId, limit] as const,
  
  // 统计和选项
  stats: ['stats'] as const,
  filterOptions: ['filter-options'] as const,
};

// 创建 Query Client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 缓存时间 - 数据在内存中保持的时间
      gcTime: 10 * 60 * 1000, // 10分钟 (原 cacheTime)
      
      // 数据新鲜度 - 数据被认为是新鲜的时间
      staleTime: 5 * 60 * 1000, // 5分钟
      
      // 重试配置
      retry: (failureCount, error) => {
        // API错误不重试
        if (error instanceof Error && error.name === 'ApiError') {
          return false;
        }
        // 最多重试2次
        return failureCount < 2;
      },
      
      // 重试延迟
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // 窗口聚焦时不自动重新获取
      refetchOnWindowFocus: false,
      
      // 网络重连时重新获取
      refetchOnReconnect: true,
      
      // 组件挂载时不自动重新获取（如果数据是新鲜的）
      refetchOnMount: true,
    },
    mutations: {
      // 变更重试配置
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// 查询客户端工具函数
export const queryUtils = {
  // 预取数据
  prefetchProducts: () => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.products,
      queryFn: async () => {
        const { apiService } = await import('./apiService');
        const response = await apiService.getProducts();
        return response.data;
      },
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
    });
  },

  // 使产品数据失效
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
  invalidateSearch: () => {
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

  // 清除所有缓存
  clearAll: () => {
    return queryClient.clear();
  },

  // 获取缓存的产品数据
  getCachedProducts: () => {
    return queryClient.getQueryData(queryKeys.products);
  },

  // 获取缓存的产品详情
  getCachedProduct: (id: string) => {
    return queryClient.getQueryData(queryKeys.product(id));
  },

  // 设置产品数据到缓存
  setProductsData: (data: any) => {
    queryClient.setQueryData(queryKeys.products, data);
  },

  // 设置产品详情到缓存
  setProductData: (id: string, data: any) => {
    queryClient.setQueryData(queryKeys.product(id), data);
  },

  // 移除查询缓存
  removeQuery: (queryKey: any[]) => {
    queryClient.removeQueries({ queryKey });
  },

  // 取消正在进行的查询
  cancelQueries: (queryKey: any[]) => {
    return queryClient.cancelQueries({ queryKey });
  },
};


