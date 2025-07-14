// 动画设置面板组件
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CogIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  BoltIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Button } from './Button';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { useAnimationPreferences, type AnimationPreferences } from '../../hooks/useAnimationPreferences';
import { cn } from '../../utils/cn';

interface AnimationSettingsProps {
  className?: string;
}

export const AnimationSettings: React.FC<AnimationSettingsProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    preferences,
    savePreferences,
    resetPreferences,
    performanceMetrics,
    speedMultiplier,
  } = useAnimationPreferences();

  const handleToggle = (key: keyof AnimationPreferences, value: any) => {
    savePreferences({ [key]: value });
  };

  const getPerformanceColor = (fps: number) => {
    if (fps >= 50) return 'text-green-600';
    if (fps >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceLabel = (fps: number) => {
    if (fps >= 50) return '优秀';
    if (fps >= 30) return '良好';
    return '较差';
  };

  return (
    <>
      {/* 设置按钮 */}
      <motion.div
        className={cn('fixed bottom-4 right-4 z-50', className)}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 1, type: 'spring', stiffness: 200 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-12 h-12 shadow-lg"
          title="动画设置"
          ripple
        >
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <CogIcon className="w-5 h-5" />
          </motion.div>
        </Button>
      </motion.div>

      {/* 设置面板 */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* 设置面板 */}
            <motion.div
              key="panel"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <SparklesIcon className="w-5 h-5 text-blue-600" />
                      <span>动画设置</span>
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* 性能监控 */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">性能监控</h4>
                      <div className="flex items-center justify-between text-sm">
                        <span>帧率:</span>
                        <span className={getPerformanceColor(performanceMetrics.frameRate)}>
                          {performanceMetrics.frameRate} FPS ({getPerformanceLabel(performanceMetrics.frameRate)})
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span>动画速度:</span>
                        <span>{speedMultiplier}x</span>
                      </div>
                    </div>
                  )}

                  {/* 减少动画 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {preferences.reduceMotion ? (
                        <EyeSlashIcon className="w-4 h-4 text-gray-500" />
                      ) : (
                        <EyeIcon className="w-4 h-4 text-blue-600" />
                      )}
                      <div>
                        <div className="font-medium">减少动画</div>
                        <div className="text-xs text-gray-500">适合对动画敏感的用户</div>
                      </div>
                    </div>
                    <Button
                      variant={preferences.reduceMotion ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleToggle('reduceMotion', !preferences.reduceMotion)}
                    >
                      {preferences.reduceMotion ? '已启用' : '已禁用'}
                    </Button>
                  </div>

                  {/* 动画速度 */}
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <BoltIcon className="w-4 h-4 text-yellow-600" />
                      <div className="font-medium">动画速度</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(['slow', 'normal', 'fast'] as const).map((speed) => (
                        <Button
                          key={speed}
                          variant={preferences.animationSpeed === speed ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleToggle('animationSpeed', speed)}
                          disabled={preferences.reduceMotion}
                        >
                          {speed === 'slow' ? '慢' : speed === 'normal' ? '正常' : '快'}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* 动画效果开关 */}
                  <div className="space-y-3">
                    <h4 className="font-medium">动画效果</h4>
                    
                    {[
                      { key: 'enablePageTransitions', label: '页面切换动画', desc: '页面间的过渡效果' },
                      { key: 'enableScrollAnimations', label: '滚动动画', desc: '滚动触发的动画效果' },
                      { key: 'enableParallax', label: '视差效果', desc: '滚动视差动画' },
                      { key: 'enableRippleEffects', label: '波纹效果', desc: '按钮点击波纹动画' },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{label}</div>
                          <div className="text-xs text-gray-500">{desc}</div>
                        </div>
                        <Button
                          variant={preferences[key as keyof AnimationPreferences] ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleToggle(key as keyof AnimationPreferences, !preferences[key as keyof AnimationPreferences])}
                          disabled={preferences.reduceMotion}
                        >
                          {preferences[key as keyof AnimationPreferences] ? '开' : '关'}
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex space-x-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={resetPreferences}
                      className="flex-1"
                    >
                      重置默认
                    </Button>
                    <Button
                      onClick={() => setIsOpen(false)}
                      className="flex-1"
                    >
                      完成
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

// 动画性能警告组件
export const AnimationPerformanceWarning: React.FC = () => {
  const { performanceMetrics, preferences, savePreferences } = useAnimationPreferences();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !performanceMetrics.isLowPerformance || preferences.reduceMotion) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 max-w-md mx-4"
      >
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <BoltIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-800">性能提醒</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  检测到设备性能较低，建议减少动画效果以提升体验。
                </p>
                <div className="flex space-x-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => {
                      savePreferences({ reduceMotion: true });
                      setDismissed(true);
                    }}
                  >
                    优化设置
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDismissed(true)}
                  >
                    忽略
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimationSettings;
