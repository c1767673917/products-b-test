// 统一的动画常量和配置
// 这个文件定义了整个应用程序的动画标准

export const ANIMATION_DURATION = {
  instant: 0,
  fast: 0.2,        // 更快的交互响应
  normal: 0.3,
  slow: 0.5,
  slower: 0.8,
} as const;

export const ANIMATION_EASING = {
  // 标准缓动函数
  easeOut: [0.25, 0.46, 0.45, 0.94] as const,
  easeIn: [0.55, 0.06, 0.68, 0.19] as const,
  easeInOut: [0.42, 0, 0.58, 1] as const,
  
  // 弹性缓动
  springGentle: { type: 'spring', stiffness: 200, damping: 25 } as const,
  springMedium: { type: 'spring', stiffness: 300, damping: 25 } as const,
  springBouncy: { type: 'spring', stiffness: 400, damping: 17 } as const,
  
  // 特殊效果
  anticipate: [0.25, 0.1, 0.25, 1] as const,
  backOut: [0.34, 1.56, 0.64, 1] as const,
} as const;

export const ANIMATION_DISTANCE = {
  small: 10,
  medium: 20,
  large: 30,
  xlarge: 50,
} as const;

// 页面过渡动画变体
export const PAGE_TRANSITION_VARIANTS = {
  fade: {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 },
  },
  slide: {
    initial: { opacity: 0, x: ANIMATION_DISTANCE.medium },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -ANIMATION_DISTANCE.medium },
  },
  slideUp: {
    initial: { opacity: 0, y: ANIMATION_DISTANCE.medium },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -ANIMATION_DISTANCE.small },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    in: { opacity: 1, scale: 1 },
    out: { opacity: 0, scale: 1.05 },
  },
  // 新增：产品详情页专用过渡动画（更流畅）
  productDetail: {
    initial: { opacity: 0, scale: 0.96, y: ANIMATION_DISTANCE.large },
    in: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: {
        duration: ANIMATION_DURATION.normal,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: 0.05  // 轻微延迟，确保列表页动画完成
      }
    },
    out: { 
      opacity: 0, 
      scale: 1.02, 
      y: -ANIMATION_DISTANCE.small,
      transition: {
        duration: ANIMATION_DURATION.fast,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    },
  },
  // 新增：产品列表页专用过渡动画（快速淡入淡出）
  productList: {
    initial: { opacity: 0 },
    in: { 
      opacity: 1,
      transition: {
        duration: ANIMATION_DURATION.fast,
        ease: 'easeOut'
      }
    },
    out: { 
      opacity: 0,
      transition: {
        duration: ANIMATION_DURATION.fast,
        ease: 'easeIn'
      }
    },
  },
} as const;

// 卡片悬停动画
export const CARD_HOVER_VARIANTS = {
  rest: {
    y: 0,
    scale: 1,
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  },
  hover: {
    y: -4,
    scale: 1.02,
    boxShadow: '0 10px 25px 0 rgba(0, 0, 0, 0.15)',
    transition: ANIMATION_EASING.springGentle,
  },
} as const;

// 产品卡片动画变体（优化版）
export const PRODUCT_CARD_VARIANTS = {
  // 进入动画：从下方滑入
  hidden: {
    opacity: 0,
    y: ANIMATION_DISTANCE.medium,
  },
  // 显示状态：正常位置
  visible: {
    opacity: 1,
    y: 0,
  },
  // 退出动画：保持原位，只淡出（避免跳跃）
  exit: {
    opacity: 0,
    transition: {
      duration: ANIMATION_DURATION.fast,
      ease: 'easeOut',
    },
  },
  // 点击时的缩放效果
  tap: {
    scale: 0.98,
    transition: {
      duration: ANIMATION_DURATION.fast,
      ease: 'easeOut',
    },
  },
} as const;

// 按钮交互动画
export const BUTTON_VARIANTS = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.05,
    transition: ANIMATION_EASING.springMedium,
  },
  tap: { 
    scale: 0.95,
    transition: { ...ANIMATION_EASING.springBouncy, duration: ANIMATION_DURATION.fast },
  },
} as const;

// 图片加载动画
export const IMAGE_VARIANTS = {
  loading: {
    opacity: 0,
    scale: 1.1,
  },
  loaded: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: ANIMATION_EASING.easeOut,
    },
  },
} as const;

// 滚动触发动画
export const SCROLL_REVEAL_VARIANTS = {
  hidden: {
    opacity: 0,
    y: ANIMATION_DISTANCE.medium,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_DURATION.normal,
      ease: ANIMATION_EASING.easeOut,
    },
  },
} as const;

// 交错动画配置
export const STAGGER_CONFIG = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  },
  item: {
    hidden: { opacity: 0, y: ANIMATION_DISTANCE.small },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: ANIMATION_DURATION.normal,
        ease: ANIMATION_EASING.easeOut,
      },
    },
  },
} as const;

// 移动端优化配置
export const MOBILE_ANIMATION_CONFIG = {
  reducedMotion: {
    duration: ANIMATION_DURATION.fast,
    ease: 'linear' as const,
  },
  normal: {
    duration: ANIMATION_DURATION.normal,
    ease: ANIMATION_EASING.easeOut,
  },
} as const;

// 响应式断点
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

// 根据屏幕大小调整动画参数的工具函数
export const getResponsiveAnimationConfig = (screenWidth: number) => {
  if (screenWidth < BREAKPOINTS.sm) {
    return {
      duration: ANIMATION_DURATION.fast,
      distance: ANIMATION_DISTANCE.small,
      staggerDelay: 0.05,
    };
  } else if (screenWidth < BREAKPOINTS.lg) {
    return {
      duration: ANIMATION_DURATION.normal,
      distance: ANIMATION_DISTANCE.medium,
      staggerDelay: 0.08,
    };
  } else {
    return {
      duration: ANIMATION_DURATION.normal,
      distance: ANIMATION_DISTANCE.large,
      staggerDelay: 0.1,
    };
  }
};

// 性能优化的CSS属性
export const PERFORMANCE_CSS = {
  willChange: 'transform, opacity' as const,
  backfaceVisibility: 'hidden' as const,
  perspective: 1000,
  transformStyle: 'preserve-3d' as const,
} as const;

// GPU加速的CSS类名
export const GPU_ACCELERATED_CLASS = 'transform-gpu';

// 动画性能监控阈值
export const PERFORMANCE_THRESHOLDS = {
  lowFPS: 30,
  goodFPS: 50,
  excellentFPS: 60,
} as const;