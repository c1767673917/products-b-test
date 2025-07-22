import { useEffect, useCallback, useRef } from 'react';
import { useSyncStore, useSyncActions, useSyncCurrent } from '../stores/syncStore';
import type { SyncMode, SyncOptions, SyncWebSocketMessage } from '../types/sync';

// 同步操作Hook
export const useSyncOperation = () => {
  const currentSync = useSyncCurrent();
  const actions = useSyncActions();

  // 开始同步
  const startSync = useCallback(async (
    mode: SyncMode, 
    options?: SyncOptions, 
    productIds?: string[]
  ) => {
    try {
      await actions.startSync(mode, options, productIds);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : '同步启动失败';
      return { success: false, error: message };
    }
  }, [actions]);

  // 暂停同步
  const pauseSync = useCallback(async () => {
    try {
      await actions.pauseSync();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : '暂停同步失败';
      return { success: false, error: message };
    }
  }, [actions]);

  // 恢复同步
  const resumeSync = useCallback(async () => {
    try {
      await actions.resumeSync();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : '恢复同步失败';
      return { success: false, error: message };
    }
  }, [actions]);

  // 取消同步
  const cancelSync = useCallback(async () => {
    try {
      await actions.cancelSync();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : '取消同步失败';
      return { success: false, error: message };
    }
  }, [actions]);

  // 检查是否可以执行操作
  const canStart = currentSync.status === 'idle' || currentSync.status === 'completed' || 
                   currentSync.status === 'failed' || currentSync.status === 'cancelled';
  const canPause = currentSync.status === 'running';
  const canResume = currentSync.status === 'paused';
  const canCancel = currentSync.status === 'running' || currentSync.status === 'paused' || 
                    currentSync.status === 'pending';

  return {
    currentSync,
    startSync,
    pauseSync,
    resumeSync,
    cancelSync,
    canStart,
    canPause,
    canResume,
    canCancel,
    isActive: currentSync.status === 'running' || currentSync.status === 'paused' || 
              currentSync.status === 'pending'
  };
};

// WebSocket连接Hook
export const useSyncWebSocket = () => {
  const websocket = useSyncStore(state => state.websocket);
  const actions = useSyncActions();
  const reconnectTimerRef = useRef<NodeJS.Timeout>();
  const heartbeatTimerRef = useRef<NodeJS.Timeout>();

  // 连接WebSocket
  const connect = useCallback(() => {
    actions.connectWebSocket();
  }, [actions]);

  // 断开WebSocket
  const disconnect = useCallback(() => {
    actions.disconnectWebSocket();
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }
  }, [actions]);

  // 发送心跳
  const sendHeartbeat = useCallback(() => {
    if (websocket.connection && websocket.status === 'connected') {
      try {
        websocket.connection.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error('发送心跳失败:', error);
      }
    }
  }, [websocket.connection, websocket.status]);

  // 自动连接和心跳
  useEffect(() => {
    // 启动时自动连接
    if (websocket.status === 'disconnected') {
      connect();
    }

    // 设置心跳
    if (websocket.status === 'connected') {
      heartbeatTimerRef.current = setInterval(sendHeartbeat, 30000); // 30秒心跳
    }

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
    };
  }, [websocket.status, connect, sendHeartbeat]);

  // 清理
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status: websocket.status,
    messages: websocket.messages,
    connect,
    disconnect,
    isConnected: websocket.status === 'connected',
    isConnecting: websocket.status === 'connecting',
    reconnectAttempts: websocket.reconnectAttempts,
    maxReconnectAttempts: websocket.maxReconnectAttempts
  };
};

