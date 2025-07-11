import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PerformanceMonitor, usePerformanceMonitor } from '../PerformanceMonitor';

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
  XMarkIcon: () => <div data-testid="close-icon" />,
  CpuChipIcon: () => <div data-testid="cpu-icon" />,
  ClockIcon: () => <div data-testid="clock-icon" />,
}));

describe('PerformanceMonitor', () => {
  const mockMetrics = {
    filterTime: 50,
    renderTime: 30,
    totalProducts: 100,
    filteredProducts: 25,
    memoryUsage: 50 * 1024 * 1024, // 50MB
    imageLoadTime: 200,
    cacheHitRate: 0.8,
    networkRequests: 5,
  };

  it('renders performance metrics when visible', () => {
    render(
      <PerformanceMonitor
        metrics={mockMetrics}
        show={true}
      />
    );

    expect(screen.getByText('性能监控')).toBeInTheDocument();
    expect(screen.getByText('50.0ms')).toBeInTheDocument();
    expect(screen.getByText('30.0ms')).toBeInTheDocument();
    expect(screen.getByText('25 / 100')).toBeInTheDocument();
    expect(screen.getByText('25.0%')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(
      <PerformanceMonitor
        metrics={mockMetrics}
        show={false}
      />
    );

    expect(screen.queryByText('性能监控')).not.toBeInTheDocument();
  });

  it('shows close button when onClose is provided', () => {
    const onClose = vi.fn();
    
    render(
      <PerformanceMonitor
        metrics={mockMetrics}
        show={true}
        onClose={onClose}
      />
    );

    const closeButton = screen.getByTestId('close-icon').parentElement;
    expect(closeButton).toBeInTheDocument();
    
    fireEvent.click(closeButton!);
    expect(onClose).toHaveBeenCalled();
  });

  it('displays memory usage when available', () => {
    render(
      <PerformanceMonitor
        metrics={mockMetrics}
        show={true}
      />
    );

    expect(screen.getByText('50.0MB')).toBeInTheDocument();
  });

  it('shows image load time when available', () => {
    render(
      <PerformanceMonitor
        metrics={mockMetrics}
        show={true}
      />
    );

    expect(screen.getByText('200.0ms')).toBeInTheDocument();
  });

  it('displays cache hit rate', () => {
    render(
      <PerformanceMonitor
        metrics={mockMetrics}
        show={true}
      />
    );

    expect(screen.getByText('80.0%')).toBeInTheDocument();
  });

  it('shows correct performance color coding', () => {
    const fastMetrics = { ...mockMetrics, filterTime: 20, renderTime: 10 };
    
    render(
      <PerformanceMonitor
        metrics={fastMetrics}
        show={true}
      />
    );

    expect(screen.getByText('优秀')).toBeInTheDocument();
  });

  it('renders in compact mode', () => {
    render(
      <PerformanceMonitor
        metrics={mockMetrics}
        show={true}
        compact={true}
      />
    );

    const container = screen.getByText('性能监控').closest('div');
    expect(container).toHaveClass('min-w-[250px]');
  });

  it('shows real-time indicator when enabled', () => {
    render(
      <PerformanceMonitor
        metrics={mockMetrics}
        show={true}
        realTime={true}
      />
    );

    expect(screen.getByText('●')).toBeInTheDocument();
  });
});

describe('usePerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock performance.now
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1050);
  });

  it('initializes with default metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    
    expect(result.current.metrics).toEqual({
      filterTime: 0,
      renderTime: 0,
      totalProducts: 0,
      filteredProducts: 0,
    });
  });

  it('measures filter performance', async () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    
    const mockFilterFn = vi.fn(() => ['item1', 'item2']);
    
    await act(async () => {
      const { result: filterResult, filterTime } = await result.current.measureFilter(
        mockFilterFn,
        100
      );
      
      expect(filterResult).toEqual(['item1', 'item2']);
      expect(filterTime).toBe(50); // 1050 - 1000
      expect(result.current.metrics.filterTime).toBe(50);
      expect(result.current.metrics.totalProducts).toBe(100);
      expect(result.current.metrics.filteredProducts).toBe(2);
    });
  });

  it('measures render performance', () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    
    const mockRenderFn = vi.fn();
    
    act(() => {
      const renderTime = result.current.measureRender(mockRenderFn);
      
      expect(renderTime).toBe(50);
      expect(result.current.metrics.renderTime).toBe(50);
      expect(mockRenderFn).toHaveBeenCalled();
    });
  });

  it('tracks image load times', () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    
    act(() => {
      result.current.measureImageLoad(100);
      result.current.measureImageLoad(200);
    });
    
    expect(result.current.metrics.imageLoadTime).toBe(150); // average
  });

  it('tracks network requests', () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    
    act(() => {
      result.current.trackNetworkRequest();
      result.current.trackNetworkRequest();
    });
    
    expect(result.current.metrics.networkRequests).toBe(2);
  });

  it('calculates cache hit rate', () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    
    act(() => {
      result.current.calculateCacheHitRate(8, 10);
    });
    
    expect(result.current.metrics.cacheHitRate).toBe(0.8);
  });

  it('maintains performance history', async () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    
    await act(async () => {
      await result.current.measureFilter(() => ['item1'], 10);
      await result.current.measureFilter(() => ['item2'], 10);
    });
    
    expect(result.current.history).toHaveLength(2);
  });

  it('calculates average metrics from history', async () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    
    // Mock different performance.now values for each call
    vi.spyOn(performance, 'now')
      .mockReturnValueOnce(1000).mockReturnValueOnce(1100) // 100ms
      .mockReturnValueOnce(2000).mockReturnValueOnce(2050); // 50ms
    
    await act(async () => {
      await result.current.measureFilter(() => ['item1'], 10);
      await result.current.measureFilter(() => ['item2'], 10);
    });
    
    const avgMetrics = result.current.getAverageMetrics();
    expect(avgMetrics.filterTime).toBe(75); // (100 + 50) / 2
  });

  it('resets metrics and history', async () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    
    await act(async () => {
      await result.current.measureFilter(() => ['item1'], 10);
    });
    
    expect(result.current.history).toHaveLength(1);
    
    act(() => {
      result.current.resetMetrics();
    });
    
    expect(result.current.metrics.filterTime).toBe(0);
    expect(result.current.history).toHaveLength(0);
  });

  it('updates metrics correctly', () => {
    const { result } = renderHook(() => usePerformanceMonitor());
    
    act(() => {
      result.current.updateMetrics({
        memoryUsage: 1024 * 1024,
        cacheHitRate: 0.9,
      });
    });
    
    expect(result.current.metrics.memoryUsage).toBe(1024 * 1024);
    expect(result.current.metrics.cacheHitRate).toBe(0.9);
  });
});
