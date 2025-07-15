import React, { useState } from 'react';
import { MagnifyingGlassIcon, HeartIcon } from '@heroicons/react/24/outline';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Spinner,
  LoadingOverlay,
  ProductCardSkeleton,
  ListItemSkeleton,
  TextSkeleton,
  ToastContainer,
  type ToastData,
} from './index';

const UIDemo: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const toggleLoading = () => {
    setLoading(!loading);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">UI组件演示</h1>
          <p className="mt-2 text-gray-600">产品展示应用的基础UI组件库</p>
        </div>

        {/* 按钮组件演示 */}
        <Card>
          <CardHeader>
            <CardTitle>按钮组件</CardTitle>
            <CardDescription>多种变体和尺寸的按钮组件</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="success">Success</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button size="xl">Extra Large</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button loading>Loading</Button>
                <Button leftIcon={<HeartIcon className="h-4 w-4" />}>With Icon</Button>
                <Button rightIcon={<MagnifyingGlassIcon className="h-4 w-4" />}>Search</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 卡片组件演示 */}
        <Card>
          <CardHeader>
            <CardTitle>卡片组件</CardTitle>
            <CardDescription>不同样式的卡片组件</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card variant="default">
                <CardHeader>
                  <CardTitle>默认卡片</CardTitle>
                  <CardDescription>这是一个默认样式的卡片</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">卡片内容区域</p>
                </CardContent>
              </Card>

              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>高级卡片</CardTitle>
                  <CardDescription>带有更明显阴影的卡片</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">卡片内容区域</p>
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardHeader>
                  <CardTitle>边框卡片</CardTitle>
                  <CardDescription>只有边框的卡片样式</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">卡片内容区域</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* 输入框组件演示 */}
        <Card>
          <CardHeader>
            <CardTitle>输入框组件</CardTitle>
            <CardDescription>不同样式和功能的输入框</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input placeholder="基础输入框" />
              <Input
                label="带标签的输入框"
                placeholder="请输入内容"
                helperText="这是帮助文本"
              />
              <Input
                placeholder="搜索..."
                leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
              />
              <Input
                placeholder="错误状态"
                error="这是错误信息"
              />
              <Input
                variant="success"
                placeholder="成功状态"
                helperText="输入正确"
              />
            </div>
          </CardContent>
        </Card>

        {/* 加载状态组件演示 */}
        <Card>
          <CardHeader>
            <CardTitle>加载状态组件</CardTitle>
            <CardDescription>加载指示器和骨架屏组件</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="mb-2 font-medium">加载指示器</h4>
                <div className="flex items-center space-x-4">
                  <Spinner size="sm" />
                  <Spinner size="md" />
                  <Spinner size="lg" />
                  <Spinner size="xl" />
                </div>
              </div>

              <div>
                <h4 className="mb-2 font-medium">骨架屏</h4>
                <div className="space-y-4">
                  <ProductCardSkeleton />
                  <ListItemSkeleton />
                  <TextSkeleton lines={3} />
                </div>
              </div>

              <div>
                <h4 className="mb-2 font-medium">加载覆盖层</h4>
                <div className="flex items-center space-x-4">
                  <Button onClick={toggleLoading}>
                    {loading ? '停止加载' : '开始加载'}
                  </Button>
                </div>
                <LoadingOverlay isLoading={loading} className="mt-4">
                  <Card>
                    <CardContent>
                      <p>这是被覆盖的内容区域</p>
                      <p>当加载状态为true时，会显示加载覆盖层</p>
                    </CardContent>
                  </Card>
                </LoadingOverlay>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 通知组件演示 */}
        <Card>
          <CardHeader>
            <CardTitle>通知组件</CardTitle>
            <CardDescription>不同类型的通知提示</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => addToast({
                  variant: 'success',
                  title: '成功',
                  description: '操作已成功完成！',
                })}
              >
                成功通知
              </Button>
              <Button
                onClick={() => addToast({
                  variant: 'error',
                  title: '错误',
                  description: '操作失败，请重试。',
                })}
              >
                错误通知
              </Button>
              <Button
                onClick={() => addToast({
                  variant: 'warning',
                  title: '警告',
                  description: '请注意这个重要信息。',
                })}
              >
                警告通知
              </Button>
              <Button
                onClick={() => addToast({
                  variant: 'info',
                  title: '信息',
                  description: '这是一条信息通知。',
                })}
              >
                信息通知
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 通知容器 */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default UIDemo;
