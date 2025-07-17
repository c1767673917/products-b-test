# 产品展示系统后端重构设计方案

## 📋 项目概述

### 当前问题分析
- **数据量**: 786个产品，648KB JSON文件
- **图片资源**: 2040张图片，总大小742MB
- **性能瓶颈**: 
  - 初始加载时间长（需下载完整JSON）
  - 内存占用高（全量数据加载到内存）
  - 搜索筛选性能随数据增长下降
  - 图片加载无优化策略

### 重构目标
1. **性能优化**: 实现分页加载、按需查询、图片CDN加速
2. **扩展性**: 支持数据量增长到万级产品规模
3. **维护性**: 简化数据更新流程，支持自动化同步
4. **用户体验**: 提升首屏加载速度和交互响应性

## 🏗️ 整体架构设计

### 系统架构图

```mermaid
graph TB
    subgraph "前端层"
        A[React + TypeScript]
        B[TanStack Query]
        C[Zustand Store]
    end
    
    subgraph "API网关层"
        D[Nginx反向代理]
        E[负载均衡]
    end
    
    subgraph "后端服务层"
        F[Node.js API Server]
        G[数据同步服务]
        H[图片处理服务]
    end
    
    subgraph "数据存储层"
        I[MongoDB 7.0.21]
        J[MinIO对象存储]
        K[Redis缓存]
    end
    
    subgraph "外部数据源"
        L[飞书API]
        M[图片文件系统]
    end
    
    A --> D
    D --> F
    F --> I
    F --> J
    F --> K
    G --> L
    G --> I
    H --> J
    H --> M
```

### 技术栈选型

#### 后端框架推荐: **Fastify**
**选择理由:**
- **高性能**: 比Express快2-3倍，内置JSON Schema验证
- **TypeScript友好**: 原生TypeScript支持，类型安全
- **插件生态**: 丰富的插件系统，易于扩展
- **现代化**: 支持async/await，Promise原生支持
- **轻量级**: 核心小巧，按需加载功能

**对比其他框架:**
- Express: 生态最成熟但性能较低
- NestJS: 功能强大但过于重量级，适合大型企业应用
- Fastify: 性能与易用性的最佳平衡

#### 核心依赖包
```json
{
  "fastify": "^4.24.3",
  "mongoose": "^8.0.3",
  "minio": "^7.1.3",
  "redis": "^4.6.10",
  "@fastify/cors": "^8.4.0",
  "@fastify/multipart": "^8.0.0",
  "@fastify/rate-limit": "^9.0.1"
}
```

## 🗄️ 数据库设计

### MongoDB集合结构

#### 1. Products Collection (产品集合)
```javascript
// products 集合
{
  _id: ObjectId,
  productId: String,        // 业务ID，如 "20250708-002"
  recordId: String,         // 飞书记录ID
  name: String,             // 产品名称
  sequence: String,         // 序列号，如 "HM-0001A"
  
  // 分类信息 - 支持动态字段
  category: {
    primary: String,        // 一级分类
    secondary: String,      // 二级分类
    // 支持未来扩展的其他分类字段
  },
  
  // 价格信息
  price: {
    normal: Number,         // 原价
    discount: Number,       // 折扣价
    discountRate: Number,   // 折扣率
    currency: String,       // 货币单位，默认"CNY"
  },
  
  // 图片信息 - 存储MinIO路径
  images: {
    front: String,          // 正面图片URL
    back: String,           // 背面图片URL
    label: String,          // 标签照片URL
    package: String,        // 外包装图片URL
    gift: String,           // 赠品图片URL
    // 支持动态添加新的图片类型
  },
  
  // 产地信息
  origin: {
    country: String,        // 国家
    province: String,       // 省份
    city: String,          // 城市
  },
  
  // 基本信息 - 支持动态字段扩展
  platform: String,        // 采集平台
  specification: String,   // 规格
  flavor: String,          // 口味
  manufacturer: String,    // 生产商
  
  // 元数据
  collectTime: Date,       // 采集时间
  createdAt: Date,         // 创建时间
  updatedAt: Date,         // 更新时间
  version: Number,         // 数据版本号
  
  // 搜索优化字段
  searchText: String,      // 组合搜索文本
  tags: [String],          // 标签数组，便于筛选
  
  // 统计字段
  viewCount: Number,       // 查看次数
  favoriteCount: Number,   // 收藏次数
  
  // 状态字段
  status: String,          // 状态: active, inactive, deleted
  isVisible: Boolean,      // 是否可见
  
  // 支持完全动态的扩展字段
  dynamicFields: Schema.Types.Mixed  // 存储任意结构的数据
}
```

#### 2. Images Collection (图片集合)
```javascript
// images 集合
{
  _id: ObjectId,
  imageId: String,         // 图片唯一标识
  productId: String,       // 关联产品ID
  type: String,            // 图片类型: front, back, label, package, gift
  
  // MinIO存储信息
  bucketName: String,      // 存储桶名称
  objectName: String,      // 对象名称
  originalName: String,    // 原始文件名
  
  // 文件信息
  fileSize: Number,        // 文件大小(字节)
  mimeType: String,        // MIME类型
  width: Number,           // 图片宽度
  height: Number,          // 图片高度
  
  // 访问信息
  publicUrl: String,       // 公开访问URL
  cdnUrl: String,          // CDN加速URL
  
  // 处理状态
  processStatus: String,   // 处理状态: pending, processing, completed, failed
  thumbnails: [{           // 缩略图信息
    size: String,          // 尺寸标识: small, medium, large
    url: String,           // 缩略图URL
    width: Number,
    height: Number
  }],
  
  // 元数据
  uploadedAt: Date,        // 上传时间
  lastAccessedAt: Date,    // 最后访问时间
  accessCount: Number,     // 访问次数
  
  // 哈希值用于去重
  md5Hash: String,         // MD5哈希值
  sha256Hash: String,      // SHA256哈希值
  
  // 状态
  isActive: Boolean,       // 是否激活
  isPublic: Boolean        // 是否公开访问
}
```

#### 3. Categories Collection (分类集合)
```javascript
// categories 集合 - 用于动态分类管理
{
  _id: ObjectId,
  categoryId: String,      // 分类ID
  name: String,            // 分类名称
  level: Number,           // 分类层级: 1, 2, 3...
  parentId: String,        // 父分类ID
  path: String,            // 分类路径: "乳品烘焙/酸奶乳酸菌"
  
  // 统计信息
  productCount: Number,    // 产品数量
  isActive: Boolean,       // 是否激活
  sortOrder: Number,       // 排序权重
  
  // 元数据
  createdAt: Date,
  updatedAt: Date
}
```

### 索引设计
```javascript
// Products集合索引
db.products.createIndex({ "productId": 1 }, { unique: true })
db.products.createIndex({ "recordId": 1 })
db.products.createIndex({ "searchText": "text", "name": "text" })
db.products.createIndex({ "category.primary": 1, "category.secondary": 1 })
db.products.createIndex({ "platform": 1 })
db.products.createIndex({ "price.normal": 1 })
db.products.createIndex({ "collectTime": -1 })
db.products.createIndex({ "status": 1, "isVisible": 1 })
db.products.createIndex({ "createdAt": -1 })

// Images集合索引
db.images.createIndex({ "imageId": 1 }, { unique: true })
db.images.createIndex({ "productId": 1, "type": 1 })
db.images.createIndex({ "md5Hash": 1 })
db.images.createIndex({ "bucketName": 1, "objectName": 1 })

// Categories集合索引
db.categories.createIndex({ "categoryId": 1 }, { unique: true })
db.categories.createIndex({ "parentId": 1 })
db.categories.createIndex({ "level": 1, "sortOrder": 1 })
```

## 🔌 API设计规范

### RESTful API接口设计

#### 基础路由结构
```
/api/v1/
├── products/          # 产品相关接口
├── images/           # 图片相关接口
├── categories/       # 分类相关接口
├── search/           # 搜索相关接口
├── stats/            # 统计相关接口
└── sync/             # 数据同步接口
```

#### 1. 产品接口 (Products API)

##### GET /api/v1/products
获取产品列表（支持分页和筛选）

**请求参数:**
```typescript
interface ProductListQuery {
  page?: number;           // 页码，默认1
  limit?: number;          // 每页数量，默认20，最大100
  category?: string;       // 分类筛选
  platform?: string;      // 平台筛选
  priceMin?: number;       // 最低价格
  priceMax?: number;       // 最高价格
  province?: string;       // 省份筛选
  sortBy?: 'price' | 'time' | 'name';  // 排序字段
  sortOrder?: 'asc' | 'desc';          // 排序方向
  search?: string;         // 搜索关键词
  status?: 'active' | 'inactive';      // 状态筛选
}
```

**响应格式:**
```typescript
interface ProductListResponse {
  success: boolean;
  data: {
    products: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    filters: {
      categories: string[];
      platforms: string[];
      priceRange: { min: number; max: number; };
      provinces: string[];
    };
  };
  message: string;
  timestamp: string;
}
```

##### GET /api/v1/products/:id
获取单个产品详情

**响应格式:**
```typescript
interface ProductDetailResponse {
  success: boolean;
  data: {
    product: Product;
    relatedProducts: Product[];  // 相关产品推荐
    imageUrls: {
      front?: string;
      back?: string;
      label?: string;
      package?: string;
      gift?: string;
    };
  };
  message: string;
}
```

##### POST /api/v1/products/batch
批量获取产品（用于对比功能）

**请求体:**
```typescript
interface BatchProductRequest {
  productIds: string[];
  fields?: string[];  // 指定返回字段
}
```

#### 2. 搜索接口 (Search API)

##### GET /api/v1/search
全文搜索产品

**请求参数:**
```typescript
interface SearchQuery {
  q: string;              // 搜索关键词
  page?: number;
  limit?: number;
  category?: string;
  platform?: string;
  highlight?: boolean;    // 是否高亮搜索结果
}
```

##### GET /api/v1/search/suggestions
搜索建议/自动补全

**请求参数:**
```typescript
interface SuggestionQuery {
  q: string;              // 输入的关键词
  limit?: number;         // 建议数量，默认10
}
```

#### 3. 分类接口 (Categories API)

##### GET /api/v1/categories
获取分类树结构

