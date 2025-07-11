import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';

export interface VirtualGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  itemWidth: number;
  gap?: number;
  containerHeight?: number;
  className?: string;
  overscan?: number;
}

export function VirtualGrid<T>({
  items,
  renderItem,
  itemHeight,
  itemWidth,
  gap = 16,
  containerHeight = 600,
  className = '',
  overscan = 5
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算每行可以显示的项目数
  const itemsPerRow = useMemo(() => {
    if (containerWidth === 0) return 1;
    return Math.floor((containerWidth + gap) / (itemWidth + gap));
  }, [containerWidth, itemWidth, gap]);

  // 计算总行数
  const totalRows = Math.ceil(items.length / itemsPerRow);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const rowHeight = itemHeight + gap;
    const startRow = Math.floor(scrollTop / rowHeight);
    const endRow = Math.min(
      startRow + Math.ceil(containerHeight / rowHeight) + overscan,
      totalRows
    );
    
    return {
      start: Math.max(0, startRow - overscan),
      end: endRow
    };
  }, [scrollTop, itemHeight, gap, containerHeight, totalRows, overscan]);

  // 获取可见的项目
  const visibleItems = useMemo(() => {
    const startIndex = visibleRange.start * itemsPerRow;
    const endIndex = Math.min(visibleRange.end * itemsPerRow, items.length);
    
    return items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      originalIndex: startIndex + index,
      row: Math.floor((startIndex + index) / itemsPerRow),
      col: (startIndex + index) % itemsPerRow
    }));
  }, [items, visibleRange, itemsPerRow]);

  // 监听容器大小变化
  useEffect(() => {
    const updateContainerWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateContainerWidth();
    window.addEventListener('resize', updateContainerWidth);
    return () => window.removeEventListener('resize', updateContainerWidth);
  }, []);

  // 处理滚动
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const totalHeight = totalRows * (itemHeight + gap) - gap;

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, originalIndex, row, col }) => (
          <motion.div
            key={originalIndex}
            style={{
              position: 'absolute',
              top: row * (itemHeight + gap),
              left: col * (itemWidth + gap),
              width: itemWidth,
              height: itemHeight
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {renderItem(item, originalIndex)}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// 简化版本的虚拟列表（用于列表视图）
export interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight?: number;
  className?: string;
  overscan?: number;
}

export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight = 600,
  className = '',
  overscan = 5
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    );
    
    return {
      start: Math.max(0, startIndex - overscan),
      end: endIndex
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // 获取可见的项目
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      originalIndex: visibleRange.start + index
    }));
  }, [items, visibleRange]);

  // 处理滚动
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const totalHeight = items.length * itemHeight;

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, originalIndex }) => (
          <motion.div
            key={originalIndex}
            style={{
              position: 'absolute',
              top: originalIndex * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderItem(item, originalIndex)}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
