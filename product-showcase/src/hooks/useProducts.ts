// 产品相关的自定义 Hooks - TanStack Query集成
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { queryKeys, queryUtils } from '../services/queryClient';
import type { FilterState } from '../types/product';

// =========================
// 产品列表查询hooks
// =========================

// 获取产品列表 - 支持参数化查询（含分页）
export const useProducts = (params: any = {}) => {
  return useQuery({
    queryKey: queryKeys.productsList(params),
    queryFn: async () => {
      const response = await apiService.getProducts(params);
      // 检查是否是新的分页API格式
      if (response.data && typeof response.data === 'object' && 'products' in response.data) {
        return response.data; // 返回包含products和pagination的对象
      }
      // 兼容旧格式：直接返回产品数组
      return response.data;
    },
    staleTime: 3 * 60 * 1000, // 3分钟新鲜度
    enabled: true,
  });
};

// 无限滚动产品列表
export const useInfiniteProducts = (params: any = {}) => {
  return useInfiniteQuery({
    queryKey: queryKeys.productsList(params),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiService.getProducts({
        ...params,
        page: pageParam,
        limit: params.limit || 20
      });
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      // 检查后端API返回的分页信息
      if (lastPage && typeof lastPage === 'object' && 'pagination' in lastPage) {
        const pagination = (lastPage as any).pagination;
        return pagination?.hasNext ? allPages.length + 1 : undefined;
      }
      
      // 回退逻辑：基于数据量判断
      const pageSize = params.limit || 20;
      const products = Array.isArray(lastPage) ? lastPage : [];
      return products.length >= pageSize ? allPages.length + 1 : undefined;
    },
    staleTime: 2 * 60 * 1000,
    enabled: true,
  });
};

// 获取单个产品详情
export const useProduct = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: async () => {
      const response = await apiService.getProductById(id);
      return response.data;
    },
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000, // 产品详情缓存更长时间
  });
};

// 批量获取产品（用于对比功能）
export const useProductsByIds = (ids: string[], enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.productsByIds(ids),
    queryFn: async () => {
      const response = await apiService.getProductsByIds(ids);
      return response.data;
    },
    enabled: enabled && ids.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

// =========================
// 搜索相关hooks
// =========================

// 搜索产品
export const useSearchProducts = (query: string, params: any = {}, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.search(query, params),
    queryFn: async () => {
      const response = await apiService.searchProducts(query, params.limit);
      return response.data;
    },
    enabled: enabled && query.trim().length > 0,
    staleTime: 2 * 60 * 1000, // 搜索结果短缓存
  });
};

// 筛选产品
export const useFilterProducts = (filters: FilterState, searchQuery?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.filter(filters, searchQuery),
    queryFn: async () => {
      const response = await apiService.filterProducts(filters, searchQuery);
      return response.data;
    },
    enabled: enabled,
    staleTime: 2 * 60 * 1000,
  });
};

// 获取热门产品
export const usePopularProducts = (limit: number = 10) => {
  return useQuery({
    queryKey: queryKeys.popular(limit),
    queryFn: async () => {
      const response = await apiService.getPopularProducts(limit);
      return response.data;
    },
    staleTime: 15 * 60 * 1000, // 热门产品长缓存
  });
};

// 获取最新产品
export const useLatestProducts = (limit: number = 10) => {
  return useQuery({
    queryKey: queryKeys.latest(limit),
    queryFn: async () => {
      const response = await apiService.getLatestProducts(limit);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

// 获取相关产品推荐
export const useRelatedProducts = (productId: string, limit: number = 8, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.related(productId, limit),
    queryFn: async () => {
      const response = await apiService.getRelatedProducts(productId, limit);
      return response.data;
    },
    enabled: enabled && !!productId,
    staleTime: 10 * 60 * 1000,
  });
};

// =========================
// 统计和筛选hooks
// =========================

// 获取数据统计
export const useStats = (lang?: string) => {
  return useQuery({
    queryKey: [...queryKeys.stats, lang],
    queryFn: async () => {
      const response = await apiService.getStats(lang);
      return response.data;
    },
    staleTime: 15 * 60 * 1000, // 统计数据长缓存
  });
};

// 获取筛选选项
export const useFilterOptions = (lang?: string) => {
  return useQuery({
    queryKey: [...queryKeys.filterOptions, lang],
    queryFn: async () => {
      const response = await apiService.getFilterOptions(lang);
      return response.data;
    },
    staleTime: 30 * 60 * 1000, // 筛选选项超长缓存
  });
};

// =========================
// 变更操作hooks (Mutations)
// =========================

// 刷新产品数据的 Mutation
export const useRefreshProducts = () => {
  return useMutation({
    mutationFn: async (params?: any) => {
      const response = await apiService.getProducts(params);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // 更新缓存
      queryUtils.setProductsData(variables || {}, data);
      // 失效相关查询
      queryUtils.invalidateProducts();
      queryUtils.invalidateFilter();
      queryUtils.invalidateSearch();
    },
    onError: (error) => {
      console.error('Refresh products failed:', error);
    },
  });
};

// 预取产品详情的 Hook
export const usePrefetchProduct = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      await queryUtils.prefetchProduct(id);
      return id;
    },
    onError: (error) => {
      console.warn('Prefetch product failed:', error);
    },
  });
};

