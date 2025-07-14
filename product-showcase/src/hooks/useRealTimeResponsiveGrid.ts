import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface ResponsiveGridOptions {
  minCardWidth?: number;
  maxColumns?: number;
  gap?: number;
  padding?: number;
  maxCardWidth?: number; // 新增：卡片最大宽度限制
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
  padding: 32,
  maxCardWidth: 220 // 调整为更合理的最大卡片宽度
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
    options.padding,
    options.maxCardWidth
  ]);

  // 计算网格布局的纯函数
  const calculateGrid = useCallback((
    containerW: number,
    panelW: number,
    isPanelOpen: boolean
  ): GridCalculation => {
    let availableWidth = containerW - config.padding;

    if (isPanelOpen) {
      // 详情页打开后：激进减少面板宽度影响，确保至少显示2列
      const minRequiredColumns = 2; // 详情页强制最少2列
      const maxCardWidth = config.maxCardWidth;
      const minCardWidth = Math.max(config.minCardWidth * 0.75, 150); // 进一步放宽最小宽度，允许更紧凑
      
      // 计算显示2列所需的最小宽度
      const minWidthFor2Columns = minCardWidth * 2 + config.gap;
      
      // 智能调整面板宽度影响，确保能显示至少2列
      if (availableWidth < minWidthFor2Columns + panelW * 0.5) {
        // 如果常规计算无法满足2列，使用极激进策略
        const effectivePanelWidth = Math.min(panelW * 0.15, panelW - 400); // 只考虑15%的面板宽度
        const panelSpacing = 8;
        availableWidth = availableWidth - effectivePanelWidth - panelSpacing;
      } else {
        // 正常情况下的激进策略
        const effectivePanelWidth = Math.min(panelW * 0.25, panelW - 280);
        const panelSpacing = 16;
        availableWidth = availableWidth - effectivePanelWidth - panelSpacing;
      }
    }

    // 确保最小可用宽度
    availableWidth = Math.max(availableWidth, config.minCardWidth * 1.2);

    if (isPanelOpen) {
      const maxCardWidth = config.maxCardWidth;
      const minCardWidth = Math.max(config.minCardWidth * 0.75, 150); // 允许更紧凑的卡片
      const minRequiredColumns = 2; // 强制最少2列
      
      // 第一优先级：基于最大宽度计算理想列数
      const idealColumns = Math.floor((availableWidth + config.gap) / (maxCardWidth + config.gap));
      const maxPossibleColumns = Math.floor((availableWidth + config.gap) / (minCardWidth + config.gap));
      
      // 选择最优列数，但不能少于2列
      let targetColumns = Math.max(idealColumns, minRequiredColumns);
      targetColumns = Math.min(targetColumns, config.maxColumns);
      
      // 如果理想列数太少，尝试增加1列
      if (targetColumns < Math.min(maxPossibleColumns, config.maxColumns)) {
        targetColumns = Math.min(targetColumns + 1, config.maxColumns);
      }
      
      let totalGapWidth = (targetColumns - 1) * config.gap;
      let cardWidth = (availableWidth - totalGapWidth) / targetColumns;
      
      // 检查卡片宽度是否合理
      if (cardWidth >= minCardWidth && cardWidth <= maxCardWidth * 1.4) {
        const gridClass = `grid-cols-${targetColumns}`;
        const gapClass = config.gap <= 12 ? 'gap-3' : config.gap <= 16 ? 'gap-4' : 'gap-6';
        
        return {
          columns: targetColumns,
          cardWidth,
          availableWidth,
          gridClass,
          gapClass
        };
      }
      
      // 如果上述方案卡片太大或太小，强制显示2列（最低要求）
      if (availableWidth >= minCardWidth * 2 + config.gap) {
        const forceColumns = Math.max(minRequiredColumns, Math.floor((availableWidth + config.gap) / (maxCardWidth + config.gap)));
        const finalColumns = Math.min(forceColumns, config.maxColumns);
        
        totalGapWidth = (finalColumns - 1) * config.gap;
        cardWidth = (availableWidth - totalGapWidth) / finalColumns;
        
        // 即使卡片稍大也要保证至少2列
        if (finalColumns >= minRequiredColumns || cardWidth <= maxCardWidth * 1.6) {
          const gridClass = `grid-cols-${finalColumns}`;
          const gapClass = config.gap <= 12 ? 'gap-3' : config.gap <= 16 ? 'gap-4' : 'gap-6';
          
          return {
            columns: finalColumns,
            cardWidth,
            availableWidth,
            gridClass,
            gapClass
          };
        }
      }
      
      // 最后保障：无论如何都要显示至少2列（除非物理空间真的不够）
      const absoluteMinWidth = minCardWidth * 0.8; // 绝对最小卡片宽度
      if (availableWidth >= absoluteMinWidth * 2 + config.gap) {
        const emergencyColumns = 2;
        totalGapWidth = (emergencyColumns - 1) * config.gap;
        cardWidth = (availableWidth - totalGapWidth) / emergencyColumns;
        
        const gridClass = `grid-cols-${emergencyColumns}`;
        const gapClass = config.gap <= 12 ? 'gap-3' : config.gap <= 16 ? 'gap-4' : 'gap-6';
        
        return {
          columns: emergencyColumns,
          cardWidth,
          availableWidth,
          gridClass,
          gapClass
        };
      }
    }
    
    // 标准计算逻辑（未打开详情页或物理空间真的不够的极端情况）
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
    
    // 基础网格类，添加更快的过渡效果
    const baseClasses = ['grid', 'transition-all', 'duration-150', 'ease-out'];
    
    // 根据列数设置响应式类名，更加激进的多列切换
    if (isDetailPanelOpen) {
      // 详情面板打开时的布局 - 激进地显示更多列
      if (columns === 1) {
        baseClasses.push('grid-cols-1');
      } else if (columns === 2) {
        // 即使在小屏幕也直接显示2列
        baseClasses.push('grid-cols-2');
      } else if (columns === 3) {
        // 积极切换到3列
        baseClasses.push('grid-cols-3');
      } else if (columns === 4) {
        // 积极切换到4列
        baseClasses.push('grid-cols-2 sm:grid-cols-3 md:grid-cols-4');
      } else if (columns === 5) {
        // 积极切换到5列
        baseClasses.push('grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5');
      } else if (columns >= 6) {
        // 支持6列及以上
        baseClasses.push('grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6');
      }
    } else {
      // 详情面板关闭时的布局 - 也更加激进
      if (columns <= 2) {
        baseClasses.push('grid-cols-1 xs:grid-cols-2');
      } else if (columns === 3) {
        baseClasses.push('grid-cols-1 xs:grid-cols-2 sm:grid-cols-3');
      } else if (columns === 4) {
        baseClasses.push('grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4');
      } else if (columns === 5) {
        baseClasses.push('grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5');
      } else {
        baseClasses.push('grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6');
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
