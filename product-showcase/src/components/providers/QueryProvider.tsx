// React Query Provider 组件
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '../../services/queryClient';
import { useAutoCacheCleanup } from '../../hooks/useCache';

interface QueryProviderProps {
  children: React.ReactNode;
}

// 缓存管理组件
const CacheManager: React.FC = () => {
  // 启用自动缓存清理
  useAutoCacheCleanup({
    maxCacheSize: 150, // 最大缓存查询数
    cleanupInterval: 10 * 60 * 1000, // 10分钟清理一次
    maxAge: 60 * 60 * 1000, // 1小时过期
  });

  return null;
};

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <CacheManager />
      {children}
      {/* 开发环境下显示 React Query DevTools */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
};