// 预取相关产品的 Hook
export const usePrefetchRelatedProducts = () => {
  return useMutation({
    mutationFn: async ({ productId, limit }: { productId: string; limit?: number }) => {
      await queryUtils.prefetchRelatedProducts(productId);
      return { productId, limit };
    },
    onError: (error) => {
      console.warn('Prefetch related products failed:', error);
    },
  });
};

// =========================
// 复合hooks
// =========================

// 首页数据hook - 批量获取首页所需数据
export const useHomepageData = () => {
  const productsQuery = useProducts({ page: 1, limit: 20 });
  const statsQuery = useStats();
  const filterOptionsQuery = useFilterOptions();
  const latestProductsQuery = useLatestProducts(10);
  
  return {
    products: productsQuery,
    stats: statsQuery,
    filterOptions: filterOptionsQuery,
    latestProducts: latestProductsQuery,
    isLoading: productsQuery.isLoading || statsQuery.isLoading || filterOptionsQuery.isLoading,
    isError: productsQuery.isError || statsQuery.isError || filterOptionsQuery.isError,
    error: productsQuery.error || statsQuery.error || filterOptionsQuery.error,
    refetch: () => {
      productsQuery.refetch();
      statsQuery.refetch();
      filterOptionsQuery.refetch();
      latestProductsQuery.refetch();
    },
  };
};

// 组合 Hook - 获取产品列表和统计信息（向后兼容）
export const useProductsWithStats = () => {
  const productsQuery = useProducts();
  const statsQuery = useStats();

  return {
    products: productsQuery.data,
    stats: statsQuery.data,
    isLoading: productsQuery.isLoading || statsQuery.isLoading,
    isError: productsQuery.isError || statsQuery.isError,
    error: productsQuery.error || statsQuery.error,
    refetch: () => {
      productsQuery.refetch();
      statsQuery.refetch();
    },
  };
};

// 组合 Hook - 获取产品详情和相关推荐
export const useProductWithRelated = (productId: string) => {
  const productQuery = useProduct(productId);
  const relatedQuery = useRelatedProducts(productId, 8);

  return {
    product: productQuery.data,
    relatedProducts: relatedQuery.data,
    isLoading: productQuery.isLoading,
    isRelatedLoading: relatedQuery.isLoading,
    isError: productQuery.isError,
    error: productQuery.error,
    refetch: () => {
      productQuery.refetch();
      relatedQuery.refetch();
    },
  };
};

// 产品详情页数据hook
export const useProductDetailData = (productId: string) => {
  const productQuery = useProduct(productId);
  const relatedQuery = useRelatedProducts(productId, 8, !!productId);
  
  return {
    product: productQuery,
    relatedProducts: relatedQuery,
    isLoading: productQuery.isLoading || relatedQuery.isLoading,
    isError: productQuery.isError || relatedQuery.isError,
    error: productQuery.error || relatedQuery.error,
  };
};

// 搜索页面数据hook
export const useSearchPageData = (query: string) => {
  const searchQuery = useSearchProducts(query);
  const filterOptionsQuery = useFilterOptions();
  
  return {
    searchResults: searchQuery,
    filterOptions: filterOptionsQuery,
    isLoading: searchQuery.isLoading || filterOptionsQuery.isLoading,
    isError: searchQuery.isError || filterOptionsQuery.isError,
    error: searchQuery.error || filterOptionsQuery.error,
  };
};

// =========================
// 工具hooks
// =========================

// 缓存管理hook
export const useCacheManager = () => {
  return {
    clearCache: queryUtils.clearAll,
    getCacheStats: queryUtils.getCacheStats,
    cleanupStaleCache: queryUtils.cleanupStaleCache,
    invalidateProducts: queryUtils.invalidateProducts,
    invalidateSearch: queryUtils.invalidateSearch,
    invalidateStats: queryUtils.invalidateStats,
    invalidateFilterOptions: queryUtils.invalidateFilterOptions,
  };
};

// 预取管理hook  
export const usePrefetchManager = () => {
  return {
    prefetchHomepage: queryUtils.prefetchHomepageData,
    prefetchProduct: queryUtils.prefetchProduct,
    prefetchProducts: queryUtils.prefetchProducts,
    prefetchSearch: queryUtils.prefetchSearch,
    prefetchStats: queryUtils.prefetchStats,
    prefetchFilterOptions: queryUtils.prefetchFilterOptions,
    prefetchRelatedProducts: queryUtils.prefetchRelatedProducts,
  };
};
