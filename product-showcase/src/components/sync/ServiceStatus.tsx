import React, { useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useServiceStatus } from '../../hooks/useSyncOperations';

export const ServiceStatus: React.FC = () => {
  const {
    data,
    loading,
    error,
    lastCheck,
    checkStatus,
    overallHealth,
    isHealthy
  } = useServiceStatus();

  // 自动刷新
  useEffect(() => {
    const interval = setInterval(checkStatus, 30000); // 每30秒检查一次
    return () => clearInterval(interval);
  }, [checkStatus]);

  // 获取服务状态样式
  const getServiceStatusBadge = (status: string) => {
    const styles = {
      connected: 'bg-green-100 text-green-800',
      disconnected: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    };

    const labels = {
      connected: '正常',
      disconnected: '断开',
      error: '错误'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        <span className={`w-2 h-2 rounded-full mr-1 ${
          status === 'connected' ? 'bg-green-500' :
          status === 'disconnected' ? 'bg-yellow-500' :
          'bg-red-500'
        }`}></span>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  // 获取整体健康状态样式
  const getOverallHealthBadge = (health: string) => {
    const styles = {
      healthy: 'bg-green-100 text-green-800',
      degraded: 'bg-yellow-100 text-yellow-800',
      unhealthy: 'bg-red-100 text-red-800',
      unknown: 'bg-gray-100 text-gray-800'
    };

    const labels = {
      healthy: '健康',
      degraded: '部分异常',
      unhealthy: '不健康',
      unknown: '未知'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[health as keyof typeof styles]}`}>
        <span className={`w-3 h-3 rounded-full mr-2 ${
          health === 'healthy' ? 'bg-green-500' :
          health === 'degraded' ? 'bg-yellow-500' :
          health === 'unhealthy' ? 'bg-red-500' :
          'bg-gray-500'
        }`}></span>
        {labels[health as keyof typeof labels]}
      </span>
    );
  };

  // 服务配置
  const serviceConfigs = [
    {
      key: 'database',
      name: 'MongoDB 数据库',
      icon: '🗄️',
      description: '产品数据存储',
      critical: true
    },
    {
      key: 'feishuApi',
      name: '飞书 API',
      icon: '🔗',
      description: '飞书数据源连接',
      critical: true
    },
    {
      key: 'imageStorage',
      name: 'MinIO 存储',
      icon: '🖼️',
      description: '图片文件存储',
      critical: true
    },
    {
      key: 'websocket',
      name: 'WebSocket',
      icon: '⚡',
      description: '实时通信服务',
      critical: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* 整体状态概览 */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <div>
              <Card.Title>系统健康状态</Card.Title>
              <Card.Description>
                监控同步系统的各项服务状态
                {lastCheck && (
                  <span className="ml-4">
                    上次检查: {new Date(lastCheck).toLocaleString()}
                  </span>
                )}
              </Card.Description>
            </div>
            <div className="flex items-center space-x-3">
              {getOverallHealthBadge(overallHealth)}
              <Button
                variant="outline"
                size="sm"
                onClick={checkStatus}
                disabled={loading}
              >
                {loading ? '检查中...' : '刷新状态'}
              </Button>
            </div>
          </div>
        </Card.Header>

        {/* 整体健康指示器 */}
        <Card.Content>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                isHealthy ? 'bg-green-100' :
                overallHealth === 'degraded' ? 'bg-yellow-100' :
                overallHealth === 'unhealthy' ? 'bg-red-100' :
                'bg-gray-100'
              }`}>
                <span className="text-4xl">
                  {isHealthy ? '✅' :
                   overallHealth === 'degraded' ? '⚠️' :
                   overallHealth === 'unhealthy' ? '❌' :
                   '❓'}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                系统状态: {getOverallHealthBadge(overallHealth)}
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                {isHealthy ? '所有关键服务运行正常' :
                 overallHealth === 'degraded' ? '部分服务存在问题' :
                 overallHealth === 'unhealthy' ? '存在严重服务问题' :
                 '服务状态未知'}
              </p>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* 错误显示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                无法获取服务状态
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 服务详细状态 */}
      <div className="grid gap-6 md:grid-cols-2">
        {serviceConfigs.map((service) => {
          const status = data?.services?.[service.key as keyof typeof data.services] || 'unknown';
          const isDown = status === 'error' || status === 'disconnected';
          
          return (
            <Card 
              key={service.key}
              className={`${
                isDown && service.critical ? 'border-red-200 bg-red-50' :
                isDown ? 'border-yellow-200 bg-yellow-50' :
                'border-green-200 bg-green-50'
              }`}
            >
              <Card.Content className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">{service.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {service.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {service.description}
                      </p>
                      {service.critical && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          关键服务
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    {getServiceStatusBadge(status)}
                    <div className={`w-3 h-3 rounded-full ${
                      status === 'connected' ? 'bg-green-500' :
                      status === 'disconnected' ? 'bg-yellow-500 animate-pulse' :
                      status === 'error' ? 'bg-red-500' :
                      'bg-gray-500'
                    }`}></div>
                  </div>
                </div>

                {/* 服务特定信息 */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {service.key === 'database' && status === 'connected' && (
                    <div className="text-sm text-gray-600">
                      <p>✓ 数据库连接正常</p>
                      <p>✓ 集合访问正常</p>
                    </div>
                  )}
                  
                  {service.key === 'feishuApi' && status === 'connected' && (
                    <div className="text-sm text-gray-600">
                      <p>✓ API 认证正常</p>
                      <p>✓ 数据表访问正常</p>
                    </div>
                  )}
                  
                  {service.key === 'imageStorage' && status === 'connected' && (
                    <div className="text-sm text-gray-600">
                      <p>✓ 存储连接正常</p>
                      <p>✓ 上传下载正常</p>
                    </div>
                  )}
                  
                  {service.key === 'websocket' && status === 'connected' && (
                    <div className="text-sm text-gray-600">
                      <p>✓ WebSocket 服务正常</p>
                      <p>✓ 实时通信可用</p>
                    </div>
                  )}

                  {/* 错误状态提示 */}
                  {isDown && (
                    <div className="text-sm text-red-600">
                      <p>❌ 服务连接失败</p>
                      {service.critical && (
                        <p className="font-medium">⚠️ 此服务故障会影响同步功能</p>
                      )}
                    </div>
                  )}
                </div>
              </Card.Content>
            </Card>
          );
        })}
      </div>

      {/* 系统信息 */}
      {data && (
        <Card>
          <Card.Header>
            <Card.Title>系统信息</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-gray-900">系统状态</p>
                <p className="text-lg">{data.status}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">最后检查</p>
                <p className="text-lg">
                  {lastCheck ? new Date(lastCheck).toLocaleTimeString() : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">检查频率</p>
                <p className="text-lg">每30秒</p>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* 故障排除建议 */}
      {!isHealthy && data && (
        <Card className="border-yellow-200 bg-yellow-50">
          <Card.Header>
            <Card.Title className="text-yellow-800">故障排除建议</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-3 text-sm text-yellow-800">
              {Object.entries(data.services).map(([serviceName, status]) => {
                if (status === 'error' || status === 'disconnected') {
                  const service = serviceConfigs.find(s => s.key === serviceName);
                  return (
                    <div key={serviceName} className="flex items-start space-x-2">
                      <span className="text-yellow-600">•</span>
                      <div>
                        <p className="font-medium">
                          {service?.name || serviceName} 服务异常
                        </p>
                        <p className="mt-1 text-yellow-700">
                          {serviceName === 'database' && '请检查 MongoDB 连接配置和网络连通性'}
                          {serviceName === 'feishuApi' && '请检查飞书 API 凭证配置和网络连通性'}
                          {serviceName === 'imageStorage' && '请检查 MinIO 存储配置和连接状态'}
                          {serviceName === 'websocket' && '请检查 WebSocket 服务配置'}
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
              
              <div className="mt-4 p-3 bg-yellow-100 rounded-md">
                <p className="font-medium">如果问题持续存在:</p>
                <ol className="mt-2 list-decimal list-inside space-y-1 text-yellow-700">
                  <li>检查相关服务的日志文件</li>
                  <li>确认网络连接和防火墙设置</li>
                  <li>验证配置文件中的连接参数</li>
                  <li>联系系统管理员获取技术支持</li>
                </ol>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* 首次加载状态 */}
      {!data && !loading && !error && (
        <Card>
          <Card.Content className="pt-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900">系统状态监控</h3>
              <p className="text-sm text-gray-500 mt-2">
                点击"刷新状态"按钮检查系统服务状态
              </p>
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};