import { useEffect, useCallback, useRef, useState } from 'react';
import { profiler, PerformanceReport } from '../utils/performanceProfiler';

// 性能优化Hook
export const usePerformanceOptimization = () => {
  const [isOptimized, setIsOptimized] = useState(false);
  const [performanceScore, setPerformanceScore] = useState(0);
  const optimizationRef = useRef<{
    imageOptimization: boolean;
    codesplitting: boolean;
    caching: boolean;
    virtualScrolling: boolean;
  }>({
    imageOptimization: false,
    codesplitting: false,
    caching: false,
    virtualScrolling: false,
  });

  // 检测设备性能
  const detectDevicePerformance = useCallback(() => {
    const deviceMemory = (navigator as any).deviceMemory || 4; // GB
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const connection = (navigator as any).connection;
    
    let score = 0;
    
    // 内存评分 (0-30分)
    if (deviceMemory >= 8) score += 30;
    else if (deviceMemory >= 4) score += 20;
    else if (deviceMemory >= 2) score += 10;
    
    // CPU评分 (0-30分)
    if (hardwareConcurrency >= 8) score += 30;
    else if (hardwareConcurrency >= 4) score += 20;
    else if (hardwareConcurrency >= 2) score += 10;
    
    // 网络评分 (0-40分)
    if (connection) {
      const effectiveType = connection.effectiveType;
      if (effectiveType === '4g') score += 40;
      else if (effectiveType === '3g') score += 25;
      else if (effectiveType === '2g') score += 10;
      else score += 5;
    } else {
      score += 20; // 默认分数
    }
    
    return Math.min(score, 100);
  }, []);

  // 应用性能优化策略
  const applyOptimizations = useCallback((score: number) => {
    const optimizations = optimizationRef.current;
    
    // 根据性能分数决定优化策略
    if (score < 50) {
      // 低性能设备：激进优化
      optimizations.imageOptimization = true;
      optimizations.codesplitting = true;
      optimizations.caching = true;
      optimizations.virtualScrolling = true;
      
      // 禁用一些动画
      document.documentElement.style.setProperty('--animation-duration', '0.1s');
      document.documentElement.style.setProperty('--animation-enabled', '0');
    } else if (score < 75) {
      // 中等性能设备：适度优化
      optimizations.imageOptimization = true;
      optimizations.codesplitting = true;
      optimizations.caching = true;
      optimizations.virtualScrolling = false;
      
      // 减少动画时长
      document.documentElement.style.setProperty('--animation-duration', '0.2s');
      document.documentElement.style.setProperty('--animation-enabled', '1');
    } else {
      // 高性能设备：保持完整体验
      optimizations.imageOptimization = false;
      optimizations.codeSpli tting = false;
      optimizations.caching = true;
      optimizations.virtualScrolling = false;
      
      // 正常动画
      document.documentElement.style.setProperty('--animation-duration', '0.3s');
      document.documentElement.style.setProperty('--animation-enabled', '1');
    }
    
    setIsOptimized(true);
  }, []);

  // 监控性能指标
  const monitorPerformance = useCallback(() => {
    const checkPerformance = () => {
      const stats = profiler.getStats();
      
      // 计算综合性能分数
      let totalScore = 100;
      
      // 检查渲染性能
      if (stats.function) {
        const avgRenderTime = stats.function.average;
        if (avgRenderTime > 16) totalScore -= 20; // 超过16ms影响60fps
        else if (avgRenderTime > 8) totalScore -= 10;
      }
      
      // 检查资源加载性能
      if (stats.resource) {
        const avgLoadTime = stats.resource.average;
        if (avgLoadTime > 1000) totalScore -= 15;
        else if (avgLoadTime > 500) totalScore -= 8;
      }
      
      // 检查内存使用
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        if (memoryUsage > 0.8) totalScore -= 20;
        else if (memoryUsage > 0.6) totalScore -= 10;
      }
      
      setPerformanceScore(Math.max(0, totalScore));
    };
    
    // 定期检查性能
    const interval = setInterval(checkPerformance, 5000);
    return () => clearInterval(interval);
  }, []);

  // 预加载关键资源
  const preloadCriticalResources = useCallback(() => {
    const criticalImages = [
      '/placeholder-image.svg',
      // 添加其他关键图片
    ];
    
    const criticalScripts = [
      // 添加关键脚本
    ];
    
    // 预加载图片
    criticalImages.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });
    
    // 预加载脚本
    criticalScripts.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = src;
      document.head.appendChild(link);
    });
  }, []);

  // 优化图片加载
  const optimizeImageLoading = useCallback(() => {
    // 设置图片懒加载的全局配置
    if ('loading' in HTMLImageElement.prototype) {
      // 浏览器支持原生懒加载
      const images = document.querySelectorAll('img[data-src]');
      images.forEach(img => {
        const imageElement = img as HTMLImageElement;
        imageElement.loading = 'lazy';
        imageElement.src = imageElement.dataset.src || '';
      });
    }
  }, []);

  // 初始化性能优化
  useEffect(() => {
    const score = detectDevicePerformance();
    setPerformanceScore(score);
    applyOptimizations(score);
    preloadCriticalResources();
    optimizeImageLoading();
    
    const cleanup = monitorPerformance();
    
    return cleanup;
  }, [detectDevicePerformance, applyOptimizations, preloadCriticalResources, optimizeImageLoading, monitorPerformance]);

  // 获取性能报告
  const getPerformanceReport = useCallback((): PerformanceReport => {
    return profiler.exportReport();
  }, []);

  // 清理性能数据
  const clearPerformanceData = useCallback(() => {
    profiler.clear();
  }, []);

  // 手动触发优化
  const triggerOptimization = useCallback(() => {
    const score = detectDevicePerformance();
    applyOptimizations(score);
  }, [detectDevicePerformance, applyOptimizations]);

  return {
    isOptimized,
    performanceScore,
    optimizations: optimizationRef.current,
    getPerformanceReport,
    clearPerformanceData,
    triggerOptimization,
  };
};

// 性能监控Hook
export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    memoryUsage: 0,
    loadTime: 0,
    renderTime: 0,
  });

  const updateMetrics = useCallback(() => {
    // FPS监控
    let fps = 0;
    let lastTime = performance.now();
    let frameCount = 0;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
        
        setMetrics(prev => ({ ...prev, fps }));
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);

    // 内存使用监控
    const updateMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = Math.round(memory.usedJSHeapSize / (1024 * 1024));
        setMetrics(prev => ({ ...prev, memoryUsage }));
      }
    };

    const memoryInterval = setInterval(updateMemory, 2000);
    
    return () => {
      clearInterval(memoryInterval);
    };
  }, []);

  useEffect(() => {
    const cleanup = updateMetrics();
    return cleanup;
  }, [updateMetrics]);

  return metrics;
};

// 自适应性能Hook
export const useAdaptivePerformance = () => {
  const [adaptiveSettings, setAdaptiveSettings] = useState({
    imageQuality: 85,
    animationEnabled: true,
    virtualScrollEnabled: false,
    prefetchEnabled: true,
  });

  const adaptToPerformance = useCallback((performanceScore: number) => {
    setAdaptiveSettings(prev => ({
      ...prev,
      imageQuality: performanceScore > 70 ? 85 : performanceScore > 50 ? 70 : 60,
      animationEnabled: performanceScore > 60,
      virtualScrollEnabled: performanceScore < 50,
      prefetchEnabled: performanceScore > 40,
    }));
  }, []);

  return {
    adaptiveSettings,
    adaptToPerformance,
  };
};
