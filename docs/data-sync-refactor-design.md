# 数据同步机制重构设计文档

## 项目概述

本文档详细描述了产品展示系统数据同步机制的完整重构方案，旨在建立一个稳定、高效的从飞书多维表格到本地存储的数据同步系统。

## 1. 现状分析

### 1.1 项目架构现状

**前端 (product-showcase)**
- 技术栈: React 19 + TypeScript + Vite
- 状态管理: Zustand + TanStack Query
- UI框架: Tailwind CSS + HeadlessUI
- 图片处理: 懒加载 + 路径转换工具

**后端 (products-backend)**
- 技术栈: Fastify + TypeScript + MongoDB
- 图片存储: MinIO (S3兼容)
- 数据同步: 基于JSON文件的同步服务
- API设计: RESTful API

### 1.2 现有问题分析

1. **数据同步混乱**: 缺乏直接的飞书API集成，依赖手动JSON文件更新
2. **图片路径不一致**: 本地路径与MinIO存储路径不匹配
3. **数据源字段变化**: 飞书表格字段已更新，现有映射过时
4. **缺乏实时同步**: 无法实时获取飞书数据变更
5. **错误处理不完善**: 同步失败时缺乏有效的错误恢复机制

### 1.3 飞书数据源分析

根据最新的飞书API分析结果：

**表格基本信息**
- 字段总数: 40个
- 图片字段数: 5个
- 主要数据类型: 文本(14)、选择(6)、数字(5)、附件(5)、日期(1)等

**关键字段映射**
```
飞书字段名 -> 本地字段名
- 品名/Product Name -> name
- 品类一级/Category Level 1 -> category.primary  
- 品类二级/Category Level 2 -> category.secondary
- 正常售价 -> price.normal
- 优惠到手价 -> price.discount
- Front image(正) -> images.front
- Back image(背) -> images.back
- Tag photo(标签) -> images.label
- Outer packaging image(外包装) -> images.package
- Gift pictures(赠品图片) -> images.gift
- Origin (Province) -> origin.province
- Origin (City) -> origin.city
- Platform(平台) -> platform
- Specs(规格) -> specification
- 口味/Flavor(口味) -> flavor
- Manufacturer(生产商) -> manufacturer
- 采集时间 -> collectTime
```

## 2. 重构目标

### 2.1 核心目标

1. **建立直接的飞书API集成**: 实现实时数据获取和同步
2. **统一图片存储管理**: 建立完整的图片下载、存储、访问链路
3. **提供一键同步功能**: 前端触发，后端执行，实时反馈
4. **确保数据一致性**: 数据库记录与图片存储的关联性
5. **建立监控和错误处理**: 完善的日志记录和错误恢复机制

### 2.2 技术目标

- 支持增量和全量同步模式
- 实现图片自动下载和MinIO存储
- 提供同步进度实时反馈
- 建立数据验证和修复机制
- 支持同步任务的暂停和恢复

## 3. 架构设计

### 3.1 整体架构图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   飞书多维表格   │    │   后端同步服务   │    │   前端展示应用   │
│                │    │                │    │                │
│ - 产品数据      │◄──►│ - 飞书API客户端  │◄──►│ - 同步触发界面   │
│ - 图片附件      │    │ - 数据转换服务   │    │ - 进度显示      │
│ - 字段结构      │    │ - 图片下载服务   │    │ - 状态反馈      │
└─────────────────┘    │ - 数据验证服务   │    └─────────────────┘
                       └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐    ┌─────────────────┐
                    │   MongoDB数据库  │    │   MinIO对象存储  │
                    │                │    │                │
                    │ - 产品集合      │    │ - 产品图片      │
                    │ - 图片元数据    │    │ - 缩略图       │
                    │ - 同步日志      │    │ - 临时文件      │
                    └─────────────────┘    └─────────────────┘
```

### 3.2 数据流程设计

#### 3.2.1 同步流程

```
1. 前端触发同步
   ↓
2. 后端验证权限和状态
   ↓
3. 获取飞书访问令牌
   ↓
4. 获取表格字段结构
   ↓
5. 获取表格数据记录
   ↓
6. 数据转换和验证
   ↓
7. 检测数据变更
   ↓
8. 下载新增/更新的图片
   ↓
9. 上传图片到MinIO
   ↓
10. 更新MongoDB数据
    ↓
11. 清理临时文件
    ↓
12. 返回同步结果
```

#### 3.2.2 图片处理流程

```
1. 从飞书获取图片文件令牌
   ↓
