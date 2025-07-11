import React from 'react';
import { motion } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// 加载指示器变体配置
const spinnerVariants = cva(
  'animate-spin rounded-full border-2 border-gray-300',
  {
    variants: {
      size: {
        sm: 'h-4 w-4 border-t-gray-600',
        md: 'h-6 w-6 border-t-gray-600',
        lg: 'h-8 w-8 border-t-gray-600',
        xl: 'h-12 w-12 border-t-gray-600',
      },
      variant: {
        default: 'border-t-gray-600',
        primary: 'border-t-primary-600',
        white: 'border-gray-200 border-t-white',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  }
);

// 骨架屏变体配置
const skeletonVariants = cva(
  'animate-pulse bg-gray-200 rounded',
  {
    variants: {
      variant: {
        default: 'bg-gray-200',
        light: 'bg-gray-100',
        dark: 'bg-gray-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  width?: string | number;
  height?: string | number;
}

export interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  spinner?: React.ReactNode;
  className?: string;
}

// 加载指示器组件
const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, variant, label, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-center', className)}
      {...props}
    >
      <div className={cn(spinnerVariants({ size, variant }))} />
      {label && <span className="ml-2 text-sm text-gray-600">{label}</span>}
    </div>
  )
);

// 骨架屏组件
const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, width, height, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(skeletonVariants({ variant, className }))}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  )
);

// 加载覆盖层组件
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  spinner,
  className,
}) => (
  <div className={cn('relative', className)}>
    {children}
    {isLoading && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm"
      >
        {spinner || <Spinner size="lg" />}
      </motion.div>
    )}
  </div>
);

// 产品卡片骨架屏
const ProductCardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-3', className)}>
    <Skeleton className="aspect-square w-full" />
    <div className="space-y-2">
      <Skeleton height="1rem" width="80%" />
      <Skeleton height="0.875rem" width="60%" />
      <div className="flex justify-between">
        <Skeleton height="1.25rem" width="40%" />
        <Skeleton height="1rem" width="30%" />
      </div>
    </div>
  </div>
);

// 列表项骨架屏
const ListItemSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex items-center space-x-4', className)}>
    <Skeleton className="h-12 w-12 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton height="1rem" width="70%" />
      <Skeleton height="0.875rem" width="50%" />
    </div>
  </div>
);

// 文本骨架屏
const TextSkeleton: React.FC<{ 
  lines?: number; 
  className?: string;
}> = ({ lines = 3, className }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        height="1rem"
        width={index === lines - 1 ? '60%' : '100%'}
      />
    ))}
  </div>
);

Spinner.displayName = 'Spinner';
Skeleton.displayName = 'Skeleton';
LoadingOverlay.displayName = 'LoadingOverlay';
ProductCardSkeleton.displayName = 'ProductCardSkeleton';
ListItemSkeleton.displayName = 'ListItemSkeleton';
TextSkeleton.displayName = 'TextSkeleton';

export {
  Spinner,
  Skeleton,
  LoadingOverlay,
  ProductCardSkeleton,
  ListItemSkeleton,
  TextSkeleton,
};
