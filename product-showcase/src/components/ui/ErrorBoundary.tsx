import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';
import { Card } from './Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // 调用错误回调
    this.props.onError?.(error, errorInfo);

    // 记录错误到控制台
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // 可以在这里集成错误监控服务
    // 例如: Sentry.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    
    // 创建错误报告
    const errorReport = {
      id: errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // 复制到剪贴板
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('错误报告已复制到剪贴板');
      })
      .catch(() => {
        console.log('错误报告:', errorReport);
        alert('错误报告已输出到控制台');
      });
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误UI
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="min-h-screen flex items-center justify-center p-4 bg-gray-50"
        >
          <Card className="max-w-lg w-full p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center"
            >
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
            </motion.div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              出现了一些问题
            </h1>
            
            <p className="text-gray-600 mb-6">
              应用遇到了意外错误。这可能是由于性能优化过程中的兼容性问题导致的。
            </p>

            {/* 错误详情（开发环境） */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  错误详情
                </summary>
                <div className="bg-gray-100 rounded-lg p-4 text-xs font-mono overflow-auto max-h-40">
                  <div className="text-red-600 mb-2">
                    {this.state.error.message}
                  </div>
                  <div className="text-gray-600">
                    {this.state.error.stack}
                  </div>
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleRetry}
                className="flex items-center justify-center space-x-2"
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span>重试</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={this.handleReportError}
              >
                报告错误
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => window.location.reload()}
              >
                刷新页面
              </Button>
            </div>

            <div className="mt-6 text-xs text-gray-500">
              错误ID: {this.state.errorId}
            </div>
          </Card>
        </motion.div>
      );
    }

    return this.props.children;
  }
}

// 高阶组件版本
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook版本（用于函数组件）
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  // 如果有错误，抛出它让ErrorBoundary捕获
  if (error) {
    throw error;
  }

  return { captureError, resetError };
}

// 性能监控错误边界
export const PerformanceErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // 记录性能相关错误
        console.error('Performance Error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: Date.now(),
        });
      }}
      fallback={
        <div className="p-8 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            性能组件加载失败
          </h2>
          <p className="text-gray-600 mb-4">
            性能监控组件遇到问题，但不影响主要功能的使用。
          </p>
          <Button onClick={() => window.location.reload()}>
            刷新页面
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};
