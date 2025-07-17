# 后端重构快速开始指南

## 🚀 快速概览

本指南将帮助您快速了解并开始实施产品展示系统的后端重构方案。

### 重构目标
- **性能提升**: 首屏加载时间从 3.2s 降至 0.8s (75% 提升)
- **内存优化**: 内存占用从 50MB 降至 15MB (70% 减少)
- **扩展性**: 支持从 786 个产品扩展到 10万+ 产品
- **维护性**: 数据更新从重新部署改为实时同步

### 技术栈选择
- **后端框架**: Fastify (高性能 Node.js 框架)
- **数据库**: MongoDB 7.0.21 (文档数据库，支持灵活字段)
- **对象存储**: MinIO (S3兼容，图片存储)
- **缓存**: Redis (多级缓存策略)
- **前端**: React + TanStack Query (保持现有架构)

## 📋 前置条件检查

### 服务器环境
```bash
# 检查 MongoDB 连接
mongosh "mongodb://lcs:Sa2482047260@@152.89.168.61:27017/admin"

# 检查 MinIO 服务
curl -I http://152.89.168.61:9000/minio/health/live

# 检查端口开放
telnet 152.89.168.61 27017  # MongoDB
telnet 152.89.168.61 9000   # MinIO API
telnet 152.89.168.61 9001   # MinIO Console
```

### 开发环境
```bash
# Node.js 版本检查 (需要 18+)
node --version

# 安装必要工具
npm install -g typescript ts-node nodemon

# 克隆项目 (假设已有仓库)
git clone <your-repo-url>
cd products-backend
```

## 🏗️ 项目初始化

### 1. 创建后端项目结构
```bash
mkdir products-backend
cd products-backend

# 初始化 package.json
npm init -y

# 安装核心依赖
npm install fastify @fastify/cors @fastify/multipart @fastify/rate-limit
npm install mongoose minio redis
npm install dotenv winston

# 安装开发依赖
npm install -D typescript @types/node ts-node nodemon
npm install -D eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### 2. 创建基础目录结构
```bash
mkdir -p src/{controllers,models,services,routes,middleware,utils,types}
mkdir -p src/{config,migrations,scripts}
mkdir -p logs tests docs
```

### 3. 配置 TypeScript
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 4. 环境配置
```bash
# .env
NODE_ENV=development
PORT=3000

# MongoDB 配置
MONGODB_URI=mongodb://lcs:Sa2482047260@@152.89.168.61:27017/products?authSource=admin

# MinIO 配置
MINIO_ENDPOINT=152.89.168.61
MINIO_PORT=9000
MINIO_ACCESS_KEY=lcsm
MINIO_SECRET_KEY=Sa2482047260@
MINIO_BUCKET=product-images

# Redis 配置 (可选，后续添加)
REDIS_URL=redis://152.89.168.61:6379

# 日志配置
LOG_LEVEL=info
```

## 🗄️ 数据库初始化

### 1. 连接测试脚本
```typescript
// src/scripts/test-connections.ts
import mongoose from 'mongoose';
import { Client as MinioClient } from 'minio';

async function testMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ MongoDB 连接成功');
    
    // 测试基本操作
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`📊 现有集合数量: ${collections.length}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error);
  }
}

async function testMinIO() {
  try {
    const minioClient = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT!,
      port: parseInt(process.env.MINIO_PORT!),
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY!,
      secretKey: process.env.MINIO_SECRET_KEY!
    });
    
    // 测试连接
    const buckets = await minioClient.listBuckets();
    console.log('✅ MinIO 连接成功');
    console.log(`🪣 现有存储桶: ${buckets.map(b => b.name).join(', ')}`);
    
    // 检查产品图片桶
    const bucketExists = await minioClient.bucketExists('product-images');
    if (!bucketExists) {
      await minioClient.makeBucket('product-images');
      console.log('📦 创建 product-images 存储桶');
    }
  } catch (error) {
    console.error('❌ MinIO 连接失败:', error);
  }
}

async function main() {
  console.log('🔍 开始连接测试...\n');
  await testMongoDB();
  console.log('');
  await testMinIO();
  console.log('\n✨ 连接测试完成');
}

main();
```

### 2. 运行连接测试
```bash
# 运行测试脚本
npx ts-node src/scripts/test-connections.ts
```

## 📊 数据迁移快速开始

### 1. 分析现有数据
```typescript
// src/scripts/analyze-data.ts
import fs from 'fs';
import path from 'path';

function analyzeProductData() {
  const dataPath = path.join(__dirname, '../product-showcase/src/data/products.json');
  const products = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  console.log('📊 数据分析结果:');
  console.log(`- 产品总数: ${products.length}`);
  console.log(`- 文件大小: ${(fs.statSync(dataPath).size / 1024).toFixed(2)} KB`);
  
  // 分析字段结构
  const sampleProduct = products[0];
  console.log('\n🔍 产品字段结构:');
  console.log(JSON.stringify(sampleProduct, null, 2));
  
  // 统计分类分布
  const categories = products.reduce((acc: any, product: any) => {
    const primary = product.category?.primary || '未分类';
    acc[primary] = (acc[primary] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\n📈 分类分布:');
  Object.entries(categories).forEach(([category, count]) => {
    console.log(`- ${category}: ${count}`);
  });
}

analyzeProductData();
```

