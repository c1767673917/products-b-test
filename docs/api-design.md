# API接口设计文档

## 概述

本文档定义了数据同步重构后的API接口规范，包括飞书数据同步、实时通信、数据验证等功能的接口设计。

## 基础规范

### 请求格式

- **协议**: HTTPS
- **内容类型**: application/json
- **字符编码**: UTF-8
- **API版本**: v1

### 响应格式

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  timestamp: number;
  requestId?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### 错误码规范

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| SUCCESS | 200 | 请求成功 |
| INVALID_PARAMS | 400 | 参数错误 |
| UNAUTHORIZED | 401 | 未授权 |
| FORBIDDEN | 403 | 禁止访问 |
| NOT_FOUND | 404 | 资源不存在 |
| CONFLICT | 409 | 资源冲突 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |
| SERVICE_UNAVAILABLE | 503 | 服务不可用 |

## 1. 飞书数据同步API

### 1.1 触发数据同步

**接口**: `POST /api/v1/sync/feishu`

**描述**: 触发从飞书多维表格的数据同步

**请求参数**:
```typescript
interface SyncFeishuRequest {
  mode: 'full' | 'incremental' | 'selective';
  productIds?: string[];  // 选择性同步时的产品ID列表
  options?: {
    downloadImages?: boolean;     // 是否下载图片，默认true
    validateData?: boolean;       // 是否验证数据，默认true
    dryRun?: boolean;            // 是否仅预览，默认false
    batchSize?: number;          // 批处理大小，默认50
    concurrentImages?: number;   // 并发图片下载数，默认5
  };
}
```

**响应数据**:
```typescript
interface SyncFeishuResponse {
  syncId: string;           // 同步任务ID
  status: 'started' | 'queued';
  estimatedDuration: number; // 预估耗时(秒)
  websocketUrl: string;     // WebSocket连接URL
}
```

**示例**:
```bash
curl -X POST /api/v1/sync/feishu \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "incremental",
    "options": {
      "downloadImages": true,
      "validateData": true,
      "dryRun": false
    }
  }'
```

### 1.2 获取同步状态

**接口**: `GET /api/v1/sync/status`

**描述**: 获取当前同步任务的状态信息

**响应数据**:
```typescript
interface SyncStatusResponse {
  currentSync?: {
    syncId: string;
    mode: string;
    status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
    startTime: string;
    endTime?: string;
    progress: {
      totalRecords: number;
      processedRecords: number;
      totalImages: number;
      processedImages: number;
      percentage: number;
    };
    currentOperation: string;
    errors: Array<{
      type: string;
      message: string;
      productId?: string;
      timestamp: string;
    }>;
  };
  lastSync?: {
    syncId: string;
    endTime: string;
    status: string;
    duration: number;
    stats: {
      created: number;
      updated: number;
      deleted: number;
      errors: number;
    };
  };
}
```

### 1.3 控制同步任务

**接口**: `POST /api/v1/sync/control`

**描述**: 控制当前同步任务的执行

**请求参数**:
```typescript
interface SyncControlRequest {
  action: 'pause' | 'resume' | 'cancel';
  syncId?: string;  // 可选，默认为当前任务
}
```

**响应数据**:
```typescript
interface SyncControlResponse {
  syncId: string;
  action: string;
  status: string;
  message: string;
}
```

### 1.4 获取同步历史

**接口**: `GET /api/v1/sync/history`

**描述**: 获取历史同步记录

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页数量，默认20
- `status`: 状态过滤，可选
- `mode`: 模式过滤，可选
- `startDate`: 开始日期过滤
- `endDate`: 结束日期过滤

