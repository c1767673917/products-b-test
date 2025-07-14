# AnimatePresence 最佳实践指南

## 🎯 问题背景

在使用 Framer Motion 的 AnimatePresence 组件时，遇到了控制台警告：
```
"You're attempting to animate multiple children within AnimatePresence, but its mode is set to 'wait'. This will lead to odd visual behaviour."
```

## 🔍 问题分析

### 警告产生的原因

1. **mode="wait" 的限制**：当 AnimatePresence 设置为 `mode="wait"` 时，它期望在任何时候只有一个子元素存在
2. **多个子元素同时存在**：如果在同一个 AnimatePresence 中同时渲染多个子元素，就会产生警告
3. **缺少唯一 key**：即使不是 wait 模式，多个子元素也需要唯一的 key 来正确追踪动画

### 代码库中发现的问题

1. **AnimationSettings.tsx**：包含背景遮罩和设置面板两个子元素
2. **ProductListWithQuery.tsx**：移动端筛选面板包含背景遮罩和抽屉两个子元素  
3. **Pagination.tsx**：错误使用了 `mode="wait"` 来渲染多个页码按钮

## ✅ 解决方案

### 1. 为多个子元素添加唯一 key

**修复前：**
```tsx
<AnimatePresence>
  {isOpen && (
    <>
      <motion.div>背景遮罩</motion.div>
      <motion.div>内容面板</motion.div>
    </>
  )}
</AnimatePresence>
```

**修复后：**
```tsx
<AnimatePresence>
  {isOpen && (
    <>
      <motion.div key="backdrop">背景遮罩</motion.div>
      <motion.div key="panel">内容面板</motion.div>
    </>
  )}
</AnimatePresence>
```

### 2. 正确使用 mode 属性

**对于多个同时存在的元素：**
```tsx
<AnimatePresence> {/* 默认 mode="sync" */}
  {items.map(item => (
    <motion.div key={item.id}>{item.content}</motion.div>
  ))}
</AnimatePresence>
```

**对于互斥的单个元素：**
```tsx
<AnimatePresence mode="wait">
  {viewMode === 'list' && (
    <motion.div key="list">列表视图</motion.div>
  )}
  {viewMode === 'grid' && (
    <motion.div key="grid">网格视图</motion.div>
  )}
</AnimatePresence>
```

## 📋 最佳实践

### 1. Mode 选择指南

- **mode="sync"（默认）**：适用于多个元素可能同时存在的场景
  - 产品列表动画
  - 多个通知消息
  - 并行的 UI 元素

- **mode="wait"**：适用于互斥元素切换的场景
  - 页面路由切换
  - 视图模式切换（列表/网格）
  - 单一内容区域的状态切换

- **mode="popLayout"**：适用于布局变化的场景
  - 响应式网格布局
  - 动态添加/删除元素

### 2. Key 设计原则

```tsx
// ✅ 好的 key 设计
<motion.div key={`product-${product.id}`}>
<motion.div key="modal-backdrop">
<motion.div key={`page-${currentPage}`}>

// ❌ 避免的 key 设计
<motion.div key={Math.random()}> // 随机 key
<motion.div key={index}> // 仅使用索引
```

### 3. 条件渲染最佳实践

```tsx
// ✅ 推荐：明确的条件分支
<AnimatePresence mode="wait">
  {currentView === 'loading' && (
    <motion.div key="loading">加载中...</motion.div>
  )}
  {currentView === 'content' && (
    <motion.div key="content">内容</motion.div>
  )}
  {currentView === 'error' && (
    <motion.div key="error">错误信息</motion.div>
  )}
</AnimatePresence>

// ❌ 避免：可能同时为真的条件
<AnimatePresence mode="wait">
  {isLoading && <motion.div>加载中...</motion.div>}
  {hasData && <motion.div>数据内容</motion.div>}
</AnimatePresence>
```

### 4. 响应式布局动画

对于左右分屏布局的响应式动画：

```tsx
// 产品列表页面的响应式动画
<AnimatePresence>
  {products.map(product => (
    <motion.div
      key={product.id}
      layout // 启用布局动画
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      <ProductCard product={product} />
    </motion.div>
  ))}
</AnimatePresence>
```

## 🛠️ 修复总结

### 已修复的文件

1. **AnimationSettings.tsx**
   - 为背景遮罩添加 `key="backdrop"`
   - 为设置面板添加 `key="panel"`

2. **ProductListWithQuery.tsx**
   - 为移动端筛选背景遮罩添加 `key="mobile-filter-backdrop"`
   - 为移动端筛选抽屉添加 `key="mobile-filter-drawer"`

3. **Pagination.tsx**
   - 移除了不当的 `mode="wait"` 设置
   - 保持默认的 `mode="sync"` 以支持多个页码按钮

### 验证结果

- ✅ 控制台警告已消除
- ✅ 动画效果正常工作
- ✅ 左右分屏布局的响应式动画流畅
- ✅ 所有交互功能正常

## 🔮 预防措施

1. **代码审查检查点**：
   - 检查 AnimatePresence 的 mode 设置是否合适
   - 确保所有子元素都有唯一的 key
   - 验证条件渲染逻辑的互斥性

2. **开发工具**：
   - 启用 React 开发模式的严格检查
   - 使用 ESLint 规则检查 key 的使用
   - 定期检查控制台警告

3. **测试策略**：
   - 测试不同屏幕尺寸下的动画效果
   - 验证快速切换操作的动画表现
   - 检查动画性能和流畅度

通过遵循这些最佳实践，可以避免 AnimatePresence 相关的警告和问题，确保动画效果的稳定性和用户体验的一致性。
