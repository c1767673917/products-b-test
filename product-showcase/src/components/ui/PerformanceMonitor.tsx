import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChartBarIcon, XMarkIcon, CpuChipIcon, ClockIcon } from '@heroicons/react/24/outline';

interface PerformanceMetrics {
  filterTime: number;
  renderTime: number;
  totalProducts: number;
  filteredProducts: number;
  memoryUsage?: number;
  imageLoadTime?: number;
  cacheHitRate?: number;
  networkRequests?: number;
  fps?: number;
  bundleSize?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  firstInputDelay?: number;
}

export interface PerformanceMonitorProps {
  metrics: PerformanceMetrics;
  show?: boolean;
  onClose?: () => void;
  realTime?: boolean;
  compact?: boolean;
}

// Web Vitals 监控
class WebVitalsMonitor {
  private static instance: WebVitalsMonitor;
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];

  static getInstance(): WebVitalsMonitor {
    if (!this.instance) {
      this.instance = new WebVitalsMonitor();
    }
    return this.instance;
  }

  startMonitoring(): void {
    this.monitorFCP();
    this.monitorLCP();
    this.monitorCLS();
    this.monitorFID();
    this.monitorMemory();
  }

  private monitorFCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          this.metrics.firstContentfulPaint = fcpEntry.startTime;
        }
      });
      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    } catch (e) {
      console.warn('FCP monitoring not supported');
    }
  }

  private monitorLCP(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.largestContentfulPaint = lastEntry.startTime;
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (e) {
      console.warn('LCP monitoring not supported');
    }
  }

  private monitorCLS(): void {
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            this.metrics.cumulativeLayoutShift = clsValue;
          }
        }
      });
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (e) {
      console.warn('CLS monitoring not supported');
    }
  }

  private monitorFID(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.metrics.firstInputDelay = (entry as any).processingStart - entry.startTime;
        }
      });
      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    } catch (e) {
      console.warn('FID monitoring not supported');
    }
  }

  private monitorMemory(): void {
    if ('memory' in performance) {
      const updateMemory = () => {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize;
      };
      updateMemory();
      setInterval(updateMemory, 5000); // 每5秒更新一次
    }
  }

  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  metrics,
  show = false,
  onClose,
  realTime = false,
  compact = false
}) => {
  const [isVisible, setIsVisible] = useState(show);
  const [webVitals, setWebVitals] = useState<Partial<PerformanceMetrics>>({});
  const webVitalsRef = useRef<WebVitalsMonitor>();

  useEffect(() => {
    setIsVisible(show);
  }, [show]);

  useEffect(() => {
    if (realTime && isVisible) {
      webVitalsRef.current = WebVitalsMonitor.getInstance();
      webVitalsRef.current.startMonitoring();

      const interval = setInterval(() => {
        setWebVitals(webVitalsRef.current!.getMetrics());
      }, 1000);

      return () => {
        clearInterval(interval);
        webVitalsRef.current?.cleanup();
      };
    }
  }, [realTime, isVisible]);

  if (!isVisible) return null;

  const combinedMetrics = { ...metrics, ...webVitals };

  const formatTime = (time: number) => {
    if (time < 1) return `${(time * 1000).toFixed(1)}μs`;
    if (time < 1000) return `${time.toFixed(1)}ms`;
    return `${(time / 1000).toFixed(2)}s`;
  };

  const formatMemory = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  };

  const formatPercentage = (value?: number) => {
    if (value === undefined) return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
  };

  const getPerformanceColor = (time: number, thresholds = [50, 200]) => {
    if (time < thresholds[0]) return 'text-green-600';
    if (time < thresholds[1]) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getWebVitalColor = (metric: string, value: number) => {
    const thresholds = {
      fcp: [1800, 3000],
      lcp: [2500, 4000],
      cls: [0.1, 0.25],
      fid: [100, 300]
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'text-gray-600';

    if (value <= threshold[0]) return 'text-green-600';
    if (value <= threshold[1]) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          className={`fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 ${
            compact ? 'min-w-[250px]' : 'min-w-[350px]'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <ChartBarIcon className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900">
                性能监控 {realTime && <span className="text-xs text-green-500">●</span>}
              </h3>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 性能指标标签页 */}
          <div className="mb-4">
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button className="flex-1 px-2 py-1 text-xs font-medium bg-white rounded shadow-sm text-blue-600">
                基础
              </button>
              {realTime && (
                <button className="flex-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900">
                  Web Vitals
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2 text-sm max-h-64 overflow-y-auto">
            {/* 基础性能指标 */}
            <div className="flex justify-between">
              <span className="text-gray-600 flex items-center">
                <ClockIcon className="w-3 h-3 mr-1" />
                筛选时间:
              </span>
              <span className={getPerformanceColor(combinedMetrics.filterTime || 0)}>
                {formatTime(combinedMetrics.filterTime || 0)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600 flex items-center">
                <CpuChipIcon className="w-3 h-3 mr-1" />
                渲染时间:
              </span>
              <span className={getPerformanceColor(combinedMetrics.renderTime || 0)}>
                {formatTime(combinedMetrics.renderTime || 0)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">产品数量:</span>
              <span className="text-gray-900">
                {combinedMetrics.filteredProducts || 0} / {combinedMetrics.totalProducts || 0}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">筛选率:</span>
              <span className="text-gray-900">
                {combinedMetrics.totalProducts ?
                  (((combinedMetrics.filteredProducts || 0) / combinedMetrics.totalProducts) * 100).toFixed(1) : 0}%
              </span>
            </div>

            {/* 图片相关指标 */}
            {combinedMetrics.imageLoadTime && (
              <div className="flex justify-between">
                <span className="text-gray-600">图片加载:</span>
                <span className={getPerformanceColor(combinedMetrics.imageLoadTime)}>
                  {formatTime(combinedMetrics.imageLoadTime)}
                </span>
              </div>
            )}

            {combinedMetrics.cacheHitRate !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">缓存命中:</span>
                <span className="text-green-600">
                  {formatPercentage(combinedMetrics.cacheHitRate)}
                </span>
              </div>
            )}

            {combinedMetrics.memoryUsage && (
              <div className="flex justify-between">
                <span className="text-gray-600">内存使用:</span>
                <span className="text-gray-900">
                  {formatMemory(combinedMetrics.memoryUsage)}
                </span>
              </div>
            )}

            {/* Web Vitals 指标 */}
            {realTime && (
              <>
                {combinedMetrics.firstContentfulPaint && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">FCP:</span>
                    <span className={getWebVitalColor('fcp', combinedMetrics.firstContentfulPaint)}>
                      {formatTime(combinedMetrics.firstContentfulPaint)}
                    </span>
                  </div>
                )}

                {combinedMetrics.largestContentfulPaint && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">LCP:</span>
                    <span className={getWebVitalColor('lcp', combinedMetrics.largestContentfulPaint)}>
                      {formatTime(combinedMetrics.largestContentfulPaint)}
                    </span>
                  </div>
                )}

                {combinedMetrics.cumulativeLayoutShift !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">CLS:</span>
                    <span className={getWebVitalColor('cls', combinedMetrics.cumulativeLayoutShift)}>
                      {combinedMetrics.cumulativeLayoutShift.toFixed(3)}
                    </span>
                  </div>
                )}

                {combinedMetrics.firstInputDelay && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">FID:</span>
                    <span className={getWebVitalColor('fid', combinedMetrics.firstInputDelay)}>
                      {formatTime(combinedMetrics.firstInputDelay)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 性能指示器 */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="space-y-2">
              {/* 总体性能 */}
              <div className="flex items-center space-x-2">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1">总体性能</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      className={`h-2 rounded-full ${
                        (combinedMetrics.filterTime || 0) + (combinedMetrics.renderTime || 0) < 100
                          ? 'bg-green-500'
                          : (combinedMetrics.filterTime || 0) + (combinedMetrics.renderTime || 0) < 300
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, (((combinedMetrics.filterTime || 0) + (combinedMetrics.renderTime || 0)) / 500) * 100)}%`
                      }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {(combinedMetrics.filterTime || 0) + (combinedMetrics.renderTime || 0) < 100 ? '优秀' :
                   (combinedMetrics.filterTime || 0) + (combinedMetrics.renderTime || 0) < 300 ? '良好' : '需优化'}
                </div>
              </div>

              {/* Web Vitals 总分 */}
              {realTime && (
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">Web Vitals</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        className="h-2 rounded-full bg-gradient-to-r from-green-500 to-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: '75%' }} // 示例值，实际应根据Web Vitals计算
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-green-600">良好</div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// 性能监控Hook
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    filterTime: 0,
    renderTime: 0,
    totalProducts: 0,
    filteredProducts: 0
  });
  const [history, setHistory] = useState<PerformanceMetrics[]>([]);
  const networkRequestsRef = useRef(0);
  const imageLoadTimesRef = useRef<number[]>([]);

  const startTiming = useCallback(() => {
    return performance.now();
  }, []);

  const endTiming = useCallback((startTime: number) => {
    return performance.now() - startTime;
  }, []);

  const updateMetrics = useCallback((newMetrics: Partial<PerformanceMetrics>) => {
    setMetrics(prev => {
      const updated = { ...prev, ...newMetrics };

      // 保存历史记录（最多保留50条）
      setHistory(prevHistory => {
        const newHistory = [...prevHistory, updated];
        return newHistory.slice(-50);
      });

      return updated;
    });
  }, []);

  const measureFilter = useCallback(async <T,>(
    filterFn: () => T,
    totalProducts: number
  ): Promise<{ result: T; filterTime: number }> => {
    const startTime = startTiming();
    const result = filterFn();
    const filterTime = endTiming(startTime);

    updateMetrics({
      filterTime,
      totalProducts,
      filteredProducts: Array.isArray(result) ? result.length : 0
    });

    return { result, filterTime };
  }, [startTiming, endTiming, updateMetrics]);

  const measureRender = useCallback((renderFn: () => void): number => {
    const startTime = startTiming();
    renderFn();
    const renderTime = endTiming(startTime);

    updateMetrics({ renderTime });
    return renderTime;
  }, [startTiming, endTiming, updateMetrics]);

  const measureImageLoad = useCallback((loadTime: number) => {
    imageLoadTimesRef.current.push(loadTime);
    const avgImageLoadTime = imageLoadTimesRef.current.reduce((a, b) => a + b, 0) / imageLoadTimesRef.current.length;

    updateMetrics({ imageLoadTime: avgImageLoadTime });
  }, [updateMetrics]);

  const trackNetworkRequest = useCallback(() => {
    networkRequestsRef.current += 1;
    updateMetrics({ networkRequests: networkRequestsRef.current });
  }, [updateMetrics]);

  const calculateCacheHitRate = useCallback((hits: number, total: number) => {
    const hitRate = total > 0 ? hits / total : 0;
    updateMetrics({ cacheHitRate: hitRate });
  }, [updateMetrics]);

  const getAverageMetrics = useCallback(() => {
    if (history.length === 0) return metrics;

    const avg = history.reduce((acc, curr) => ({
      filterTime: acc.filterTime + curr.filterTime,
      renderTime: acc.renderTime + curr.renderTime,
      totalProducts: curr.totalProducts, // 使用最新值
      filteredProducts: curr.filteredProducts, // 使用最新值
      memoryUsage: curr.memoryUsage || acc.memoryUsage,
      imageLoadTime: acc.imageLoadTime + (curr.imageLoadTime || 0),
      cacheHitRate: curr.cacheHitRate || acc.cacheHitRate,
      networkRequests: curr.networkRequests || acc.networkRequests,
    }), {
      filterTime: 0,
      renderTime: 0,
      totalProducts: 0,
      filteredProducts: 0,
      memoryUsage: 0,
      imageLoadTime: 0,
      cacheHitRate: 0,
      networkRequests: 0,
    });

    const count = history.length;
    return {
      ...avg,
      filterTime: avg.filterTime / count,
      renderTime: avg.renderTime / count,
      imageLoadTime: avg.imageLoadTime / count,
    };
  }, [history, metrics]);

  const resetMetrics = useCallback(() => {
    setMetrics({
      filterTime: 0,
      renderTime: 0,
      totalProducts: 0,
      filteredProducts: 0
    });
    setHistory([]);
    networkRequestsRef.current = 0;
    imageLoadTimesRef.current = [];
  }, []);

  return {
    metrics,
    history,
    updateMetrics,
    measureFilter,
    measureRender,
    measureImageLoad,
    trackNetworkRequest,
    calculateCacheHitRate,
    getAverageMetrics,
    resetMetrics,
    startTiming,
    endTiming
  };
};
