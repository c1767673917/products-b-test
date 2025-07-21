# 前端组件设计文档

## 概述

本文档详细描述了数据同步功能的前端组件设计，包括组件结构、状态管理、用户交互和样式设计。

## 1. 组件架构

### 1.1 组件层次结构

```
SyncManagement (主容器)
├── SyncController (同步控制)
│   ├── SyncModeSelector (模式选择)
│   ├── SyncOptionsPanel (选项配置)
│   └── SyncActionButtons (操作按钮)
├── SyncProgress (进度显示)
│   ├── ProgressBar (进度条)
│   ├── StatsDisplay (统计信息)
│   └── CurrentOperation (当前操作)
├── SyncHistory (历史记录)
│   ├── HistoryList (记录列表)
│   ├── HistoryFilter (过滤器)
│   └── HistoryDetail (详情查看)
└── DataValidator (数据验证)
    ├── ValidationRunner (验证执行)
    ├── IssuesList (问题列表)
    └── RepairActions (修复操作)
```

### 1.2 状态管理架构

```typescript
// 使用Zustand进行状态管理
interface SyncStore {
  // 同步状态
  currentSync: SyncStatus | null;
  syncHistory: SyncRecord[];
  
  // UI状态
  activeTab: 'controller' | 'progress' | 'history' | 'validator';
  isLoading: boolean;
  error: string | null;
  
  // 配置状态
  syncOptions: SyncOptions;
  
  // 操作方法
  triggerSync: (options: SyncOptions) => Promise<void>;
  controlSync: (action: SyncAction) => Promise<void>;
  loadHistory: (params: HistoryParams) => Promise<void>;
  validateData: (options: ValidationOptions) => Promise<void>;
}
```

## 2. 核心组件设计

### 2.1 SyncManagement (主容器组件)

**功能**: 数据同步管理的主入口组件

**Props**:
```typescript
interface SyncManagementProps {
  className?: string;
  defaultTab?: 'controller' | 'progress' | 'history' | 'validator';
  onSyncComplete?: (result: SyncResult) => void;
  onError?: (error: Error) => void;
}
```

**组件结构**:
```tsx
const SyncManagement: React.FC<SyncManagementProps> = ({
  className,
  defaultTab = 'controller',
  onSyncComplete,
  onError
}) => {
  const { activeTab, setActiveTab } = useSyncStore();
  
  return (
    <div className={cn('sync-management', className)}>
      {/* 标签页导航 */}
      <TabNavigation 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      {/* 标签页内容 */}
      <TabContent activeTab={activeTab}>
        <TabPanel value="controller">
          <SyncController onComplete={onSyncComplete} onError={onError} />
        </TabPanel>
        <TabPanel value="progress">
          <SyncProgress />
        </TabPanel>
        <TabPanel value="history">
          <SyncHistory />
        </TabPanel>
        <TabPanel value="validator">
          <DataValidator />
        </TabPanel>
      </TabContent>
    </div>
  );
};
```

### 2.2 SyncController (同步控制组件)

**功能**: 提供同步触发和控制功能

**Props**:
```typescript
interface SyncControllerProps {
  onComplete?: (result: SyncResult) => void;
  onError?: (error: Error) => void;
}
```

**组件结构**:
```tsx
const SyncController: React.FC<SyncControllerProps> = ({
  onComplete,
  onError
}) => {
  const {
    syncOptions,
    setSyncOptions,
    triggerSync,
    controlSync,
    currentSync,
    isLoading
  } = useSyncStore();

  const handleTriggerSync = async () => {
    try {
      const result = await triggerSync(syncOptions);
      onComplete?.(result);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  return (
    <Card className="sync-controller">
      <CardHeader>
        <CardTitle>数据同步控制</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 同步模式选择 */}
        <SyncModeSelector
          value={syncOptions.mode}
          onChange={(mode) => setSyncOptions({ ...syncOptions, mode })}
        />
        
        {/* 同步选项配置 */}
        <SyncOptionsPanel
          options={syncOptions.options}
          onChange={(options) => setSyncOptions({ ...syncOptions, options })}
        />
        
        {/* 操作按钮 */}
        <SyncActionButtons
          isLoading={isLoading}
          currentSync={currentSync}
          onTrigger={handleTriggerSync}
          onControl={controlSync}
        />
      </CardContent>
    </Card>
  );
};
```

### 2.3 SyncProgress (进度显示组件)

**功能**: 实时显示同步进度和状态

