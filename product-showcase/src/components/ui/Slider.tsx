import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue?: (value: number) => string;
  className?: string;
  disabled?: boolean;
}

export const Slider: React.FC<SliderProps> = ({
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue = (val) => val.toString(),
  className,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const getPercentage = useCallback((val: number) => {
    return ((val - min) / (max - min)) * 100;
  }, [min, max]);

  const getValue = useCallback((percentage: number) => {
    const val = min + (percentage / 100) * (max - min);
    return Math.round(val / step) * step;
  }, [min, max, step]);

  const handleMouseDown = useCallback((type: 'min' | 'max') => (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(type);
  }, [disabled]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !sliderRef.current || disabled) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const newValue = getValue(percentage);

    if (isDragging === 'min') {
      const newMin = Math.min(newValue, value[1]);
      onChange([newMin, value[1]]);
    } else {
      const newMax = Math.max(newValue, value[0]);
      onChange([value[0], newMax]);
    }
  }, [isDragging, getValue, value, onChange, disabled]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const minPercentage = getPercentage(value[0]);
  const maxPercentage = getPercentage(value[1]);

  return (
    <div className={cn('relative w-full', className)}>
      {/* 数值显示 */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm font-medium text-gray-700">
          {formatValue(value[0])}
        </div>
        <div className="text-sm font-medium text-gray-700">
          {formatValue(value[1])}
        </div>
      </div>

      {/* 滑块轨道 */}
      <div
        ref={sliderRef}
        className={cn(
          'relative h-2 bg-gray-200 rounded-full cursor-pointer',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* 选中区间 */}
        <div
          className="absolute h-full bg-blue-500 rounded-full"
          style={{
            left: `${minPercentage}%`,
            width: `${maxPercentage - minPercentage}%`
          }}
        />

        {/* 最小值滑块 */}
        <motion.div
          className={cn(
            'absolute w-5 h-5 bg-white border-2 border-blue-500 rounded-full cursor-grab shadow-md',
            'transform -translate-x-1/2 -translate-y-1/2 top-1/2',
            isDragging === 'min' && 'cursor-grabbing scale-110',
            disabled && 'cursor-not-allowed'
          )}
          style={{ left: `${minPercentage}%` }}
          onMouseDown={handleMouseDown('min')}
          whileHover={!disabled ? { scale: 1.1 } : {}}
          whileTap={!disabled ? { scale: 0.95 } : {}}
          animate={{
            scale: isDragging === 'min' ? 1.1 : 1
          }}
        />

        {/* 最大值滑块 */}
        <motion.div
          className={cn(
            'absolute w-5 h-5 bg-white border-2 border-blue-500 rounded-full cursor-grab shadow-md',
            'transform -translate-x-1/2 -translate-y-1/2 top-1/2',
            isDragging === 'max' && 'cursor-grabbing scale-110',
            disabled && 'cursor-not-allowed'
          )}
          style={{ left: `${maxPercentage}%` }}
          onMouseDown={handleMouseDown('max')}
          whileHover={!disabled ? { scale: 1.1 } : {}}
          whileTap={!disabled ? { scale: 0.95 } : {}}
          animate={{
            scale: isDragging === 'max' ? 1.1 : 1
          }}
        />
      </div>

      {/* 刻度标记 */}
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
};

// 快速价格区间选项组件
export interface PriceRangeQuickSelectProps {
  onSelect: (range: [number, number]) => void;
  currentRange: [number, number];
  className?: string;
}

export const PriceRangeQuickSelect: React.FC<PriceRangeQuickSelectProps> = ({
  onSelect,
  currentRange,
  className
}) => {
  const quickRanges = [
    { label: '全部', range: [1.5, 450] as [number, number] },
    { label: '¥0-10', range: [1.5, 10] as [number, number] },
    { label: '¥10-30', range: [10, 30] as [number, number] },
    { label: '¥30-50', range: [30, 50] as [number, number] },
    { label: '¥50-100', range: [50, 100] as [number, number] },
    { label: '¥100+', range: [100, 450] as [number, number] },
  ];

  const isActive = (range: [number, number]) => {
    return currentRange[0] === range[0] && currentRange[1] === range[1];
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {quickRanges.map((item) => (
        <motion.button
          key={item.label}
          onClick={() => onSelect(item.range)}
          className={cn(
            'px-3 py-1.5 text-sm rounded-full border transition-colors',
            isActive(item.range)
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:text-blue-600'
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {item.label}
        </motion.button>
      ))}
    </div>
  );
};