2. 调用飞书API下载图片
   ↓
3. 图片格式验证和转换
   ↓
4. 生成标准化文件名
   ↓
5. 上传到MinIO存储
   ↓
6. 生成缩略图
   ↓
7. 更新图片元数据记录
   ↓
8. 清理临时文件
```

## 4. 技术实现方案

### 4.1 飞书API集成

**新增服务: FeishuApiService**
```typescript
class FeishuApiService {
  // 认证管理
  async getAccessToken(): Promise<string>
  async refreshToken(): Promise<void>
  
  // 数据获取
  async getTableFields(appToken: string, tableId: string): Promise<Field[]>
  async getTableRecords(appToken: string, tableId: string): Promise<Record[]>
  async downloadImage(fileToken: string): Promise<Buffer>
  
  // 批量操作
  async batchDownloadImages(fileTokens: string[]): Promise<Map<string, Buffer>>
}
```

### 4.2 数据转换服务

**新增服务: DataTransformService**
```typescript
class DataTransformService {
  // 字段映射
  mapFeishuToLocal(feishuRecord: FeishuRecord): LocalProduct
  
  // 数据验证
  validateProduct(product: LocalProduct): ValidationResult
  
  // 变更检测
  detectChanges(newData: LocalProduct[], existingData: LocalProduct[]): ChangeSet
}
```

### 4.3 图片管理服务增强

**增强现有的 ImageService**
```typescript
class ImageService {
  // 新增方法
  async downloadFromFeishu(fileToken: string, productId: string, imageType: string): Promise<string>
  async batchProcessImages(imageJobs: ImageJob[]): Promise<ProcessResult[]>
  async validateImageIntegrity(objectName: string): Promise<boolean>
  async repairBrokenImages(): Promise<RepairResult>
}
```

### 4.4 同步服务重构

**重构现有的 SyncService**
```typescript
class SyncService {
  // 核心同步方法
  async syncFromFeishu(options: SyncOptions): Promise<SyncResult>
  
  // 同步模式
  async fullSync(): Promise<SyncResult>
  async incrementalSync(): Promise<SyncResult>
  async selectiveSync(productIds: string[]): Promise<SyncResult>
  
  // 进度管理
  onProgress(callback: (progress: SyncProgress) => void): void
  pauseSync(): void
  resumeSync(): void
  cancelSync(): void
}
```

## 5. 数据库设计

### 5.1 产品集合 (products)

```typescript
interface Product {
  // 基本信息
  productId: string;        // 飞书记录ID，作为主键 (rx编号)
  internalId: string;       // 内部编号 (编号字段)
  name: string;            // 产品名称
  sequence: string;        // 序号
  
  // 分类信息
  category: {
    primary: string;       // 一级分类
    secondary: string;     // 二级分类
  };
  
  // 价格信息
  price: {
    normal: number;        // 正常售价
    discount: number;      // 优惠价格
    discountRate: number;  // 折扣率
    currency: string;      // 货币单位
  };
  
  // 图片信息 (存储MinIO对象名)
  images: {
    front?: string;        // 正面图片
    back?: string;         // 背面图片
    label?: string;        // 标签图片
    package?: string;      // 包装图片
    gift?: string;         // 赠品图片
  };
  
  // 产地信息
  origin: {
    country: string;       // 国家
    province: string;      // 省份
    city: string;         // 城市
  };
  
  // 其他信息
  platform: string;       // 平台
  specification: string;  // 规格
  flavor?: string;        // 口味
  manufacturer?: string;  // 生产商
  
  // 元数据
  collectTime: Date;      // 采集时间
  syncTime: Date;         // 同步时间
  version: number;        // 数据版本
  status: 'active' | 'inactive' | 'deleted';
  isVisible: boolean;
}
```

### 5.2 同步日志集合 (sync_logs)

```typescript
interface SyncLog {
  logId: string;
  syncType: 'full' | 'incremental' | 'selective';
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  
  // 统计信息
  stats: {
    totalRecords: number;
    createdRecords: number;
    updatedRecords: number;
    deletedRecords: number;
    processedImages: number;
    failedImages: number;
  };
  
  // 错误信息
  errors: Array<{
    type: string;
    message: string;
    productId?: string;
    timestamp: Date;
  }>;
  
  // 配置信息
  config: {
    feishuAppToken: string;
    feishuTableId: string;
    syncOptions: any;
  };
}
```

## 6. API设计

### 6.1 同步相关API

```typescript
// 触发同步
POST /api/v1/sync/feishu
{
  mode: 'full' | 'incremental' | 'selective',
  productIds?: string[],
  options?: {
    downloadImages: boolean,
    validateData: boolean,
    dryRun: boolean
  }
}

