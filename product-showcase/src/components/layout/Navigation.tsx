// 简化的页面布局组件
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

// 页面布局组件
export const PageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { t } = useTranslation('navigation');
  
  const navItems = [
    { path: '/', label: t('navigation.list') },
    { path: '/sync-management', label: t('navigation.sync') },
    { path: '/api-demo', label: t('navigation.demo') },
    { path: '/image-test', label: '图片测试' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">{t('titles.home')}</h1>
            </div>
            <div className="flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <LanguageSwitcher variant="compact" showLabel={false} />
            </div>
          </div>
        </div>
      </nav>
      <main className="relative">
        {children}
      </main>
    </div>
  );
};
