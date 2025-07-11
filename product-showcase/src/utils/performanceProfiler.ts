// 性能分析工具
export class PerformanceProfiler {
  private static instance: PerformanceProfiler;
  private measurements: Map<string, PerformanceMeasurement[]> = new Map();
  private observers: PerformanceObserver[] = [];
  private isEnabled: boolean = true;

  static getInstance(): PerformanceProfiler {
    if (!this.instance) {
      this.instance = new PerformanceProfiler();
    }
    return this.instance;
  }

  constructor() {
    this.setupObservers();
  }

  // 设置性能观察器
  private setupObservers(): void {
    if (typeof PerformanceObserver === 'undefined') {
      console.warn('PerformanceObserver not supported');
      return;
    }

    try {
      // 监控导航性能
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordMeasurement('navigation', {
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration,
            type: entry.entryType,
            details: entry
          });
        });
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);

      // 监控资源加载
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordMeasurement('resource', {
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration,
            type: entry.entryType,
            details: entry
          });
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

      // 监控用户交互
      const measureObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordMeasurement('measure', {
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration,
            type: entry.entryType,
            details: entry
          });
        });
      });
      measureObserver.observe({ entryTypes: ['measure'] });
      this.observers.push(measureObserver);

    } catch (error) {
      console.warn('Failed to setup performance observers:', error);
    }
  }

  // 记录性能测量
  private recordMeasurement(category: string, measurement: PerformanceMeasurement): void {
    if (!this.isEnabled) return;

    if (!this.measurements.has(category)) {
      this.measurements.set(category, []);
    }

    const measurements = this.measurements.get(category)!;
    measurements.push(measurement);

    // 限制存储的测量数量
    if (measurements.length > 100) {
      measurements.shift();
    }
  }

  // 开始性能测量
  mark(name: string): void {
    if (!this.isEnabled) return;
    
    try {
      performance.mark(`${name}-start`);
    } catch (error) {
      console.warn('Failed to create performance mark:', error);
    }
  }

  // 结束性能测量
  measure(name: string): number {
    if (!this.isEnabled) return 0;

    try {
      const startMark = `${name}-start`;
      const endMark = `${name}-end`;
      
      performance.mark(endMark);
      performance.measure(name, startMark, endMark);
      
      const entries = performance.getEntriesByName(name, 'measure');
      const latestEntry = entries[entries.length - 1];
      
      // 清理标记
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(name);
      
      return latestEntry ? latestEntry.duration : 0;
    } catch (error) {
      console.warn('Failed to measure performance:', error);
      return 0;
    }
  }

  // 测量函数执行时间
  async measureFunction<T>(name: string, fn: () => T | Promise<T>): Promise<{ result: T; duration: number }> {
    if (!this.isEnabled) {
      const result = await fn();
      return { result, duration: 0 };
    }

    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      this.recordMeasurement('function', {
        name,
        startTime,
        duration,
        type: 'function',
        details: { success: true }
      });
      
      return { result, duration };
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordMeasurement('function', {
        name,
        startTime,
        duration,
        type: 'function',
        details: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      });
      
      throw error;
    }
  }

  // 获取性能统计
  getStats(category?: string): PerformanceStats {
    const categories = category ? [category] : Array.from(this.measurements.keys());
    const stats: PerformanceStats = {};

    categories.forEach(cat => {
      const measurements = this.measurements.get(cat) || [];
      if (measurements.length === 0) return;

      const durations = measurements.map(m => m.duration).filter(d => d > 0);
      if (durations.length === 0) return;

      const sorted = durations.sort((a, b) => a - b);
      const sum = durations.reduce((a, b) => a + b, 0);

      stats[cat] = {
        count: measurements.length,
        total: sum,
        average: sum / durations.length,
        median: sorted[Math.floor(sorted.length / 2)],
        min: Math.min(...durations),
        max: Math.max(...durations),
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      };
    });

    return stats;
  }

  // 获取详细测量数据
  getMeasurements(category?: string): PerformanceMeasurement[] {
    if (category) {
      return this.measurements.get(category) || [];
    }

    const allMeasurements: PerformanceMeasurement[] = [];
    this.measurements.forEach(measurements => {
      allMeasurements.push(...measurements);
    });

    return allMeasurements.sort((a, b) => a.startTime - b.startTime);
  }

  // 清理测量数据
  clear(category?: string): void {
    if (category) {
      this.measurements.delete(category);
    } else {
      this.measurements.clear();
    }
  }

  // 启用/禁用性能分析
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // 导出性能报告
  exportReport(): PerformanceReport {
    const stats = this.getStats();
    const measurements = this.getMeasurements();
    
    return {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      stats,
      measurements: measurements.slice(-50), // 只导出最近50条记录
      memoryInfo: this.getMemoryInfo(),
      connectionInfo: this.getConnectionInfo(),
    };
  }

  // 获取内存信息
  private getMemoryInfo(): MemoryInfo | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  }

  // 获取网络连接信息
  private getConnectionInfo(): ConnectionInfo | null {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }
    return null;
  }

  // 清理资源
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.measurements.clear();
  }
}

// 类型定义
export interface PerformanceMeasurement {
  name: string;
  startTime: number;
  duration: number;
  type: string;
  details?: any;
}

export interface PerformanceStats {
  [category: string]: {
    count: number;
    total: number;
    average: number;
    median: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  };
}

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface ConnectionInfo {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export interface PerformanceReport {
  timestamp: number;
  userAgent: string;
  url: string;
  stats: PerformanceStats;
  measurements: PerformanceMeasurement[];
  memoryInfo: MemoryInfo | null;
  connectionInfo: ConnectionInfo | null;
}

// 全局实例
export const profiler = PerformanceProfiler.getInstance();

// 装饰器函数，用于自动测量函数性能
export function measurePerformance(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const measureName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const { result, duration } = await profiler.measureFunction(measureName, () => 
        originalMethod.apply(this, args)
      );
      return result;
    };

    return descriptor;
  };
}
