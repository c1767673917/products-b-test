// 同步相关类型定义

// 同步模式
export type SyncMode = 'full' | 'incremental' | 'selective';

// 同步状态
export type SyncStatus = 'idle' | 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

// 同步操作
export type SyncOperation = 'start' | 'pause' | 'resume' | 'cancel' | 'validate' | 'repair';

// 同步配置选项
export interface SyncOptions {
  skipImageDownload?: boolean;
  skipDataValidation?: boolean;
  batchSize?: number;
  concurrentImages?: number;
  retryCount?: number;
  forceUpdate?: boolean;
}

// 同步进度信息
export interface SyncProgress {
  current: number;
  total: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  percentage: number;
  stage: 'preparing' | 'fetching' | 'processing' | 'images' | 'validating' | 'completed';
  currentOperation?: string;
  estimatedTimeRemaining?: number;
}

// 同步错误
export interface SyncError {
  type: 'api' | 'network' | 'validation' | 'image' | 'database' | 'system';
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  productId?: string;
  retry?: boolean;
}

// 同步记录
export interface SyncRecord {
  id: string;
  mode: SyncMode;
  status: SyncStatus;
  startTime: string;
  endTime?: string;
  duration?: number;
  progress: SyncProgress;
  options: SyncOptions;
  results: {
    totalRecords: number;
    processedRecords: number;
    createdRecords: number;
    updatedRecords: number;
    skippedRecords: number;
    errorRecords: number;
    downloadedImages: number;
    validationErrors: number;
  };
  errors: SyncError[];
  logs: string[];
}

// 同步历史查询参数
export interface SyncHistoryParams {
  page?: number;
  limit?: number;
  status?: SyncStatus;
  mode?: SyncMode;
  dateFrom?: string;
  dateTo?: string;
}

// WebSocket 消息类型
export interface SyncWebSocketMessage {
  type: 'progress' | 'status_change' | 'error' | 'log' | 'completion';
  data: any;
  timestamp: string;
  syncId: string;
}

// 数据验证结果
export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  summary: {
    totalChecked: number;
    totalIssues: number;
    criticalIssues: number;
    warningIssues: number;
  };
}

// 验证问题
export interface ValidationIssue {
  id: string;
  type: 'critical' | 'warning' | 'info';
  category: 'data' | 'image' | 'reference' | 'format';
  message: string;
  description?: string;
  productId?: string;
  field?: string;
  currentValue?: any;
  expectedValue?: any;
  canAutoFix: boolean;
  fixAction?: string;
}

// 服务状态
export interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: 'connected' | 'disconnected' | 'error';
    feishuApi: 'connected' | 'disconnected' | 'error';
    imageStorage: 'connected' | 'disconnected' | 'error';
    websocket: 'connected' | 'disconnected' | 'error';
  };
  lastCheck: string;
}

// API响应类型
export interface SyncApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

// 同步触发参数
export interface SyncTriggerParams {
  mode: SyncMode;
  options?: SyncOptions;
  productIds?: string[];
}

// 同步控制参数
export interface SyncControlParams {
  operation: SyncOperation;
  syncId: string;
}