import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useSyncOperation } from '../../hooks/useSyncOperations';
import type { SyncMode, SyncOptions } from '../../types/sync';

export const SyncController: React.FC = () => {
  const {
    currentSync,
    startSync,
    pauseSync,
    resumeSync,
    cancelSync,
    canStart,
    canPause,
    canResume,
    canCancel,
    isActive
  } = useSyncOperation();

  const [selectedMode, setSelectedMode] = useState<SyncMode>('incremental');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [options, setOptions] = useState<SyncOptions>({
    skipImageDownload: false,
    skipDataValidation: false,
    batchSize: 50,
    concurrentImages: 5,
    retryCount: 3,
    forceUpdate: false
  });
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [loading, setLoading] = useState(false);

  // 同步模式配置
  const syncModes = [
    {
      id: 'full' as SyncMode,
      name: '全量同步',
      description: '同步所有飞书数据，包括已存在的记录',
      icon: '🔄',
      recommended: false,
      estimatedTime: '15-30分钟'
    },
    {
      id: 'incremental' as SyncMode,
      name: '增量同步',
      description: '只同步新增或修改的数据',
      icon: '⚡',
      recommended: true,
      estimatedTime: '2-5分钟'
    },
    {
      id: 'selective' as SyncMode,
      name: '选择性同步',
      description: '同步指定的产品记录',
      icon: '🎯',
      recommended: false,
      estimatedTime: '1-10分钟'
    }
  ];

  // 处理同步启动
  const handleStartSync = async () => {
    setLoading(true);
    try {
      const result = await startSync(
        selectedMode,
        options,
        selectedMode === 'selective' ? selectedProductIds : undefined
      );
      
      if (!result.success) {
        alert(`启动同步失败: ${result.error}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // 处理控制操作
  const handleControlOperation = async (operation: 'pause' | 'resume' | 'cancel') => {
    setLoading(true);
    try {
      let result;
      switch (operation) {
        case 'pause':
          result = await pauseSync();
          break;
        case 'resume':
          result = await resumeSync();
          break;
        case 'cancel':
          result = await cancelSync();
          break;
      }
      
      if (!result.success) {
        alert(`操作失败: ${result.error}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 当前同步状态 */}
      {isActive && (
        <Card className="border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className={`w-3 h-3 rounded-full ${
                  currentSync.status === 'running' ? 'bg-green-500 animate-pulse' :
                  currentSync.status === 'paused' ? 'bg-yellow-500' :
                  currentSync.status === 'pending' ? 'bg-blue-500 animate-pulse' :
                  'bg-gray-500'
                }`}></div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-blue-900">
                  同步进行中 - {currentSync.mode === 'full' ? '全量' : 
                              currentSync.mode === 'incremental' ? '增量' : '选择性'}同步
                </h3>
                <p className="text-blue-700">
                  状态: {
                    currentSync.status === 'running' ? '运行中' :
                    currentSync.status === 'paused' ? '已暂停' :
                    currentSync.status === 'pending' ? '准备中' :
                    currentSync.status
                  }
                  {currentSync.startTime && (
                    <span className="ml-2">
                      开始时间: {new Date(currentSync.startTime).toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            {/* 控制按钮 */}
            <div className="flex items-center space-x-2">
              {canPause && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleControlOperation('pause')}
                  disabled={loading}
                >
                  暂停
                </Button>
              )}
              {canResume && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleControlOperation('resume')}
                  disabled={loading}
                >
                  恢复
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleControlOperation('cancel')}
                  disabled={loading}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  取消
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 同步模式选择 */}
      <Card>
        <Card.Header>
          <Card.Title>选择同步模式</Card.Title>
          <Card.Description>
            根据您的需求选择合适的同步方式
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div className="grid gap-4 md:grid-cols-3">
            {syncModes.map((mode) => (
              <div
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`
                  relative cursor-pointer rounded-lg border-2 p-4 hover:bg-gray-50
                  ${selectedMode === mode.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                  transition-colors duration-200
                `}
              >
                {mode.recommended && (
                  <div className="absolute -top-2 -right-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      推荐
                    </span>
                  </div>
                )}
                
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">{mode.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="syncMode"
                        value={mode.id}
                        checked={selectedMode === mode.id}
                        onChange={() => setSelectedMode(mode.id)}
                        className="sr-only"
                      />
                      <h3 className="text-lg font-medium text-gray-900">
                        {mode.name}
                      </h3>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {mode.description}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      预计耗时: {mode.estimatedTime}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 选择性同步的产品选择 */}
          {selectedMode === 'selective' && (
            <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                选择要同步的产品
              </h4>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                rows={3}
                placeholder="请输入产品ID，每行一个，或用逗号分隔"
                value={selectedProductIds.join('\n')}
                onChange={(e) => {
                  const ids = e.target.value
                    .split(/[\n,]/)
                    .map(id => id.trim())
                    .filter(id => id.length > 0);
                  setSelectedProductIds(ids);
                }}
              />
              <p className="mt-2 text-xs text-gray-500">
                已选择 {selectedProductIds.length} 个产品
              </p>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* 高级选项 */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <div>
              <Card.Title>同步选项</Card.Title>
              <Card.Description>
                配置同步的详细参数
              </Card.Description>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            >
              {showAdvancedOptions ? '收起' : '展开'}高级选项
            </Button>
          </div>
        </Card.Header>
        <Card.Content>
          {/* 基础选项 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">
                  跳过图片下载
                </label>
                <p className="text-xs text-gray-500">
                  仅同步产品数据，不下载图片文件
                </p>
              </div>
              <input
                type="checkbox"
                checked={options.skipImageDownload}
                onChange={(e) => setOptions(prev => ({
                  ...prev,
                  skipImageDownload: e.target.checked
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">
                  跳过数据验证
                </label>
                <p className="text-xs text-gray-500">
                  跳过数据完整性检查，加快同步速度
                </p>
              </div>
              <input
                type="checkbox"
                checked={options.skipDataValidation}
                onChange={(e) => setOptions(prev => ({
                  ...prev,
                  skipDataValidation: e.target.checked
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">
                  强制更新
                </label>
                <p className="text-xs text-gray-500">
                  即使数据未变更也强制更新所有记录
                </p>
              </div>
              <input
                type="checkbox"
                checked={options.forceUpdate}
                onChange={(e) => setOptions(prev => ({
                  ...prev,
                  forceUpdate: e.target.checked
                }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>

          {/* 高级选项 */}
          {showAdvancedOptions && (
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  批处理大小
                </label>
                <input
                  type="number"
                  min="10"
                  max="200"
                  step="10"
                  value={options.batchSize}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    batchSize: parseInt(e.target.value) || 50
                  }))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  每批处理的记录数量 (10-200)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  并发图片下载数
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={options.concurrentImages}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    concurrentImages: parseInt(e.target.value) || 5
                  }))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  同时下载的图片数量 (1-20)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  重试次数
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={options.retryCount}
                  onChange={(e) => setOptions(prev => ({
                    ...prev,
                    retryCount: parseInt(e.target.value) || 3
                  }))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  失败操作的重试次数 (0-10)
                </p>
              </div>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* 启动按钮 */}
      <Card>
        <Card.Content className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                准备开始 {syncModes.find(m => m.id === selectedMode)?.name} 
                {selectedMode === 'selective' && ` (${selectedProductIds.length} 个产品)`}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                预计耗时: {syncModes.find(m => m.id === selectedMode)?.estimatedTime}
              </p>
            </div>
            
            <Button
              onClick={handleStartSync}
              disabled={!canStart || loading || (selectedMode === 'selective' && selectedProductIds.length === 0)}
              className="px-8"
            >
              {loading ? '启动中...' : '开始同步'}
            </Button>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
};