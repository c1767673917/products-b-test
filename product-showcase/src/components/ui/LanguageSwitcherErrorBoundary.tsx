import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { LanguageSwitcher } from './LanguageSwitcher';
import { LanguageIcon } from '@heroicons/react/24/outline';

interface LanguageSwitcherErrorBoundaryProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'dropdown' | 'buttons' | 'compact';
  size?: 'sm' | 'md' | 'lg';
}

// 简单的回退组件
const LanguageSwitcherFallback: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-md ${className || ''}`}>
    <LanguageIcon className="w-5 h-5 text-gray-400" />
    <span className="text-gray-600 text-sm">语言切换暂不可用</span>
  </div>
);

export const LanguageSwitcherWithErrorBoundary: React.FC<LanguageSwitcherErrorBoundaryProps> = (props) => {
  return (
    <ErrorBoundary
      fallback={<LanguageSwitcherFallback className={props.className} />}
      onError={(error, errorInfo) => {
        console.error('LanguageSwitcher Error:', error);
        console.error('Error Info:', errorInfo);
        
        // 可以在这里添加错误监控服务
        // 例如: Sentry.captureException(error, { extra: errorInfo });
      }}
    >
      <LanguageSwitcher {...props} />
    </ErrorBoundary>
  );
};

LanguageSwitcherWithErrorBoundary.displayName = 'LanguageSwitcherWithErrorBoundary';

export default LanguageSwitcherWithErrorBoundary;