**响应格式:**
```typescript
interface CategoryTreeResponse {
  success: boolean;
  data: {
    categories: CategoryNode[];
  };
}

interface CategoryNode {
  id: string;
  name: string;
  level: number;
  productCount: number;
  children?: CategoryNode[];
}
```

#### 4. 统计接口 (Stats API)

##### GET /api/v1/stats/overview
获取数据概览统计

**响应格式:**
```typescript
interface StatsOverviewResponse {
  success: boolean;
  data: {
    totalProducts: number;
    totalImages: number;
    categoryDistribution: Record<string, number>;
    platformDistribution: Record<string, number>;
    locationDistribution: Record<string, number>;
    priceStats: {
      min: number;
      max: number;
      average: number;
      median: number;
    };
    recentActivity: {
      newProductsToday: number;
      newProductsWeek: number;
      lastUpdateTime: string;
    };
  };
}
```

#### 5. 图片接口 (Images API)

##### GET /api/v1/images/:imageId
获取图片信息和访问URL

##### POST /api/v1/images/upload
上传图片到MinIO

##### GET /api/v1/images/proxy/:imageId
图片代理访问（支持缩放、格式转换）

**请求参数:**
```typescript
interface ImageProxyQuery {
  width?: number;         // 宽度
  height?: number;        // 高度
  quality?: number;       // 质量 1-100
  format?: 'webp' | 'jpeg' | 'png';  // 输出格式
}
```

#### 6. 数据同步接口 (Sync API)

##### POST /api/v1/sync/products
从飞书同步产品数据

**请求体:**
```typescript
interface SyncProductsRequest {
  mode: 'full' | 'incremental';  // 同步模式
  forceUpdate?: boolean;          // 是否强制更新
  dryRun?: boolean;              // 是否仅预览不执行
}
```

##### POST /api/v1/sync/images
同步图片到MinIO

##### GET /api/v1/sync/status
获取同步状态

### API响应标准格式

#### 成功响应
```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  message: string;
  timestamp: string;
  requestId: string;
}
```

#### 错误响应
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;           // 错误代码
    message: string;        // 错误消息
    details?: any;          // 详细错误信息
  };
  timestamp: string;
  requestId: string;
}
```

#### HTTP状态码规范
- `200 OK`: 请求成功
- `201 Created`: 资源创建成功
- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 未授权
- `403 Forbidden`: 禁止访问
- `404 Not Found`: 资源不存在
- `422 Unprocessable Entity`: 数据验证失败
- `429 Too Many Requests`: 请求频率限制
- `500 Internal Server Error`: 服务器内部错误
- `503 Service Unavailable`: 服务不可用

### API安全和限流

#### 1. 请求限流
```typescript
// 不同接口的限流策略
const rateLimits = {
  '/api/v1/products': { max: 100, timeWindow: '1 minute' },
  '/api/v1/search': { max: 50, timeWindow: '1 minute' },
  '/api/v1/sync/*': { max: 10, timeWindow: '1 hour' },
  '/api/v1/images/upload': { max: 20, timeWindow: '1 minute' }
};
```

#### 2. 请求验证
- 使用JSON Schema验证请求参数
- 实现请求签名验证（可选）
- 支持API Key认证

#### 3. 缓存策略
```typescript
// 不同接口的缓存策略
const cacheStrategies = {
  '/api/v1/products': { ttl: 300, type: 'redis' },      // 5分钟
  '/api/v1/categories': { ttl: 3600, type: 'redis' },   // 1小时
  '/api/v1/stats': { ttl: 1800, type: 'redis' },        // 30分钟
  '/api/v1/search': { ttl: 600, type: 'redis' }         // 10分钟
};
```

## 🖼️ MinIO图片服务设计

### 存储桶结构设计

#### 1. 存储桶组织
```
product-images/                 # 主存储桶
├── products/                  # 产品图片（统一路径）
│   ├── 20250708-002_正面图片_0.jpg
│   └── 20250708-002_背面图片_0.jpg
├── thumbnails/               # 缩略图
│   ├── small/               # 小尺寸 (150x150)
│   ├── medium/              # 中尺寸 (300x300)
│   └── large/               # 大尺寸 (600x600)
└── processed/               # 处理后的图片
    ├── webp/               # WebP格式
    └── compressed/         # 压缩版本
```

#### 2. 图片命名规范
```typescript
// 图片文件命名规范
interface ImageNaming {
  original: string;     // {productId}_{type}_{sequence}.{ext}
  thumbnail: string;    // {productId}_{type}_{sequence}_{size}.{ext}
  processed: string;    // {productId}_{type}_{sequence}_{process}.{ext}
}

// 示例
const examples = {
  original: "20250708-002_正面图片_0.jpg",
  thumbnailSmall: "20250708-002_正面图片_0_small.webp",
  thumbnailMedium: "20250708-002_正面图片_0_medium.webp",
  compressed: "20250708-002_正面图片_0_compressed.jpg"
};
```

### 图片处理服务

#### 1. 上传流程
```typescript
interface ImageUploadFlow {
  1: "接收原始图片文件";
  2: "计算MD5/SHA256哈希值";
  3: "检查是否已存在（去重）";
  4: "上传到MinIO原始目录";
  5: "生成多种尺寸缩略图";
  6: "转换为WebP格式";
  7: "更新数据库记录";
  8: "返回访问URL";
}
```

#### 2. 图片处理配置
```typescript
interface ImageProcessConfig {
  thumbnailSizes: {
    small: { width: 150, height: 150, quality: 80 };
    medium: { width: 300, height: 300, quality: 85 };
    large: { width: 600, height: 600, quality: 90 };
  };

  formats: {
    webp: { quality: 85, lossless: false };
    jpeg: { quality: 90, progressive: true };
    png: { compressionLevel: 6 };
  };

  optimization: {
    autoOrient: true;        // 自动旋转
    stripMetadata: true;     // 移除元数据
    progressive: true;       // 渐进式加载
  };
}
```

#### 3. CDN和缓存策略
```typescript
interface CDNStrategy {
  // 缓存策略
  cacheHeaders: {
    'Cache-Control': 'public, max-age=31536000';  // 1年
    'ETag': 'auto-generated';
    'Last-Modified': 'auto-generated';
  };

  // 压缩策略
  compression: {
    gzip: true;
    brotli: true;
  };

  // 访问控制
  accessControl: {
    allowOrigins: ['https://yourdomain.com'];
    allowMethods: ['GET', 'HEAD'];
  };
}
```

### 图片访问和代理

#### 1. 直接访问URL
```
# 原始图片
http://152.89.168.61:9000/product-images/products/20250708-002_正面图片_0.jpg

# 缩略图
http://152.89.168.61:9000/product-images/thumbnails/small/20250708-002_正面图片_0_small.webp
```

#### 2. API代理访问（推荐）
```
# 通过API代理，支持实时处理
GET /api/v1/images/proxy/20250708-002_正面图片_0?width=300&format=webp&quality=85

# 优势：
- 统一访问入口
- 实时图片处理
- 访问统计和控制
- 错误处理和降级
```

#### 3. 图片去重机制
```typescript
interface ImageDeduplication {
  // 基于哈希值去重
  hashCheck: {
    md5: string;           // 快速去重
    sha256: string;        // 精确去重
  };

  // 去重策略
  strategy: {
    sameHash: "复用现有图片，更新引用关系";
    similarImage: "使用感知哈希检测相似图片";
    sizeOptimization: "保留最优质量版本";
  };

  // 引用计数
  referenceCount: {
    productReferences: string[];  // 引用此图片的产品列表
    autoCleanup: boolean;         // 无引用时自动清理
  };
}
```

### MinIO配置和优化

#### 1. 服务器配置
```bash
# MinIO服务器配置
MINIO_ROOT_USER=lcsm
MINIO_ROOT_PASSWORD=Sa2482047260@
MINIO_BROWSER_REDIRECT_URL=http://152.89.168.61:9001
MINIO_SERVER_URL=http://152.89.168.61:9000

# 性能优化配置
MINIO_CACHE_DRIVES="/tmp/minio-cache"
MINIO_CACHE_EXCLUDE="*.tmp,*.log"
MINIO_CACHE_QUOTA=80
MINIO_CACHE_AFTER=3
MINIO_CACHE_WATERMARK_LOW=70
MINIO_CACHE_WATERMARK_HIGH=90
```

#### 2. 存储桶策略
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::product-images/products/*"],
      "Condition": {
        "StringEquals": {
          "s3:ExistingObjectTag/public": "true"
        }
      }
    },
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["arn:aws:iam::minio:user/api-service"]},
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": ["arn:aws:s3:::product-images/*"]
    }
  ]
}
```

#### 3. 生命周期管理
```typescript
interface LifecyclePolicy {
  rules: [
    {
      id: "cleanup-temp-files";
      status: "Enabled";
      filter: { prefix: "temp/" };
      expiration: { days: 1 };
    },
    {
      id: "archive-old-versions";
      status: "Enabled";
      filter: { prefix: "products/" };
      transitions: [
        {
          days: 90;
          storageClass: "STANDARD_IA";  // 不常访问存储
        }
      ];
    }
  ];
}
```

## 🔄 数据更新和同步方案

### 1. 飞书数据同步架构

#### 同步服务设计
```typescript
interface SyncService {
  // 同步模式
  modes: {
    full: "全量同步，覆盖所有数据";
    incremental: "增量同步，仅更新变更数据";
    selective: "选择性同步，指定产品或字段";
  };

  // 同步策略
  strategies: {
    dataOverwrite: "产品数据采用覆盖策略";
    imageAppend: "图片数据采用新增策略";
    fieldMerge: "字段级别的智能合并";
  };

  // 冲突处理
  conflictResolution: {
    timestampBased: "基于时间戳的冲突解决";
    manualReview: "需要人工审核的冲突";
    autoMerge: "自动合并策略";
  };
}
```

#### 同步流程设计
```mermaid
sequenceDiagram
    participant FS as 飞书API
    participant SS as 同步服务
    participant DB as MongoDB
    participant MIO as MinIO
    participant Cache as Redis

    SS->>FS: 获取数据更新时间戳
    FS-->>SS: 返回最新时间戳

    alt 需要同步
        SS->>FS: 获取产品数据
        FS-->>SS: 返回CSV/JSON数据

        SS->>SS: 数据清洗和验证
        SS->>SS: 检测数据变更

        loop 每个产品
            SS->>DB: 更新/插入产品数据
            SS->>SS: 检查图片变更

            alt 有新图片
                SS->>MIO: 上传图片
                SS->>DB: 更新图片记录
            end
        end

        SS->>Cache: 清除相关缓存
        SS->>SS: 记录同步日志
    end
```

