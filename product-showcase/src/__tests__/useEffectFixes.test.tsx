import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useResponsiveGrid } from '../hooks/useResponsiveGrid';
import { useContainerDimensions } from '../hooks/useContainerDimensions';
import { usePerformanceOptimization } from '../hooks/usePerformanceOptimization';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock window methods
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

Object.defineProperty(window, 'addEventListener', {
  writable: true,
  configurable: true,
  value: vi.fn(),
});

Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  configurable: true,
  value: vi.fn(),
});

describe('useEffect修复验证', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useResponsiveGrid', () => {
    it('应该正确计算网格布局而不导致无限重渲染', () => {
      const { result, rerender } = renderHook(
        ({ containerWidth, panelWidth, isDetailPanelOpen }) =>
          useResponsiveGrid(containerWidth, panelWidth, isDetailPanelOpen),
        {
          initialProps: {
            containerWidth: 1000,
            panelWidth: 400,
            isDetailPanelOpen: false,
          },
        }
      );

      const initialResult = result.current;

      // 重新渲染多次，确保结果稳定
      rerender({
        containerWidth: 1000,
        panelWidth: 400,
        isDetailPanelOpen: false,
      });

      expect(result.current.columns).toBe(initialResult.columns);
      expect(result.current.cardWidth).toBe(initialResult.cardWidth);
    });

    it('应该在面板状态变化时正确更新布局', () => {
      const { result, rerender } = renderHook(
        ({ containerWidth, panelWidth, isDetailPanelOpen }) =>
          useResponsiveGrid(containerWidth, panelWidth, isDetailPanelOpen),
        {
          initialProps: {
            containerWidth: 1000,
            panelWidth: 400,
            isDetailPanelOpen: false,
          },
        }
      );

      const closedPanelResult = result.current;

      // 打开面板
      rerender({
        containerWidth: 1000,
        panelWidth: 400,
        isDetailPanelOpen: true,
      });

      const openPanelResult = result.current;

      // 面板打开时应该有更少的列数
      expect(openPanelResult.columns).toBeLessThanOrEqual(closedPanelResult.columns);
    });
  });

  describe('useContainerDimensions', () => {
    it('应该正确初始化容器尺寸', () => {
      const { result } = renderHook(() => useContainerDimensions());

      expect(result.current.dimensions).toEqual({
        width: 0,
        height: 0,
      });
      expect(result.current.containerRef).toBeDefined();
      expect(typeof result.current.updateDimensions).toBe('function');
    });

    it('应该提供稳定的updateDimensions函数', () => {
      const { result, rerender } = renderHook(() => useContainerDimensions());

      const firstUpdateDimensions = result.current.updateDimensions;

      rerender();

      const secondUpdateDimensions = result.current.updateDimensions;

      // updateDimensions函数应该保持稳定
      expect(firstUpdateDimensions).toBe(secondUpdateDimensions);
    });
  });

  describe('usePerformanceOptimization', () => {
    it('应该正确初始化性能优化状态', () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      expect(typeof result.current.isOptimized).toBe('boolean');
      expect(typeof result.current.performanceScore).toBe('number');
      expect(typeof result.current.getPerformanceReport).toBe('function');
    });

    it('应该提供稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => usePerformanceOptimization());

      const firstGetPerformanceReport = result.current.getPerformanceReport;

      rerender();

      const secondGetPerformanceReport = result.current.getPerformanceReport;

      // 函数引用应该保持稳定
      expect(firstGetPerformanceReport).toBe(secondGetPerformanceReport);
    });
  });
});

describe('依赖数组稳定性测试', () => {
  it('useResponsiveGrid的config对象应该保持稳定', () => {
    const options = { minCardWidth: 200, maxColumns: 6 };
    
    const { rerender } = renderHook(
      ({ containerWidth }) => useResponsiveGrid(containerWidth, 0, false, options),
      { initialProps: { containerWidth: 1000 } }
    );

    // 多次重新渲染，确保没有无限循环
    for (let i = 0; i < 10; i++) {
      rerender({ containerWidth: 1000 });
    }

    // 如果到这里没有超时，说明没有无限循环
    expect(true).toBe(true);
  });

  it('应该处理options对象的变化', () => {
    const { result, rerender } = renderHook(
      ({ options }) => useResponsiveGrid(1000, 0, false, options),
      { 
        initialProps: { 
          options: { minCardWidth: 200, maxColumns: 6 } 
        } 
      }
    );

    const initialColumns = result.current.columns;

    // 改变options
    rerender({ 
      options: { minCardWidth: 300, maxColumns: 4 } 
    });

    // 应该重新计算布局
    expect(result.current.columns).toBeLessThanOrEqual(4);
  });
});