**响应数据**:
```typescript
interface SyncHistoryResponse {
  records: Array<{
    syncId: string;
    mode: string;
    status: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    stats: {
      totalRecords: number;
      created: number;
      updated: number;
      deleted: number;
      processedImages: number;
      errors: number;
    };
    config: {
      options: any;
      feishuConfig: {
        appToken: string;
        tableId: string;
      };
    };
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

## 2. 数据验证和修复API

### 2.1 数据一致性验证

**接口**: `POST /api/v1/sync/validate`

**描述**: 验证数据库数据与图片存储的一致性

**请求参数**:
```typescript
interface ValidateRequest {
  scope?: 'all' | 'recent' | 'selective';
  productIds?: string[];
  checks?: Array<'data_integrity' | 'image_existence' | 'field_validation'>;
}
```

**响应数据**:
```typescript
interface ValidateResponse {
  validationId: string;
  summary: {
    totalChecked: number;
    issuesFound: number;
    criticalIssues: number;
    warnings: number;
  };
  issues: Array<{
    type: 'missing_image' | 'invalid_data' | 'broken_reference';
    severity: 'critical' | 'warning' | 'info';
    productId: string;
    field?: string;
    message: string;
    suggestedFix?: string;
  }>;
}
```

### 2.2 数据修复

**接口**: `POST /api/v1/sync/repair`

**描述**: 修复检测到的数据问题

**请求参数**:
```typescript
interface RepairRequest {
  validationId?: string;
  issueTypes?: string[];
  productIds?: string[];
  dryRun?: boolean;
}
```

**响应数据**:
```typescript
interface RepairResponse {
  repairId: string;
  summary: {
    totalIssues: number;
    repairedIssues: number;
    failedRepairs: number;
  };
  results: Array<{
    productId: string;
    issueType: string;
    status: 'repaired' | 'failed' | 'skipped';
    message: string;
  }>;
}
```

## 3. WebSocket实时通信

### 3.1 连接建立

**URL**: `ws://localhost:3000/api/v1/sync/progress`

**连接参数**:
- `syncId`: 同步任务ID (可选)
- `token`: 认证令牌 (如果需要)

### 3.2 消息格式

**进度更新消息**:
```typescript
interface ProgressMessage {
  type: 'progress';
  syncId: string;
  data: {
    stage: 'fetching_data' | 'processing_records' | 'downloading_images' | 'updating_database';
    progress: {
      current: number;
      total: number;
      percentage: number;
    };
    currentOperation: string;
    estimatedTimeRemaining: number;
  };
}
```

**状态变更消息**:
```typescript
interface StatusMessage {
  type: 'status_change';
  syncId: string;
  data: {
    oldStatus: string;
    newStatus: string;
    message: string;
    timestamp: string;
  };
}
```

**错误消息**:
```typescript
interface ErrorMessage {
  type: 'error';
  syncId: string;
  data: {
    errorType: string;
    message: string;
    productId?: string;
    recoverable: boolean;
    timestamp: string;
  };
}
```

**完成消息**:
```typescript
interface CompletionMessage {
  type: 'completion';
  syncId: string;
  data: {
    status: 'completed' | 'failed' | 'cancelled';
    duration: number;
    stats: {
      created: number;
      updated: number;
      deleted: number;
      errors: number;
    };
    summary: string;
  };
}
```

## 4. 配置管理API

### 4.1 获取飞书配置

**接口**: `GET /api/v1/config/feishu`

**描述**: 获取飞书API配置信息

**响应数据**:
```typescript
interface FeishuConfigResponse {
  appId: string;
  appToken: string;
  tableId: string;
  fieldMapping: {
    [localField: string]: {
      feishuFieldId: string;
      feishuFieldName: string;
      type: string;
      required: boolean;
    };
  };
  syncSettings: {
    batchSize: number;
    concurrentImages: number;
    retryAttempts: number;
    timeout: number;
  };
}
```

### 4.2 更新飞书配置

**接口**: `PUT /api/v1/config/feishu`

**描述**: 更新飞书API配置

**请求参数**:
```typescript
interface UpdateFeishuConfigRequest {
  appToken?: string;
  tableId?: string;
  syncSettings?: {
    batchSize?: number;
    concurrentImages?: number;
    retryAttempts?: number;
    timeout?: number;
  };
}
```

## 5. 健康检查和监控API

### 5.1 服务健康检查

**接口**: `GET /api/v1/health`

**描述**: 检查服务健康状态

**响应数据**:
```typescript
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: {
      status: 'up' | 'down';
      responseTime: number;
    };
    minio: {
      status: 'up' | 'down';
      responseTime: number;
    };
    feishu: {
      status: 'up' | 'down';
      responseTime: number;
      tokenValid: boolean;
    };
  };
  metrics: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}
```

### 5.2 同步服务状态

**接口**: `GET /api/v1/sync/service-status`

**描述**: 获取同步服务的详细状态

