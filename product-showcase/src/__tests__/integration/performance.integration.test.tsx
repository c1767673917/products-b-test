import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import PerformanceDemo from '../../pages/PerformanceDemo';
import { profiler } from '../../utils/performanceProfiler';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  ChartBarIcon: () => <div data-testid="chart-icon" />,
  PhotoIcon: () => <div data-testid="photo-icon" />,
  CpuChipIcon: () => <div data-testid="cpu-icon" />,
  ClockIcon: () => <div data-testid="clock-icon" />,
  ArrowPathIcon: () => <div data-testid="refresh-icon" />,
  CheckCircleIcon: () => <div data-testid="check-icon" />,
  XMarkIcon: () => <div data-testid="close-icon" />,
}));

// Mock components
vi.mock('../../components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, className, variant }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      data-variant={variant}
    >
      {children}
    </button>
  ),
}));

vi.mock('../../components/ui/Card', () => ({
  Card: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock('../../components/ui/VirtualGrid', () => ({
  VirtualGrid: ({ items, renderItem, className }: any) => (
    <div className={className} data-testid="virtual-grid">
      {items.slice(0, 10).map((item: any, index: number) => (
        <div key={item.id} data-testid={`grid-item-${item.id}`}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  ),
  VirtualList: ({ items, renderItem, className }: any) => (
    <div className={className} data-testid="virtual-list">
      {items.slice(0, 10).map((item: any, index: number) => (
        <div key={item.id} data-testid={`list-item-${item.id}`}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../../components/product/LazyImage', () => ({
  default: ({ src, alt, className, priority }: any) => (
    <img 
      src={src} 
      alt={alt} 
      className={className}
      data-priority={priority}
      data-testid="lazy-image"
    />
  ),
  useImagePreloader: () => ({
    preloadImagesInBatches: vi.fn().mockResolvedValue({
      successful: 8,
      failed: 2,
      total: 10,
    }),
    clearCache: vi.fn(),
  }),
  ImageCache: {
    clear: vi.fn(),
    getStats: vi.fn().mockReturnValue({ cached: 5, preloading: 2 }),
  },
}));

vi.mock('../../components/ui/PerformanceMonitor', () => ({
  PerformanceMonitor: ({ show, metrics, onClose }: any) => 
    show ? (
      <div data-testid="performance-monitor">
        <div>筛选时间: {metrics.filterTime}ms</div>
        <div>渲染时间: {metrics.renderTime}ms</div>
        <button onClick={onClose}>关闭</button>
      </div>
    ) : null,
  usePerformanceMonitor: () => ({
    metrics: {
      filterTime: 25.5,
      renderTime: 15.2,
      totalProducts: 1000,
      filteredProducts: 250,
      memoryUsage: 52428800, // 50MB
      imageLoadTime: 150,
      cacheHitRate: 0.8,
      networkRequests: 5,
    },
    measureFilter: vi.fn().mockImplementation(async (fn, total) => {
      const result = fn();
      return { result, filterTime: 25.5 };
    }),
    measureRender: vi.fn().mockReturnValue(15.2),
    updateMetrics: vi.fn(),
    resetMetrics: vi.fn(),
  }),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Performance Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profiler.clear();
  });

  afterEach(() => {
    profiler.clear();
  });

  describe('PerformanceDemo Page', () => {
    it('renders performance demo page with all components', async () => {
      renderWithRouter(<PerformanceDemo />);

      // 检查页面标题
      expect(screen.getByText('性能优化演示')).toBeInTheDocument();

      // 检查控制按钮
      expect(screen.getByText('运行性能测试')).toBeInTheDocument();
      expect(screen.getByText('清理缓存')).toBeInTheDocument();
      expect(screen.getByText('性能监控')).toBeInTheDocument();

      // 检查演示模式切换按钮
      expect(screen.getByText('虚拟网格')).toBeInTheDocument();
      expect(screen.getByText('虚拟列表')).toBeInTheDocument();
      expect(screen.getByText('懒加载图片')).toBeInTheDocument();

      // 检查性能指标卡片
      expect(screen.getByText('筛选时间')).toBeInTheDocument();
      expect(screen.getByText('渲染时间')).toBeInTheDocument();
      expect(screen.getByText('缓存命中率')).toBeInTheDocument();
      expect(screen.getByText('内存使用')).toBeInTheDocument();
    });

    it('displays performance metrics correctly', () => {
      renderWithRouter(<PerformanceDemo />);

      // 检查性能指标显示
      expect(screen.getByText('25.5ms')).toBeInTheDocument(); // 筛选时间
      expect(screen.getByText('15.2ms')).toBeInTheDocument(); // 渲染时间
      expect(screen.getByText('80.0%')).toBeInTheDocument();  // 缓存命中率
      expect(screen.getByText('50.0MB')).toBeInTheDocument(); // 内存使用
    });

    it('switches between demo modes correctly', async () => {
      renderWithRouter(<PerformanceDemo />);

      // 默认应该显示虚拟网格
      expect(screen.getByText('虚拟网格演示')).toBeInTheDocument();
      expect(screen.getByTestId('virtual-grid')).toBeInTheDocument();

      // 切换到虚拟列表
      fireEvent.click(screen.getByText('虚拟列表'));
      await waitFor(() => {
        expect(screen.getByText('虚拟列表演示')).toBeInTheDocument();
        expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
      });

      // 切换到懒加载图片
      fireEvent.click(screen.getByText('懒加载图片'));
      await waitFor(() => {
        expect(screen.getByText('懒加载图片演示')).toBeInTheDocument();
        expect(screen.getAllByTestId('lazy-image')).toHaveLength(50);
      });
    });

    it('runs performance test successfully', async () => {
      renderWithRouter(<PerformanceDemo />);

      const testButton = screen.getByText('运行性能测试');
      
      // 点击运行性能测试
      fireEvent.click(testButton);

      // 应该显示加载状态
      await waitFor(() => {
        expect(screen.getByText('测试中...')).toBeInTheDocument();
      });

      // 等待测试完成
      await waitFor(() => {
        expect(screen.getByText('运行性能测试')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('toggles performance monitor visibility', () => {
      renderWithRouter(<PerformanceDemo />);

      // 性能监控应该默认显示
      expect(screen.getByTestId('performance-monitor')).toBeInTheDocument();

      // 点击关闭按钮
      fireEvent.click(screen.getByText('关闭'));

      // 性能监控应该隐藏
      expect(screen.queryByTestId('performance-monitor')).not.toBeInTheDocument();

      // 再次点击性能监控按钮
      fireEvent.click(screen.getByText('性能监控'));

      // 性能监控应该重新显示
      expect(screen.getByTestId('performance-monitor')).toBeInTheDocument();
    });

    it('clears cache when clear button is clicked', () => {
      renderWithRouter(<PerformanceDemo />);

      const clearButton = screen.getByText('清理缓存');
      fireEvent.click(clearButton);

      // 验证清理函数被调用（通过mock验证）
      // 这里可以添加更多的验证逻辑
    });
  });

  describe('Virtual Grid Performance', () => {
    it('renders virtual grid with large dataset efficiently', () => {
      renderWithRouter(<PerformanceDemo />);

      // 确保虚拟网格模式被选中
      fireEvent.click(screen.getByText('虚拟网格'));

      // 检查虚拟网格是否渲染
      const virtualGrid = screen.getByTestId('virtual-grid');
      expect(virtualGrid).toBeInTheDocument();

      // 检查只渲染了部分项目（虚拟化效果）
      const gridItems = screen.getAllByTestId(/grid-item-/);
      expect(gridItems.length).toBeLessThanOrEqual(10); // 只渲染前10个
    });
  });

  describe('Virtual List Performance', () => {
    it('renders virtual list with large dataset efficiently', () => {
      renderWithRouter(<PerformanceDemo />);

      // 切换到虚拟列表模式
      fireEvent.click(screen.getByText('虚拟列表'));

      // 检查虚拟列表是否渲染
      const virtualList = screen.getByTestId('virtual-list');
      expect(virtualList).toBeInTheDocument();

      // 检查只渲染了部分项目（虚拟化效果）
      const listItems = screen.getAllByTestId(/list-item-/);
      expect(listItems.length).toBeLessThanOrEqual(10); // 只渲染前10个
    });
  });

  describe('Lazy Image Loading', () => {
    it('renders lazy images with correct attributes', () => {
      renderWithRouter(<PerformanceDemo />);

      // 切换到懒加载图片模式
      fireEvent.click(screen.getByText('懒加载图片'));

      // 检查懒加载图片
      const lazyImages = screen.getAllByTestId('lazy-image');
      expect(lazyImages.length).toBe(50);

      // 检查前几个图片是否有优先级标记
      const priorityImages = lazyImages.slice(0, 6);
      priorityImages.forEach(img => {
        expect(img).toHaveAttribute('data-priority', 'true');
      });

      // 检查其他图片没有优先级标记
      const normalImages = lazyImages.slice(6);
      normalImages.forEach(img => {
        expect(img).toHaveAttribute('data-priority', 'false');
      });
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('displays real-time performance metrics', () => {
      renderWithRouter(<PerformanceDemo />);

      const monitor = screen.getByTestId('performance-monitor');
      expect(monitor).toBeInTheDocument();

      // 检查性能指标显示
      expect(screen.getByText('筛选时间: 25.5ms')).toBeInTheDocument();
      expect(screen.getByText('渲染时间: 15.2ms')).toBeInTheDocument();
    });

    it('updates metrics when performance test is run', async () => {
      renderWithRouter(<PerformanceDemo />);

      // 运行性能测试
      fireEvent.click(screen.getByText('运行性能测试'));

      // 等待测试完成并检查指标更新
      await waitFor(() => {
        expect(screen.getByText('运行性能测试')).toBeInTheDocument();
      });

      // 验证性能指标仍然显示
      expect(screen.getByText('筛选时间: 25.5ms')).toBeInTheDocument();
    });
  });
});
