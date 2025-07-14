import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ResizableHandleProps {
  onResize: (width: number) => void;
  onResizing?: (width: number) => void; // 拖拽过程中的实时回调
  minWidth?: number;
  maxWidth?: number;
  className?: string;
}

const ResizableHandle: React.FC<ResizableHandleProps> = ({
  onResize,
  onResizing,
  minWidth = 300,
  maxWidth = 800,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const handleRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartX(e.clientX);
    
    // 获取当前面板宽度
    const panel = handleRef.current?.parentElement;
    if (panel) {
      setStartWidth(panel.getBoundingClientRect().width);
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth - deltaX));

    // 拖拽过程中的实时回调
    if (onResizing) {
      onResizing(newWidth);
    }

    onResize(newWidth);
  }, [isDragging, startX, startWidth, minWidth, maxWidth, onResize, onResizing]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={handleRef}
      className={`absolute -left-8 top-0 bottom-0 w-8 cursor-col-resize hover:bg-blue-500 hover:bg-opacity-15 transition-colors duration-200 group ${className}`}
      onMouseDown={handleMouseDown}
    >
      {/* 可视化拖拽指示器 */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="w-full h-full bg-blue-500 rounded-sm flex items-center justify-center">
          <div className="w-1 h-4 bg-white rounded-full"></div>
        </div>
      </div>
      
      {/* 拖拽时的线条指示器 */}
      {isDragging && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 shadow-lg"></div>
      )}
    </div>
  );
};

export default ResizableHandle;