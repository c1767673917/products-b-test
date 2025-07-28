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
    staleTime: 5 * 60 * 1000, // 5分钟新鲜度 - 因为使用了乐观更新
    cacheTime: 10 * 60 * 1000, // 10分钟缓存时间
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
    staleTime: 5 * 60 * 1000, // 5分钟新鲜度 - 因为使用了乐观更新，可以增加缓存时间
    cacheTime: 10 * 60 * 1000, // 10分钟缓存时间
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
    // 乐观更新 - 立即更新UI
    onMutate: async (productId: string) => {
      // 取消相关查询的进行中请求
      await queryClient.cancelQueries({ queryKey: globalFavoriteQueryKeys.status(productId) });
      await queryClient.cancelQueries({ 
        predicate: (query) => {
          return query.queryKey[0] === 'global-favorites' && 
                 query.queryKey[1] === 'batch-status' &&
                 Array.isArray(query.queryKey[2]) &&
                 query.queryKey[2].includes(productId);
        }
      });

      // 保存当前状态作为快照，以便回滚
      const previousStatus = queryClient.getQueryData(globalFavoriteQueryKeys.status(productId));
      const previousBatchQueries: any[] = [];

      // 查找并保存所有包含此产品的批量查询状态
      queryClient.getQueryCache().findAll({
        predicate: (query) => {
          return query.queryKey[0] === 'global-favorites' && 
                 query.queryKey[1] === 'batch-status' &&
                 Array.isArray(query.queryKey[2]) &&
                 query.queryKey[2].includes(productId);
        }
      }).forEach(query => {
        const data = queryClient.getQueryData(query.queryKey);
        if (data) {
          previousBatchQueries.push({ queryKey: query.queryKey, data });
        }
      });

      // 乐观更新单个产品状态
      const currentStatus = previousStatus as any || { productId, isFavorited: false, favoriteCount: 0 };
      const newIsFavorited = !currentStatus.isFavorited;
      const newFavoriteCount = newIsFavorited ? (currentStatus.favoriteCount + 1) : Math.max(0, currentStatus.favoriteCount - 1);

      queryClient.setQueryData(
        globalFavoriteQueryKeys.status(productId),
        {
          productId,
          isFavorited: newIsFavorited,
          favoriteCount: newFavoriteCount
        }
      );

      // 乐观更新所有批量查询
      queryClient.getQueryCache().findAll({
        predicate: (query) => {
          return query.queryKey[0] === 'global-favorites' && 
                 query.queryKey[1] === 'batch-status' &&
                 Array.isArray(query.queryKey[2]) &&
                 query.queryKey[2].includes(productId);
        }
      }).forEach(query => {
        const currentData = queryClient.getQueryData(query.queryKey) as any;
        if (currentData?.favoriteMap) {
          queryClient.setQueryData(query.queryKey, {
            ...currentData,
            favoriteMap: {
              ...currentData.favoriteMap,
              [productId]: newIsFavorited
            },
            countMap: {
              ...currentData.countMap,
              [productId]: newFavoriteCount
            }
          });
        }
      });

      // 乐观更新收藏列表查询
      const previousLists = queryClient.getQueryData(globalFavoriteQueryKeys.lists()) as any;
      if (previousLists?.favorites) {
        const newFavorites = newIsFavorited 
          ? [...previousLists.favorites, { productId, createdAt: new Date().toISOString() }]
          : previousLists.favorites.filter((f: any) => f.productId !== productId);
        
        queryClient.setQueryData(globalFavoriteQueryKeys.lists(), {
          ...previousLists,
          favorites: newFavorites,
          total: newFavorites.length
        });
      }

      // 返回快照数据，以便在错误时回滚
      return { productId, previousStatus, previousBatchQueries, previousLists };
    },
    onError: (error: any, productId: string, context: any) => {
      // 如果请求失败，回滚到之前的状态
      if (context?.previousStatus) {
        queryClient.setQueryData(
          globalFavoriteQueryKeys.status(productId),
          context.previousStatus
        );
      }

      // 回滚批量查询状态
      if (context?.previousBatchQueries) {
        context.previousBatchQueries.forEach(({ queryKey, data }: any) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      // 回滚收藏列表
      if (context?.previousLists) {
        queryClient.setQueryData(globalFavoriteQueryKeys.lists(), context.previousLists);
      }

      console.error('切换全局收藏状态失败:', error);
      showError('操作失败，请稍后重试');
    },
    onSuccess: (data, productId) => {
      const { action, isFavorited, favoriteCount } = data;
      
      // 确保后端返回的数据与乐观更新一致
      queryClient.setQueryData(
        globalFavoriteQueryKeys.status(productId),
        {
          productId,
          isFavorited,
          favoriteCount
        }
      );

      // 后台刷新收藏列表，不影响当前UI
      queryClient.invalidateQueries({
        queryKey: globalFavoriteQueryKeys.lists()
      });

      // 显示成功消息
      showSuccess(action === 'added' ? '收藏成功' : '取消收藏成功');
    },
    onSettled: (data, error, productId) => {
      // 无论成功还是失败，都在后台重新获取最新数据
      // 这确保了数据的最终一致性
      queryClient.invalidateQueries({
        queryKey: globalFavoriteQueryKeys.status(productId)
      });
      
      queryClient.invalidateQueries({
        predicate: (query) => {
          return query.queryKey[0] === 'global-favorites' && 
                 query.queryKey[1] === 'batch-status' &&
                 Array.isArray(query.queryKey[2]) &&
                 query.queryKey[2].includes(productId);
        }
      });
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
    refetch: favoritesQuery.refetch,
    // 添加一个标记来表示数据是否已经加载过
    isInitialLoading: favoritesQuery.isLoading && !favoritesQuery.data
  };
};