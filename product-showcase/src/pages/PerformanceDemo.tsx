import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon, 
  PhotoIcon, 
  CpuChipIcon, 
  ClockIcon,
  ArrowPathIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

import { PerformanceMonitor, usePerformanceMonitor } from '../components/ui/PerformanceMonitor';
import { VirtualGrid, VirtualList } from '../components/ui/VirtualGrid';
import LazyImage, { useImagePreloader, ImageCache } from '../components/product/LazyImage';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageNavigation } from '../components/layout/PageNavigation';

// 模拟产品数据
const generateMockProducts = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `产品 ${i + 1}`,
    price: Math.floor(Math.random() * 500) + 10,
    image: `https://picsum.photos/300/300?random=${i}`,
    category: ['电子产品', '服装', '食品', '家居'][Math.floor(Math.random() * 4)],
  }));
};

const PerformanceDemo: React.FC = () => {
  const [products] = useState(() => generateMockProducts(1000));
  const [showMonitor, setShowMonitor] = useState(true);
  const [demoMode, setDemoMode] = useState<'virtual-grid' | 'virtual-list' | 'lazy-images'>('virtual-grid');
  const [isLoading, setIsLoading] = useState(false);
  
  const performanceMonitor = usePerformanceMonitor();
  const imagePreloader = useImagePreloader();

  // 模拟性能测试
  const runPerformanceTest = async () => {
    setIsLoading(true);
    
    // 测试筛选性能
    const { result: filteredProducts } = await performanceMonitor.measureFilter(
      () => products.filter(p => p.price > 100),
      products.length
    );

    // 测试渲染性能
    performanceMonitor.measureRender(() => {
      // 模拟DOM操作
      const div = document.createElement('div');
      div.innerHTML = filteredProducts.map(p => `<div>${p.name}</div>`).join('');
    });

    // 测试图片预加载
    const imageUrls = products.slice(0, 10).map(p => p.image);
    const preloadResult = await imagePreloader.preloadImagesInBatches(imageUrls, 3, 100);
    
    performanceMonitor.updateMetrics({
      imageLoadTime: 150 + Math.random() * 100,
      cacheHitRate: preloadResult.successful / preloadResult.total,
      networkRequests: preloadResult.total,
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 50 * 1024 * 1024,
    });

    setIsLoading(false);
  };

  // 清理缓存
  const clearCache = () => {
    ImageCache.clear();
    performanceMonitor.resetMetrics();
    imagePreloader.clearCache();
  };

  const renderProductCard = (product: any, index: number) => (
    <Card key={product.id} className="p-4">
      <div className="aspect-square mb-3">
        <LazyImage
          src={product.image}
          alt={product.name}
          className="w-full h-full rounded-lg"
          priority={index < 4} // 前4个图片高优先级
          blur={true}
          quality={80}
        />
      </div>
      <h3 className="font-semibold text-sm mb-1 truncate">{product.name}</h3>
      <p className="text-blue-600 font-bold">¥{product.price}</p>
      <p className="text-xs text-gray-500">{product.category}</p>
    </Card>
  );

  const renderProductListItem = (product: any, index: number) => (
    <Card key={product.id} className="p-4 flex items-center space-x-4">
      <div className="w-16 h-16 flex-shrink-0">
        <LazyImage
          src={product.image}
          alt={product.name}
          className="w-full h-full rounded-lg"
          priority={index < 10}
          blur={true}
          quality={60}
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm mb-1 truncate">{product.name}</h3>
        <p className="text-blue-600 font-bold">¥{product.price}</p>
        <p className="text-xs text-gray-500">{product.category}</p>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面导航 */}
      <PageNavigation title="性能优化演示" />

      <div className="max-w-7xl mx-auto p-6">
        {/* 控制面板 */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <Button
                onClick={runPerformanceTest}
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                {isLoading ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <ChartBarIcon className="w-4 h-4" />
                )}
                <span>{isLoading ? '测试中...' : '运行性能测试'}</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={clearCache}
                className="flex items-center space-x-2"
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span>清理缓存</span>
              </Button>
              
              <Button
                variant={showMonitor ? 'default' : 'outline'}
                onClick={() => setShowMonitor(!showMonitor)}
                className="flex items-center space-x-2"
              >
                <CpuChipIcon className="w-4 h-4" />
                <span>性能监控</span>
              </Button>
            </div>

            {/* 演示模式切换 */}
            <div className="flex space-x-2">
              {[
                { key: 'virtual-grid', label: '虚拟网格', icon: PhotoIcon },
                { key: 'virtual-list', label: '虚拟列表', icon: ClockIcon },
                { key: 'lazy-images', label: '懒加载图片', icon: CheckCircleIcon },
              ].map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  variant={demoMode === key ? 'default' : 'outline'}
                  onClick={() => setDemoMode(key as any)}
                  className="flex items-center space-x-2"
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* 性能指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClockIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">筛选时间</p>
                <p className="text-lg font-semibold">
                  {performanceMonitor.metrics.filterTime.toFixed(1)}ms
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CpuChipIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">渲染时间</p>
                <p className="text-lg font-semibold">
                  {performanceMonitor.metrics.renderTime.toFixed(1)}ms
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <PhotoIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">缓存命中率</p>
                <p className="text-lg font-semibold">
                  {((performanceMonitor.metrics.cacheHitRate || 0) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ChartBarIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">内存使用</p>
                <p className="text-lg font-semibold">
                  {((performanceMonitor.metrics.memoryUsage || 0) / (1024 * 1024)).toFixed(1)}MB
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* 演示内容 */}
        <motion.div
          key={demoMode}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-lg shadow-sm border p-6"
        >
          {demoMode === 'virtual-grid' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">虚拟网格演示</h2>
              <p className="text-gray-600 mb-4">
                虚拟网格只渲染可见区域的项目，大大提升大量数据的渲染性能。
                当前显示 {products.length} 个产品。
              </p>
              <VirtualGrid
                items={products}
                renderItem={renderProductCard}
                itemHeight={280}
                itemWidth={200}
                containerHeight={600}
                gap={16}
                className="border rounded-lg"
              />
            </div>
          )}

          {demoMode === 'virtual-list' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">虚拟列表演示</h2>
              <p className="text-gray-600 mb-4">
                虚拟列表适用于长列表场景，只渲染可见项目。
                当前显示 {products.length} 个产品。
              </p>
              <VirtualList
                items={products}
                renderItem={renderProductListItem}
                itemHeight={100}
                containerHeight={600}
                className="border rounded-lg"
              />
            </div>
          )}

          {demoMode === 'lazy-images' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">懒加载图片演示</h2>
              <p className="text-gray-600 mb-4">
                图片懒加载只在进入视口时才加载，支持重试、缓存、模糊占位符等功能。
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-96 overflow-y-auto">
                {products.slice(0, 50).map((product, index) => (
                  <div key={product.id} className="aspect-square">
                    <LazyImage
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full rounded-lg"
                      priority={index < 6}
                      blur={true}
                      quality={75}
                      retryCount={2}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* 性能监控面板 */}
      <PerformanceMonitor
        metrics={performanceMonitor.metrics}
        show={showMonitor}
        onClose={() => setShowMonitor(false)}
        realTime={true}
        compact={false}
      />
    </div>
  );
};

export default PerformanceDemo;
