// 导出所有类型定义
export * from './product';

// 通用类型定义
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// 组件通用属性
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// 按钮变体
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

// 输入框类型
export type InputType = 'text' | 'email' | 'password' | 'number' | 'search';

// 通知类型
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// 主题模式
export type ThemeMode = 'light' | 'dark' | 'system';