**组件结构**:
```tsx
const SyncProgress: React.FC = () => {
  const { currentSync } = useSyncStore();
  const { progress, status } = useSyncWebSocket(currentSync?.syncId);

  if (!currentSync) {
    return (
      <Card className="sync-progress">
        <CardContent className="text-center py-8">
          <div className="text-gray-500">暂无进行中的同步任务</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sync-progress">
      <CardHeader>
        <CardTitle>同步进度</CardTitle>
        <div className="text-sm text-gray-500">
          任务ID: {currentSync.syncId}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 进度条 */}
        <ProgressBar
          percentage={progress?.percentage || 0}
          status={currentSync.status}
        />
        
        {/* 统计信息 */}
        <StatsDisplay
          stats={progress?.stats}
          currentOperation={progress?.currentOperation}
        />
        
        {/* 当前操作 */}
        <CurrentOperation
          operation={progress?.currentOperation}
          estimatedTime={progress?.estimatedTimeRemaining}
        />
        
        {/* 错误信息 */}
        {currentSync.errors.length > 0 && (
          <ErrorsList errors={currentSync.errors} />
        )}
      </CardContent>
    </Card>
  );
};
```

### 2.4 SyncHistory (历史记录组件)

**功能**: 显示和管理同步历史记录

**组件结构**:
```tsx
const SyncHistory: React.FC = () => {
  const { syncHistory, loadHistory } = useSyncStore();
  const [filters, setFilters] = useState<HistoryFilters>({});
  const [selectedRecord, setSelectedRecord] = useState<SyncRecord | null>(null);

  useEffect(() => {
    loadHistory({ ...filters, page: 1, limit: 20 });
  }, [filters]);

  return (
    <Card className="sync-history">
      <CardHeader>
        <CardTitle>同步历史</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 过滤器 */}
        <HistoryFilter
          filters={filters}
          onChange={setFilters}
        />
        
        {/* 记录列表 */}
        <HistoryList
          records={syncHistory}
          onSelect={setSelectedRecord}
        />
        
        {/* 详情查看 */}
        {selectedRecord && (
          <HistoryDetail
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
          />
        )}
      </CardContent>
    </Card>
  );
};
```

### 2.5 DataValidator (数据验证组件)

**功能**: 数据一致性验证和修复

**组件结构**:
```tsx
const DataValidator: React.FC = () => {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  const handleValidate = async (options: ValidationOptions) => {
    setIsValidating(true);
    try {
      const result = await validateData(options);
      setValidationResult(result);
    } catch (error) {
      console.error('验证失败:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRepair = async (issueTypes: string[]) => {
    setIsRepairing(true);
    try {
      await repairData({ issueTypes });
      // 重新验证
      await handleValidate({});
    } catch (error) {
      console.error('修复失败:', error);
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <Card className="data-validator">
      <CardHeader>
        <CardTitle>数据验证</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 验证执行器 */}
        <ValidationRunner
          onValidate={handleValidate}
          isLoading={isValidating}
        />
        
        {/* 验证结果 */}
        {validationResult && (
          <>
            <ValidationSummary summary={validationResult.summary} />
            
            <IssuesList
              issues={validationResult.issues}
              onRepair={handleRepair}
              isRepairing={isRepairing}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};
```

## 3. 子组件设计

### 3.1 SyncModeSelector (模式选择器)

```tsx
const SyncModeSelector: React.FC<{
  value: SyncMode;
  onChange: (mode: SyncMode) => void;
}> = ({ value, onChange }) => {
  const modes = [
    { value: 'full', label: '全量同步', description: '同步所有数据，耗时较长' },
    { value: 'incremental', label: '增量同步', description: '仅同步变更数据，推荐使用' },
    { value: 'selective', label: '选择性同步', description: '同步指定产品数据' }
  ];

  return (
    <div className="sync-mode-selector">
      <label className="block text-sm font-medium mb-2">同步模式</label>
      <div className="grid grid-cols-1 gap-3">
        {modes.map((mode) => (
          <label key={mode.value} className="flex items-start space-x-3">
            <input
              type="radio"
              value={mode.value}
              checked={value === mode.value}
              onChange={(e) => onChange(e.target.value as SyncMode)}
              className="mt-1"
            />
            <div>
              <div className="font-medium">{mode.label}</div>
              <div className="text-sm text-gray-500">{mode.description}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};
```

### 3.2 ProgressBar (进度条)

```tsx
const ProgressBar: React.FC<{
  percentage: number;
  status: SyncStatus;
}> = ({ percentage, status }) => {
  const getStatusColor = (status: SyncStatus) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="progress-bar">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">同步进度</span>
        <span className="text-sm text-gray-500">{percentage.toFixed(1)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={cn('h-2 rounded-full transition-all duration-300', getStatusColor(status))}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
```

