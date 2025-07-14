// 简化的页面布局组件
import React from 'react';

// 页面布局组件
export const PageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="relative">
        {children}
      </main>
    </div>
  );
};
