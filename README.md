# Products B Test

一个现代化的产品展示应用程序，采用 React + TypeScript + Vite 构建，具有高性能优化和完整的后端API支持。

## 项目概述

该项目包含以下主要组件：

- **product-showcase/**: 前端展示应用 - 基于 React 19 + TypeScript 的现代化产品展示平台
- **products-backend/**: 后端API服务 - 提供产品数据同步和图片管理功能
- **docs/**: 项目文档和架构设计
- **scripts/**: 项目维护脚本

## 主要特性

### 前端应用 (product-showcase)
- 🚀 **现代技术栈**: React 19 + TypeScript + Vite
- ⚡ **性能优化**: 虚拟滚动、图片懒加载、代码分割
- 🎨 **动画效果**: Framer Motion 动画与性能监控
- 📊 **数据管理**: TanStack Query 数据缓存 + Zustand 状态管理
- 🎯 **用户体验**: Tailwind CSS + HeadlessUI 响应式设计
- 🧪 **完整测试**: Vitest + React Testing Library 测试覆盖

### 后端服务 (products-backend)
- 🔄 **数据同步**: 自动化产品数据同步服务
- 🖼️ **图片管理**: 智能图片URL处理和路径映射
- 🔗 **API集成**: RESTful API 接口设计
- ⚙️ **定时任务**: 自动化数据同步调度

## 快速开始

### 前端开发

```bash
cd product-showcase
npm install
npm run dev                # 启动开发服务器 (http://localhost:5173)
```

### 后端服务

```bash
cd products-backend
npm install
npm start                  # 启动后端API服务
```

## 开发命令

### 前端开发 (product-showcase/)

#### 开发服务
```bash
npm run dev                # 开发服务器
npm run build              # 生产构建
npm run preview            # 预览生产版本
```

#### 测试
```bash
npm run test               # 测试监听模式
npm run test:run           # 单次运行测试
npm run test:ui            # 测试UI界面
npm run test:coverage      # 测试覆盖率报告
```

#### 代码质量
```bash
npm run lint               # ESLint检查
```

#### 数据管理
```bash
npm run fix-keys           # 修复重复产品键
npm run validate-keys      # 验证产品数据完整性
npm run process-data       # 处理原始产品数据
npm run backup-data        # 备份当前产品数据
npm run check-duplicates   # 检查重复产品ID
```

### 后端服务 (products-backend/)

```bash
npm start                  # 启动API服务
npm run build              # 构建项目
npm run dev                # 开发模式
```

## 项目架构

### 状态管理
- **Zustand Store**: 主应用状态管理，支持用户偏好持久化
- **TanStack Query**: 服务器状态管理和缓存优化
- **数据服务**: 本地产品数据操作和过滤功能

### 关键组件结构

#### 页面组件 (src/pages/)
- `ProductList`: 主产品网格，支持过滤功能
- `ProductListWithQuery`: TanStack Query 实现版本
- `ProductDetail`: 单个产品详情页面
- `ApiDemo`: API集成演示
- `PerformanceDemo`: 性能测试工具

#### UI组件 (src/components/ui/)
- `VirtualGrid`: 高性能虚拟滚动
- `Pagination`: 高级分页，支持URL同步
- `PerformanceMonitor`: 实时性能监控
- `AnimationSettings`: 用户动画偏好设置

#### 产品组件 (src/components/product/)
- `ProductCard`: 优化的产品展示卡片，支持懒加载
- `ImageGallery`: 多图片查看器，支持预加载
- `LazyImage`: 性能优化的图片组件

### 性能特性
- 🔄 大型产品列表的虚拟滚动
- 🖼️ 交叉观察器的图片懒加载
- 📦 Vite配置的代码分割和手动块
- 📊 动画性能监控和用户偏好
- ⚡ 防抖搜索和过滤

### 测试策略
- 核心工具和组件的单元测试
- 性能场景的集成测试
- UI组件的视觉测试
- Vitest的覆盖率报告

## 数据结构

产品遵循 `src/types/product.ts` 中的 `Product` 接口：
- 分层分类（主要/次要）
- 多图片支持（正面/背面/标签/包装/礼品）
- 价格支持折扣
- 原产地位置数据
- 平台和规格详情

## 安全设置

项目包含完整的安全配置：
- 环境变量模板 (`.env.example`)
- Git忽略敏感文件配置
- 安全设置指南 (`SECURITY_SETUP.md`)

## 文档

- `CLAUDE.md`: Claude Code 工作指南
- `SECURITY_SETUP.md`: 安全设置和环境配置
- `docs/`: 详细的架构文档和实现清单

## 技术栈

### 前端
- React 19 + TypeScript
- Vite (构建工具)
- Framer Motion (动画)
- TanStack Query (数据获取)
- Zustand (状态管理)
- Tailwind CSS + HeadlessUI
- Vitest + React Testing Library

### 后端
- Node.js + TypeScript
- Express.js
- 数据同步服务
- 图片管理API

## 贡献指南

1. 遵循现有组件模式 `src/components/`
2. 使用 `src/types/` 中的TypeScript接口
3. 在 `__tests__/` 目录中实现测试
4. 考虑大型数据集的性能影响

## 许可证

私有项目

---

*本项目采用现代化开发最佳实践，注重性能优化和用户体验。*