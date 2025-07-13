import { useState, useEffect, useRef, useCallback } from 'react';

interface ContainerDimensions {
  width: number;
  height: number;
}

export const useContainerDimensions = () => {
  const [dimensions, setDimensions] = useState<ContainerDimensions>({
    width: 0,
    height: 0
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 初始化尺寸
    updateDimensions();

    // 创建 ResizeObserver
    if (window.ResizeObserver) {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          setDimensions({ width, height });
        }
      });

      resizeObserverRef.current.observe(container);
    } else {
      // 降级到 window resize 事件
      const handleResize = () => {
        updateDimensions();
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [updateDimensions]);

  return {
    containerRef,
    dimensions,
    updateDimensions
  };
};

export default useContainerDimensions;