import React from 'react';
import { motion } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { RippleEffect } from './InteractiveAnimations';

// 按钮变体配置
const buttonVariants = cva(
  // 基础样式
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300',
        primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300',
        ghost: 'text-gray-700 hover:bg-gray-100 active:bg-gray-200',
        outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100',
        destructive: 'bg-error-500 text-white hover:bg-red-600 active:bg-red-700',
        success: 'bg-success-500 text-white hover:bg-green-600 active:bg-green-700',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 py-2',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
        icon: 'h-10 w-10',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  ripple?: boolean;
  animationType?: 'scale' | 'bounce' | 'none';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading = false,
      leftIcon,
      rightIcon,
      ripple = false,
      animationType = 'scale',
      children,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const getAnimationProps = () => {
      if (isDisabled || animationType === 'none') return {};

      switch (animationType) {
        case 'bounce':
          return {
            whileHover: { scale: 1.05 },
            whileTap: { scale: 0.9 },
            transition: { type: "spring", stiffness: 400, damping: 10 }
          };
        case 'scale':
        default:
          return {
            whileHover: { scale: 1.02 },
            whileTap: { scale: 0.98 },
            transition: { type: "spring", stiffness: 400, damping: 17 }
          };
      }
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) return;
      onClick?.(e);
    };

    const buttonContent = (
      <motion.button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        disabled={isDisabled}
        onClick={handleClick}
        {...getAnimationProps()}
        {...props}
      >
        {loading && (
          <motion.svg
            className="mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </motion.svg>
        )}
        {!loading && leftIcon && (
          <motion.span
            className="mr-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {leftIcon}
          </motion.span>
        )}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          {children}
        </motion.span>
        {!loading && rightIcon && (
          <motion.span
            className="ml-2"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {rightIcon}
          </motion.span>
        )}
      </motion.button>
    );

    if (ripple && !isDisabled) {
      return (
        <RippleEffect onClick={handleClick}>
          {buttonContent}
        </RippleEffect>
      );
    }

    return buttonContent;
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
