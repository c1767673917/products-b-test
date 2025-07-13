import { useState, useEffect, useCallback } from 'react';

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

  const config = { ...DEFAULT_OPTIONS, ...options };

  const calculateGrid = useCallback(() => {
    // 计算可用宽度
    let availableWidth = containerWidth - config.padding;
    
    // 如果详情面板打开，减去面板宽度
    if (isDetailPanelOpen) {
      availableWidth = availableWidth - panelWidth;
    }

    // 确保最小宽度
    availableWidth = Math.max(availableWidth, config.minCardWidth);

    // 计算最佳列数
    const possibleColumns = Math.floor((availableWidth + config.gap) / (config.minCardWidth + config.gap));
    const columns = Math.min(Math.max(1, possibleColumns), config.maxColumns);

    // 计算实际卡片宽度
    const totalGapWidth = (columns - 1) * config.gap;
    const cardWidth = (availableWidth - totalGapWidth) / columns;

    // 生成对应的 CSS 类名
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
    const newCalculation = calculateGrid();
    setGridCalculation(newCalculation);
  }, [calculateGrid]);

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