### 2. 创建数据模型
```typescript
// src/models/Product.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  productId: string;
  recordId: string;
  name: string;
  sequence: string;
  category: {
    primary: string;
    secondary: string;
  };
  price: {
    normal: number;
    discount: number;
    discountRate: number;
    currency: string;
  };
  images: {
    front?: string;
    back?: string;
    label?: string;
    package?: string;
    gift?: string;
  };
  origin: {
    country: string;
    province: string;
    city: string;
  };
  platform: string;
  specification: string;
  flavor: string;
  manufacturer: string;
  collectTime: Date;
  createdAt: Date;
  updatedAt: Date;
  searchText: string;
  status: string;
  isVisible: boolean;
}

const ProductSchema = new Schema<IProduct>({
  productId: { type: String, required: true, unique: true, index: true },
  recordId: { type: String, required: true },
  name: { type: String, required: true, index: true },
  sequence: { type: String, required: true },
  
  category: {
    primary: { type: String, required: true, index: true },
    secondary: { type: String, required: true }
  },
  
  price: {
    normal: { type: Number, required: true, index: true },
    discount: { type: Number, default: 0 },
    discountRate: { type: Number, default: 0 },
    currency: { type: String, default: 'CNY' }
  },
  
  images: {
    front: String,
    back: String,
    label: String,
    package: String,
    gift: String
  },
  
  origin: {
    country: { type: String, default: '中国' },
    province: { type: String, index: true },
    city: String
  },
  
  platform: { type: String, required: true, index: true },
  specification: String,
  flavor: String,
  manufacturer: String,
  
  collectTime: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  searchText: { type: String, index: 'text' },
  status: { type: String, default: 'active', index: true },
  isVisible: { type: Boolean, default: true, index: true }
}, {
  timestamps: true
});

// 复合索引
ProductSchema.index({ status: 1, isVisible: 1, 'category.primary': 1, collectTime: -1 });
ProductSchema.index({ platform: 1, 'origin.province': 1 });
ProductSchema.index({ 'price.normal': 1, 'category.primary': 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
```

## 🔧 基础 API 开发

### 1. 创建 Fastify 应用
```typescript
// src/app.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import mongoose from 'mongoose';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

// 注册插件
app.register(cors, {
  origin: true,
  credentials: true
});

app.register(multipart);

app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

// 数据库连接
async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    app.log.info('MongoDB 连接成功');
  } catch (error) {
    app.log.error('MongoDB 连接失败:', error);
    process.exit(1);
  }
}

// 健康检查
app.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
});

// 启动服务器
async function start() {
  try {
    await connectDatabase();
    await app.listen({ port: parseInt(process.env.PORT || '3000'), host: '0.0.0.0' });
    app.log.info('服务器启动成功');
  } catch (error) {
    app.log.error('服务器启动失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

export default app;
```

### 2. 创建产品路由
```typescript
// src/routes/products.ts
import { FastifyInstance } from 'fastify';
import { Product } from '../models/Product';

export async function productRoutes(fastify: FastifyInstance) {
  // 获取产品列表
  fastify.get('/products', async (request, reply) => {
    try {
      const { page = 1, limit = 20, category, platform, search } = request.query as any;
      
      const query: any = { status: 'active', isVisible: true };
      
      if (category) query['category.primary'] = category;
      if (platform) query.platform = platform;
      if (search) query.$text = { $search: search };
      
      const skip = (page - 1) * limit;
      
      const [products, total] = await Promise.all([
        Product.find(query)
          .sort({ collectTime: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(query)
      ]);
      
      return {
        success: true,
        data: {
          products,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: skip + limit < total,
            hasPrev: page > 1
          }
        }
      };
    } catch (error) {
      fastify.log.error('获取产品列表失败:', error);
      return reply.status(500).send({
        success: false,
        error: { message: '获取产品列表失败' }
      });
    }
  });
  
  // 获取产品详情
  fastify.get('/products/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      const product = await Product.findOne({
        productId: id,
        status: 'active',
        isVisible: true
      }).lean();
      
      if (!product) {
        return reply.status(404).send({
          success: false,
          error: { message: '产品不存在' }
        });
      }
      
      return {
        success: true,
        data: { product }
      };
    } catch (error) {
      fastify.log.error('获取产品详情失败:', error);
      return reply.status(500).send({
        success: false,
        error: { message: '获取产品详情失败' }
      });
    }
  });
}
```

## 🚀 快速启动

### 1. 启动开发服务器
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 或者直接运行
npx ts-node src/app.ts
```

### 2. 测试 API
```bash
# 健康检查
curl http://localhost:3000/health

# 获取产品列表
curl "http://localhost:3000/api/v1/products?page=1&limit=10"

# 获取产品详情
curl "http://localhost:3000/api/v1/products/20250708-002"
```

## 📝 下一步计划

1. **完成数据迁移** (参考 `docs/backend-refactor-design.md` 中的迁移方案)
2. **实现图片服务** (MinIO 集成和图片处理)
3. **添加缓存层** (Redis 集成)
4. **前端 API 集成** (修改前端调用后端 API)
5. **性能优化** (索引优化、查询优化)
6. **部署上线** (Docker 容器化部署)

## 📚 相关文档

- [完整设计方案](./backend-refactor-design.md) - 详细的技术设计和架构说明
- [架构图](./architecture-diagram.md) - 系统架构可视化图表
- [实施检查清单](./implementation-checklist.md) - 详细的实施步骤检查清单

## 🆘 常见问题

### Q: MongoDB 连接失败怎么办？
A: 检查网络连接、用户名密码、防火墙设置，确保 MongoDB 服务正常运行。

### Q: MinIO 访问被拒绝？
A: 检查访问密钥是否正确，存储桶权限是否配置正确。

### Q: 如何处理大量数据迁移？
A: 建议分批迁移，先迁移少量数据测试，确认无误后再全量迁移。

---

**需要帮助？** 请参考完整的设计文档或联系技术支持团队。
