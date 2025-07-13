// 滚动动画和视差效果组件 - 性能优化版本
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, useAnimation, useInView, useScroll, useTransform } from 'framer-motion';
import { cn } from '../../utils/cn';
import { useAnimationPreferences } from '../../hooks/useAnimationPreferences';

// 优化的滚动触发动画组件
interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
  once?: boolean;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.4, // 减少默认持续时间
  distance = 30, // 减少移动距离
  className = '',
  once = true,
}) => {
  const ref = useRef(null);
  const { preferences, getAnimationConfig } = useAnimationPreferences();
  
  // 如果用户偏好减少动画，直接显示内容
  if (preferences.reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const isInView = useInView(ref, { 
    once, 
    margin: '-50px', // 减少监听边距，提高性能
    amount: 0.1 // 只需要10%进入视口即触发
  });
  
  const controls = useAnimation();

  const animationVariants = useMemo(() => {
    const getInitialPosition = () => {
      switch (direction) {
        case 'up':
          return { y: distance, opacity: 0 };
        case 'down':
          return { y: -distance, opacity: 0 };
        case 'left':
          return { x: distance, opacity: 0 };
        case 'right':
          return { x: -distance, opacity: 0 };
        default:
          return { y: distance, opacity: 0 };
      }
    };

    const getFinalPosition = () => {
      switch (direction) {
        case 'up':
        case 'down':
          return { y: 0, opacity: 1 };
        case 'left':
        case 'right':
          return { x: 0, opacity: 1 };
        default:
          return { y: 0, opacity: 1 };
      }
    };

    return { initial: getInitialPosition(), final: getFinalPosition() };
  }, [direction, distance]);

  useEffect(() => {
    if (isInView) {
      controls.start(animationVariants.final);
    } else if (!once) {
      controls.start(animationVariants.initial);
    }
  }, [isInView, controls, once, animationVariants]);

  const animConfig = getAnimationConfig(duration);

  return (
    <motion.div
      ref={ref}
      initial={animationVariants.initial}
      animate={controls}
      transition={{
        duration: animConfig.duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94], // 优化的贝塞尔曲线
      }}
      style={{
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
      }}
      className={cn(className, 'transform-gpu')}
    >
      {children}
    </motion.div>
  );
};

// 视差滚动组件
interface ParallaxProps {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}

export const Parallax: React.FC<ParallaxProps> = ({
  children,
  speed = 0.5,
  className = '',
}) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', `${speed * 100}%`]);

  return (
    <div ref={ref} className={cn('overflow-hidden', className)}>
      <motion.div style={{ y }}>
        {children}
      </motion.div>
    </div>
  );
};

// 滚动进度条组件
interface ScrollProgressProps {
  className?: string;
  color?: string;
}

export const ScrollProgress: React.FC<ScrollProgressProps> = ({
  className = '',
  color = 'rgb(59, 130, 246)',
}) => {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      className={cn(
        'fixed top-0 left-0 right-0 h-1 z-50 origin-left',
        className
      )}
      style={{
        scaleX: scrollYProgress,
        backgroundColor: color,
      }}
    />
  );
};

// 滚动触发计数器组件
interface ScrollCounterProps {
  from?: number;
  to: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export const ScrollCounter: React.FC<ScrollCounterProps> = ({
  from = 0,
  to,
  duration = 2,
  className = '',
  suffix = '',
  prefix = '',
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(from);

  useEffect(() => {
    if (isInView) {
      const startTime = Date.now();
      const startValue = from;
      const endValue = to;
      const totalDuration = duration * 1000;

      const updateCount = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / totalDuration, 1);
        
        // 使用缓动函数
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.round(startValue + (endValue - startValue) * easeOutQuart);
        
        setCount(currentValue);

        if (progress < 1) {
          requestAnimationFrame(updateCount);
        }
      };

      requestAnimationFrame(updateCount);
    }
  }, [isInView, from, to, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
};

// 优化的滚动触发交错动画组件
interface ScrollStaggerProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

export const ScrollStagger: React.FC<ScrollStaggerProps> = ({
  children,
  staggerDelay = 0.05, // 减少交错延迟
  className = '',
}) => {
  const ref = useRef(null);
  const { preferences, getAnimationConfig } = useAnimationPreferences();
  
  // 如果用户偏好减少动画，直接显示内容
  if (preferences.reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const isInView = useInView(ref, { 
    once: true, 
    margin: '-30px', // 减少监听边距
    amount: 0.1 
  });

  const animConfig = getAnimationConfig(0.4);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      style={{
        willChange: 'opacity',
      }}
      className={cn(className, 'transform-gpu')}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: 15 }, // 减少移动距离
            visible: {
              opacity: 1,
              y: 0,
              transition: {
                duration: animConfig.duration,
                ease: [0.25, 0.46, 0.45, 0.94],
              },
            },
          }}
          style={{
            willChange: 'transform, opacity',
            backfaceVisibility: 'hidden',
          }}
          className="transform-gpu"
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

// 滚动触发缩放动画组件
interface ScrollScaleProps {
  children: React.ReactNode;
  scale?: number;
  className?: string;
}

export const ScrollScale: React.FC<ScrollScaleProps> = ({
  children,
  scale = 1.1,
  className = '',
}) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const scaleValue = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, scale, 0.8]);

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ scale: scaleValue }}>
        {children}
      </motion.div>
    </div>
  );
};

// 滚动触发旋转动画组件
interface ScrollRotateProps {
  children: React.ReactNode;
  rotation?: number;
  className?: string;
}

export const ScrollRotate: React.FC<ScrollRotateProps> = ({
  children,
  rotation = 360,
  className = '',
}) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const rotate = useTransform(scrollYProgress, [0, 1], [0, rotation]);

  return (
    <div ref={ref} className={className}>
      <motion.div style={{ rotate }}>
        {children}
      </motion.div>
    </div>
  );
};

// 滚动触发文字打字机效果组件
interface ScrollTypewriterProps {
  text: string;
  speed?: number;
  className?: string;
}

export const ScrollTypewriter: React.FC<ScrollTypewriterProps> = ({
  text,
  speed = 50,
  className = '',
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    if (isInView) {
      let index = 0;
      const timer = setInterval(() => {
        setDisplayText(text.slice(0, index + 1));
        index++;
        if (index >= text.length) {
          clearInterval(timer);
        }
      }, speed);

      return () => clearInterval(timer);
    }
  }, [isInView, text, speed]);

  return (
    <span ref={ref} className={className}>
      {displayText}
      {isInView && displayText.length < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block"
        >
          |
        </motion.span>
      )}
    </span>
  );
};

export default {
  ScrollReveal,
  Parallax,
  ScrollProgress,
  ScrollCounter,
  ScrollStagger,
  ScrollScale,
  ScrollRotate,
  ScrollTypewriter,
};
