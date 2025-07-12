import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PageLayout } from './components/layout/Navigation';
import { ToastProvider } from './components/ui/ToastNotification';
import { PageTransitionWrapper } from './components/layout/PageTransition';
import { AnimationPreferencesProvider } from './hooks/useAnimationPreferences';
import { AnimationSettings, AnimationPerformanceWarning } from './components/ui/AnimationSettings';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { useProductStore } from './stores/productStore';
import { dataService } from './services/dataService';
import './App.css';

// 懒加载页面组件
const ProductList = React.lazy(() => import('./pages/ProductList'));
const ProductListWithQuery = React.lazy(() =>
  import('./pages/ProductList/ProductListWithQuery').then(module => ({
    default: module.ProductListWithQuery
  }))
);
const ProductDetail = React.lazy(() => import('./pages/ProductDetail'));
const ApiDemo = React.lazy(() =>
  import('./pages/ApiDemo').then(module => ({
    default: module.ApiDemo
  }))
);
const PerformanceDemo = React.lazy(() => import('./pages/PerformanceDemo'));

// 简单的调试组件
const DebugPage: React.FC = () => {
  const products = useProductStore(state => state.products);
  const initializeData = useProductStore(state => state.initializeData);
  const loading = useProductStore(state => state.loading);
  const error = useProductStore(state => state.error);

  React.useEffect(() => {
    console.log('DebugPage: 初始化数据...');
    initializeData();
  }, [initializeData]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">数据加载调试页面</h1>
      <div className="space-y-4">
        <div>
          <strong>加载状态:</strong> {loading ? '加载中...' : '已完成'}
        </div>
        <div>
          <strong>错误信息:</strong> {error || '无'}
        </div>
        <div>
          <strong>产品数量:</strong> {products.length}
        </div>
        <div>
          <strong>DataService 产品数量:</strong> {dataService.getAllProducts().length}
        </div>
        {products.length > 0 && (
          <div>
            <strong>第一个产品:</strong>
            <pre className="bg-gray-100 p-2 rounded text-sm">
              {JSON.stringify(products[0], null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

// 加载组件
const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

// 路由组件包装器
const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <PageTransitionWrapper type="fade">
                  <ProductListWithQuery />
                </PageTransitionWrapper>
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/products"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <PageTransitionWrapper type="slide">
                  <ProductList />
                </PageTransitionWrapper>
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/products-query"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <PageTransitionWrapper type="scale">
                  <ProductListWithQuery />
                </PageTransitionWrapper>
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/products/:id"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <PageTransitionWrapper type="default">
                  <ProductDetail />
                </PageTransitionWrapper>
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/api-demo"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <PageTransitionWrapper type="fade">
                  <ApiDemo />
                </PageTransitionWrapper>
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/performance-demo"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <PageTransitionWrapper type="scale">
                  <PerformanceDemo />
                </PageTransitionWrapper>
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/debug"
          element={
            <ErrorBoundary>
              <PageTransitionWrapper type="fade">
                <DebugPage />
              </PageTransitionWrapper>
            </ErrorBoundary>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  // 添加调试信息
  useEffect(() => {
    console.log('=== App 组件调试信息 ===');

    // 检查原始数据
    const products = dataService.getAllProducts();
    const stats = dataService.getStats();
    console.log(`DataService.getAllProducts(): ${products.length} 个产品`);
    console.log('DataService.getStats():', stats);

    // 检查筛选选项
    const categoryOptions = dataService.getCategoryOptions();
    const locationOptions = dataService.getLocationOptions();
    const platformOptions = dataService.getPlatformOptions();
    console.log(`品类选项: ${categoryOptions.length} 个`);
    console.log(`产地选项: ${locationOptions.length} 个`);
    console.log(`平台选项: ${platformOptions.length} 个`);

    // 检查 ProductStore 状态
    const storeState = useProductStore.getState();
    console.log('ProductStore 初始状态:');
    console.log(`  - products: ${storeState.products.length} 个`);
    console.log(`  - loading: ${storeState.loading}`);
    console.log(`  - error: ${storeState.error}`);

    // 将调试函数暴露到全局
    (window as any).debugStore = () => {
      const state = useProductStore.getState();
      console.log('当前 ProductStore 状态:', {
        products: state.products.length,
        filteredProducts: state.filteredProducts.length,
        loading: state.loading,
        error: state.error,
        filters: state.filters
      });
      return state;
    };

    (window as any).testDataService = () => {
      const products = dataService.getAllProducts();
      const stats = dataService.getStats();
      console.log('DataService 测试:', {
        products: products.length,
        stats,
        categoryOptions: dataService.getCategoryOptions(),
        locationOptions: dataService.getLocationOptions(),
        platformOptions: dataService.getPlatformOptions()
      });
      return { products, stats };
    };
  }, []);

  return (
    <AnimationPreferencesProvider>
      <ToastProvider>
        <Router>
          <PageLayout>
            <AnimatedRoutes />
            <AnimationSettings />
            <AnimationPerformanceWarning />
          </PageLayout>
        </Router>
      </ToastProvider>
    </AnimationPreferencesProvider>
  );
}

export default App;