**响应数据**:
```typescript
interface SyncServiceStatusResponse {
  isRunning: boolean;
  currentTasks: number;
  queuedTasks: number;
  lastSyncTime?: string;
  nextScheduledSync?: string;
  performance: {
    averageSyncDuration: number;
    successRate: number;
    errorRate: number;
  };
  resources: {
    memoryUsage: number;
    diskUsage: number;
    networkUsage: number;
  };
}
```

## 6. 错误处理示例

### 6.1 同步冲突错误

```json
{
  "success": false,
  "message": "同步任务冲突",
  "timestamp": 1642781234567,
  "error": {
    "code": "SYNC_CONFLICT",
    "message": "已有同步任务正在运行",
    "details": {
      "currentSyncId": "sync-123456",
      "currentSyncStatus": "running",
      "estimatedCompletion": "2025-07-21T15:30:00Z"
    }
  }
}
```

### 6.2 飞书API错误

```json
{
  "success": false,
  "message": "飞书API调用失败",
  "timestamp": 1642781234567,
  "error": {
    "code": "FEISHU_API_ERROR",
    "message": "访问令牌已过期",
    "details": {
      "feishuErrorCode": 99991663,
      "feishuErrorMsg": "token expired",
      "retryAfter": 60
    }
  }
}
```

### 6.3 数据验证错误

```json
{
  "success": false,
  "message": "数据验证失败",
  "timestamp": 1642781234567,
  "error": {
    "code": "DATA_VALIDATION_ERROR",
    "message": "产品数据不完整",
    "details": {
      "productId": "20250708-002",
      "missingFields": ["name", "category.primary"],
      "invalidFields": {
        "price.normal": "价格不能为负数"
      }
    }
  }
}
```

## 7. 认证和授权

### 7.1 API密钥认证

```bash
# 请求头中包含API密钥
curl -H "X-API-Key: your-api-key" /api/v1/sync/status
```

### 7.2 JWT令牌认证

```bash
# 请求头中包含JWT令牌
curl -H "Authorization: Bearer your-jwt-token" /api/v1/sync/feishu
```

## 8. 限流和配额

### 8.1 请求限制

- **同步API**: 每分钟最多5次请求
- **查询API**: 每分钟最多100次请求
- **WebSocket连接**: 每个客户端最多5个并发连接

### 8.2 配额限制

- **同步任务**: 每小时最多10个同步任务
- **数据验证**: 每天最多50次验证请求
- **历史记录**: 保留最近1000条同步记录

## 9. 前端集成示例

### 9.1 React Hook使用示例

```typescript
// 使用同步操作Hook
const SyncManagement: React.FC = () => {
  const {
    triggerSync,
    syncStatus,
    syncProgress,
    controlSync,
    syncHistory,
    isLoading,
    error
  } = useSyncOperation();

  const handleFullSync = async () => {
    try {
      await triggerSync({
        mode: 'full',
        options: {
          downloadImages: true,
          validateData: true
        }
      });
    } catch (error) {
      console.error('同步失败:', error);
    }
  };

  return (
    <div>
      <button onClick={handleFullSync} disabled={isLoading}>
        {isLoading ? '同步中...' : '开始全量同步'}
      </button>

      {syncProgress && (
        <div>
          <div>进度: {syncProgress.percentage}%</div>
          <div>当前操作: {syncProgress.currentOperation}</div>
        </div>
      )}
    </div>
  );
};
```

### 9.2 WebSocket连接示例

```typescript
// WebSocket连接管理
const useSyncWebSocket = (syncId?: string) => {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [status, setStatus] = useState<string>('disconnected');

  useEffect(() => {
    if (!syncId) return;

    const ws = new WebSocket(`ws://localhost:3000/api/v1/sync/progress?syncId=${syncId}`);

    ws.onopen = () => setStatus('connected');
    ws.onclose = () => setStatus('disconnected');

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'progress':
          setProgress(message.data);
          break;
        case 'status_change':
          console.log('状态变更:', message.data);
          break;
        case 'error':
          console.error('同步错误:', message.data);
          break;
        case 'completion':
          console.log('同步完成:', message.data);
          break;
      }
    };

    return () => ws.close();
  }, [syncId]);

  return { progress, status };
};
```

---

**文档版本**: v1.0
**创建时间**: 2025-07-21
**最后更新**: 2025-07-21
**维护人**: API架构师