// 获取同步状态
GET /api/v1/sync/status

// 获取同步进度 (WebSocket)
WS /api/v1/sync/progress

// 暂停/恢复/取消同步
POST /api/v1/sync/control
{
  action: 'pause' | 'resume' | 'cancel'
}

// 获取同步历史
GET /api/v1/sync/history?page=1&limit=20

// 数据验证和修复
POST /api/v1/sync/validate
POST /api/v1/sync/repair
```

### 6.2 前端集成API

```typescript
// React Hook for sync operations
const useSyncOperation = () => {
  const triggerSync = (options: SyncOptions) => Promise<SyncResult>
  const getSyncStatus = () => SyncStatus
  const subscribeSyncProgress = (callback: (progress: SyncProgress) => void) => void
  const controlSync = (action: 'pause' | 'resume' | 'cancel') => Promise<void>
}
```

## 7. 前端界面设计

### 7.1 数据同步管理页面

**主要功能模块:**
1. 同步触发区域
   - 同步模式选择 (全量/增量/选择性)
   - 同步选项配置
   - 一键同步按钮

2. 同步状态显示
   - 当前同步状态
   - 进度条和百分比
   - 实时统计信息

3. 同步历史记录
   - 历史同步记录列表
   - 详细日志查看
   - 错误信息展示

4. 数据验证工具
   - 数据一致性检查
   - 图片完整性验证
   - 问题修复工具

### 7.2 组件设计

```typescript
// 主同步管理组件
const SyncManagement: React.FC = () => {
  // 同步控制组件
  const SyncController: React.FC
  
  // 进度显示组件  
  const SyncProgress: React.FC
  
  // 历史记录组件
  const SyncHistory: React.FC
  
  // 数据验证组件
  const DataValidator: React.FC
}
```

## 8. 部署和配置

### 8.1 环境变量配置

```bash
# 飞书API配置
FEISHU_APP_ID=cli_a8e575c35763d013
FEISHU_APP_SECRET=41VyUJHWqFBoiOr5dOwgqctKwSn1RqWf
FEISHU_APP_TOKEN=Lf6Ob6BRIaFaQEseCy4ckAPVnFf
FEISHU_TABLE_ID=tblUT2lRAWTKgygO

# 同步配置
SYNC_BATCH_SIZE=50
SYNC_CONCURRENT_IMAGES=5
SYNC_RETRY_ATTEMPTS=3
SYNC_TIMEOUT=300000

# 图片处理配置
IMAGE_MAX_SIZE=10485760
IMAGE_ALLOWED_TYPES=jpg,jpeg,png,webp
IMAGE_QUALITY=85
```

### 8.2 部署步骤

1. 更新环境变量配置
2. 安装新增依赖包
3. 运行数据库迁移脚本
4. 部署后端服务
5. 构建和部署前端应用
6. 执行初始数据同步
7. 配置定时同步任务

## 9. 测试策略

### 9.1 单元测试
- 飞书API客户端测试
- 数据转换服务测试
- 图片处理服务测试
- 同步逻辑测试

### 9.2 集成测试
- 端到端同步流程测试
- 错误处理和恢复测试
- 性能压力测试
- 数据一致性测试

### 9.3 用户验收测试
- 同步功能完整性测试
- 前端界面交互测试
- 错误场景处理测试

## 10. 风险评估和缓解

### 10.1 主要风险

1. **飞书API限制**: 请求频率限制可能影响同步速度
2. **网络稳定性**: 网络中断可能导致同步失败
3. **数据量增长**: 大量数据可能影响同步性能
4. **图片存储空间**: MinIO存储空间可能不足

### 10.2 缓解措施

1. 实现请求频率控制和重试机制
2. 添加断点续传和增量同步功能
3. 优化批处理和并发控制
4. 监控存储使用情况并设置告警

## 11. 后续优化计划

1. **实时同步**: 基于飞书Webhook的实时数据推送
2. **智能缓存**: Redis缓存热点数据
3. **CDN集成**: 图片CDN加速访问
4. **数据分析**: 同步性能和数据质量分析
5. **多租户支持**: 支持多个飞书应用的数据同步

---

**文档版本**: v1.0  
**创建时间**: 2025-07-21  
**最后更新**: 2025-07-21  
**负责人**: 系统架构师
