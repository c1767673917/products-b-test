# 基础UI组件库

这是产品展示应用的基础UI组件库，包含了5个核心组件，采用现代化的设计系统和最佳实践。

## 🎨 设计特色

- **类型安全**: 完整的TypeScript类型定义
- **变体系统**: 使用class-variance-authority实现类型安全的样式变体
- **动画效果**: 集成Framer Motion提供流畅的交互动画
- **可访问性**: 遵循WCAG标准，支持键盘导航和屏幕阅读器
- **响应式**: 支持多种屏幕尺寸的自适应布局

## 📦 组件列表

### 1. Button 按钮组件

支持多种变体、尺寸和状态的按钮组件。

```tsx
import { Button } from './components/ui';

// 基础用法
<Button>点击我</Button>

// 不同变体
<Button variant="primary">主要按钮</Button>
<Button variant="secondary">次要按钮</Button>
<Button variant="ghost">幽灵按钮</Button>
<Button variant="outline">边框按钮</Button>

// 不同尺寸
<Button size="sm">小按钮</Button>
<Button size="md">中等按钮</Button>
<Button size="lg">大按钮</Button>

// 加载状态
<Button loading>加载中...</Button>

// 带图标
<Button leftIcon={<HeartIcon className="h-4 w-4" />}>收藏</Button>
```

### 2. Card 卡片组件

灵活的卡片容器组件，支持多种样式和布局。

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './components/ui';

<Card>
  <CardHeader>
    <CardTitle>卡片标题</CardTitle>
    <CardDescription>卡片描述</CardDescription>
  </CardHeader>
  <CardContent>
    <p>卡片内容</p>
  </CardContent>
  <CardFooter>
    <Button>操作按钮</Button>
  </CardFooter>
</Card>
```

### 3. Input 输入框组件

功能丰富的输入框组件，支持多种状态和配置。

```tsx
import { Input } from './components/ui';

// 基础用法
<Input placeholder="请输入内容" />

// 带标签和帮助文本
<Input 
  label="用户名"
  placeholder="请输入用户名"
  helperText="用户名长度为3-20个字符"
/>

// 带图标
<Input 
  placeholder="搜索..."
  leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
/>

// 错误状态
<Input 
  placeholder="邮箱地址"
  error="请输入有效的邮箱地址"
/>
```

### 4. Loading 加载状态组件

包含加载指示器、骨架屏和加载覆盖层的完整加载状态解决方案。

```tsx
import { Spinner, Skeleton, LoadingOverlay, ProductCardSkeleton } from './components/ui';

// 加载指示器
<Spinner size="md" />
<Spinner size="lg" variant="primary" />

// 骨架屏
<Skeleton width="100%" height="2rem" />
<ProductCardSkeleton />

// 加载覆盖层
<LoadingOverlay isLoading={loading}>
  <div>需要被覆盖的内容</div>
</LoadingOverlay>
```

### 5. Toast 通知组件

支持多种类型和自动消失的通知提示组件。

```tsx
import { Toast, ToastContainer } from './components/ui';

// 单个通知
<Toast
  variant="success"
  title="成功"
  description="操作已成功完成！"
  onClose={() => console.log('关闭通知')}
/>

// 通知容器（通常放在应用根部）
<ToastContainer 
  toasts={toasts}
  onRemove={removeToast}
  position="top-right"
/>
```

## 🚀 快速开始

1. 导入需要的组件：
```tsx
import { Button, Card, Input } from './components/ui';
```

2. 在你的组件中使用：
```tsx
function MyComponent() {
  return (
    <Card>
      <CardContent>
        <Input placeholder="搜索产品..." />
        <Button>搜索</Button>
      </CardContent>
    </Card>
  );
}
```

## 🎯 演示页面

访问 `http://localhost:5173/` 查看所有组件的完整演示和使用示例。

## 📝 开发说明

- 所有组件都使用 `React.forwardRef` 支持ref传递
- 组件样式基于Tailwind CSS设计系统
- 动画效果使用Framer Motion实现
- 类型定义完整，支持IntelliSense自动补全