### 3.3 StatsDisplay (统计信息显示)

```tsx
const StatsDisplay: React.FC<{
  stats?: SyncStats;
  currentOperation?: string;
}> = ({ stats, currentOperation }) => {
  if (!stats) return null;

  const statItems = [
    { label: '总记录数', value: stats.totalRecords, color: 'text-gray-600' },
    { label: '已处理', value: stats.processedRecords, color: 'text-blue-600' },
    { label: '已创建', value: stats.created, color: 'text-green-600' },
    { label: '已更新', value: stats.updated, color: 'text-yellow-600' },
    { label: '错误数', value: stats.errors, color: 'text-red-600' }
  ];

  return (
    <div className="stats-display">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statItems.map((item) => (
          <div key={item.label} className="text-center">
            <div className={cn('text-2xl font-bold', item.color)}>
              {item.value.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>
      
      {currentOperation && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-800">
            当前操作: {currentOperation}
          </div>
        </div>
      )}
    </div>
  );
};
```

## 4. Hooks设计

### 4.1 useSyncOperation Hook

```typescript
const useSyncOperation = () => {
  const {
    currentSync,
    syncHistory,
    isLoading,
    error,
    triggerSync: _triggerSync,
    controlSync: _controlSync,
    loadHistory
  } = useSyncStore();

  const triggerSync = useCallback(async (options: SyncOptions) => {
    try {
      return await _triggerSync(options);
    } catch (error) {
      console.error('同步失败:', error);
      throw error;
    }
  }, [_triggerSync]);

  const controlSync = useCallback(async (action: SyncAction) => {
    try {
      return await _controlSync(action);
    } catch (error) {
      console.error('控制同步失败:', error);
      throw error;
    }
  }, [_controlSync]);

  return {
    currentSync,
    syncHistory,
    isLoading,
    error,
    triggerSync,
    controlSync,
    loadHistory
  };
};
```

### 4.2 useSyncWebSocket Hook

```typescript
const useSyncWebSocket = (syncId?: string) => {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  useEffect(() => {
    if (!syncId) return;

    setConnectionStatus('connecting');
    const ws = new WebSocket(`${WS_BASE_URL}/sync/progress?syncId=${syncId}`);
    
    ws.onopen = () => setConnectionStatus('connected');
    ws.onclose = () => setConnectionStatus('disconnected');
    ws.onerror = () => setConnectionStatus('disconnected');
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message, setProgress);
      } catch (error) {
        console.error('WebSocket消息解析失败:', error);
      }
    };

    return () => {
      ws.close();
      setConnectionStatus('disconnected');
    };
  }, [syncId]);

  return { progress, connectionStatus };
};
```

## 5. 样式设计

### 5.1 主题配置

```typescript
// tailwind.config.js 扩展
module.exports = {
  theme: {
    extend: {
      colors: {
        sync: {
          primary: '#3B82F6',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#6B7280'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 2s infinite'
      }
    }
  }
};
```

### 5.2 组件样式

```css
/* 同步管理主容器 */
.sync-management {
  @apply max-w-6xl mx-auto p-6 space-y-6;
}

/* 进度条动画 */
.progress-bar .progress-fill {
  @apply transition-all duration-500 ease-out;
}

/* 状态指示器 */
.status-indicator {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}

.status-indicator.running {
  @apply bg-blue-100 text-blue-800 animate-pulse;
}

.status-indicator.completed {
  @apply bg-green-100 text-green-800;
}

.status-indicator.failed {
  @apply bg-red-100 text-red-800;
}

/* 统计卡片 */
.stats-card {
  @apply bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow;
}

/* 历史记录列表 */
.history-item {
  @apply border-b border-gray-200 py-4 hover:bg-gray-50 cursor-pointer transition-colors;
}

.history-item:last-child {
  @apply border-b-0;
}
```

## 6. 响应式设计

### 6.1 断点配置

- **移动端** (< 768px): 单列布局，简化操作
- **平板端** (768px - 1024px): 两列布局，保留主要功能
- **桌面端** (> 1024px): 多列布局，完整功能

### 6.2 移动端适配

```tsx
const SyncManagementMobile: React.FC = () => {
  return (
    <div className="sync-management-mobile">
      {/* 移动端使用底部标签页 */}
      <div className="flex-1 overflow-auto">
        {/* 内容区域 */}
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
        {/* 底部导航 */}
      </div>
    </div>
  );
};
```

---

**文档版本**: v1.0  
**创建时间**: 2025-07-21  
**最后更新**: 2025-07-21  
**维护人**: 前端架构师
