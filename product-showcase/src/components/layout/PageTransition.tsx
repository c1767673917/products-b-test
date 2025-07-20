// 页面过渡动画组件
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAnimationContext } from '../../hooks/useAnimationPreferences';
import { PAGE_TRANSITION_VARIANTS } from '../../constants/animations';

interface PageTransitionProps {
  children: React.ReactNode;
}

// 页面过渡动画变体
const pageVariants = PAGE_TRANSITION_VARIANTS.slide;

// 页面过渡动画配置
const pageTransition = {
  type: 'tween' as const,
  ease: 'anticipate' as const,
  duration: 0.4,
};

// 滑动过渡动画变体
const slideVariants = PAGE_TRANSITION_VARIANTS.slide;

// 淡入淡出动画变体
const fadeVariants = PAGE_TRANSITION_VARIANTS.fade;

// 缩放动画变体
const scaleVariants = PAGE_TRANSITION_VARIANTS.scale;

export type TransitionType = 'fade' | 'slide' | 'scale' | 'default';

interface PageTransitionWrapperProps {
  children: React.ReactNode;
  type?: TransitionType;
  duration?: number;
  className?: string;
}

export const PageTransitionWrapper: React.FC<PageTransitionWrapperProps> = ({
  children,
  type = 'default',
  duration = 0.4,
  className = '',
}) => {
  const location = useLocation();
  const { shouldEnableAnimation, getAnimationConfig } = useAnimationContext();

  const getVariants = () => {
    switch (type) {
      case 'fade':
        return fadeVariants;
      case 'slide':
        return slideVariants;
      case 'scale':
        return scaleVariants;
      default:
        return pageVariants;
    }
  };

  const getTransition = () => {
    const config = getAnimationConfig(duration);
    return {
      type: 'tween' as const,
      ease: type === 'slide' ? 'easeInOut' as const : 'anticipate' as const,
      duration: config.duration,
    };
  };

  // 如果禁用页面切换动画，直接返回内容
  if (!shouldEnableAnimation('enablePageTransitions')) {
    return <div className={className}>{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={getVariants()}
        transition={getTransition()}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// 路由过渡组件
export const RouteTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// 页面内容过渡组件
export const ContentTransition: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
}> = ({ children, delay = 0, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay,
        ease: 'easeOut' as const,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// 交错动画组件
export const StaggerContainer: React.FC<{
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}> = ({ children, staggerDelay = 0.1, className = '' }) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// 交错动画子项组件
export const StaggerItem: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.5,
            ease: 'easeOut',
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// 页面加载动画组件
export const PageLoader: React.FC<{
  isLoading: boolean;
  children: React.ReactNode;
}> = ({ isLoading, children }) => {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center justify-center min-h-screen"
        >
          <div className="flex flex-col items-center space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"
            />
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-gray-600"
            >
              加载中...
            </motion.p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PageTransitionWrapper;