// 同步历史Hook
export const useSyncHistory = () => {
  const history = useSyncStore(state => state.history);
  const actions = useSyncActions();

  // 加载历史记录
  const loadHistory = useCallback((params?: any) => {
    return actions.loadHistory(params);
  }, [actions]);

  // 设置过滤器
  const setFilters = useCallback((filters: any) => {
    actions.setHistoryFilters(filters);
  }, [actions]);

  // 清空历史
  const clearHistory = useCallback(() => {
    actions.clearHistory();
  }, [actions]);

  // 刷新数据
  const refresh = useCallback(() => {
    return loadHistory();
  }, [loadHistory]);

  // 自动加载
  useEffect(() => {
    if (history.records.length === 0 && !history.loading) {
      loadHistory();
    }
  }, [loadHistory, history.records.length, history.loading]);

  return {
    records: history.records,
    pagination: history.pagination,
    filters: history.filters,
    loading: history.loading,
    error: history.error,
    loadHistory,
    setFilters,
    clearHistory,
    refresh
  };
};

// 数据验证Hook
export const useDataValidation = () => {
  const validation = useSyncStore(state => state.validation);
  const actions = useSyncActions();

  // 验证数据
  const validateData = useCallback(async () => {
    try {
      await actions.validateData();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : '数据验证失败';
      return { success: false, error: message };
    }
  }, [actions]);

  // 修复数据
  const repairData = useCallback(async (issueIds?: string[]) => {
    try {
      await actions.repairData(issueIds);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : '数据修复失败';
      return { success: false, error: message };
    }
  }, [actions]);

  // 获取问题统计
  const getIssueSummary = useCallback(() => {
    if (!validation.result) return null;

    const summary = validation.result.summary;
    return {
      total: summary.totalIssues,
      critical: summary.criticalIssues,
      warning: summary.warningIssues,
      info: summary.totalIssues - summary.criticalIssues - summary.warningIssues,
      canAutoFix: validation.result.issues.filter(issue => issue.canAutoFix).length
    };
  }, [validation.result]);

  return {
    result: validation.result,
    loading: validation.loading,
    error: validation.error,
    lastCheck: validation.lastCheck,
    validateData,
    repairData,
    issueSummary: getIssueSummary(),
    hasIssues: validation.result && validation.result.summary.totalIssues > 0
  };
};

// 服务状态Hook
export const useServiceStatus = () => {
  const serviceStatus = useSyncStore(state => state.serviceStatus);
  const actions = useSyncActions();

  // 检查服务状态
  const checkStatus = useCallback(async () => {
    try {
      await actions.checkServiceStatus();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : '检查服务状态失败';
      return { success: false, error: message };
    }
  }, [actions]);

  // 获取整体健康状态
  const getOverallHealth = useCallback(() => {
    if (!serviceStatus.data) return 'unknown';
    
    const services = serviceStatus.data.services;
    const hasError = Object.values(services).some(status => status === 'error');
    const hasDisconnected = Object.values(services).some(status => status === 'disconnected');
    
    if (hasError) return 'unhealthy';
    if (hasDisconnected) return 'degraded';
    return 'healthy';
  }, [serviceStatus.data]);

  // 自动检查（定期）
  useEffect(() => {
    // 初始检查
    if (!serviceStatus.data && !serviceStatus.loading) {
      checkStatus();
    }

    // 定期检查（每5分钟）
    const interval = setInterval(checkStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [checkStatus, serviceStatus.data, serviceStatus.loading]);

  return {
    data: serviceStatus.data,
    loading: serviceStatus.loading,
    error: serviceStatus.error,
    lastCheck: serviceStatus.lastCheck,
    checkStatus,
    overallHealth: getOverallHealth(),
    isHealthy: getOverallHealth() === 'healthy'
  };
};

// 同步设置Hook
export const useSyncSettings = () => {
  const settings = useSyncStore(state => state.settings);
  const actions = useSyncActions();

  // 更新设置
  const updateSettings = useCallback((newSettings: Partial<typeof settings>) => {
    actions.updateSettings(newSettings);
  }, [actions]);

  // 重置设置
  const resetSettings = useCallback(() => {
    actions.resetSettings();
  }, [actions]);

  return {
    settings,
    updateSettings,
    resetSettings
  };
};