# MinIO图片存储优化 - 实施指南

## 概述

本指南详细说明如何部署和使用MinIO图片存储优化方案，确保图片与业务数据的强关联性和数据一致性。

## 实施步骤

### 第一步：数据库迁移

#### 1.1 备份现有数据
```bash
# 备份MongoDB数据库
mongodump --uri="mongodb://localhost:27017/products-db" --out="./backup/$(date +%Y%m%d_%H%M%S)"

# 备份MinIO数据（可选）
mc mirror minio/product-images ./backup/minio-images/
```

#### 1.2 运行数据库迁移脚本
```bash
cd products-backend
npm run build
node scripts/migrate-image-structure.js
```

迁移脚本将：
- 将Product表中的图片字段从字符串转换为对象结构
- 创建缺失的Image记录
- 验证迁移结果

#### 1.3 验证迁移结果
```bash
# 检查迁移日志
tail -f products-backend/logs/migration.log

# 运行验证脚本
node scripts/validate-migration.js
```

### 第二步：后端服务部署

#### 2.1 安装新依赖
```bash
cd products-backend
npm install
```

#### 2.2 更新环境变量
```bash
# .env 文件中添加或更新以下配置
MINIO_ENDPOINT=152.89.168.61
MINIO_PORT=9000
MINIO_ACCESS_KEY=lcsm
MINIO_SECRET_KEY=Sa2482047260@
MINIO_BUCKET=product-images
MINIO_USE_SSL=false

# 飞书API配置
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
FEISHU_APP_TOKEN=your_app_token
FEISHU_TABLE_ID=your_table_id
```

#### 2.3 重启后端服务
```bash
npm run build
npm run start
```

#### 2.4 验证后端API
```bash
# 测试健康检查
curl http://localhost:3000/api/v1/health

# 测试图片API
curl http://localhost:3000/api/v1/products/rec12345abcd/images

# 测试一致性验证
curl http://localhost:3000/api/v1/products/rec12345abcd/images/validate
```

### 第三步：前端更新部署

#### 3.1 安装依赖
```bash
cd product-showcase
npm install
```

#### 3.2 更新配置
```bash
# .env 文件中确认以下配置
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_IMAGE_BASE_URL=http://152.89.168.61:9000
```

#### 3.3 构建和启动
```bash
npm run build
npm run preview
# 或开发模式
npm run dev
```

#### 3.4 验证前端功能
- 访问 http://localhost:5173
- 检查产品图片是否正常显示
- 测试图片错误处理和重试机制

### 第四步：数据同步测试

#### 4.1 运行完整同步
```bash
# 通过API触发同步
curl -X POST http://localhost:3000/api/v1/sync/feishu \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "full",
    "downloadImages": true,
    "validateData": true
  }'
```

#### 4.2 监控同步进度
```bash
# 查看同步日志
tail -f products-backend/logs/sync.log

# 检查同步状态
curl http://localhost:3000/api/v1/sync/status
```

#### 4.3 验证同步结果
```bash
# 检查产品数量
curl http://localhost:3000/api/v1/products?limit=1

# 验证图片完整性
curl http://localhost:3000/api/v1/products/rec12345abcd/images/validate
```

## 新功能使用指南

### 1. 图片一致性检查

#### API调用
```javascript
// 检查单个产品的图片一致性
const response = await apiService.validateImageConsistency('rec12345abcd');
console.log(response.data.checks);
```

#### 前端组件使用
```jsx
import { ImageIntegrityTest } from '../components/test/ImageIntegrityTest';

function TestPage() {
  return <ImageIntegrityTest />;
}
```

### 2. 图片错误处理

#### Hook使用
```jsx
import { useImageErrorHandling } from '../hooks/useImageErrorHandling';

function ProductImage({ productId, imageType, src }) {
  const {
    handleImageError,
    getCurrentImageUrl,
    isRetrying,
    shouldShowError
  } = useImageErrorHandling(productId, imageType);

  return (
    <div>
      <img
        src={getCurrentImageUrl(src)}
        onError={() => handleImageError(src)}
        alt={`${imageType} image`}
      />
      {isRetrying && <div>正在修复图片...</div>}
      {shouldShowError && <div>图片加载失败</div>}
    </div>
  );
}
```

### 3. 批量图片修复