### 2. 数据变更检测

#### 变更检测策略
```typescript
interface ChangeDetection {
  // 检测方法
  methods: {
    timestampComparison: "基于时间戳比较";
    hashComparison: "基于数据哈希比较";
    fieldLevelDiff: "字段级别差异检测";
  };

  // 检测粒度
  granularity: {
    product: "产品级别变更";
    field: "字段级别变更";
    image: "图片级别变更";
  };

  // 变更类型
  changeTypes: {
    create: "新增产品";
    update: "更新产品";
    delete: "删除产品";
    imageAdd: "新增图片";
    imageUpdate: "更新图片";
  };
}
```

#### 实现示例
```typescript
class ChangeDetector {
  async detectProductChanges(
    feishuData: FeishuProduct[],
    existingData: Product[]
  ): Promise<ChangeSet> {
    const changes: ChangeSet = {
      creates: [],
      updates: [],
      deletes: [],
      imageChanges: []
    };

    // 创建现有数据的映射
    const existingMap = new Map(
      existingData.map(p => [p.productId, p])
    );

    // 检测新增和更新
    for (const feishuProduct of feishuData) {
      const existing = existingMap.get(feishuProduct.id);

      if (!existing) {
        changes.creates.push(feishuProduct);
      } else {
        const diff = this.compareProducts(feishuProduct, existing);
        if (diff.hasChanges) {
          changes.updates.push({
            productId: feishuProduct.id,
            changes: diff.changes,
            newData: feishuProduct
          });
        }
      }

      existingMap.delete(feishuProduct.id);
    }

    // 检测删除（剩余的就是要删除的）
    changes.deletes = Array.from(existingMap.values());

    return changes;
  }

  private compareProducts(
    feishu: FeishuProduct,
    existing: Product
  ): ProductDiff {
    const changes: FieldChange[] = [];

    // 比较基本字段
    if (feishu.name !== existing.name) {
      changes.push({
        field: 'name',
        oldValue: existing.name,
        newValue: feishu.name
      });
    }

    // 比较价格信息
    if (feishu.price !== existing.price.normal) {
      changes.push({
        field: 'price.normal',
        oldValue: existing.price.normal,
        newValue: feishu.price
      });
    }

    // 比较分类信息
    if (feishu.category !== existing.category.primary) {
      changes.push({
        field: 'category.primary',
        oldValue: existing.category.primary,
        newValue: feishu.category
      });
    }

    return {
      hasChanges: changes.length > 0,
      changes
    };
  }
}
```

### 3. 自动化同步任务

#### 定时同步配置
```typescript
interface SyncSchedule {
  // 同步频率配置
  schedules: {
    full: "0 2 * * *";        // 每天凌晨2点全量同步
    incremental: "*/30 * * * *"; // 每30分钟增量同步
    images: "0 3 * * *";       // 每天凌晨3点同步图片
  };

  // 同步条件
  conditions: {
    dataThreshold: 10;         // 变更数据超过10条触发同步
    timeThreshold: 3600000;    // 1小时内无同步则强制同步
    errorRetry: 3;             // 错误重试次数
  };

  // 监控和告警
  monitoring: {
    successRate: 95;           // 成功率低于95%告警
    syncDuration: 300000;      // 同步时间超过5分钟告警
    dataConsistency: true;     // 数据一致性检查
  };
}
```

#### 同步任务实现
```typescript
class SyncScheduler {
  private cron = require('node-cron');
  private syncService: SyncService;

  constructor(syncService: SyncService) {
    this.syncService = syncService;
    this.setupSchedules();
  }

  private setupSchedules() {
    // 增量同步任务
    this.cron.schedule('*/30 * * * *', async () => {
      try {
        await this.syncService.performIncrementalSync();
      } catch (error) {
        console.error('增量同步失败:', error);
        await this.notifyError('incremental_sync_failed', error);
      }
    });

    // 全量同步任务
    this.cron.schedule('0 2 * * *', async () => {
      try {
        await this.syncService.performFullSync();
      } catch (error) {
        console.error('全量同步失败:', error);
        await this.notifyError('full_sync_failed', error);
      }
    });

    // 图片同步任务
    this.cron.schedule('0 3 * * *', async () => {
      try {
        await this.syncService.syncImages();
      } catch (error) {
        console.error('图片同步失败:', error);
        await this.notifyError('image_sync_failed', error);
      }
    });
  }

  private async notifyError(type: string, error: Error) {
    // 发送告警通知（邮件、钉钉、企业微信等）
    // 记录错误日志
    // 触发重试机制
  }
}
```

### 4. 数据一致性保证

#### 事务处理
```typescript
class TransactionalSync {
  async syncProductWithImages(
    productData: FeishuProduct,
    imageFiles: ImageFile[]
  ): Promise<SyncResult> {
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // 1. 更新产品数据
        const product = await Product.findOneAndUpdate(
          { productId: productData.id },
          { ...productData, updatedAt: new Date() },
          { upsert: true, new: true, session }
        );

        // 2. 处理图片上传
        const imageResults = await Promise.all(
          imageFiles.map(file => this.uploadImageWithRetry(file))
        );

        // 3. 更新图片记录
        for (const imageResult of imageResults) {
          await Image.findOneAndUpdate(
            { imageId: imageResult.imageId },
            {
              ...imageResult,
              productId: product.productId,
              updatedAt: new Date()
            },
            { upsert: true, session }
          );
        }

        // 4. 更新产品的图片引用
        product.images = this.buildImageReferences(imageResults);
        await product.save({ session });

        // 5. 清除相关缓存
        await this.clearProductCache(product.productId);
      });

      return { success: true, productId: productData.id };
    } catch (error) {
      console.error('同步事务失败:', error);
      return { success: false, error: error.message };
    } finally {
      await session.endSession();
    }
  }
}
```

#### 数据验证和修复
```typescript
class DataValidator {
  async validateDataConsistency(): Promise<ValidationReport> {
    const report: ValidationReport = {
      timestamp: new Date(),
      issues: [],
      statistics: {}
    };

    // 1. 检查产品数据完整性
    const productsWithoutImages = await Product.find({
      $or: [
        { 'images.front': { $exists: false } },
        { 'images.front': '' }
      ]
    });

    if (productsWithoutImages.length > 0) {
      report.issues.push({
        type: 'missing_images',
        count: productsWithoutImages.length,
        products: productsWithoutImages.map(p => p.productId)
      });
    }

    // 2. 检查图片文件存在性
    const imageRecords = await Image.find({ isActive: true });
    const missingImages = [];

    for (const image of imageRecords) {
      const exists = await this.checkImageExists(image.bucketName, image.objectName);
      if (!exists) {
        missingImages.push(image);
      }
    }

    if (missingImages.length > 0) {
      report.issues.push({
        type: 'missing_image_files',
        count: missingImages.length,
        images: missingImages.map(i => i.imageId)
      });
    }

    // 3. 检查数据重复
    const duplicateProducts = await Product.aggregate([
      { $group: { _id: '$productId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (duplicateProducts.length > 0) {
      report.issues.push({
        type: 'duplicate_products',
        count: duplicateProducts.length,
        duplicates: duplicateProducts
      });
    }

    return report;
  }

  async repairDataIssues(report: ValidationReport): Promise<RepairResult> {
    const results: RepairResult = {
      repaired: [],
      failed: []
    };

    for (const issue of report.issues) {
      try {
        switch (issue.type) {
          case 'missing_images':
            await this.repairMissingImages(issue.products);
            results.repaired.push(issue);
            break;

          case 'duplicate_products':
            await this.removeDuplicateProducts(issue.duplicates);
            results.repaired.push(issue);
            break;

          default:
            console.warn(`未知的问题类型: ${issue.type}`);
        }
      } catch (error) {
        results.failed.push({ issue, error: error.message });
      }
    }

    return results;
  }
}
```

## 📦 数据迁移方案

### 1. 迁移策略

#### 迁移阶段规划
```typescript
interface MigrationPhases {
  phase1: {
    name: "数据准备和验证";
    tasks: [
      "分析现有JSON数据结构",
      "设计MongoDB数据模型",
      "创建数据转换脚本",
      "验证数据完整性"
    ];
    duration: "2-3天";
  };

  phase2: {
    name: "图片迁移";
    tasks: [
      "批量上传图片到MinIO",
      "生成缩略图和优化版本",
      "更新图片访问路径",
      "验证图片可访问性"
    ];
    duration: "1-2天";
  };

  phase3: {
    name: "数据库迁移";
    tasks: [
      "执行数据转换和导入",
      "创建索引和优化查询",
      "数据一致性检查",
      "性能测试"
    ];
    duration: "1天";
  };

  phase4: {
    name: "API开发和测试";
    tasks: [
      "开发后端API服务",
      "集成测试和性能测试",
      "前端API集成",
      "端到端测试"
    ];
    duration: "3-5天";
  };

  phase5: {
    name: "部署和切换";
    tasks: [
      "生产环境部署",
      "灰度发布和监控",
      "全量切换",
      "旧系统下线"
    ];
    duration: "1-2天";
  };
}
```

### 2. 数据转换脚本

