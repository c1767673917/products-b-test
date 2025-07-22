import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  SyncMode,
  SyncStatus,
  SyncProgress,
  SyncRecord,
  SyncOptions,
  SyncError,
  ValidationResult,
  ServiceStatus,
  SyncWebSocketMessage
} from '../types/sync';

// WebSocket连接状态
export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// 同步状态管理
interface SyncState {
  // 当前同步状态
  currentSync: {
    id: string | null;
    mode: SyncMode | null;
    status: SyncStatus;
    progress: SyncProgress | null;
    startTime: string | null;
    errors: SyncError[];
    logs: string[];
  };

  // 同步历史
  history: {
    records: SyncRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    filters: {
      status?: SyncStatus;
      mode?: SyncMode;
      dateFrom?: string;
      dateTo?: string;
    };
    loading: boolean;
    error: string | null;
  };

  // 数据验证
  validation: {
    result: ValidationResult | null;
    loading: boolean;
    error: string | null;
    lastCheck: string | null;
  };

  // 服务状态
  serviceStatus: {
    data: ServiceStatus | null;
    loading: boolean;
    error: string | null;
    lastCheck: string | null;
  };

  // WebSocket连接
  websocket: {
    status: WebSocketStatus;
    connection: WebSocket | null;
    messages: SyncWebSocketMessage[];
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    reconnectDelay: number;
    lastHeartbeat: string | null;
  };

  // 用户设置
  settings: {
    defaultSyncMode: SyncMode;
    defaultOptions: SyncOptions;
    autoReconnect: boolean;
    showProgressNotifications: boolean;
    showErrorNotifications: boolean;
    maxLogMessages: number;
    refreshInterval: number;
  };

  // 操作方法
  actions: {
    // 同步操作
    startSync: (mode: SyncMode, options?: SyncOptions, productIds?: string[]) => Promise<void>;
    pauseSync: () => Promise<void>;
    resumeSync: () => Promise<void>;
    cancelSync: () => Promise<void>;
    
    // 历史记录
    loadHistory: (params?: any) => Promise<void>;
    setHistoryFilters: (filters: any) => void;
    clearHistory: () => void;
    
    // 数据验证
    validateData: () => Promise<void>;
    repairData: (issueIds?: string[]) => Promise<void>;
    
    // 服务状态
    checkServiceStatus: () => Promise<void>;
    
    // WebSocket
    connectWebSocket: () => void;
    disconnectWebSocket: () => void;
    handleWebSocketMessage: (message: SyncWebSocketMessage) => void;
    
    // 设置
    updateSettings: (settings: Partial<SyncState['settings']>) => void;
    resetSettings: () => void;
    
    // 状态管理
    clearCurrentSync: () => void;
    addError: (error: SyncError) => void;
    addLog: (message: string) => void;
    clearErrors: () => void;
    clearLogs: () => void;
  };
}