#### API调用
```javascript
// 修复单个产品的图片引用
const repairResult = await apiService.repairProductImages('rec12345abcd');
console.log(`修复了 ${repairResult.data.repaired} 个问题`);
```

#### 批量修复脚本
```bash
# 运行批量修复脚本
node scripts/batch-repair-images.js
```

### 4. 增强的同步服务

#### 使用增强同步
```javascript
import { enhancedSyncService } from '../services/enhancedSyncService';

// 执行增强的全量同步
const result = await enhancedSyncService.performEnhancedFullSync('sync_123');

// 验证同步完整性
const integrity = await enhancedSyncService.validateSyncIntegrity('sync_123');
```

## 监控和维护

### 1. 日志监控

#### 重要日志文件
```bash
# 同步日志
tail -f products-backend/logs/sync.log

# 图片服务日志
tail -f products-backend/logs/image-service.log

# 错误日志
tail -f products-backend/logs/error.log
```

#### 日志分析
```bash
# 统计图片下载成功率
grep "图片下载成功" products-backend/logs/image-service.log | wc -l

# 查找图片错误
grep "图片.*失败" products-backend/logs/error.log
```

### 2. 性能监控

#### 关键指标
- 图片下载成功率
- 数据一致性检查通过率
- 同步任务完成时间
- MinIO存储使用量

#### 监控脚本
```bash
# 检查MinIO存储使用情况
mc du minio/product-images

# 统计数据库中的图片记录
mongo products-db --eval "db.images.count()"

# 检查孤立图片
node scripts/check-orphaned-images.js
```

### 3. 定期维护

#### 每日任务
```bash
# 验证图片完整性
node scripts/daily-image-check.js

# 清理临时文件
node scripts/cleanup-temp-files.js
```

#### 每周任务
```bash
# 清理孤立图片
node scripts/cleanup-orphaned-images.js

# 生成健康报告
node scripts/generate-health-report.js
```

## 故障排除

### 常见问题

#### 1. 图片无法显示
**症状**: 前端显示占位符图片
**排查步骤**:
1. 检查MinIO服务是否正常
2. 验证图片URL是否正确
3. 检查网络连接
4. 运行一致性检查

```bash
# 检查MinIO连接
mc ls minio/product-images

# 验证图片URL
curl -I http://152.89.168.61:9000/product-images/products/example.jpg

# 运行修复
curl -X POST http://localhost:3000/api/v1/products/rec12345abcd/images/repair
```

#### 2. 数据同步失败
**症状**: 同步任务报错或卡住
**排查步骤**:
1. 检查飞书API配置
2. 验证网络连接
3. 查看错误日志
4. 重启同步服务

```bash
# 测试飞书API连接
curl -X GET http://localhost:3000/api/v1/sync/test-connection

# 查看同步状态
curl http://localhost:3000/api/v1/sync/status

# 重启同步
curl -X POST http://localhost:3000/api/v1/sync/restart
```

#### 3. 数据不一致
**症状**: Product表和Image表数据不匹配
**解决方案**:
```bash
# 运行一致性检查
node scripts/check-data-consistency.js

# 批量修复
node scripts/batch-repair-consistency.js

# 重新迁移（如果必要）
node scripts/migrate-image-structure.js --force
```

### 回滚方案

如果出现严重问题，可以按以下步骤回滚：

#### 1. 数据库回滚
```bash
# 恢复数据库备份
mongorestore --uri="mongodb://localhost:27017/products-db" ./backup/20240722_120000/

# 重启服务
npm run restart
```

#### 2. 代码回滚
```bash
# 切换到之前的版本
git checkout previous-stable-version

# 重新部署
npm run build
npm run start
```

## 性能优化建议

### 1. 图片优化
- 启用WebP格式转换
- 实施CDN加速
- 优化缩略图生成

### 2. 数据库优化
- 添加适当的索引
- 定期清理过期数据
- 优化查询语句

### 3. 缓存策略
- 实施Redis缓存
- 启用浏览器缓存
- 优化API响应缓存

## 总结

通过以上实施步骤，您的系统将获得：
- 强一致的图片数据关联
- 自动的错误检测和修复
- 完善的监控和维护工具
- 高可靠性的图片存储方案

如有问题，请参考故障排除部分或联系技术支持团队。
