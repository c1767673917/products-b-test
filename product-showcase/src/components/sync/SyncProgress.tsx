import React, { useEffect } from 'react';
import { Card } from '../ui/Card';
import { useSyncOperation, useSyncWebSocket } from '../../hooks/useSyncOperations';

export const SyncProgress: React.FC = () => {
  const { currentSync, isActive } = useSyncOperation();
  const { status: wsStatus, connect, isConnected } = useSyncWebSocket();

  // 自动连接WebSocket
  useEffect(() => {
    if (!isConnected && wsStatus !== 'connecting') {
      connect();
    }
  }, [isConnected, wsStatus, connect]);

  // 获取进度条颜色
  const getProgressColor = () => {
    if (currentSync.errors.length > 0) return 'bg-red-500';
    if (currentSync.status === 'paused') return 'bg-yellow-500';
    if (currentSync.status === 'running') return 'bg-blue-500';
    if (currentSync.status === 'completed') return 'bg-green-500';
    return 'bg-gray-500';
  };

  // 获取阶段显示名称
  const getStageDisplayName = (stage?: string) => {
    const stageMap: Record<string, string> = {
      'preparing': '准备中',
      'fetching': '获取数据',
      'processing': '处理数据',
      'images': '处理图片',
      'validating': '验证数据',
      'completed': '已完成'
    };
    return stageMap[stage || ''] || stage || '未知';
  };

  // 获取状态显示名称
  const getStatusDisplayName = (status: string) => {
    const statusMap: Record<string, string> = {
      'idle': '空闲',
      'pending': '准备中',
      'running': '运行中',
      'paused': '已暂停',
      'completed': '已完成',
      'failed': '失败',
      'cancelled': '已取消'
    };
    return statusMap[status] || status;
  };

  // 格式化时长
  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
    
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 估算剩余时间
  const estimateRemainingTime = () => {
    if (!currentSync.progress || !currentSync.startTime) return null;
    
    const { current, total } = currentSync.progress;
    if (total === 0 || current === 0) return null;
    
    const elapsed = (Date.now() - new Date(currentSync.startTime).getTime()) / 1000;
    const rate = current / elapsed;
    const remaining = (total - current) / rate;
    
    if (remaining < 60) return `约 ${Math.ceil(remaining)} 秒`;
    if (remaining < 3600) return `约 ${Math.ceil(remaining / 60)} 分钟`;
    return `约 ${Math.ceil(remaining / 3600)} 小时`;
  };

  if (!isActive) {
    return (
      <div className="space-y-6">
        {/* WebSocket连接状态 */}
        <Card>
          <Card.Content className="pt-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">😴</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900">当前没有进行中的同步任务</h3>
                <p className="text-sm text-gray-500 mt-2">
                  请前往"同步控制"页面启动新的同步任务
                </p>
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    isConnected 
                      ? 'bg-green-100 text-green-800' 
                      : wsStatus === 'connecting'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                  }`}>
                    <span className={`w-2 h-2 rounded-full mr-1 ${
                      isConnected 
                        ? 'bg-green-500' 
                        : wsStatus === 'connecting'
                          ? 'bg-yellow-500 animate-pulse'
                          : 'bg-red-500'
                    }`}></span>
                    实时连接 {isConnected ? '已连接' : wsStatus === 'connecting' ? '连接中' : '未连接'}
                  </span>
                </div>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* WebSocket连接状态 */}
      <div className="flex justify-end">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          isConnected 
            ? 'bg-green-100 text-green-800' 
            : wsStatus === 'connecting'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
        }`}>
          <span className={`w-2 h-2 rounded-full mr-2 ${
            isConnected 
              ? 'bg-green-500' 
              : wsStatus === 'connecting'
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500'
          }`}></span>
          实时连接 {isConnected ? '已连接' : wsStatus === 'connecting' ? '连接中' : '未连接'}
        </span>
      </div>

      {/* 同步概览 */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <div>
              <Card.Title>
                同步进度 - {currentSync.mode === 'full' ? '全量同步' : 
                           currentSync.mode === 'incremental' ? '增量同步' : '选择性同步'}
              </Card.Title>
              <Card.Description>
                状态: {getStatusDisplayName(currentSync.status)}
                {currentSync.startTime && (
                  <span className="ml-4">
                    运行时长: {formatDuration(currentSync.startTime)}
                  </span>
                )}
              </Card.Description>
            </div>
            <div className={`w-4 h-4 rounded-full ${
              currentSync.status === 'running' ? 'bg-green-500 animate-pulse' :
              currentSync.status === 'paused' ? 'bg-yellow-500' :
              currentSync.status === 'pending' ? 'bg-blue-500 animate-pulse' :
              currentSync.status === 'completed' ? 'bg-green-500' :
              currentSync.status === 'failed' ? 'bg-red-500' :
              'bg-gray-500'
            }`}></div>
          </div>
        </Card.Header>
        <Card.Content>
          {currentSync.progress && (
            <div className="space-y-4">
              {/* 总体进度条 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    总体进度 ({currentSync.progress.current}/{currentSync.progress.total})
                  </span>
                  <span className="text-sm text-gray-500">
                    {currentSync.progress.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                    style={{ width: `${currentSync.progress.percentage}%` }}
                  ></div>
                </div>
              </div>

              {/* 当前阶段 */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${getProgressColor()}`}></div>
                  <span className="font-medium text-gray-900">
                    当前阶段: {getStageDisplayName(currentSync.progress.stage)}
                  </span>
                </div>
                {currentSync.progress.currentOperation && (
                  <span className="text-sm text-gray-600">
                    {currentSync.progress.currentOperation}
                  </span>
                )}
              </div>

              {/* 剩余时间估算 */}
              {currentSync.status === 'running' && (
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    {estimateRemainingTime() && (
                      <>预计剩余时间: {estimateRemainingTime()}</>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </Card.Content>
      </Card>

      {/* 详细统计 */}
      {currentSync.progress && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-green-50 border-green-200">
            <Card.Content className="pt-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900">已处理</p>
                  <p className="text-2xl font-bold text-green-900">
                    {currentSync.progress.processed}
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <Card.Content className="pt-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🆕</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900">新增</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {currentSync.progress.created}
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <Card.Content className="pt-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">🔄</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-900">更新</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {currentSync.progress.updated}
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>

          <Card className={`${
            currentSync.progress.errors > 0 
              ? 'bg-red-50 border-red-200' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <Card.Content className="pt-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">
                    {currentSync.progress.errors > 0 ? '❌' : '⏭️'}
                  </span>
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    currentSync.progress.errors > 0 ? 'text-red-900' : 'text-gray-900'
                  }`}>
                    {currentSync.progress.errors > 0 ? '错误' : '跳过'}
                  </p>
                  <p className={`text-2xl font-bold ${
                    currentSync.progress.errors > 0 ? 'text-red-900' : 'text-gray-900'
                  }`}>
                    {currentSync.progress.errors > 0 ? currentSync.progress.errors : currentSync.progress.skipped}
                  </p>
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>
      )}

      {/* 错误信息 */}
      {currentSync.errors.length > 0 && (
        <Card className="border-red-200">
          <Card.Header>
            <Card.Title className="text-red-800">同步错误</Card.Title>
            <Card.Description>
              发现 {currentSync.errors.length} 个错误
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {currentSync.errors.map((error, index) => (
                <div 
                  key={index}
                  className="p-3 bg-red-50 border border-red-200 rounded-md"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">
                        {error.type}: {error.message}
                      </p>
                      {error.productId && (
                        <p className="text-xs text-red-600 mt-1">
                          产品ID: {error.productId}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-red-500 ml-2">
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}

      {/* 实时日志 */}
      {currentSync.logs.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>同步日志</Card.Title>
            <Card.Description>
              实时同步操作记录
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm max-h-64 overflow-y-auto">
              {currentSync.logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};