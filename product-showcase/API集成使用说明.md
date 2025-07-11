# API集成和状态管理使用说明

## 📋 概述

本项目已完成React Query和Zustand的状态管理集成，提供了完整的API服务层、缓存策略和性能监控功能。

## 🚀 快速开始

### 启动应用

```bash
cd product-showcase
npm run dev
```

应用将在 http://localhost:5173/ 启动

### 页面导航

- **主页** (`/`): React Query版本的产品列表页面
- **原版产品列表** (`/products`): 使用Zustand的原版产品列表
- **产品详情** (`/products/:id`): 产品详情页面
- **API演示** (`/api-demo`): API集成功能演示页面

## 🔧 核心功能

### 1. React Query集成

#### 查询配置
- **缓存时间**: 10分钟内存缓存，5分钟数据新鲜度
- **重试策略**: 最多重试2次，指数退避延迟
- **离线支持**: 网络重连时自动重新获取数据

#### 可用的Hooks
```typescript
// 获取所有产品
const { data: products, isLoading, error } = useProducts();

// 获取单个产品
const { data: product } = useProduct(productId);

// 搜索产品
const { data: searchResults } = useSearchProducts(query, limit);

// 获取热门产品
const { data: popularProducts } = usePopularProducts(8);

// 筛选产品
const { data: filteredProducts } = useFilterProducts(filters, searchQuery);
```

### 2. 缓存管理

#### 缓存策略
- **多层缓存**: React Query缓存 + 内存缓存 + 离线缓存
- **智能预加载**: 基于用户行为的数据预加载
- **自动清理**: 定期清理过期缓存，控制内存使用

#### 缓存管理Hooks
```typescript
// 缓存管理
const { cacheStatus, clearAllCache, preloadCoreData } = useCacheManager();

// 离线缓存
const { isOffline, getOfflineData } = useOfflineCache();

// 性能监控
const metrics = useCachePerformance();
```

### 3. API服务层

#### ApiService类
```typescript
// 获取产品数据
const response = await apiService.getProducts();

// 搜索产品
const searchResponse = await apiService.searchProducts(query, limit);

// 获取相关产品推荐
const relatedResponse = await apiService.getRelatedProducts(productId, limit);
```

#### 错误处理
- 统一的API错误处理
- 用户友好的错误提示
- 自动重试和降级策略

### 4. 性能监控

#### 实时监控指标
- 缓存命中率
- 查询性能统计
- 网络状态监控
- 内存使用情况

#### 开发工具
- React Query DevTools (开发环境)
- 浏览器控制台调试工具
- 性能分析面板

## 📊 API演示页面功能

访问 `/api-demo` 查看完整的API集成演示：

### 左侧面板 - 系统状态
- **缓存状态**: 显示查询数量、网络状态、命中率等
- **离线缓存**: 显示离线状态和可用数据
- **数据统计**: 显示产品总数、品类数、价格范围等

### 中间面板 - 交互功能
- **产品搜索**: 实时搜索功能演示
- **热门产品**: 显示有优惠的热门产品

### 右侧面板 - 产品详情
- **详情展示**: 选择产品后显示完整信息
- **图片展示**: 产品图片预览
- **规格信息**: 价格、规格、产地等详细信息

### 操作按钮
- **清空缓存**: 清除所有缓存数据
- **预加载核心数据**: 预加载产品、统计、筛选选项
- **刷新数据**: 强制刷新产品数据

## 🔄 两个版本对比

### React Query版本 (`/`)
- ✅ 使用React Query进行数据管理
- ✅ 完整的缓存策略和性能优化
- ✅ 离线支持和错误恢复
- ✅ 实时性能监控
- ✅ 开发工具集成

### 原版本 (`/products`)
- ✅ 使用Zustand进行状态管理
- ✅ 完整的筛选和搜索功能
- ✅ URL状态持久化
- ✅ 用户偏好存储

## 🛠️ 开发调试

### React Query DevTools
在开发环境下，页面右下角会显示React Query DevTools按钮，点击可以：
- 查看所有查询状态
- 监控缓存数据
- 手动触发重新获取
- 分析查询性能

### 浏览器控制台
开发环境下可以使用以下全局对象进行调试：
```javascript
// 查询客户端
window.queryClient

// 查询工具函数
window.queryUtils

// 清除所有缓存
window.queryUtils.clearAll()

// 获取缓存的产品数据
window.queryUtils.getCachedProducts()
```

## 📈 性能优化特性

### 1. 智能缓存
- 基于使用频率的缓存优先级
- 自动清理过期数据
- 内存使用控制

### 2. 预加载策略
- 核心数据预加载
- 基于用户行为的智能预加载
- 相关产品预加载

### 3. 网络优化
- 请求去重和合并
- 自动重试机制
- 离线模式支持

### 4. 用户体验
- 加载状态管理
- 错误边界处理
- 流畅的动画效果

## 🔍 故障排除

### 常见问题

1. **数据加载失败**
   - 检查网络连接
   - 查看浏览器控制台错误信息
   - 尝试刷新页面或清空缓存

2. **缓存问题**
   - 使用API演示页面的"清空缓存"功能
   - 检查浏览器存储空间
   - 重启开发服务器

3. **性能问题**
   - 查看React Query DevTools中的查询状态
   - 检查缓存命中率
   - 分析网络请求时间

### 调试技巧

1. 使用React Query DevTools监控查询状态
2. 查看API演示页面的实时性能指标
3. 使用浏览器开发者工具分析网络请求
4. 检查控制台的性能日志

## 📝 总结

本API集成方案提供了：
- 🚀 高性能的数据管理和缓存策略
- 🔧 完整的开发工具和调试支持
- 📊 实时性能监控和分析
- 🌐 离线支持和错误恢复
- 🎯 用户友好的交互体验

通过React Query和Zustand的结合，实现了既强大又灵活的状态管理解决方案。
