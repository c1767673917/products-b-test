// 导航组件
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  RectangleStackIcon,
  CpuChipIcon,
  ChartBarIcon,
  DocumentTextIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    path: '/',
    label: 'React Query版本',
    icon: HomeIcon,
    description: '使用React Query的产品列表'
  },
  {
    path: '/products',
    label: '原版本',
    icon: RectangleStackIcon,
    description: '使用Zustand的产品列表'
  },
  {
    path: '/api-demo',
    label: 'API演示',
    icon: CpuChipIcon,
    description: 'API集成和缓存管理演示'
  },
  {
    path: '/performance-demo',
    label: '性能演示',
    icon: ChartBarIcon,
    description: '性能优化和测试功能演示'
  }
];

export const Navigation: React.FC = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 监听路由变化，关闭移动端菜单
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // 监听窗口大小变化，在桌面端关闭移动端菜单
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 阻止背景滚动
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.div
              className="flex items-center"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <DocumentTextIcon className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900 hidden sm:block">
                产品展示系统
              </span>
              <span className="ml-2 text-lg font-semibold text-gray-900 sm:hidden">
                产品展示
              </span>
            </motion.div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigationItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;

                  return (
                    <Link key={item.path} to={item.path}>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative"
                      >
                        <Button
                          variant={isActive ? 'default' : 'ghost'}
                          size="sm"
                          className={cn(
                            'flex items-center space-x-2',
                            isActive && 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Button>

                        {/* Active indicator */}
                        {isActive && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
                            initial={false}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        )}
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2"
                >
                  <AnimatePresence mode="wait">
                    {isMobileMenuOpen ? (
                      <motion.div
                        key="close"
                        initial={{ rotate: -90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: 90, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="menu"
                        initial={{ rotate: 90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: -90, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Bars3Icon className="h-6 w-6" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 left-0 h-full w-80 bg-white shadow-xl z-50 md:hidden"
            >
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                  <span className="ml-2 text-xl font-semibold text-gray-900">
                    产品展示系统
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2"
                >
                  <XMarkIcon className="h-5 w-5" />
                </Button>
              </div>

              {/* Sidebar Navigation */}
              <div className="p-4">
                <nav className="space-y-2">
                  {navigationItems.map((item, index) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;

                    return (
                      <motion.div
                        key={item.path}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Link to={item.path}>
                          <motion.div
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                              'flex items-center p-3 rounded-lg transition-colors',
                              isActive
                                ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            )}
                          >
                            <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="font-medium">{item.label}</div>
                              <div className="text-sm text-gray-500 mt-1">
                                {item.description}
                              </div>
                            </div>
                            {isActive && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-2 h-2 bg-blue-600 rounded-full"
                              />
                            )}
                          </motion.div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

// 页面布局组件
export const PageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="relative">
        {children}
      </main>
    </div>
  );
};
