import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface ResponsiveGridOptions {
  minCardWidth?: number;
  maxColumns?: number;
  gap?: number;
  padding?: number;
}

interface GridCalculation {
  columns: number;
  cardWidth: number;
  availableWidth: number;
  gridClass: string;
  gapClass: string;
}

const DEFAULT_OPTIONS: Required<ResponsiveGridOptions> = {
  minCardWidth: 200,
  maxColumns: 6,
  gap: 16,
  padding: 32
};

export const useRealTimeResponsiveGrid = (
  containerWidth: number,
  panelWidth: number = 0,
  isDetailPanelOpen: boolean = false,
  options: ResponsiveGridOptions = {}
) => {
  const [gridCalculation, setGridCalculation] = useState<GridCalculation>({
    columns: 1,
    cardWidth: 200,
    availableWidth: 0,
    gridClass: 'grid-cols-1',
    gapClass: 'gap-4'
  });

  // 使用 ref 来存储上一次的计算结果，用于平滑过渡
  const previousCalculationRef = useRef<GridCalculation>(gridCalculation);
  const animationFrameRef = useRef<number>();

  // 使用useMemo来稳定config对象
  const config = useMemo(() => {
    return { ...DEFAULT_OPTIONS, ...options };
  }, [
    options.minCardWidth,
    options.maxColumns,
    options.gap,
    options.padding
  ]);

  // 计算网格布局的纯函数
  const calculateGrid = useCallback((
    containerW: number,
    panelW: number,
    isPanelOpen: boolean
  ): GridCalculation => {
    let availableWidth = containerW - config.padding;

    if (isPanelOpen) {
      availableWidth = availableWidth - panelW - 32; // 减去面板宽度和间距
    }

    availableWidth = Math.max(availableWidth, config.minCardWidth);

    const possibleColumns = Math.floor((availableWidth + config.gap) / (config.minCardWidth + config.gap));
    const columns = Math.min(Math.max(1, possibleColumns), config.maxColumns);

    const totalGapWidth = (columns - 1) * config.gap;
    const cardWidth = (availableWidth - totalGapWidth) / columns;

    const gridClass = `grid-cols-${columns}`;
    const gapClass = config.gap <= 12 ? 'gap-3' : config.gap <= 16 ? 'gap-4' : 'gap-6';

    return {
      columns,
      cardWidth,
      availableWidth,
      gridClass,
      gapClass
    };
  }, [config]);

  // 实时更新网格计算，使用 requestAnimationFrame 优化性能
  const updateGridCalculation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const newCalculation = calculateGrid(containerWidth, panelWidth, isDetailPanelOpen);
      
      // 只有当计算结果真正改变时才更新状态
      const previous = previousCalculationRef.current;
      if (
        previous.columns !== newCalculation.columns ||
        Math.abs(previous.cardWidth - newCalculation.cardWidth) > 1 ||
        previous.availableWidth !== newCalculation.availableWidth
      ) {
        previousCalculationRef.current = newCalculation;
        setGridCalculation(newCalculation);

        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 实时网格计算更新:', {
            容器宽度: containerWidth,
            面板宽度: panelWidth,
            面板状态: isDetailPanelOpen,
            列数: newCalculation.columns,
            卡片宽度: newCalculation.cardWidth,
            可用宽度: newCalculation.availableWidth
          });
        }
      }
    });
  }, [containerWidth, panelWidth, isDetailPanelOpen, calculateGrid]);

  // 监听参数变化，实时更新
  useEffect(() => {
    updateGridCalculation();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateGridCalculation]);

  // 获取响应式断点类名，支持平滑过渡
  const getResponsiveGridClass = useCallback(() => {
    const { columns } = gridCalculation;
    
    // 基础网格类，添加过渡效果
    const baseClasses = ['grid', 'transition-all', 'duration-300', 'ease-out'];
    
    // 根据列数设置响应式类名
    if (isDetailPanelOpen) {
      // 详情面板打开时的布局
      if (columns === 1) {
        baseClasses.push('grid-cols-1');
      } else if (columns === 2) {
        baseClasses.push('grid-cols-1 sm:grid-cols-2');
      } else if (columns === 3) {
        baseClasses.push('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3');
      } else if (columns >= 4) {
        baseClasses.push('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4');
      }
    } else {
      // 详情面板关闭时的布局
      if (columns <= 2) {
        baseClasses.push('grid-cols-1 xs:grid-cols-2');
      } else if (columns === 3) {
        baseClasses.push('grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3');
      } else if (columns === 4) {
        baseClasses.push('grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4');
      } else if (columns === 5) {
        baseClasses.push('grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5');
      } else {
        baseClasses.push('grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6');
      }
    }
    
    // 添加间距类，也支持过渡
    baseClasses.push(gridCalculation.gapClass);
    
    return baseClasses.join(' ');
  }, [gridCalculation, isDetailPanelOpen]);

  // 手动刷新计算（用于调试或特殊情况）
  const refreshCalculation = useCallback(() => {
    updateGridCalculation();
  }, [updateGridCalculation]);

  return {
    ...gridCalculation,
    getResponsiveGridClass,
    refreshCalculation,
    // 调试信息
    debug: {
      containerWidth,
      panelWidth,
      isDetailPanelOpen,
      config
    }
  };
};

export default useRealTimeResponsiveGrid;
