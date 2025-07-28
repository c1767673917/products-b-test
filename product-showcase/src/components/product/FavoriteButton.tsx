import React from 'react';
import { motion } from 'framer-motion';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';

interface FavoriteButtonProps {
  isFavorited: boolean;
  isLoading?: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showCount?: boolean;
  favoriteCount?: number;
  showTooltip?: boolean;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  isFavorited,
  isLoading = false,
  onClick,
  size = 'md',
  className,
  showCount = false,
  favoriteCount = 0,
  showTooltip = true
}) => {
  const { t } = useTranslation('product');

  const sizeClasses = {
    sm: 'w-6 h-6 p-1',
    md: 'w-8 h-8 p-1.5',
    lg: 'w-10 h-10 p-2'
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) {
      onClick(e);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <motion.button
        onClick={handleClick}
        disabled={isLoading}
        title={showTooltip ? (isFavorited ? t('actions.favorited') : t('actions.favorite')) : undefined}
        className={cn(
          'relative rounded-full bg-white/90 backdrop-blur-sm shadow-sm',
          'hover:bg-white hover:shadow-md transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizeClasses[size],
          className
        )}
        whileHover={{ scale: isLoading ? 1 : 1.1 }}
        whileTap={{ scale: isLoading ? 1 : 0.95 }}
        initial={false}
        animate={{
          scale: isLoading ? [1, 1.1, 1] : 1,
        }}
        transition={{
          scale: isLoading ? {
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut"
          } : {
            duration: 0.1
          }
        }}
      >
        {/* 背景动画效果 */}
        <motion.div
          className="absolute inset-0 rounded-full bg-red-100"
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: isFavorited ? 1 : 0,
            opacity: isFavorited ? 1 : 0
          }}
          transition={{ duration: 0.2 }}
        />

        {/* 心形图标 */}
        <motion.div
          className="relative z-10 flex items-center justify-center"
          initial={false}
          animate={{
            scale: isFavorited ? [1, 1.3, 1] : 1,
          }}
          transition={{
            scale: isFavorited ? {
              duration: 0.3,
              times: [0, 0.5, 1],
              ease: "easeOut"
            } : {
              duration: 0.2
            }
          }}
        >
          {isFavorited ? (
            <HeartSolidIcon 
              className={cn(
                'text-red-500',
                iconSizeClasses[size]
              )}
            />
          ) : (
            <HeartIcon 
              className={cn(
                'text-gray-600 hover:text-red-500 transition-colors duration-200',
                iconSizeClasses[size]
              )}
            />
          )}
        </motion.div>

        {/* 加载状态指示器 */}
        {isLoading && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-red-200 border-t-red-500"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        )}

        {/* 点击波纹效果 */}
        <motion.div
          className="absolute inset-0 rounded-full bg-red-500/20"
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: isFavorited ? [0, 2, 0] : 0,
            opacity: isFavorited ? [0, 0.5, 0] : 0
          }}
          transition={{
            duration: 0.6,
            ease: "easeOut"
          }}
        />
      </motion.button>

      {/* 收藏数量显示 */}
      {showCount && favoriteCount > 0 && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-xs text-gray-500 font-medium"
        >
          {favoriteCount}
        </motion.span>
      )}
    </div>
  );
};

export default FavoriteButton;
