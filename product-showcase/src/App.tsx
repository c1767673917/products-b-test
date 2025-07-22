import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PageLayout } from './components/layout/Navigation';
import { ToastProvider } from './components/ui/ToastNotification';
import { PageTransitionWrapper } from './components/layout/PageTransition';
import { AnimationPreferencesProvider } from './hooks/useAnimationPreferences';
import { AnimationSettings, AnimationPerformanceWarning } from './components/ui/AnimationSettings';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import './App.css';

// 懒加载页面组件
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
const SyncManagement = React.lazy(() => import('./pages/SyncManagement'));
const ImageTestComponent = React.lazy(() => import('./components/ImageTestComponent'));




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
                <PageTransitionWrapper type="fade" duration={0.15}>
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
                <PageTransitionWrapper type="scale" duration={0.25}>
                  <ProductDetail />
                </PageTransitionWrapper>
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/sync-management"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <PageTransitionWrapper type="fade">
                  <SyncManagement />
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
          path="/image-test"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <PageTransitionWrapper type="fade">
                  <ImageTestComponent />
                </PageTransitionWrapper>
              </Suspense>
            </ErrorBoundary>
          }
        />

      </Routes>
    </AnimatePresence>
  );
};

function App() {

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
