// 动画偏好设置和性能优化Hook
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { getResponsiveAnimationConfig, BREAKPOINTS } from '../constants/animations';

export interface AnimationPreferences {
  reduceMotion: boolean;
  enableParallax: boolean;
  enableRippleEffects: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
  enableScrollAnimations: boolean;
  enablePageTransitions: boolean;
}

const defaultPreferences: AnimationPreferences = {
  reduceMotion: false,
  enableParallax: true,
  enableRippleEffects: true,
  animationSpeed: 'normal',
  enableScrollAnimations: true,
  enablePageTransitions: true,
};

const STORAGE_KEY = 'animation-preferences';

// 检测用户系统偏好
const getSystemPreferences = (): Partial<AnimationPreferences> => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
  const hasSlowConnection = 'connection' in navigator && 
    (navigator as any).connection?.effectiveType === 'slow-2g' || 
    (navigator as any).connection?.effectiveType === '2g';

  return {
    reduceMotion: prefersReducedMotion,
    enableParallax: !isLowEndDevice && !hasSlowConnection,
    enableRippleEffects: !isLowEndDevice,
    animationSpeed: isLowEndDevice || hasSlowConnection ? 'fast' : 'normal',
    enableScrollAnimations: !prefersReducedMotion && !isLowEndDevice,
    enablePageTransitions: !isLowEndDevice,
  };
};

// 获取动画持续时间倍数
const getSpeedMultiplier = (speed: AnimationPreferences['animationSpeed']): number => {
  switch (speed) {
    case 'slow':
      return 1.5;
    case 'fast':
      return 0.5;
    case 'normal':
    default:
      return 1;
  }
};

export const useAnimationPreferences = () => {
  const [preferences, setPreferences] = useState<AnimationPreferences>(() => {
    // 从localStorage加载偏好设置
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultPreferences, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load animation preferences:', error);
    }

    // 如果没有存储的偏好，使用系统偏好
    const systemPrefs = getSystemPreferences();
    return { ...defaultPreferences, ...systemPrefs };
  });

  // 响应式屏幕尺寸状态
  const [screenWidth, setScreenWidth] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth : BREAKPOINTS.lg;
  });

  // 监听屏幕尺寸变化
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 保存偏好设置到localStorage
  const savePreferences = useCallback((newPreferences: Partial<AnimationPreferences>) => {
    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save animation preferences:', error);
    }
  }, [preferences]);

  // 重置为默认设置
  const resetPreferences = useCallback(() => {
    const systemPrefs = getSystemPreferences();
    const reset = { ...defaultPreferences, ...systemPrefs };
    setPreferences(reset);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
    } catch (error) {
      console.warn('Failed to reset animation preferences:', error);
    }
  }, []);

  // 监听系统偏好变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches && !preferences.reduceMotion) {
        savePreferences({ reduceMotion: true });
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [preferences.reduceMotion, savePreferences]);

  // 获取优化后的动画配置（支持响应式）
  const getAnimationConfig = useCallback((baseDuration: number = 0.3) => {
    if (preferences.reduceMotion) {
      return {
        duration: 0.01, // 几乎瞬间完成
        ease: 'linear',
        disabled: true,
      };
    }

    const speedMultiplier = getSpeedMultiplier(preferences.animationSpeed);
    const responsiveConfig = getResponsiveAnimationConfig(screenWidth);
    
    return {
      duration: (baseDuration * speedMultiplier * responsiveConfig.duration) / 0.3, // 基于响应式调整
      ease: 'easeOut',
      disabled: false,
    };
  }, [preferences.reduceMotion, preferences.animationSpeed, screenWidth]);

  // 获取Framer Motion变体配置
  const getMotionVariants = useCallback((variants: any) => {
    if (preferences.reduceMotion) {
      // 为减少动画模式创建简化变体
      const reducedVariants: any = {};
      Object.keys(variants).forEach(key => {
        reducedVariants[key] = {
          ...variants[key],
          transition: { duration: 0.01 },
        };
      });
      return reducedVariants;
    }

    const speedMultiplier = getSpeedMultiplier(preferences.animationSpeed);
    const enhancedVariants: any = {};
    
    Object.keys(variants).forEach(key => {
      const variant = variants[key];
      enhancedVariants[key] = {
        ...variant,
        transition: variant.transition ? {
          ...variant.transition,
          duration: (variant.transition.duration || 0.3) * speedMultiplier,
        } : {
          duration: 0.3 * speedMultiplier,
        },
      };
    });

    return enhancedVariants;
  }, [preferences.reduceMotion, preferences.animationSpeed]);

  // 检查是否应该启用特定动画
  const shouldEnableAnimation = useCallback((animationType: keyof AnimationPreferences) => {
    if (preferences.reduceMotion) return false;
    return preferences[animationType] as boolean;
  }, [preferences]);

  // 性能监控
  const [performanceMetrics, setPerformanceMetrics] = useState({
    frameRate: 60,
    isLowPerformance: false,
  });

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measurePerformance = (currentTime: number) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        const isLowPerformance = fps < 30;
        
        setPerformanceMetrics({
          frameRate: fps,
          isLowPerformance,
        });

        // 如果性能较低，自动调整设置
        if (isLowPerformance && !preferences.reduceMotion) {
          console.warn('Low performance detected, adjusting animation settings');
          savePreferences({
            animationSpeed: 'fast',
            enableParallax: false,
            enableRippleEffects: false,
          });
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      animationId = requestAnimationFrame(measurePerformance);
    };

    // 只在开发环境或用户明确启用性能监控时运行
    if (process.env.NODE_ENV === 'development') {
      animationId = requestAnimationFrame(measurePerformance);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [preferences.reduceMotion, savePreferences]);

  return {
    preferences,
    savePreferences,
    resetPreferences,
    getAnimationConfig,
    getMotionVariants,
    shouldEnableAnimation,
    performanceMetrics,
    speedMultiplier: getSpeedMultiplier(preferences.animationSpeed),
    screenWidth,
    responsiveConfig: getResponsiveAnimationConfig(screenWidth),
    isMobile: screenWidth < BREAKPOINTS.md,
    isTablet: screenWidth >= BREAKPOINTS.md && screenWidth < BREAKPOINTS.lg,
    isDesktop: screenWidth >= BREAKPOINTS.lg,
  };
};

// 动画偏好设置Context
const AnimationPreferencesContext = createContext<ReturnType<typeof useAnimationPreferences> | null>(null);

export const AnimationPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const animationPreferences = useAnimationPreferences();

  return React.createElement(
    AnimationPreferencesContext.Provider,
    { value: animationPreferences },
    children
  );
};

export const useAnimationContext = () => {
  const context = useContext(AnimationPreferencesContext);
  if (!context) {
    throw new Error('useAnimationContext must be used within AnimationPreferencesProvider');
  }
  return context;
};

export default useAnimationPreferences;
