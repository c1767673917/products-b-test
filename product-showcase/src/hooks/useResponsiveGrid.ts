import { useState, useEffect, useCallback, useMemo } from 'react';

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

export const useResponsiveGrid = (
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

  // 使用useMemo来稳定config对象，避免每次重新创建
  const config = useMemo(() => {
    const result = { ...DEFAULT_OPTIONS, ...options };
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 useResponsiveGrid config 重新计算:', result);
    }
    return result;
  }, [
    options.minCardWidth,
    options.maxColumns,
    options.gap,
    options.padding
  ]); // 使用具体的属性作为依赖，而不是整个options对象

  // 计算网格布局的纯函数，用于手动刷新
  const calculateGrid = useCallback(() => {
    let availableWidth = containerWidth - config.padding;

    if (isDetailPanelOpen) {
      availableWidth = availableWidth - panelWidth;
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
  }, [containerWidth, panelWidth, isDetailPanelOpen, config]);

  useEffect(() => {
    // 添加调试信息（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 useResponsiveGrid useEffect 触发:', {
        containerWidth,
        panelWidth,
        isDetailPanelOpen,
        config
      });
    }

    // 直接在useEffect中计算，避免函数依赖
    let availableWidth = containerWidth - config.padding;

    if (isDetailPanelOpen) {
      availableWidth = availableWidth - panelWidth;
    }

    availableWidth = Math.max(availableWidth, config.minCardWidth);

    const possibleColumns = Math.floor((availableWidth + config.gap) / (config.minCardWidth + config.gap));
    const columns = Math.min(Math.max(1, possibleColumns), config.maxColumns);

    const totalGapWidth = (columns - 1) * config.gap;
    const cardWidth = (availableWidth - totalGapWidth) / columns;

    const gridClass = `grid-cols-${columns}`;
    const gapClass = config.gap <= 12 ? 'gap-3' : config.gap <= 16 ? 'gap-4' : 'gap-6';

    const newCalculation = {
      columns,
      cardWidth,
      availableWidth,
      gridClass,
      gapClass
    };

    setGridCalculation(newCalculation);
  }, [containerWidth, panelWidth, isDetailPanelOpen, config]); // 只依赖原始值

  // 获取响应式断点类名
  const getResponsiveGridClass = useCallback(() => {
    const { columns } = gridCalculation;
    
    // 基础网格类
    const baseClasses = ['grid'];
    
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
    
    // 添加间距类
    baseClasses.push(gridCalculation.gapClass);
    
    return baseClasses.join(' ');
  }, [gridCalculation, isDetailPanelOpen]);

  return {
    ...gridCalculation,
    getResponsiveGridClass,
    refreshCalculation: calculateGrid,
    // 调试信息
    debug: {
      containerWidth,
      panelWidth,
      isDetailPanelOpen,
      config
    }
  };
};

export default useResponsiveGrid;