// 初始状态
const initialState = {
  currentSync: {
    id: null,
    mode: null,
    status: 'idle' as SyncStatus,
    progress: null,
    startTime: null,
    errors: [],
    logs: []
  },
  
  history: {
    records: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    },
    filters: {},
    loading: false,
    error: null
  },
  
  validation: {
    result: null,
    loading: false,
    error: null,
    lastCheck: null
  },
  
  serviceStatus: {
    data: null,
    loading: false,
    error: null,
    lastCheck: null
  },
  
  websocket: {
    status: 'disconnected' as WebSocketStatus,
    connection: null,
    messages: [],
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 3000,
    lastHeartbeat: null
  },
  
  settings: {
    defaultSyncMode: 'incremental' as SyncMode,
    defaultOptions: {
      skipImageDownload: false,
      skipDataValidation: false,
      batchSize: 50,
      concurrentImages: 5,
      retryCount: 3,
      forceUpdate: false
    },
    autoReconnect: true,
    showProgressNotifications: true,
    showErrorNotifications: true,
    maxLogMessages: 100,
    refreshInterval: 30000 // 30秒
  }
};

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      actions: {
        // 开始同步
        startSync: async (mode: SyncMode, options?: SyncOptions, productIds?: string[]) => {
          const state = get();
          
          // 如果已有同步在进行，先取消
          if (state.currentSync.status === 'running' || state.currentSync.status === 'paused') {
            await get().actions.cancelSync();
          }
          
          const syncId = `sync_${Date.now()}`;
          const startTime = new Date().toISOString();
          
          set(state => ({
            currentSync: {
              id: syncId,
              mode,
              status: 'pending',
              progress: {
                current: 0,
                total: 0,
                processed: 0,
                created: 0,
                updated: 0,
                skipped: 0,
                errors: 0,
                percentage: 0,
                stage: 'preparing'
              },
              startTime,
              errors: [],
              logs: [`开始 ${mode} 同步模式...`]
            }
          }));
          
          try {
            // 调用后端API
            const response = await fetch('/api/v1/sync/feishu', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mode,
                options: { ...state.settings.defaultOptions, ...options },
                productIds
              })
            });
            
            if (!response.ok) {
              throw new Error(`同步启动失败: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            set(state => ({
              currentSync: {
                ...state.currentSync,
                id: result.data.syncId || syncId,
                status: 'running'
              }
            }));
            
            get().actions.addLog('同步任务启动成功');
            
            // 自动连接WebSocket
            if (state.websocket.status !== 'connected') {
              get().actions.connectWebSocket();
            }
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '启动同步失败';
            get().actions.addError({
              type: 'api',
              code: 'SYNC_START_FAILED',
              message: errorMessage,
              timestamp: new Date().toISOString()
            });
            
            set(state => ({
              currentSync: {
                ...state.currentSync,
                status: 'failed'
              }
            }));
          }
        },
        
        // 暂停同步
        pauseSync: async () => {
          const state = get();
          if (!state.currentSync.id || state.currentSync.status !== 'running') {
            return;
          }
          
          try {
            const response = await fetch('/api/v1/sync/control', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                operation: 'pause',
                syncId: state.currentSync.id
              })
            });
            
            if (!response.ok) {
              throw new Error(`暂停同步失败: ${response.statusText}`);
            }
            
            set(state => ({
              currentSync: {
                ...state.currentSync,
                status: 'paused'
              }
            }));
            
            get().actions.addLog('同步任务已暂停');
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '暂停同步失败';
            get().actions.addError({
              type: 'api',
              code: 'SYNC_PAUSE_FAILED',
              message: errorMessage,
              timestamp: new Date().toISOString()
            });
          }
        },
        
        // 恢复同步
        resumeSync: async () => {
          const state = get();
          if (!state.currentSync.id || state.currentSync.status !== 'paused') {
            return;
          }
          
          try {
            const response = await fetch('/api/v1/sync/control', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                operation: 'resume',
                syncId: state.currentSync.id
              })
            });
            
            if (!response.ok) {
              throw new Error(`恢复同步失败: ${response.statusText}`);
            }
            
            set(state => ({
              currentSync: {
                ...state.currentSync,
                status: 'running'
              }
            }));
            
            get().actions.addLog('同步任务已恢复');
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '恢复同步失败';
            get().actions.addError({
              type: 'api',
              code: 'SYNC_RESUME_FAILED',
              message: errorMessage,
              timestamp: new Date().toISOString()
            });
          }
        },
        
        // 取消同步
        cancelSync: async () => {
          const state = get();
          if (!state.currentSync.id || state.currentSync.status === 'idle') {
            return;
          }
          
          try {
            const response = await fetch('/api/v1/sync/control', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                operation: 'cancel',
                syncId: state.currentSync.id
              })
            });
            
            if (!response.ok) {
              throw new Error(`取消同步失败: ${response.statusText}`);
            }
            
            set(state => ({
              currentSync: {
                ...state.currentSync,
                status: 'cancelled'
              }
            }));
            
            get().actions.addLog('同步任务已取消');
            
            // 延迟清理状态
            setTimeout(() => {
              get().actions.clearCurrentSync();
            }, 3000);
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '取消同步失败';
            get().actions.addError({
              type: 'api',
              code: 'SYNC_CANCEL_FAILED',
              message: errorMessage,
              timestamp: new Date().toISOString()
            });
          }
        },
        
        // 加载历史记录
        loadHistory: async (params = {}) => {
          const state = get();
          const queryParams = {
            ...params,
            page: params.page || state.history.pagination.page,
            limit: params.limit || state.history.pagination.limit,
            ...state.history.filters
          };
          
          set(state => ({
            history: { ...state.history, loading: true, error: null }
          }));
          
          try {
            const searchParams = new URLSearchParams();
            Object.entries(queryParams).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                searchParams.append(key, value.toString());
              }
            });
            
            const response = await fetch(`/api/v1/sync/history?${searchParams}`);
            
            if (!response.ok) {
              throw new Error(`加载历史记录失败: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            set(state => ({
              history: {
                ...state.history,
                records: result.data.records || [],
                pagination: result.data.pagination || state.history.pagination,
                loading: false
              }
            }));
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '加载历史记录失败';
            set(state => ({
              history: {
                ...state.history,
                loading: false,
                error: errorMessage
              }
            }));
          }
        },
        
        // 设置历史筛选
        setHistoryFilters: (filters) => {
          set(state => ({
            history: {
              ...state.history,
              filters: { ...state.history.filters, ...filters },
              pagination: { ...state.history.pagination, page: 1 }
            }
          }));
          
          // 重新加载数据
          get().actions.loadHistory();
        },
        
        // 清空历史记录
        clearHistory: () => {
          set(state => ({
            history: {
              ...state.history,
              records: [],
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
            }
          }));
        },
        
        // 验证数据
        validateData: async () => {
          set(state => ({
            validation: { ...state.validation, loading: true, error: null }
          }));
          
          try {
            const response = await fetch('/api/v1/sync/validate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
              throw new Error(`数据验证失败: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            set(state => ({
              validation: {
                result: result.data,
                loading: false,
                error: null,
                lastCheck: new Date().toISOString()
              }
            }));
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '数据验证失败';
            set(state => ({
              validation: {
                ...state.validation,
                loading: false,
                error: errorMessage
              }
            }));
          }
        },
        
        // 修复数据
        repairData: async (issueIds?: string[]) => {
          try {
            const response = await fetch('/api/v1/sync/repair', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ issueIds })
            });
            
            if (!response.ok) {
              throw new Error(`数据修复失败: ${response.statusText}`);
            }
            
            // 修复后重新验证
            await get().actions.validateData();
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '数据修复失败';
            set(state => ({
              validation: {
                ...state.validation,
                error: errorMessage
              }
            }));
          }
        },
        
        // 检查服务状态
        checkServiceStatus: async () => {
          set(state => ({
            serviceStatus: { ...state.serviceStatus, loading: true, error: null }
          }));
          
          try {
            const response = await fetch('/api/v1/sync/service-status');
            
            if (!response.ok) {
              throw new Error(`检查服务状态失败: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            set(state => ({
              serviceStatus: {
                data: result.data,
                loading: false,
                error: null,
                lastCheck: new Date().toISOString()
              }
            }));
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '检查服务状态失败';
            set(state => ({
              serviceStatus: {
                ...state.serviceStatus,
                loading: false,
                error: errorMessage
              }
            }));
          }
        },
        
        // 连接WebSocket
        connectWebSocket: () => {
          const state = get();
          
          if (state.websocket.status === 'connected' || state.websocket.status === 'connecting') {
            return;
          }
          
          set(state => ({
            websocket: { ...state.websocket, status: 'connecting' }
          }));
          
          try {
            const wsUrl = `ws://localhost:3000/api/v1/sync/progress`;
            const ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
              set(state => ({
                websocket: {
                  ...state.websocket,
                  status: 'connected',
                  connection: ws,
                  reconnectAttempts: 0,
                  lastHeartbeat: new Date().toISOString()
                }
              }));
              
              get().actions.addLog('WebSocket 连接已建立');
            };
            
            ws.onmessage = (event) => {
              try {
                const message: SyncWebSocketMessage = JSON.parse(event.data);
                get().actions.handleWebSocketMessage(message);
              } catch (error) {
                console.error('WebSocket消息解析失败:', error);
              }
            };
            
            ws.onclose = () => {
              set(state => ({
                websocket: {
                  ...state.websocket,
                  status: 'disconnected',
                  connection: null
                }
              }));
              
              // 自动重连
              const state = get();
              if (state.settings.autoReconnect && 
                  state.websocket.reconnectAttempts < state.websocket.maxReconnectAttempts) {
                
                setTimeout(() => {
                  set(state => ({
                    websocket: {
                      ...state.websocket,
                      reconnectAttempts: state.websocket.reconnectAttempts + 1
                    }
                  }));
                  
                  get().actions.connectWebSocket();
                }, state.websocket.reconnectDelay);
              }
            };
            
            ws.onerror = (error) => {
              console.error('WebSocket错误:', error);
              set(state => ({
                websocket: { ...state.websocket, status: 'error' }
              }));
            };
            
          } catch (error) {
            console.error('WebSocket连接失败:', error);
            set(state => ({
              websocket: { ...state.websocket, status: 'error' }
            }));
          }
        },
        
        // 断开WebSocket
        disconnectWebSocket: () => {
          const state = get();
          if (state.websocket.connection) {
            state.websocket.connection.close();
          }
          
          set(state => ({
            websocket: {
              ...state.websocket,
              status: 'disconnected',
              connection: null,
              reconnectAttempts: 0
            }
          }));
        },
        
        // 处理WebSocket消息
        handleWebSocketMessage: (message: SyncWebSocketMessage) => {
          const state = get();
          
          // 添加到消息队列
          set(state => ({
            websocket: {
              ...state.websocket,
              messages: [...state.websocket.messages.slice(-99), message] // 保留最后100条消息
            }
          }));
          
          // 根据消息类型更新状态
          switch (message.type) {
            case 'progress':
              if (message.syncId === state.currentSync.id) {
                set(state => ({
                  currentSync: {
                    ...state.currentSync,
                    progress: message.data
                  }
                }));
              }
              break;
              
            case 'status_change':
              if (message.syncId === state.currentSync.id) {
                set(state => ({
                  currentSync: {
                    ...state.currentSync,
                    status: message.data.status
                  }
                }));
              }
              break;
              
            case 'error':
              if (message.syncId === state.currentSync.id) {
                get().actions.addError(message.data);
              }
              break;
              
            case 'log':
              if (message.syncId === state.currentSync.id) {
                get().actions.addLog(message.data.message);
              }
              break;
              
            case 'completion':
              if (message.syncId === state.currentSync.id) {
                set(state => ({
                  currentSync: {
                    ...state.currentSync,
                    status: message.data.status,
                    progress: message.data.progress
                  }
                }));
                
                // 自动刷新历史记录
                get().actions.loadHistory();
              }
              break;
          }
        },
        
        // 更新设置
        updateSettings: (newSettings) => {
          set(state => ({
            settings: { ...state.settings, ...newSettings }
          }));
        },
        
        // 重置设置
        resetSettings: () => {
          set(state => ({
            settings: initialState.settings
          }));
        },
        
        // 清空当前同步
        clearCurrentSync: () => {
          set(state => ({
            currentSync: initialState.currentSync
          }));
        },
        
        // 添加错误
        addError: (error: SyncError) => {
          set(state => ({
            currentSync: {
              ...state.currentSync,
              errors: [...state.currentSync.errors, error]
            }
          }));
        },
        
        // 添加日志
        addLog: (message: string) => {
          const timestamp = new Date().toLocaleTimeString();
          const logMessage = `[${timestamp}] ${message}`;
          
          set(state => ({
            currentSync: {
              ...state.currentSync,
              logs: [...state.currentSync.logs.slice(-(state.settings.maxLogMessages - 1)), logMessage]
            }
          }));
        },
        
        // 清空错误
        clearErrors: () => {
          set(state => ({
            currentSync: {
              ...state.currentSync,
              errors: []
            }
          }));
        },
        
        // 清空日志
        clearLogs: () => {
          set(state => ({
            currentSync: {
              ...state.currentSync,
              logs: []
            }
          }));
        }
      }
    }),
    {
      name: 'sync-store',
      // 只持久化用户设置
      partialize: (state) => ({
        settings: state.settings
      })
    }
  )
);

// 选择器
export const useSyncCurrent = () => useSyncStore(state => state.currentSync);
export const useSyncHistory = () => useSyncStore(state => state.history);
export const useSyncValidation = () => useSyncStore(state => state.validation);
export const useSyncServiceStatus = () => useSyncStore(state => state.serviceStatus);
export const useSyncWebSocket = () => useSyncStore(state => state.websocket);
export const useSyncSettings = () => useSyncStore(state => state.settings);
export const useSyncActions = () => useSyncStore(state => state.actions);