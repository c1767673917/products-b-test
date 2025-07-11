// 交互反馈动画组件
import React, { useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { cn } from '../../utils/cn';

// 点击波纹效果组件
interface RippleEffectProps {
  children: React.ReactNode;
  className?: string;
  rippleColor?: string;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export const RippleEffect: React.FC<RippleEffectProps> = ({
  children,
  className = '',
  rippleColor = 'rgba(59, 130, 246, 0.3)',
  disabled = false,
  onClick,
}) => {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples(prev => [...prev, { id, x, y }]);

    // 移除波纹效果
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== id));
    }, 600);

    onClick?.(e);
  };

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      onClick={handleClick}
    >
      {children}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.div
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: ripple.x - 10,
              top: ripple.y - 10,
              width: 20,
              height: 20,
              backgroundColor: rippleColor,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// 悬停放大效果组件
interface HoverScaleProps {
  children: React.ReactNode;
  scale?: number;
  duration?: number;
  className?: string;
}

export const HoverScale: React.FC<HoverScaleProps> = ({
  children,
  scale = 1.05,
  duration = 0.2,
  className = '',
}) => {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: scale * 0.95 }}
      transition={{ duration, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// 弹跳点击效果组件
interface BounceClickProps {
  children: React.ReactNode;
  bounceScale?: number;
  className?: string;
}

export const BounceClick: React.FC<BounceClickProps> = ({
  children,
  bounceScale = 0.9,
  className = '',
}) => {
  return (
    <motion.div
      whileTap={{ scale: bounceScale }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// 摇摆动画组件
interface WiggleProps {
  children: React.ReactNode;
  trigger?: boolean;
  className?: string;
}

export const Wiggle: React.FC<WiggleProps> = ({
  children,
  trigger = false,
  className = '',
}) => {
  const controls = useAnimation();

  React.useEffect(() => {
    if (trigger) {
      controls.start({
        rotate: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.5 }
      });
    }
  }, [trigger, controls]);

  return (
    <motion.div
      animate={controls}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// 脉冲动画组件
interface PulseProps {
  children: React.ReactNode;
  isActive?: boolean;
  className?: string;
}

export const Pulse: React.FC<PulseProps> = ({
  children,
  isActive = false,
  className = '',
}) => {
  return (
    <motion.div
      animate={isActive ? {
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
      } : {}}
      transition={{
        duration: 1.5,
        repeat: isActive ? Infinity : 0,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// 浮动动画组件
interface FloatProps {
  children: React.ReactNode;
  isActive?: boolean;
  amplitude?: number;
  className?: string;
}

export const Float: React.FC<FloatProps> = ({
  children,
  isActive = true,
  amplitude = 10,
  className = '',
}) => {
  return (
    <motion.div
      animate={isActive ? {
        y: [-amplitude, amplitude, -amplitude],
      } : {}}
      transition={{
        duration: 3,
        repeat: isActive ? Infinity : 0,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// 渐变边框动画组件
interface AnimatedBorderProps {
  children: React.ReactNode;
  isActive?: boolean;
  borderColor?: string;
  className?: string;
}

export const AnimatedBorder: React.FC<AnimatedBorderProps> = ({
  children,
  isActive = false,
  borderColor = 'rgb(59, 130, 246)',
  className = '',
}) => {
  return (
    <motion.div
      className={cn('relative', className)}
      animate={isActive ? {
        boxShadow: [
          `0 0 0 0px ${borderColor}40`,
          `0 0 0 4px ${borderColor}20`,
          `0 0 0 0px ${borderColor}40`,
        ],
      } : {}}
      transition={{
        duration: 2,
        repeat: isActive ? Infinity : 0,
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.div>
  );
};

// 加载状态动画组件
interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  size = 'md',
  color = 'rgb(59, 130, 246)',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  const dotSize = sizeClasses[size];

  return (
    <div className={cn('flex space-x-1', className)}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={cn('rounded-full', dotSize)}
          style={{ backgroundColor: color }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: index * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

// 成功检查标记动画组件
interface CheckmarkProps {
  isVisible?: boolean;
  size?: number;
  color?: string;
  className?: string;
}

export const AnimatedCheckmark: React.FC<CheckmarkProps> = ({
  isVisible = false,
  size = 24,
  color = 'rgb(16, 185, 129)',
  className = '',
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className={cn('flex items-center justify-center', className)}
        >
          <motion.svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M20 6L9 17l-5-5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </motion.svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// 数字计数动画组件
interface CountUpProps {
  from?: number;
  to: number;
  duration?: number;
  className?: string;
}

export const CountUp: React.FC<CountUpProps> = ({
  from = 0,
  to,
  duration = 1,
  className = '',
}) => {
  const [count, setCount] = useState(from);

  React.useEffect(() => {
    const controls = useAnimation();
    controls.start({
      count: to,
      transition: { duration, ease: 'easeOut' },
    });
  }, [to, duration]);

  return (
    <motion.span
      className={className}
      animate={{ count: to }}
      transition={{ duration, ease: 'easeOut' }}
      onUpdate={(latest) => {
        setCount(Math.round(latest.count as number));
      }}
    >
      {count}
    </motion.span>
  );
};

export default {
  RippleEffect,
  HoverScale,
  BounceClick,
  Wiggle,
  Pulse,
  Float,
  AnimatedBorder,
  LoadingDots,
  AnimatedCheckmark,
  CountUp,
};
