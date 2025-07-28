import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { globalFavoriteApiService } from '../services/globalFavoriteApiService';
import { useToast } from '../components/ui/ToastNotification';

// Query keys for global favorites
export const globalFavoriteQueryKeys = {
  all: ['global-favorites'] as const,
  lists: () => [...globalFavoriteQueryKeys.all, 'list'] as const,
  list: (params: any) => [...globalFavoriteQueryKeys.lists(), params] as const,
  status: (productId: string) => [...globalFavoriteQueryKeys.all, 'status', productId] as const,
  batchStatus: (productIds: string[]) => [...globalFavoriteQueryKeys.all, 'batch-status', productIds] as const,
};

// 获取全局收藏列表
export const useGlobalFavorites = (params: {
  page?: number;
  limit?: number;
  populate?: boolean;
  sortBy?: 'recent' | 'popular';
} = {}) => {
  return useQuery({
    queryKey: globalFavoriteQueryKeys.list(params),
    queryFn: async () => {
      const response = await globalFavoriteApiService.getFavorites(params);
      return response.data;
    },
    staleTime: 30 * 1000, // 30秒新鲜度（全局数据更新更频繁）
    enabled: true,
  });
};

// 检查单个产品全局收藏状态
export const useGlobalFavoriteStatus = (productId: string) => {
  return useQuery({
    queryKey: globalFavoriteQueryKeys.status(productId),
    queryFn: async () => {
      const response = await globalFavoriteApiService.checkFavoriteStatus(productId);
      return response.data;
    },
    enabled: !!productId,
    staleTime: 30 * 1000, // 30秒新鲜度
  });
};

// 批量检查全局收藏状态
export const useBatchGlobalFavoriteStatus = (productIds: string[]) => {
  return useQuery({
    queryKey: globalFavoriteQueryKeys.batchStatus(productIds),
    queryFn: async () => {
      const response = await globalFavoriteApiService.batchCheckFavoriteStatus(productIds);
      return response.data;
    },
    enabled: productIds.length > 0,
    staleTime: 30 * 1000, // 30秒新鲜度
  });
};

// 切换全局收藏状态的mutation
export const useToggleGlobalFavorite = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (productId: string) => {
      const response = await globalFavoriteApiService.toggleFavorite(productId);
      return response.data;
    },
    onSuccess: (data) => {
      const { productId, action, isFavorited, favoriteCount } = data;
      
      // 更新单个产品的收藏状态缓存
      queryClient.setQueryData(
        globalFavoriteQueryKeys.status(productId),
        {
          productId,
          isFavorited,
          favoriteCount
        }
      );

      // 更新批量状态缓存中包含此产品的所有查询
      queryClient.invalidateQueries({
        predicate: (query) => {
          return query.queryKey[0] === 'global-favorites' && 
                 query.queryKey[1] === 'batch-status' &&
                 Array.isArray(query.queryKey[2]) &&
                 query.queryKey[2].includes(productId);
        }
      });

      // 刷新收藏列表
      queryClient.invalidateQueries({
        queryKey: globalFavoriteQueryKeys.lists()
      });

      // 显示成功消息
      showSuccess(action === 'added' ? '收藏成功' : '取消收藏成功');
    },
    onError: (error: any) => {
      console.error('切换全局收藏状态失败:', error);
      showError('操作失败，请稍后重试');
    }
  });
};

// 自定义hook：管理产品列表的全局收藏状态
export const useProductListGlobalFavorites = (productIds: string[]) => {
  const batchStatusQuery = useBatchGlobalFavoriteStatus(productIds);
  const toggleMutation = useToggleGlobalFavorite();

  const handleToggleFavorite = (productId: string) => {
    toggleMutation.mutate(productId);
  };

  const getFavoriteStatus = (productId: string): boolean => {
    return batchStatusQuery.data?.favoriteMap?.[productId] || false;
  };

  const getFavoriteCount = (productId: string): number => {
    return batchStatusQuery.data?.countMap?.[productId] || 0;
  };

  return {
    favoriteMap: batchStatusQuery.data?.favoriteMap || {},
    countMap: batchStatusQuery.data?.countMap || {},
    isLoading: batchStatusQuery.isLoading,
    isError: batchStatusQuery.isError,
    error: batchStatusQuery.error,
    toggleFavorite: handleToggleFavorite,
    getFavoriteStatus,
    getFavoriteCount,
    isToggling: toggleMutation.isPending
  };
};

// 自定义hook：管理单个产品的全局收藏状态
export const useProductGlobalFavorite = (productId: string) => {
  const statusQuery = useGlobalFavoriteStatus(productId);
  const toggleMutation = useToggleGlobalFavorite();

  const handleToggleFavorite = () => {
    toggleMutation.mutate(productId);
  };

  return {
    isFavorited: statusQuery.data?.isFavorited || false,
    favoriteCount: statusQuery.data?.favoriteCount || 0,
    isLoading: statusQuery.isLoading,
    isError: statusQuery.isError,
    error: statusQuery.error,
    toggleFavorite: handleToggleFavorite,
    isToggling: toggleMutation.isPending
  };
};

// 获取全局收藏的产品ID列表（用于筛选）
export const useGlobalFavoriteProductIds = () => {
  const favoritesQuery = useGlobalFavorites({ 
    limit: 1000, // 获取所有收藏
    populate: false // 只需要ID，不需要完整产品信息
  });

  const favoriteProductIds = favoritesQuery.data?.favorites?.map((fav: any) => fav.productId).filter(Boolean) || [];

  return {
    favoriteProductIds,
    isLoading: favoritesQuery.isLoading,
    isError: favoritesQuery.isError,
    error: favoritesQuery.error,
    refetch: favoritesQuery.refetch
  };
};