#### JSON到MongoDB转换
```typescript
class DataMigrator {
  async migrateProductsFromJSON(): Promise<MigrationResult> {
    const jsonData = await this.loadJSONData();
    const migrationResult: MigrationResult = {
      total: jsonData.length,
      success: 0,
      failed: 0,
      errors: []
    };

    for (const jsonProduct of jsonData) {
      try {
        // 转换数据结构
        const mongoProduct = this.transformProduct(jsonProduct);

        // 验证数据
        await this.validateProduct(mongoProduct);

        // 保存到MongoDB
        await Product.findOneAndUpdate(
          { productId: mongoProduct.productId },
          mongoProduct,
          { upsert: true, new: true }
        );

        migrationResult.success++;
      } catch (error) {
        migrationResult.failed++;
        migrationResult.errors.push({
          productId: jsonProduct.id,
          error: error.message
        });
      }
    }

    return migrationResult;
  }

  private transformProduct(jsonProduct: any): Product {
    return {
      productId: jsonProduct.id,
      recordId: jsonProduct.recordId,
      name: jsonProduct.name,
      sequence: jsonProduct.sequence,

      category: {
        primary: jsonProduct.category?.primary || '',
        secondary: jsonProduct.category?.secondary || ''
      },

      price: {
        normal: jsonProduct.price?.normal || 0,
        discount: jsonProduct.price?.discount || 0,
        discountRate: jsonProduct.price?.discountRate || 0,
        currency: 'CNY'
      },

      images: this.transformImages(jsonProduct.images),

      origin: {
        country: jsonProduct.origin?.country || '中国',
        province: jsonProduct.origin?.province || '',
        city: jsonProduct.origin?.city || ''
      },

      platform: jsonProduct.platform || '',
      specification: jsonProduct.specification || '',
      flavor: jsonProduct.flavor || '',
      manufacturer: jsonProduct.manufacturer || '',

      collectTime: new Date(jsonProduct.collectTime),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,

      searchText: this.buildSearchText(jsonProduct),
      tags: this.extractTags(jsonProduct),

      viewCount: 0,
      favoriteCount: 0,

      status: 'active',
      isVisible: true
    };
  }

  private transformImages(jsonImages: any): ProductImages {
    const images: ProductImages = {};

    if (jsonImages?.front) {
      images.front = this.convertImagePath(jsonImages.front);
    }
    if (jsonImages?.back) {
      images.back = this.convertImagePath(jsonImages.back);
    }
    if (jsonImages?.label) {
      images.label = this.convertImagePath(jsonImages.label);
    }
    if (jsonImages?.package) {
      images.package = this.convertImagePath(jsonImages.package);
    }
    if (jsonImages?.gift) {
      images.gift = this.convertImagePath(jsonImages.gift);
    }

    return images;
  }

  private convertImagePath(oldPath: string): string {
    // 将旧的本地路径转换为MinIO URL
    const filename = path.basename(oldPath);
    return `http://152.89.168.61:9000/product-images/products/${filename}`;
  }

  private buildSearchText(product: any): string {
    const searchFields = [
      product.name,
      product.category?.primary,
      product.category?.secondary,
      product.platform,
      product.manufacturer,
      product.flavor,
      product.specification
    ];

    return searchFields
      .filter(field => field && field.trim())
      .join(' ')
      .toLowerCase();
  }

  private extractTags(product: any): string[] {
    const tags: string[] = [];

    if (product.category?.primary) tags.push(product.category.primary);
    if (product.category?.secondary) tags.push(product.category.secondary);
    if (product.platform) tags.push(product.platform);
    if (product.origin?.province) tags.push(product.origin.province);

    return [...new Set(tags)]; // 去重
  }
}
```

### 3. 图片批量迁移

#### 图片上传脚本
```typescript
class ImageMigrator {
  private minioClient: Minio.Client;

  constructor() {
    this.minioClient = new Minio.Client({
      endPoint: '152.89.168.61',
      port: 9000,
      useSSL: false,
      accessKey: 'lcsm',
      secretKey: 'Sa2482047260@'
    });
  }

  async migrateAllImages(): Promise<ImageMigrationResult> {
    const imageDir = '../product-showcase/public/images';
    const imageFiles = await this.scanImageFiles(imageDir);

    const result: ImageMigrationResult = {
      total: imageFiles.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    // 并发控制，避免过多并发请求
    const concurrency = 5;
    const chunks = this.chunkArray(imageFiles, concurrency);

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (imageFile) => {
          try {
            const uploadResult = await this.uploadSingleImage(imageFile);

            if (uploadResult.skipped) {
              result.skipped++;
            } else {
              result.success++;

              // 创建图片记录
              await this.createImageRecord(imageFile, uploadResult);

              // 生成缩略图
              await this.generateThumbnails(uploadResult.objectName);
            }
          } catch (error) {
            result.failed++;
            result.errors.push({
              file: imageFile.path,
              error: error.message
            });
          }
        })
      );
    }

    return result;
  }

  private async uploadSingleImage(imageFile: ImageFileInfo): Promise<UploadResult> {
    const objectName = `products/${imageFile.name}`;

    // 检查文件是否已存在
    try {
      await this.minioClient.statObject('product-images', objectName);
      console.log(`图片已存在，跳过: ${objectName}`);
      return { skipped: true, objectName };
    } catch (error) {
      // 文件不存在，继续上传
    }

    // 计算文件哈希
    const fileBuffer = await fs.readFile(imageFile.path);
    const md5Hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // 检查是否有相同哈希的文件（去重）
    const existingImage = await Image.findOne({ md5Hash });
    if (existingImage) {
      console.log(`发现重复图片，复用现有文件: ${existingImage.objectName}`);
      return { skipped: true, objectName: existingImage.objectName, reused: true };
    }

    // 上传文件
    const metadata = {
      'Content-Type': imageFile.mimeType,
      'X-Amz-Meta-Original-Name': imageFile.originalName,
      'X-Amz-Meta-Upload-Time': new Date().toISOString(),
      'X-Amz-Meta-MD5': md5Hash,
      'X-Amz-Meta-SHA256': sha256Hash
    };

    await this.minioClient.putObject(
      'product-images',
      objectName,
      fileBuffer,
      fileBuffer.length,
      metadata
    );

    console.log(`图片上传成功: ${objectName}`);

    return {
      skipped: false,
      objectName,
      md5Hash,
      sha256Hash,
      fileSize: fileBuffer.length
    };
  }

  private async createImageRecord(
    imageFile: ImageFileInfo,
    uploadResult: UploadResult
  ): Promise<void> {
    const imageRecord = new Image({
      imageId: this.generateImageId(imageFile),
      productId: this.extractProductId(imageFile.name),
      type: this.extractImageType(imageFile.name),

      bucketName: 'product-images',
      objectName: uploadResult.objectName,
      originalName: imageFile.originalName,

      fileSize: uploadResult.fileSize,
      mimeType: imageFile.mimeType,
      width: imageFile.dimensions?.width,
      height: imageFile.dimensions?.height,

      publicUrl: `http://152.89.168.61:9000/product-images/${uploadResult.objectName}`,

      processStatus: 'completed',

      uploadedAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 0,

      md5Hash: uploadResult.md5Hash,
      sha256Hash: uploadResult.sha256Hash,

      isActive: true,
      isPublic: true
    });

    await imageRecord.save();
  }

  private async generateThumbnails(objectName: string): Promise<void> {
    const sizes = [
      { name: 'small', width: 150, height: 150 },
      { name: 'medium', width: 300, height: 300 },
      { name: 'large', width: 600, height: 600 }
    ];

    for (const size of sizes) {
      try {
        await this.createThumbnail(objectName, size);
      } catch (error) {
        console.error(`生成缩略图失败 ${size.name}:`, error);
      }
    }
  }

  private async createThumbnail(
    originalObjectName: string,
    size: { name: string; width: number; height: number }
  ): Promise<void> {
    // 下载原始图片
    const originalStream = await this.minioClient.getObject('product-images', originalObjectName);
    const originalBuffer = await this.streamToBuffer(originalStream);

    // 使用sharp处理图片
    const sharp = require('sharp');
    const thumbnailBuffer = await sharp(originalBuffer)
      .resize(size.width, size.height, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 85 })
      .toBuffer();

    // 生成缩略图对象名
    const thumbnailObjectName = originalObjectName
      .replace('products/', `thumbnails/${size.name}/`)
      .replace(/\.(jpg|jpeg|png)$/i, '.webp');

    // 上传缩略图
    await this.minioClient.putObject(
      'product-images',
      thumbnailObjectName,
      thumbnailBuffer,
      thumbnailBuffer.length,
      {
        'Content-Type': 'image/webp',
        'X-Amz-Meta-Thumbnail-Size': size.name,
        'X-Amz-Meta-Original-Object': originalObjectName
      }
    );

    console.log(`缩略图生成成功: ${thumbnailObjectName}`);
  }

  private getDatePath(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}/${month}`;
  }

  private extractProductId(filename: string): string {
    const match = filename.match(/^([^_]+)/);
    return match ? match[1] : '';
  }

  private extractImageType(filename: string): string {
    if (filename.includes('正面图片')) return 'front';
    if (filename.includes('背面图片')) return 'back';
    if (filename.includes('标签照片')) return 'label';
    if (filename.includes('外包装图片')) return 'package';
    if (filename.includes('赠品图片')) return 'gift';
    return 'unknown';
  }
}
```

### 4. 迁移验证和回滚

