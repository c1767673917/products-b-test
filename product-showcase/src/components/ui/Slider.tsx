import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useProductI18n } from '../../hooks/useProductI18n';
import { useTranslation } from 'react-i18next';

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
  minPrice?: number;
  maxPrice?: number;
}

export const PriceRangeQuickSelect: React.FC<PriceRangeQuickSelectProps> = ({
  onSelect,
  currentRange,
  className,
  minPrice,
  maxPrice
}) => {
  const { t } = useTranslation('product');
  const { currentLanguage } = useProductI18n();
  
  // 根据语言和实际价格范围动态生成快速选择范围
  const quickRanges = React.useMemo(() => {
    const min = minPrice ?? (currentLanguage === 'en' ? 0 : 1.5);
    const max = maxPrice ?? (currentLanguage === 'en' ? 100 : 450);
    const isUSD = currentLanguage === 'en';
    
    // 根据实际价格范围生成合理的分段
    const ranges: Array<{ label: string; range: [number, number] }> = [];
    
    // 全部范围
    ranges.push({
      label: t('filters.allPrices'),
      range: [min, max]
    });
    
    // 根据最大价格动态生成价格段
    if (max <= 20) {
      // 小价格范围
      ranges.push(
        { label: `${isUSD ? '$' : '¥'}0-5`, range: [min, 5] },
        { label: `${isUSD ? '$' : '¥'}5-10`, range: [5, 10] },
        { label: `${isUSD ? '$' : '¥'}10+`, range: [10, max] }
      );
    } else if (max <= 100) {
      // 中等价格范围
      ranges.push(
        { label: `${isUSD ? '$' : '¥'}0-10`, range: [min, 10] },
        { label: `${isUSD ? '$' : '¥'}10-30`, range: [10, 30] },
        { label: `${isUSD ? '$' : '¥'}30-50`, range: [30, 50] },
        { label: `${isUSD ? '$' : '¥'}50+`, range: [50, max] }
      );
    } else {
      // 大价格范围
      ranges.push(
        { label: `${isUSD ? '$' : '¥'}0-50`, range: [min, 50] },
        { label: `${isUSD ? '$' : '¥'}50-100`, range: [50, 100] },
        { label: `${isUSD ? '$' : '¥'}100-200`, range: [100, 200] },
        { label: `${isUSD ? '$' : '¥'}200+`, range: [200, max] }
      );
    }
    
    return ranges;
  }, [currentLanguage, minPrice, maxPrice, t]);

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
