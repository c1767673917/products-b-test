import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { useToast } from '../components/ui/ToastNotification';

// Query keys for favorites
export const favoriteQueryKeys = {
  all: ['favorites'] as const,
  lists: () => [...favoriteQueryKeys.all, 'list'] as const,
  list: (params: any) => [...favoriteQueryKeys.lists(), params] as const,
  status: (productId: string) => [...favoriteQueryKeys.all, 'status', productId] as const,
  batchStatus: (productIds: string[]) => [...favoriteQueryKeys.all, 'batch-status', productIds] as const,
};

// 获取收藏列表
export const useFavorites = (params: {
  userId?: string;
  page?: number;
  limit?: number;
  populate?: boolean;
} = {}) => {
  return useQuery({
    queryKey: favoriteQueryKeys.list(params),
    queryFn: async () => {
      const response = await apiService.getFavorites(params);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2分钟新鲜度
    enabled: true,
  });
};

// 检查单个产品收藏状态
export const useFavoriteStatus = (productId: string, userId?: string) => {
  return useQuery({
    queryKey: favoriteQueryKeys.status(productId),
    queryFn: async () => {
      const response = await apiService.checkFavoriteStatus(productId, userId);
      return response.data;
    },
    enabled: !!productId,
    staleTime: 1 * 60 * 1000, // 1分钟新鲜度
  });
};

// 批量检查收藏状态
export const useBatchFavoriteStatus = (productIds: string[], userId?: string) => {
  return useQuery({
    queryKey: favoriteQueryKeys.batchStatus(productIds),
    queryFn: async () => {
      const response = await apiService.batchCheckFavoriteStatus(productIds, userId);
      return response.data.favoriteMap;
    },
    enabled: productIds.length > 0,
    staleTime: 1 * 60 * 1000, // 1分钟新鲜度
  });
};

// 切换收藏状态的mutation
export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async ({ productId, userId }: { productId: string; userId?: string }) => {
      const response = await apiService.toggleFavorite(productId, userId);
      return response.data;
    },
    onSuccess: (data) => {
      const { productId, action, isFavorited } = data;
      
      // 更新单个产品的收藏状态缓存
      queryClient.setQueryData(
        favoriteQueryKeys.status(productId),
        {
          productId,
          isFavorited,
          favoriteCount: data.favoriteCount
        }
      );

      // 更新批量状态缓存中包含此产品的所有查询
      queryClient.invalidateQueries({
        predicate: (query) => {
          return query.queryKey[0] === 'favorites' && 
                 query.queryKey[1] === 'batch-status' &&
                 Array.isArray(query.queryKey[2]) &&
                 query.queryKey[2].includes(productId);
        }
      });

      // 如果是取消收藏，需要刷新收藏列表
      if (action === 'removed') {
        queryClient.invalidateQueries({
          queryKey: favoriteQueryKeys.lists()
        });
      }

      // 显示成功消息
      showSuccess(action === 'added' ? '收藏成功' : '取消收藏成功');
    },
    onError: (error: any) => {
      console.error('切换收藏状态失败:', error);
      showError('操作失败，请稍后重试');
    }
  });
};

// 自定义hook：管理产品列表的收藏状态
export const useProductListFavorites = (productIds: string[], userId?: string) => {
  const batchStatusQuery = useBatchFavoriteStatus(productIds, userId);
  const toggleMutation = useToggleFavorite();

  const handleToggleFavorite = (productId: string) => {
    toggleMutation.mutate({ productId, userId });
  };

  const getFavoriteStatus = (productId: string): boolean => {
    return batchStatusQuery.data?.[productId] || false;
  };

  return {
    favoriteMap: batchStatusQuery.data || {},
    isLoading: batchStatusQuery.isLoading,
    isError: batchStatusQuery.isError,
    error: batchStatusQuery.error,
    toggleFavorite: handleToggleFavorite,
    getFavoriteStatus,
    isToggling: toggleMutation.isPending
  };
};

// 自定义hook：管理单个产品的收藏状态
export const useProductFavorite = (productId: string, userId?: string) => {
  const statusQuery = useFavoriteStatus(productId, userId);
  const toggleMutation = useToggleFavorite();

  const handleToggleFavorite = () => {
    toggleMutation.mutate({ productId, userId });
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

// 获取收藏的产品ID列表（用于筛选）
export const useFavoriteProductIds = (userId?: string) => {
  const favoritesQuery = useFavorites({ 
    userId, 
    limit: 1000, // 获取所有收藏，用于筛选
    populate: false // 只需要ID，不需要完整产品信息
  });

  const favoriteProductIds = favoritesQuery.data?.favorites?.map((fav: any) => 
    typeof fav.productId === 'string' ? fav.productId : fav.productId?.productId
  ).filter(Boolean) || [];

  return {
    favoriteProductIds,
    isLoading: favoritesQuery.isLoading,
    isError: favoritesQuery.isError,
    error: favoritesQuery.error,
    refetch: favoritesQuery.refetch
  };
};