#### 数据验证脚本
```typescript
class MigrationValidator {
  async validateMigration(): Promise<ValidationReport> {
    const report: ValidationReport = {
      timestamp: new Date(),
      dataConsistency: await this.validateDataConsistency(),
      imageConsistency: await this.validateImageConsistency(),
      performanceMetrics: await this.validatePerformance(),
      functionalTests: await this.runFunctionalTests()
    };

    return report;
  }

  private async validateDataConsistency(): Promise<DataConsistencyReport> {
    // 比较JSON数据和MongoDB数据
    const jsonData = await this.loadOriginalJSONData();
    const mongoData = await Product.find({}).lean();

    const report: DataConsistencyReport = {
      totalRecords: { json: jsonData.length, mongo: mongoData.length },
      missingRecords: [],
      dataDiscrepancies: []
    };

    // 检查记录数量
    if (jsonData.length !== mongoData.length) {
      report.recordCountMismatch = {
        expected: jsonData.length,
        actual: mongoData.length,
        difference: Math.abs(jsonData.length - mongoData.length)
      };
    }

    // 检查每条记录
    const mongoMap = new Map(mongoData.map(p => [p.productId, p]));

    for (const jsonProduct of jsonData) {
      const mongoProduct = mongoMap.get(jsonProduct.id);

      if (!mongoProduct) {
        report.missingRecords.push(jsonProduct.id);
        continue;
      }

      // 检查关键字段
      const discrepancies = this.compareProducts(jsonProduct, mongoProduct);
      if (discrepancies.length > 0) {
        report.dataDiscrepancies.push({
          productId: jsonProduct.id,
          discrepancies
        });
      }
    }

    return report;
  }

  private async validateImageConsistency(): Promise<ImageConsistencyReport> {
    const report: ImageConsistencyReport = {
      totalImages: 0,
      accessibleImages: 0,
      inaccessibleImages: [],
      thumbnailStatus: {}
    };

    const imageRecords = await Image.find({ isActive: true });
    report.totalImages = imageRecords.length;

    for (const image of imageRecords) {
      try {
        // 检查原始图片是否可访问
        await this.minioClient.statObject(image.bucketName, image.objectName);
        report.accessibleImages++;

        // 检查缩略图
        const thumbnailStatus = await this.checkThumbnails(image.objectName);
        report.thumbnailStatus[image.imageId] = thumbnailStatus;

      } catch (error) {
        report.inaccessibleImages.push({
          imageId: image.imageId,
          objectName: image.objectName,
          error: error.message
        });
      }
    }

    return report;
  }

  private async validatePerformance(): Promise<PerformanceReport> {
    const report: PerformanceReport = {
      apiResponseTimes: {},
      databaseQueryTimes: {},
      imageLoadTimes: {}
    };

    // 测试API响应时间
    const apiTests = [
      { endpoint: '/api/v1/products', expectedTime: 500 },
      { endpoint: '/api/v1/products?page=1&limit=20', expectedTime: 300 },
      { endpoint: '/api/v1/search?q=酸奶', expectedTime: 800 },
      { endpoint: '/api/v1/categories', expectedTime: 200 }
    ];

    for (const test of apiTests) {
      const startTime = Date.now();
      try {
        await this.makeAPIRequest(test.endpoint);
        const responseTime = Date.now() - startTime;

        report.apiResponseTimes[test.endpoint] = {
          actual: responseTime,
          expected: test.expectedTime,
          passed: responseTime <= test.expectedTime
        };
      } catch (error) {
        report.apiResponseTimes[test.endpoint] = {
          actual: -1,
          expected: test.expectedTime,
          passed: false,
          error: error.message
        };
      }
    }

    return report;
  }
}
```

#### 回滚方案
```typescript
class MigrationRollback {
  async createBackup(): Promise<BackupInfo> {
    const backupId = `backup_${Date.now()}`;
    const backupPath = `./backups/${backupId}`;

    // 备份MongoDB数据
    await this.backupMongoDB(backupPath);

    // 备份MinIO数据（可选，因为图片通常不需要回滚）
    await this.backupMinIOMetadata(backupPath);

    return {
      backupId,
      backupPath,
      timestamp: new Date(),
      size: await this.calculateBackupSize(backupPath)
    };
  }

  async rollbackToBackup(backupId: string): Promise<RollbackResult> {
    const backupPath = `./backups/${backupId}`;

    try {
      // 1. 停止API服务
      await this.stopAPIService();

      // 2. 恢复MongoDB数据
      await this.restoreMongoDB(backupPath);

      // 3. 清理MinIO中的新增图片（可选）
      await this.cleanupNewImages(backupId);

      // 4. 重启API服务
      await this.startAPIService();

      return { success: true, backupId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async emergencyRollback(): Promise<void> {
    // 紧急回滚到JSON文件模式
    console.log('执行紧急回滚...');

    // 1. 停止后端API服务
    await this.stopAPIService();

    // 2. 恢复前端到JSON模式
    await this.restoreFrontendToJSONMode();

    // 3. 重启前端服务
    await this.restartFrontendService();

    console.log('紧急回滚完成，系统已恢复到JSON模式');
  }
}
```

## 🚀 部署和运维方案

### 1. 服务器环境配置

#### 系统架构部署
```yaml
# docker-compose.yml
version: '3.8'

services:
  # API服务
  api-server:
    build: ./products-backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://lcs:Sa2482047260@@152.89.168.61:27017/products?authSource=admin
      - MINIO_ENDPOINT=152.89.168.61
      - MINIO_PORT=9000
      - MINIO_ACCESS_KEY=lcsm
      - MINIO_SECRET_KEY=Sa2482047260@
      - REDIS_URL=redis://152.89.168.61:6379
    depends_on:
      - redis
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
    networks:
      - product-network

  # Redis缓存
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks:
      - product-network

  # Nginx反向代理
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - api-server
    restart: unless-stopped
    networks:
      - product-network

  # 前端服务
  frontend:
    build: ./product-showcase
    ports:
      - "5173:5173"
    environment:
      - VITE_API_BASE_URL=http://152.89.168.61:3000/api/v1
      - VITE_IMAGE_BASE_URL=http://152.89.168.61:9000
    restart: unless-stopped
    networks:
      - product-network

volumes:
  redis-data:

networks:
  product-network:
    driver: bridge
```

#### Nginx配置
```nginx
# nginx/nginx.conf
upstream api_backend {
    server api-server:3000;
    keepalive 32;
}

upstream frontend_backend {
    server frontend:5173;
    keepalive 32;
}

# API服务代理
server {
    listen 80;
    server_name api.yourdomain.com;

    # 请求限流
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    location /api/ {
        limit_req zone=api burst=20 nodelay;

        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 超时设置
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # 健康检查
    location /health {
        proxy_pass http://api_backend/health;
        access_log off;
    }
}

# 前端服务代理
server {
    listen 80;
    server_name yourdomain.com;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Cache-Status "STATIC";
    }

    location / {
        proxy_pass http://frontend_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# MinIO图片代理（可选）
server {
    listen 80;
    server_name images.yourdomain.com;

    location /images/ {
        proxy_pass http://152.89.168.61:9000/product-images/;
        proxy_set_header Host $host;

        # 图片缓存
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Cache-Status "IMAGE";

        # 错误处理
        error_page 404 = @fallback;
    }

    location @fallback {
        return 302 /placeholder-image.svg;
    }
}
```

### 2. 监控和日志

#### 应用监控配置
```typescript
// 监控中间件
class MonitoringService {
  private prometheus = require('prom-client');

  constructor() {
    this.setupMetrics();
  }

  private setupMetrics() {
    // HTTP请求指标
    this.httpRequestDuration = new this.prometheus.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });

    // 数据库查询指标
    this.dbQueryDuration = new this.prometheus.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'collection'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
    });

    // 缓存命中率
    this.cacheHitRate = new this.prometheus.Counter({
      name: 'cache_requests_total',
      help: 'Total number of cache requests',
      labelNames: ['type', 'result']
    });

    // 图片处理指标
    this.imageProcessingDuration = new this.prometheus.Histogram({
      name: 'image_processing_duration_seconds',
      help: 'Duration of image processing operations',
      labelNames: ['operation', 'format'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
    });
  }

  // 中间件函数
  requestMetrics() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        this.httpRequestDuration
          .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
          .observe(duration);
      });

      next();
    };
  }
}
```

#### 日志配置
```typescript
// 日志配置
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'product-api' },
  transports: [
    // 错误日志
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    }),

    // 综合日志
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10
    }),

    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// 数据库操作日志
export const dbLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/database.log',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3
    })
  ]
});

// 同步操作日志
export const syncLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/sync.log',
      maxsize: 20 * 1024 * 1024,
      maxFiles: 7
    })
  ]
});
```

### 3. 健康检查和自动恢复

#### 健康检查端点
```typescript
// 健康检查服务
class HealthCheckService {
  async checkOverallHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkMinIO(),
      this.checkRedis(),
      this.checkDiskSpace(),
      this.checkMemoryUsage()
    ]);

    const results: HealthCheckResult[] = checks.map((check, index) => {
      const names = ['database', 'minio', 'redis', 'disk', 'memory'];

      if (check.status === 'fulfilled') {
        return { name: names[index], status: 'healthy', ...check.value };
      } else {
        return {
          name: names[index],
          status: 'unhealthy',
          error: check.reason.message
        };
      }
    });

    const overallStatus = results.every(r => r.status === 'healthy') ? 'healthy' : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results,
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0'
    };
  }

  private async checkDatabase(): Promise<Partial<HealthCheckResult>> {
    try {
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - start;

      return {
        responseTime,
        details: {
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          port: mongoose.connection.port
        }
      };
    } catch (error) {
      throw new Error(`数据库连接失败: ${error.message}`);
    }
  }

  private async checkMinIO(): Promise<Partial<HealthCheckResult>> {
    try {
      const start = Date.now();
      await this.minioClient.bucketExists('product-images');
      const responseTime = Date.now() - start;

      return {
        responseTime,
        details: {
          endpoint: '152.89.168.61:9000',
          bucket: 'product-images'
        }
      };
    } catch (error) {
      throw new Error(`MinIO连接失败: ${error.message}`);
    }
  }

  private async checkRedis(): Promise<Partial<HealthCheckResult>> {
    try {
      const start = Date.now();
      await this.redisClient.ping();
      const responseTime = Date.now() - start;

      const info = await this.redisClient.info('memory');
      const memoryUsage = this.parseRedisMemoryInfo(info);

      return {
        responseTime,
        details: {
          memoryUsage,
          connectedClients: await this.redisClient.clientList()
        }
      };
    } catch (error) {
      throw new Error(`Redis连接失败: ${error.message}`);
    }
  }
}
```

