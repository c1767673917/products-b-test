// 产品相关的自定义 Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { queryKeys } from '../services/queryClient';
import type { Product, FilterState } from '../types/product';

// 获取所有产品
export const useProducts = () => {
  return useQuery({
    queryKey: queryKeys.products,
    queryFn: async () => {
      const response = await apiService.getProducts();
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10分钟内认为数据是新鲜的
  });
};

// 获取单个产品详情
export const useProduct = (id: string) => {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: async () => {
      const response = await apiService.getProductById(id);
      return response.data;
    },
    enabled: !!id, // 只有当id存在时才执行查询
    staleTime: 15 * 60 * 1000, // 产品详情缓存时间更长
  });
};

// 批量获取产品（用于对比功能）
export const useProductsByIds = (ids: string[]) => {
  return useQuery({
    queryKey: queryKeys.productsByIds(ids),
    queryFn: async () => {
      const response = await apiService.getProductsByIds(ids);
      return response.data;
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

// 搜索产品
export const useSearchProducts = (query: string, limit?: number) => {
  return useQuery({
    queryKey: queryKeys.search(query, limit),
    queryFn: async () => {
      const response = await apiService.searchProducts(query, limit);
      return response.data;
    },
    enabled: query.trim().length > 0, // 只有当查询不为空时才执行
    staleTime: 2 * 60 * 1000, // 搜索结果缓存时间较短
  });
};

// 筛选产品
export const useFilterProducts = (filters: FilterState, searchQuery?: string) => {
  return useQuery({
    queryKey: queryKeys.filter(filters, searchQuery),
    queryFn: async () => {
      const response = await apiService.filterProducts(filters, searchQuery);
      return response.data;
    },
    staleTime: 3 * 60 * 1000,
  });
};

// 获取热门产品
export const usePopularProducts = (limit?: number) => {
  return useQuery({
    queryKey: queryKeys.popular(limit),
    queryFn: async () => {
      const response = await apiService.getPopularProducts(limit);
      return response.data;
    },
    staleTime: 30 * 60 * 1000, // 热门产品缓存时间更长
  });
};

// 获取最新产品
export const useLatestProducts = (limit?: number) => {
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
export const useRelatedProducts = (productId: string, limit?: number) => {
  return useQuery({
    queryKey: queryKeys.related(productId, limit),
    queryFn: async () => {
      const response = await apiService.getRelatedProducts(productId, limit);
      return response.data;
    },
    enabled: !!productId,
    staleTime: 10 * 60 * 1000,
  });
};

// 获取数据统计
export const useStats = () => {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: async () => {
      const response = await apiService.getStats();
      return response.data;
    },
    staleTime: 60 * 60 * 1000, // 统计数据缓存1小时
  });
};

// 获取筛选选项
export const useFilterOptions = () => {
  return useQuery({
    queryKey: queryKeys.filterOptions,
    queryFn: async () => {
      const response = await apiService.getFilterOptions();
      return response.data;
    },
    staleTime: 30 * 60 * 1000, // 筛选选项缓存30分钟
  });
};

// 预加载产品详情的 Hook
export const usePrefetchProduct = () => {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.product(id),
      queryFn: async () => {
        const response = await apiService.getProductById(id);
        return response.data;
      },
      staleTime: 15 * 60 * 1000,
    });
  };
};

// 预加载相关产品的 Hook
export const usePrefetchRelatedProducts = () => {
  const queryClient = useQueryClient();

  return (productId: string, limit?: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.related(productId, limit),
      queryFn: async () => {
        const response = await apiService.getRelatedProducts(productId, limit);
        return response.data;
      },
      staleTime: 10 * 60 * 1000,
    });
  };
};

// 刷新产品数据的 Mutation
export const useRefreshProducts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiService.getProducts();
      return response.data;
    },
    onSuccess: (data) => {
      // 更新缓存
      queryClient.setQueryData(queryKeys.products, data);
      // 使相关查询失效
      queryClient.invalidateQueries({ queryKey: ['filter'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
    },
  });
};

// 组合 Hook - 获取产品列表和统计信息
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
