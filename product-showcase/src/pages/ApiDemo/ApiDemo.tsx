// API集成演示页面
import React, { useState } from 'react';

import { 
  useProducts, 
  useProduct, 
  useSearchProducts, 
  usePopularProducts,
  useLatestProducts,
  useStats,
  useFilterOptions,
  usePrefetchProduct,
  useRefreshProducts
} from '../../hooks/useProducts';
import { useCacheManager, useOfflineCache, useCachePerformance } from '../../hooks/useCache';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Loading';
import { useToast } from '../../components/ui/ToastNotification';
import { PageNavigation } from '../../components/layout/PageNavigation';

export const ApiDemo: React.FC = () => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { showSuccess, showError } = useToast();

  // API Hooks
  const productsQuery = useProducts();
  const productQuery = useProduct(selectedProductId);
  const searchQuery_ = useSearchProducts(searchQuery, 5);
  const popularQuery = usePopularProducts(6);
  const latestQuery = useLatestProducts(6);
  const statsQuery = useStats();
  const filterOptionsQuery = useFilterOptions();

  // 缓存管理 Hooks
  const cacheManager = useCacheManager();
  const offlineCache = useOfflineCache();
  const cachePerformance = useCachePerformance();

  // 预加载和刷新
  const prefetchProduct = usePrefetchProduct();
  const refreshMutation = useRefreshProducts();

  // 处理产品选择
  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    // 预加载产品详情
    prefetchProduct(productId);
  };

  // 处理搜索
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // 处理缓存操作
  const handleClearCache = () => {
    cacheManager.clearAllCache();
    showSuccess('缓存已清空');
  };

  const handlePreloadCore = async () => {
    await cacheManager.preloadCoreData();
    showSuccess('核心数据预加载完成');
  };

  const handleRefreshData = () => {
    refreshMutation.mutate(undefined, {
      onSuccess: () => {
        showSuccess('数据刷新成功');
      },
      onError: (error) => {
        showError(`刷新失败: ${error.message}`);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面导航 */}
      <PageNavigation
        title="API集成和状态管理演示"
        subtitle="展示React Query、Zustand状态管理和缓存策略的集成效果"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：API状态和缓存信息 */}
          <div className="space-y-6">
            {/* 缓存状态 */}
            <Card>
              <CardHeader>
                <CardTitle>缓存状态</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">查询数量:</span>
                    <span className="ml-2 font-semibold">{cacheManager.cacheStatus.queries}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">网络状态:</span>
                    <span className={`ml-2 font-semibold ${cacheManager.cacheStatus.isOnline ? 'text-green-600' : 'text-red-600'}`}>
                      {cacheManager.cacheStatus.isOnline ? '在线' : '离线'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">命中率:</span>
                    <span className="ml-2 font-semibold">{cachePerformance.hitRate.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">总查询:</span>
                    <span className="ml-2 font-semibold">{cachePerformance.totalQueries}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button 
                    onClick={handleClearCache}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    清空缓存
                  </Button>
                  <Button 
                    onClick={handlePreloadCore}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    预加载核心数据
                  </Button>
                  <Button 
                    onClick={handleRefreshData}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={refreshMutation.isPending}
                  >
                    {refreshMutation.isPending ? <Spinner size="sm" /> : '刷新数据'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 离线状态 */}
            <Card>
              <CardHeader>
                <CardTitle>离线缓存</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">离线状态:</span>
                    <span className={`ml-2 font-semibold ${offlineCache.isOffline ? 'text-red-600' : 'text-green-600'}`}>
                      {offlineCache.isOffline ? '离线' : '在线'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">离线数据:</span>
                    <span className={`ml-2 font-semibold ${offlineCache.getOfflineData().hasOfflineData ? 'text-green-600' : 'text-red-600'}`}>
                      {offlineCache.getOfflineData().hasOfflineData ? '可用' : '不可用'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 统计信息 */}
            <Card>
              <CardHeader>
                <CardTitle>数据统计</CardTitle>
              </CardHeader>
              <CardContent>
                {statsQuery.isLoading ? (
                  <Spinner />
                ) : statsQuery.data ? (
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">总产品数:</span>
                      <span className="ml-2 font-semibold">{statsQuery.data.totalProducts}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">品类数:</span>
                      <span className="ml-2 font-semibold">{Object.keys(statsQuery.data.categoryDistribution).length}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">平台数:</span>
                      <span className="ml-2 font-semibold">{Object.keys(statsQuery.data.platformDistribution).length}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">价格范围:</span>
                      <span className="ml-2 font-semibold">
                        ¥{statsQuery.data.priceRange.min} - ¥{statsQuery.data.priceRange.max}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-red-600">加载失败</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 中间：搜索和产品列表 */}
          <div className="space-y-6">
            {/* 搜索 */}
            <Card>
              <CardHeader>
                <CardTitle>产品搜索</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="搜索产品..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="mb-4"
                />
                
                {searchQuery && (
                  <div>
                    {searchQuery_.isLoading ? (
                      <Spinner />
                    ) : searchQuery_.data && searchQuery_.data.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">找到 {searchQuery_.data.length} 个结果:</p>
                        {searchQuery_.data.map(product => (
                          <div 
                            key={product.productId}
                            className="p-2 border rounded cursor-pointer hover:bg-gray-50"
                            onClick={() => handleProductSelect(product.productId)}
                          >
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-gray-500">
                              {product.category.primary} · ¥{product.price.discount || product.price.normal}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">没有找到相关产品</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 热门产品 */}
            <Card>
              <CardHeader>
                <CardTitle>热门产品</CardTitle>
              </CardHeader>
              <CardContent>
                {popularQuery.isLoading ? (
                  <Spinner />
                ) : popularQuery.data ? (
                  <div className="space-y-2">
                    {popularQuery.data.map(product => (
                      <div 
                        key={product.productId}
                        className="p-2 border rounded cursor-pointer hover:bg-gray-50"
                        onClick={() => handleProductSelect(product.productId)}
                      >
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-gray-500">
                          {product.category.primary} · 
                          {product.price.discount && (
                            <span className="text-red-600 ml-1">
                              ¥{product.price.discount} ({product.price.discountRate}%折扣)
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-red-600">加载失败</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧：产品详情 */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>产品详情</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedProductId ? (
                  <p className="text-gray-500">请选择一个产品查看详情</p>
                ) : productQuery.isLoading ? (
                  <Spinner />
                ) : productQuery.data ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold">{productQuery.data.name}</h3>
                      <p className="text-sm text-gray-600">{productQuery.data.category.primary}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">价格:</p>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">
                          ¥{productQuery.data.price.discount || productQuery.data.price.normal}
                        </span>
                        {productQuery.data.price.discount && (
                          <span className="text-sm text-gray-500 line-through">
                            ¥{productQuery.data.price.normal}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">规格:</p>
                      <p className="text-sm">{productQuery.data.specification}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">产地:</p>
                      <p className="text-sm">{productQuery.data.origin.province} {productQuery.data.origin.city}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">平台:</p>
                      <p className="text-sm">{productQuery.data.platform}</p>
                    </div>

                    {productQuery.data.images.front && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">产品图片:</p>
                        <img 
                          src={productQuery.data.images.front}
                          alt={productQuery.data.name}
                          className="w-full h-32 object-cover rounded"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-red-600">加载失败</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