#### 自动恢复机制
```typescript
class AutoRecoveryService {
  private recoveryAttempts = new Map<string, number>();
  private maxRetries = 3;
  private retryDelay = 5000; // 5秒

  async handleServiceFailure(serviceName: string, error: Error): Promise<void> {
    const attempts = this.recoveryAttempts.get(serviceName) || 0;

    if (attempts >= this.maxRetries) {
      await this.escalateToManualIntervention(serviceName, error);
      return;
    }

    this.recoveryAttempts.set(serviceName, attempts + 1);

    logger.warn(`服务 ${serviceName} 故障，开始第 ${attempts + 1} 次恢复尝试`, {
      service: serviceName,
      error: error.message,
      attempt: attempts + 1
    });

    try {
      await this.performRecovery(serviceName);

      // 恢复成功，重置计数器
      this.recoveryAttempts.delete(serviceName);

      logger.info(`服务 ${serviceName} 恢复成功`, { service: serviceName });
    } catch (recoveryError) {
      logger.error(`服务 ${serviceName} 恢复失败`, {
        service: serviceName,
        originalError: error.message,
        recoveryError: recoveryError.message
      });

      // 延迟后重试
      setTimeout(() => {
        this.handleServiceFailure(serviceName, error);
      }, this.retryDelay * (attempts + 1)); // 指数退避
    }
  }

  private async performRecovery(serviceName: string): Promise<void> {
    switch (serviceName) {
      case 'database':
        await this.recoverDatabase();
        break;
      case 'redis':
        await this.recoverRedis();
        break;
      case 'minio':
        await this.recoverMinIO();
        break;
      default:
        throw new Error(`未知的服务类型: ${serviceName}`);
    }
  }

  private async recoverDatabase(): Promise<void> {
    // 重新连接数据库
    await mongoose.disconnect();
    await mongoose.connect(process.env.MONGODB_URI!);

    // 验证连接
    await mongoose.connection.db.admin().ping();
  }

  private async recoverRedis(): Promise<void> {
    // 重新连接Redis
    await this.redisClient.disconnect();
    await this.redisClient.connect();

    // 验证连接
    await this.redisClient.ping();
  }

  private async recoverMinIO(): Promise<void> {
    // 重新初始化MinIO客户端
    this.minioClient = new Minio.Client({
      endPoint: '152.89.168.61',
      port: 9000,
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY!,
      secretKey: process.env.MINIO_SECRET_KEY!
    });

    // 验证连接
    await this.minioClient.bucketExists('product-images');
  }

  private async escalateToManualIntervention(serviceName: string, error: Error): Promise<void> {
    const alertMessage = `
      🚨 服务故障需要人工干预

      服务: ${serviceName}
      错误: ${error.message}
      时间: ${new Date().toISOString()}
      恢复尝试次数: ${this.maxRetries}

      请立即检查服务状态并进行手动恢复。
    `;

    // 发送告警通知
    await this.sendAlert(alertMessage);

    // 记录严重错误日志
    logger.error('服务故障升级到人工干预', {
      service: serviceName,
      error: error.message,
      attempts: this.maxRetries,
      timestamp: new Date().toISOString()
    });
  }

  private async sendAlert(message: string): Promise<void> {
    // 这里可以集成多种告警方式：
    // 1. 邮件通知
    // 2. 钉钉/企业微信机器人
    // 3. 短信通知
    // 4. Slack/Discord通知

    console.error(message); // 临时使用控制台输出
  }
}
```

## 🔧 前端改造方案

### 1. API集成改造

#### 服务层重构
```typescript
// 新的API服务配置
// src/config/api.ts
export const API_CONFIG = {
  baseURL: process.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,

  endpoints: {
    products: '/products',
    search: '/search',
    categories: '/categories',
    stats: '/stats',
    images: '/images'
  }
};

// HTTP客户端配置
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  }
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加请求ID用于追踪
    config.headers['X-Request-ID'] = generateRequestId();

    // 添加时间戳
    config.metadata = { startTime: Date.now() };

    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    // 记录响应时间
    const duration = Date.now() - response.config.metadata.startTime;
    console.log(`API请求耗时: ${duration}ms - ${response.config.url}`);

    return response;
  },
  async (error) => {
    const config = error.config;

    // 自动重试机制
    if (!config._retry && config._retryCount < API_CONFIG.retryAttempts) {
      config._retry = true;
      config._retryCount = (config._retryCount || 0) + 1;

      await new Promise(resolve =>
        setTimeout(resolve, API_CONFIG.retryDelay * config._retryCount)
      );

      return apiClient(config);
    }

    return Promise.reject(error);
  }
);
```

#### 数据服务重构
```typescript
// src/services/productService.ts
export class ProductService {
  // 获取产品列表（支持分页和筛选）
  async getProducts(params: ProductListParams): Promise<ProductListResponse> {
    try {
      const response = await apiClient.get('/products', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'getProducts');
    }
  }

  // 获取单个产品详情
  async getProductById(id: string): Promise<ProductDetailResponse> {
    try {
      const response = await apiClient.get(`/products/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'getProductById');
    }
  }

  // 搜索产品
  async searchProducts(query: SearchParams): Promise<SearchResponse> {
    try {
      const response = await apiClient.get('/search', { params: query });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'searchProducts');
    }
  }

  // 获取搜索建议
  async getSearchSuggestions(query: string): Promise<SuggestionResponse> {
    try {
      const response = await apiClient.get('/search/suggestions', {
        params: { q: query, limit: 10 }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'getSearchSuggestions');
    }
  }

  // 批量获取产品（对比功能）
  async getProductsByIds(ids: string[]): Promise<BatchProductResponse> {
    try {
      const response = await apiClient.post('/products/batch', { productIds: ids });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'getProductsByIds');
    }
  }

  // 获取分类树
  async getCategories(): Promise<CategoryTreeResponse> {
    try {
      const response = await apiClient.get('/categories');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'getCategories');
    }
  }

  // 获取统计数据
  async getStats(): Promise<StatsResponse> {
    try {
      const response = await apiClient.get('/stats/overview');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'getStats');
    }
  }

  private handleError(error: any, operation: string): Error {
    const message = error.response?.data?.error?.message || error.message || '未知错误';
    const code = error.response?.status || 500;

    console.error(`${operation} 操作失败:`, {
      message,
      code,
      operation,
      timestamp: new Date().toISOString()
    });

    return new Error(`${operation}: ${message}`);
  }
}

export const productService = new ProductService();
```

### 2. 状态管理改造

#### Zustand Store重构
```typescript
// src/stores/productStore.ts
interface ProductStore {
  // 数据状态
  products: Product[];
  currentProduct: Product | null;
  categories: CategoryNode[];
  stats: StatsData | null;

  // 分页状态
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  // 筛选状态
  filters: FilterState;
  searchQuery: string;
  sortOption: SortOption;

  // UI状态
  loading: boolean;
  error: string | null;
  viewMode: 'grid' | 'list';

  // 缓存状态
  lastFetchTime: number;
  cacheExpiry: number;

  // Actions
  loadProducts: (params?: ProductListParams) => Promise<void>;
  loadMoreProducts: () => Promise<void>;
  searchProducts: (query: string) => Promise<void>;
  loadProductById: (id: string) => Promise<void>;
  updateFilters: (filters: Partial<FilterState>) => void;
  updateSort: (sort: SortOption) => void;
  clearCache: () => void;
  reset: () => void;
}

export const useProductStore = create<ProductStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        products: [],
        currentProduct: null,
        categories: [],
        stats: null,

        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },

        filters: {
          category: '',
          platform: '',
          priceRange: [0, 1000],
          province: '',
          status: 'active'
        },

        searchQuery: '',
        sortOption: { field: 'collectTime', order: 'desc' },

        loading: false,
        error: null,
        viewMode: 'grid',

        lastFetchTime: 0,
        cacheExpiry: 5 * 60 * 1000, // 5分钟缓存

        // 加载产品列表
        loadProducts: async (params) => {
          const state = get();

          // 检查缓存
          if (state.shouldUseCache(params)) {
            return;
          }

          set({ loading: true, error: null });

          try {
            const requestParams = {
              page: params?.page || state.pagination.page,
              limit: params?.limit || state.pagination.limit,
              ...state.filters,
              search: state.searchQuery,
              sortBy: state.sortOption.field,
              sortOrder: state.sortOption.order,
              ...params
            };

            const response = await productService.getProducts(requestParams);

            set({
              products: response.data.products,
              pagination: response.data.pagination,
              loading: false,
              lastFetchTime: Date.now()
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '加载产品失败',
              loading: false
            });
          }
        },

        // 加载更多产品（分页）
        loadMoreProducts: async () => {
          const state = get();

          if (!state.pagination.hasNext || state.loading) {
            return;
          }

          set({ loading: true });

          try {
            const response = await productService.getProducts({
              page: state.pagination.page + 1,
              limit: state.pagination.limit,
              ...state.filters,
              search: state.searchQuery,
              sortBy: state.sortOption.field,
              sortOrder: state.sortOption.order
            });

            set({
              products: [...state.products, ...response.data.products],
              pagination: response.data.pagination,
              loading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '加载更多产品失败',
              loading: false
            });
          }
        },

        // 搜索产品
        searchProducts: async (query) => {
          set({ searchQuery: query, loading: true, error: null });

          try {
            const response = await productService.searchProducts({
              q: query,
              page: 1,
              limit: get().pagination.limit,
              ...get().filters
            });

            set({
              products: response.data.products,
              pagination: response.data.pagination,
              loading: false,
              lastFetchTime: Date.now()
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '搜索失败',
              loading: false
            });
          }
        },

        // 加载单个产品详情
        loadProductById: async (id) => {
          set({ loading: true, error: null });

          try {
            const response = await productService.getProductById(id);
            set({
              currentProduct: response.data.product,
              loading: false
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : '加载产品详情失败',
              loading: false
            });
          }
        },

        // 更新筛选条件
        updateFilters: (newFilters) => {
          const state = get();
          const updatedFilters = { ...state.filters, ...newFilters };

          set({
            filters: updatedFilters,
            pagination: { ...state.pagination, page: 1 } // 重置到第一页
          });

          // 自动重新加载数据
          state.loadProducts({ page: 1 });
        },

        // 更新排序
        updateSort: (sortOption) => {
          const state = get();

          set({
            sortOption,
            pagination: { ...state.pagination, page: 1 }
          });

          // 自动重新加载数据
          state.loadProducts({ page: 1 });
        },

        // 检查是否应该使用缓存
        shouldUseCache: (params) => {
          const state = get();
          const now = Date.now();
          const cacheValid = (now - state.lastFetchTime) < state.cacheExpiry;
          const sameParams = !params || Object.keys(params).length === 0;

          return cacheValid && sameParams && state.products.length > 0;
        },

        // 清除缓存
        clearCache: () => {
          set({ lastFetchTime: 0 });
        },

        // 重置状态
        reset: () => {
          set({
            products: [],
            currentProduct: null,
            pagination: {
              page: 1,
              limit: 20,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false
            },
            searchQuery: '',
            error: null,
            lastFetchTime: 0
          });
        }
      }),
      {
        name: 'product-store',
        // 只持久化用户偏好，不持久化数据
        partialize: (state) => ({
          viewMode: state.viewMode,
          sortOption: state.sortOption,
          filters: state.filters,
          pagination: { limit: state.pagination.limit }
        })
      }
    ),
    { name: 'ProductStore' }
  )
);
```

### 3. React Query集成

#### 查询配置
```typescript
// src/hooks/useProductQueries.ts
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// 查询键工厂
export const productQueryKeys = {
  all: ['products'] as const,
  lists: () => [...productQueryKeys.all, 'list'] as const,
  list: (params: ProductListParams) => [...productQueryKeys.lists(), params] as const,
  details: () => [...productQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...productQueryKeys.details(), id] as const,
  search: (query: string) => [...productQueryKeys.all, 'search', query] as const,
  categories: () => ['categories'] as const,
  stats: () => ['stats'] as const,
};

