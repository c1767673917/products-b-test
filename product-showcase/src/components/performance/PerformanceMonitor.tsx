import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  isLowPerformance: boolean;
  memoryUsage?: number;
  animationCount: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  showOverlay?: boolean;
  onPerformanceChange?: (metrics: PerformanceMetrics) => void;
  threshold?: {
    lowFps: number;
    highFrameTime: number;
  };
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = process.env.NODE_ENV === 'development',
  showOverlay = false,
  onPerformanceChange,
  threshold = { lowFps: 30, highFrameTime: 33 }
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    isLowPerformance: false,
    animationCount: 0
  });
  
  const [showDetails, setShowDetails] = useState(false);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const animationId = useRef<number>();
  const frameTimeHistory = useRef<number[]>([]);

  // 监测动画性能
  useEffect(() => {
    if (!enabled) return;

    const measurePerformance = (currentTime: number) => {
      frameCount.current++;
      const deltaTime = currentTime - lastTime.current;
      
      // 记录帧时间历史
      frameTimeHistory.current.push(deltaTime);
      if (frameTimeHistory.current.length > 60) {
        frameTimeHistory.current.shift();
      }

      // 每秒更新一次FPS计算
      if (deltaTime >= 1000) {
        const fps = Math.round((frameCount.current * 1000) / deltaTime);
        const avgFrameTime = frameTimeHistory.current.reduce((a, b) => a + b, 0) / frameTimeHistory.current.length;
        const isLowPerformance = fps < threshold.lowFps || avgFrameTime > threshold.highFrameTime;

        // 获取内存使用情况（如果可用）
        let memoryUsage;
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        }

        // 计算当前活动的动画数量
        const animationCount = document.querySelectorAll('[data-framer-motion]').length;

        const newMetrics: PerformanceMetrics = {
          fps,
          frameTime: avgFrameTime,
          isLowPerformance,
          memoryUsage,
          animationCount
        };

        setMetrics(newMetrics);
        onPerformanceChange?.(newMetrics);

        // 重置计数器
        frameCount.current = 0;
        lastTime.current = currentTime;
      }

      animationId.current = requestAnimationFrame(measurePerformance);
    };

    animationId.current = requestAnimationFrame(measurePerformance);

    return () => {
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
      }
    };
  }, [enabled, threshold, onPerformanceChange]);

  // 性能警告
  useEffect(() => {
    if (metrics.isLowPerformance && enabled) {
      // 性能警告已移除，可以在需要时重新启用
    }
  }, [metrics.isLowPerformance, enabled]);

  if (!enabled || !showOverlay) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] font-mono text-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "bg-black/80 text-white p-3 rounded-lg backdrop-blur-sm cursor-pointer select-none",
          metrics.isLowPerformance && "bg-red-600/80"
        )}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            metrics.fps >= 50 ? "bg-green-400" :
            metrics.fps >= 30 ? "bg-yellow-400" : "bg-red-400"
          )} />
          <span>{metrics.fps} FPS</span>
          {metrics.isLowPerformance && (
            <span className="text-red-300 animate-pulse">⚠️</span>
          )}
        </div>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 pt-2 border-t border-white/20 space-y-1"
            >
              <div>Frame: {metrics.frameTime.toFixed(1)}ms</div>
              <div>Animations: {metrics.animationCount}</div>
              {metrics.memoryUsage && (
                <div>Memory: {metrics.memoryUsage}MB</div>
              )}
              <div className="text-xs text-gray-300 mt-2">
                Click to {showDetails ? 'hide' : 'show'} details
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// 性能优化建议Hook
export const usePerformanceOptimization = () => {
  const [shouldReduceAnimations, setShouldReduceAnimations] = useState(false);
  const [performanceLevel, setPerformanceLevel] = useState<'high' | 'medium' | 'low'>('high');

  const handlePerformanceChange = (metrics: PerformanceMetrics) => {
    if (metrics.fps < 20 || metrics.frameTime > 50) {
      setPerformanceLevel('low');
      setShouldReduceAnimations(true);
    } else if (metrics.fps < 40 || metrics.frameTime > 25) {
      setPerformanceLevel('medium');
      setShouldReduceAnimations(false);
    } else {
      setPerformanceLevel('high');
      setShouldReduceAnimations(false);
    }
  };

  // 根据性能自动调整动画配置
  const getOptimizedAnimationConfig = (baseDuration: number = 0.3) => {
    switch (performanceLevel) {
      case 'low':
        return {
          duration: baseDuration * 0.5, // 减少50%动画时间
          ease: 'linear', // 使用最简单的缓动
          staggerDelay: 0.02 // 减少交错延迟
        };
      case 'medium':
        return {
          duration: baseDuration * 0.7, // 减少30%动画时间
          ease: 'easeOut',
          staggerDelay: 0.03
        };
      case 'high':
      default:
        return {
          duration: baseDuration,
          ease: [0.25, 0.46, 0.45, 0.94], // 优化的贝塞尔曲线
          staggerDelay: 0.05
        };
    }
  };

  return {
    shouldReduceAnimations,
    performanceLevel,
    getOptimizedAnimationConfig,
    handlePerformanceChange
  };
};

export default PerformanceMonitor;