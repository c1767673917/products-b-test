import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  useWindowScroll?: boolean;
}

export function VirtualGrid<T>({
  items,
  renderItem,
  itemHeight,
  itemWidth,
  gap = 16,
  containerHeight: initialContainerHeight = 600,
  className = '',
  overscan = 5,
  useWindowScroll = false
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(initialContainerHeight);
  const [containerTop, setContainerTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 更新容器尺寸和位置
  const updateContainerMetrics = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
      if (useWindowScroll) {
        setContainerTop(containerRef.current.offsetTop);
        setContainerHeight(window.innerHeight);
      }
    }
  }, [useWindowScroll]);

  useEffect(() => {
    updateContainerMetrics();
    window.addEventListener('resize', updateContainerMetrics);
    return () => window.removeEventListener('resize', updateContainerMetrics);
  }, [updateContainerMetrics]);

  // 处理滚动
  useEffect(() => {
    if (!useWindowScroll) return;

    const handleScroll = () => {
      setScrollTop(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [useWindowScroll]);

  const handleContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!useWindowScroll) {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };

  // 计算每行可以显示的项目数
  const itemsPerRow = useMemo(() => {
    if (containerWidth === 0) return 1;
    return Math.max(1, Math.floor((containerWidth + gap) / (itemWidth + gap)));
  }, [containerWidth, itemWidth, gap]);

  // 计算总行数
  const totalRows = Math.ceil(items.length / itemsPerRow);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const rowHeight = itemHeight + gap;
    const relativeScrollTop = useWindowScroll ? Math.max(0, scrollTop - containerTop) : scrollTop;
    
    const startRow = Math.floor(relativeScrollTop / rowHeight);
    const visibleRows = Math.ceil(containerHeight / rowHeight);
    
    const startIndex = Math.max(0, startRow - overscan);
    const endIndex = Math.min(totalRows, startRow + visibleRows + overscan);

    return { start: startIndex, end: endIndex };
  }, [scrollTop, containerTop, containerHeight, itemHeight, gap, totalRows, overscan, useWindowScroll]);

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

  const totalHeight = totalRows * (itemHeight + gap) - gap;

  return (
    <div
      ref={containerRef}
      className={!useWindowScroll ? `overflow-auto ${className}` : className}
      style={{
        height: useWindowScroll ? totalHeight : containerHeight,
        position: 'relative'
      }}
      onScroll={handleContainerScroll}
    >
      <div style={{
        height: useWindowScroll ? '100%' : totalHeight,
        position: useWindowScroll ? 'sticky' : 'relative',
        top: 0
      }}>
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
  useWindowScroll?: boolean;
}

export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight: initialContainerHeight = 600,
  className = '',
  overscan = 5,
  useWindowScroll = false
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(initialContainerHeight);
  const [containerTop, setContainerTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 更新容器尺寸和位置
  const updateContainerMetrics = useCallback(() => {
    if (containerRef.current) {
      if (useWindowScroll) {
        setContainerTop(containerRef.current.offsetTop);
        setContainerHeight(window.innerHeight);
      }
    }
  }, [useWindowScroll]);

  useEffect(() => {
    updateContainerMetrics();
    window.addEventListener('resize', updateContainerMetrics);
    return () => window.removeEventListener('resize', updateContainerMetrics);
  }, [updateContainerMetrics]);

  // 处理滚动
  useEffect(() => {
    if (!useWindowScroll) return;

    const handleScroll = () => {
      setScrollTop(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [useWindowScroll]);

  const handleContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!useWindowScroll) {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const relativeScrollTop = useWindowScroll ? Math.max(0, scrollTop - containerTop) : scrollTop;
    const startIndex = Math.floor(relativeScrollTop / itemHeight);
    const visibleItemsCount = Math.ceil(containerHeight / itemHeight);
    
    const start = Math.max(0, startIndex - overscan);
    const end = Math.min(items.length, startIndex + visibleItemsCount + overscan);
    
    return { start, end };
  }, [scrollTop, containerTop, containerHeight, itemHeight, items.length, overscan, useWindowScroll]);

  // 获取可见的项目
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      originalIndex: visibleRange.start + index
    }));
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;

  return (
    <div
      ref={containerRef}
      className={!useWindowScroll ? `overflow-auto ${className}` : className}
      style={{
        height: useWindowScroll ? totalHeight : containerHeight,
        position: 'relative'
      }}
      onScroll={handleContainerScroll}
    >
      <div style={{
        height: useWindowScroll ? '100%' : totalHeight,
        position: useWindowScroll ? 'sticky' : 'relative',
        top: 0
      }}>
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