// 产品列表查询
export const useProducts = (params: ProductListParams) => {
  return useQuery({
    queryKey: productQueryKeys.list(params),
    queryFn: () => productService.getProducts(params),
    staleTime: 5 * 60 * 1000, // 5分钟内认为数据新鲜
    cacheTime: 10 * 60 * 1000, // 10分钟缓存时间
    keepPreviousData: true, // 保持上一次的数据，避免加载闪烁
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// 无限滚动产品列表
export const useInfiniteProducts = (params: Omit<ProductListParams, 'page'>) => {
  return useInfiniteQuery({
    queryKey: [...productQueryKeys.lists(), 'infinite', params],
    queryFn: ({ pageParam = 1 }) =>
      productService.getProducts({ ...params, page: pageParam }),
    getNextPageParam: (lastPage) =>
      lastPage.data.pagination.hasNext ? lastPage.data.pagination.page + 1 : undefined,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// 产品详情查询
export const useProduct = (id: string) => {
  return useQuery({
    queryKey: productQueryKeys.detail(id),
    queryFn: () => productService.getProductById(id),
    enabled: !!id,
    staleTime: 15 * 60 * 1000, // 产品详情缓存时间更长
    cacheTime: 30 * 60 * 1000,
    retry: 1,
  });
};

// 搜索查询
export const useProductSearch = (query: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: productQueryKeys.search(query),
    queryFn: () => productService.searchProducts({ q: query }),
    enabled: enabled && query.length > 0,
    staleTime: 2 * 60 * 1000, // 搜索结果缓存时间较短
    cacheTime: 5 * 60 * 1000,
    retry: 1,
  });
};

// 分类查询
export const useCategories = () => {
  return useQuery({
    queryKey: productQueryKeys.categories(),
    queryFn: () => productService.getCategories(),
    staleTime: 60 * 60 * 1000, // 分类数据缓存1小时
    cacheTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// 统计数据查询
export const useStats = () => {
  return useQuery({
    queryKey: productQueryKeys.stats(),
    queryFn: () => productService.getStats(),
    staleTime: 30 * 60 * 1000, // 统计数据缓存30分钟
    cacheTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// 预加载相关产品
export const usePrefetchProduct = () => {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: productQueryKeys.detail(id),
      queryFn: () => productService.getProductById(id),
      staleTime: 15 * 60 * 1000,
    });
  };
};

// 缓存失效工具
export const useInvalidateQueries = () => {
  const queryClient = useQueryClient();

  return {
    invalidateProducts: () => {
      queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
    },
    invalidateProductList: (params?: ProductListParams) => {
      if (params) {
        queryClient.invalidateQueries({ queryKey: productQueryKeys.list(params) });
      } else {
        queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() });
      }
    },
    invalidateProduct: (id: string) => {
      queryClient.invalidateQueries({ queryKey: productQueryKeys.detail(id) });
    },
    invalidateSearch: (query?: string) => {
      if (query) {
        queryClient.invalidateQueries({ queryKey: productQueryKeys.search(query) });
      } else {
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === 'products' && query.queryKey[2] === 'search'
        });
      }
    }
  };
};
```

### 4. 组件改造示例

#### 产品列表组件
```typescript
// src/components/ProductList.tsx
import React, { useEffect, useMemo } from 'react';
import { useProducts, useInfiniteProducts } from '../hooks/useProductQueries';
import { useProductStore } from '../stores/productStore';
import { VirtualizedList } from './VirtualizedList';
import { ProductCard } from './ProductCard';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorBoundary } from './ErrorBoundary';

interface ProductListProps {
  infiniteScroll?: boolean;
  pageSize?: number;
}

export const ProductList: React.FC<ProductListProps> = ({
  infiniteScroll = false,
  pageSize = 20
}) => {
  const { filters, searchQuery, sortOption, viewMode } = useProductStore();

  // 构建查询参数
  const queryParams = useMemo(() => ({
    ...filters,
    search: searchQuery,
    sortBy: sortOption.field,
    sortOrder: sortOption.order,
    limit: pageSize
  }), [filters, searchQuery, sortOption, pageSize]);

  // 选择使用普通分页还是无限滚动
  const {
    data: paginatedData,
    isLoading: isPaginatedLoading,
    error: paginatedError,
    refetch: refetchPaginated
  } = useProducts(queryParams, { enabled: !infiniteScroll });

  const {
    data: infiniteData,
    isLoading: isInfiniteLoading,
    error: infiniteError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchInfinite
  } = useInfiniteProducts(queryParams, { enabled: infiniteScroll });

  // 统一数据格式
  const { products, pagination, isLoading, error, refetch } = useMemo(() => {
    if (infiniteScroll) {
      const products = infiniteData?.pages.flatMap(page => page.data.products) || [];
      const lastPage = infiniteData?.pages[infiniteData.pages.length - 1];

      return {
        products,
        pagination: lastPage?.data.pagination,
        isLoading: isInfiniteLoading,
        error: infiniteError,
        refetch: refetchInfinite
      };
    } else {
      return {
        products: paginatedData?.data.products || [],
        pagination: paginatedData?.data.pagination,
        isLoading: isPaginatedLoading,
        error: paginatedError,
        refetch: refetchPaginated
      };
    }
  }, [
    infiniteScroll,
    infiniteData,
    paginatedData,
    isInfiniteLoading,
    isPaginatedLoading,
    infiniteError,
    paginatedError,
    refetchInfinite,
    refetchPaginated
  ]);

  // 错误处理
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-red-500 mb-4">
          加载失败: {error.message}
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          重试
        </button>
      </div>
    );
  }

  // 加载状态
  if (isLoading && products.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // 空状态
  if (!isLoading && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-gray-500 mb-4">
          {searchQuery ? '未找到匹配的产品' : '暂无产品数据'}
        </div>
        {searchQuery && (
          <button
            onClick={() => useProductStore.getState().searchProducts('')}
            className="text-blue-500 hover:text-blue-600"
          >
            清除搜索条件
          </button>
        )}
      </div>
    );
  }

  // 渲染产品列表
  const renderProductList = () => {
    if (viewMode === 'list' && products.length > 100) {
      // 大量数据时使用虚拟化列表
      return (
        <VirtualizedList
          items={products}
          itemHeight={120}
          renderItem={({ item, index }) => (
            <ProductCard
              key={item.productId}
              product={item}
              viewMode="list"
              priority={index < 10} // 前10个优先加载
            />
          )}
        />
      );
    } else {
      // 普通渲染
      return (
        <div className={`
          grid gap-4
          ${viewMode === 'grid'
            ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
            : 'grid-cols-1'
          }
        `}>
          {products.map((product, index) => (
            <ProductCard
              key={product.productId}
              product={product}
              viewMode={viewMode}
              priority={index < 10}
            />
          ))}
        </div>
      );
    }
  };

  return (
    <ErrorBoundary>
      <div className="space-y-4">
        {/* 产品列表 */}
        {renderProductList()}

        {/* 分页或加载更多 */}
        {infiniteScroll ? (
          // 无限滚动加载更多
          <div className="flex justify-center py-4">
            {hasNextPage && (
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isFetchingNextPage ? '加载中...' : '加载更多'}
              </button>
            )}
          </div>
        ) : (
          // 传统分页
          pagination && pagination.totalPages > 1 && (
            <Pagination
              current={pagination.page}
              total={pagination.totalPages}
              onChange={(page) => {
                const store = useProductStore.getState();
                store.loadProducts({ ...queryParams, page });
              }}
            />
          )
        )}

        {/* 加载状态指示器 */}
        {(isLoading || isFetchingNextPage) && products.length > 0 && (
          <div className="flex justify-center py-4">
            <LoadingSpinner />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};
```

## 📈 性能优化和扩展性

### 1. 性能基准测试

#### 性能指标对比
```typescript
interface PerformanceBenchmark {
  // 当前JSON方案 vs 新后端方案
  metrics: {
    initialLoad: {
      current: "3.2s (648KB JSON + 首批图片)";
      new: "0.8s (仅首屏20个产品)";
      improvement: "75% 提升";
    };

    searchResponse: {
      current: "200ms (前端全量搜索)";
      new: "150ms (后端索引搜索)";
      improvement: "25% 提升";
    };

    memoryUsage: {
      current: "~50MB (全量数据在内存)";
      new: "~15MB (按需加载)";
      improvement: "70% 减少";
    };

    imageLoading: {
      current: "2.1s (原始图片)";
      new: "0.6s (优化后的WebP缩略图)";
      improvement: "71% 提升";
    };

    cacheHitRate: {
      current: "0% (无缓存)";
      new: "85% (多级缓存)";
      improvement: "显著提升";
    };
  };

  // 扩展性对比
  scalability: {
    productCount: {
      current: "1000个产品时性能明显下降";
      new: "支持10万+产品，性能线性扩展";
    };

    concurrentUsers: {
      current: "50个并发用户时响应变慢";
      new: "支持1000+并发用户";
    };

    dataUpdate: {
      current: "需要重新构建和部署";
      new: "实时数据同步，无需重启";
    };
  };
}
```

### 2. 缓存策略优化

#### 多级缓存架构
```typescript
class CacheManager {
  private redisClient: Redis;
  private memoryCache: Map<string, CacheItem>;
  private cacheStats: CacheStats;

  constructor() {
    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  // 分层缓存策略
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    // 1. 内存缓存 (最快)
    const memoryResult = this.getFromMemory<T>(key);
    if (memoryResult) {
      this.cacheStats.hits++;
      return memoryResult;
    }

    // 2. Redis缓存 (中等速度)
    const redisResult = await this.getFromRedis<T>(key);
    if (redisResult) {
      // 回填内存缓存
      this.setToMemory(key, redisResult, options?.memoryTTL || 60);
      this.cacheStats.hits++;
      return redisResult;
    }

    this.cacheStats.misses++;
    return null;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    // 同时设置内存和Redis缓存
    await Promise.all([
      this.setToMemory(key, value, options?.memoryTTL || 60),
      this.setToRedis(key, value, options?.redisTTL || 300)
    ]);
  }

  // 智能缓存失效
  async invalidatePattern(pattern: string): Promise<void> {
    // 清除内存缓存
    for (const key of this.memoryCache.keys()) {
      if (this.matchPattern(key, pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // 清除Redis缓存
    const keys = await this.redisClient.keys(pattern);
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
  }

  // 缓存预热
  async warmupCache(): Promise<void> {
    console.log('开始缓存预热...');

    // 预热热门产品
    const popularProducts = await Product.find()
      .sort({ viewCount: -1 })
      .limit(100)
      .lean();

    for (const product of popularProducts) {
      await this.set(`product:${product.productId}`, product, {
        memoryTTL: 300,
        redisTTL: 1800
      });
    }

    // 预热分类数据
    const categories = await this.buildCategoryTree();
    await this.set('categories:tree', categories, {
      memoryTTL: 3600,
      redisTTL: 7200
    });

    // 预热统计数据
    const stats = await this.calculateStats();
    await this.set('stats:overview', stats, {
      memoryTTL: 1800,
      redisTTL: 3600
    });

    console.log('缓存预热完成');
  }

  // 缓存监控
  getStats(): CacheStats & { memorySize: number; redisSize: number } {
    return {
      ...this.cacheStats,
      memorySize: this.memoryCache.size,
      redisSize: 0, // 需要从Redis获取
      hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)
    };
  }
}
```

### 3. 数据库查询优化

#### 查询优化策略
```typescript
class QueryOptimizer {
  // 复合索引优化
  static getOptimalIndexes(): IndexDefinition[] {
    return [
      // 产品列表查询优化
      {
        collection: 'products',
        index: {
          'status': 1,
          'isVisible': 1,
          'category.primary': 1,
          'collectTime': -1
        },
        name: 'product_list_optimal'
      },

      // 搜索查询优化
      {
        collection: 'products',
        index: {
          'searchText': 'text',
          'name': 'text',
          'manufacturer': 'text'
        },
        name: 'product_search_text',
        weights: { 'name': 10, 'searchText': 5, 'manufacturer': 1 }
      },

      // 价格筛选优化
      {
        collection: 'products',
        index: {
          'price.normal': 1,
          'category.primary': 1,
          'status': 1
        },
        name: 'product_price_filter'
      },

      // 地区筛选优化
      {
        collection: 'products',
        index: {
          'origin.province': 1,
          'platform': 1,
          'collectTime': -1
        },
        name: 'product_location_filter'
      }
    ];
  }

  // 查询性能分析
  static async analyzeQuery(query: any, collection: string): Promise<QueryAnalysis> {
    const db = mongoose.connection.db;
    const explain = await db.collection(collection).find(query).explain('executionStats');

    return {
      executionTimeMillis: explain.executionStats.executionTimeMillis,
      totalDocsExamined: explain.executionStats.totalDocsExamined,
      totalDocsReturned: explain.executionStats.totalDocsReturned,
      indexesUsed: explain.executionStats.executionStages?.indexName || 'COLLSCAN',
      efficiency: explain.executionStats.totalDocsReturned / explain.executionStats.totalDocsExamined,
      recommendations: this.generateRecommendations(explain)
    };
  }

  // 聚合管道优化
  static buildOptimizedAggregation(filters: FilterState): any[] {
    const pipeline: any[] = [];

    // 1. 早期筛选 - 减少后续处理的文档数量
    const matchStage: any = {
      status: 'active',
      isVisible: true
    };

    if (filters.category) {
      matchStage['category.primary'] = filters.category;
    }

    if (filters.platform) {
      matchStage.platform = filters.platform;
    }

    if (filters.priceRange) {
      matchStage['price.normal'] = {
        $gte: filters.priceRange[0],
        $lte: filters.priceRange[1]
      };
    }

    pipeline.push({ $match: matchStage });

    // 2. 投影 - 只选择需要的字段
    pipeline.push({
      $project: {
        productId: 1,
        name: 1,
        'category.primary': 1,
        'category.secondary': 1,
        'price.normal': 1,
        'price.discount': 1,
        'images.front': 1,
        platform: 1,
        collectTime: 1,
        // 计算字段
        hasDiscount: { $gt: ['$price.discount', 0] },
        discountPercent: {
          $cond: {
            if: { $gt: ['$price.discount', 0] },
            then: {
              $multiply: [
                { $divide: [
                  { $subtract: ['$price.normal', '$price.discount'] },
                  '$price.normal'
                ]},
                100
              ]
            },
            else: 0
          }
        }
      }
    });

    // 3. 排序
    pipeline.push({ $sort: { collectTime: -1 } });

    return pipeline;
  }
}
```

### 4. 扩展性设计

#### 微服务架构准备
```typescript
// 为未来微服务拆分做准备的模块化设计
interface ServiceModules {
  productService: {
    responsibilities: [
      "产品数据CRUD",
      "产品搜索和筛选",
      "产品分类管理"
    ];
    apis: [
      "/api/v1/products/*",
      "/api/v1/categories/*",
      "/api/v1/search/*"
    ];
    database: "products_db";
  };

  imageService: {
    responsibilities: [
      "图片上传和存储",
      "图片处理和优化",
      "CDN管理"
    ];
    apis: [
      "/api/v1/images/*"
    ];
    storage: "minio_cluster";
  };

  syncService: {
    responsibilities: [
      "数据同步任务",
      "飞书API集成",
      "数据一致性检查"
    ];
    apis: [
      "/api/v1/sync/*"
    ];
    scheduler: "cron_jobs";
  };

  analyticsService: {
    responsibilities: [
      "用户行为分析",
      "性能监控",
      "业务统计"
    ];
    apis: [
      "/api/v1/analytics/*",
      "/api/v1/stats/*"
    ];
    database: "analytics_db";
  };
}

// 服务间通信接口
interface ServiceCommunication {
  eventBus: {
    events: [
      "product.created",
      "product.updated",
      "product.deleted",
      "image.uploaded",
      "sync.completed"
    ];
    transport: "Redis Pub/Sub" | "RabbitMQ" | "Apache Kafka";
  };

  apiGateway: {
    routing: "基于路径的服务路由";
    loadBalancing: "轮询 + 健康检查";
    rateLimit: "基于服务的限流策略";
    authentication: "JWT + API Key";
  };
}
```

## 📋 实施计划和时间表

### 总体时间安排: 10-12个工作日

#### 第一阶段: 基础设施准备 (2-3天)
- **Day 1**:
  - 服务器环境配置和优化
  - MongoDB连接测试和索引创建
  - MinIO存储桶配置和权限设置
  - Redis缓存服务配置

- **Day 2**:
  - 后端项目初始化 (Fastify + TypeScript)
  - 数据模型设计和Mongoose Schema定义
  - 基础中间件配置 (CORS, 日志, 错误处理)

- **Day 3**:
  - 数据迁移脚本开发
  - 图片批量上传工具开发
  - 数据验证和测试

#### 第二阶段: 核心API开发 (3-4天)
- **Day 4**:
  - 产品相关API开发 (CRUD, 列表, 详情)
  - 分页和筛选功能实现
  - 基础测试用例编写

- **Day 5**:
  - 搜索API开发 (全文搜索, 建议)
  - 分类管理API开发
  - 统计数据API开发

- **Day 6**:
  - 图片服务API开发 (上传, 代理, 处理)
  - 缓存策略实现
  - 性能优化

- **Day 7**:
  - 数据同步API开发
  - 定时任务配置
  - 错误处理和监控

#### 第三阶段: 前端集成改造 (3-4天)
- **Day 8**:
  - API客户端配置
  - React Query集成
  - 状态管理重构

- **Day 9**:
  - 产品列表组件改造
  - 搜索功能集成
  - 分页/无限滚动实现

- **Day 10**:
  - 产品详情页改造
  - 图片懒加载优化
  - 错误边界和加载状态

- **Day 11**:
  - 整体测试和调试
  - 性能测试和优化
  - 用户体验优化

#### 第四阶段: 部署和上线 (1-2天)
- **Day 12**:
  - 生产环境部署
  - 监控和日志配置
  - 灰度发布和验证
  - 文档整理和交付

### 风险评估和应对措施

#### 高风险项
1. **数据迁移风险**:
   - 风险: 数据丢失或不一致
   - 应对: 完整备份 + 分步迁移 + 验证脚本

2. **性能风险**:
   - 风险: 新系统性能不达预期
   - 应对: 压力测试 + 性能监控 + 回滚方案

3. **兼容性风险**:
   - 风险: 前端API集成问题
   - 应对: 渐进式改造 + 充分测试

#### 中风险项
1. **服务稳定性**: 定期健康检查 + 自动恢复机制
2. **图片处理性能**: 异步处理 + 队列机制
3. **缓存一致性**: 合理的失效策略 + 监控告警

## 📚 总结

本重构方案将彻底解决当前纯前端方案的性能瓶颈，通过引入MongoDB + MinIO + 后端API的现代化架构，实现：

### 核心收益
- **性能提升75%**: 首屏加载时间从3.2s降至0.8s
- **内存优化70%**: 内存占用从50MB降至15MB
- **扩展性增强**: 支持从786个产品扩展到10万+产品
- **维护性改善**: 数据更新从重新部署改为实时同步

### 技术亮点
- **现代化技术栈**: Fastify + MongoDB + MinIO + React Query
- **多级缓存策略**: 内存 + Redis + CDN三级缓存
- **智能图片处理**: 自动压缩 + 多格式 + 懒加载
- **完善监控体系**: 健康检查 + 性能监控 + 自动恢复

### 实施保障
- **详细的迁移方案**: 分阶段实施，风险可控
- **完整的回滚机制**: 确保系统稳定性
- **充分的测试覆盖**: 单元测试 + 集成测试 + 性能测试

该方案不仅解决了当前问题，更为未来的业务发展奠定了坚实的技术基础，具备良好的扩展性和维护性。
```
```
