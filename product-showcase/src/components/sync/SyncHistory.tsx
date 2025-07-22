import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import Pagination from '../ui/Pagination';
import { useSyncHistory } from '../../hooks/useSyncOperations';
import type { SyncStatus, SyncMode } from '../../types/sync';

export const SyncHistory: React.FC = () => {
  const {
    records,
    pagination,
    filters,
    loading,
    error,
    setFilters,
    refresh
  } = useSyncHistory();

  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // 状态过滤选项
  const statusOptions = [
    { value: '', label: '全部状态' },
    { value: 'completed', label: '已完成' },
    { value: 'running', label: '运行中' },
    { value: 'failed', label: '失败' },
    { value: 'cancelled', label: '已取消' }
  ];

  // 模式过滤选项
  const modeOptions = [
    { value: '', label: '全部模式' },
    { value: 'full', label: '全量同步' },
    { value: 'incremental', label: '增量同步' },
    { value: 'selective', label: '选择性同步' }
  ];

  // 获取状态显示样式
  const getStatusBadge = (status: SyncStatus) => {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      running: 'bg-blue-100 text-blue-800',
      paused: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      pending: 'bg-purple-100 text-purple-800',
      idle: 'bg-gray-100 text-gray-600'
    };

    const labels = {
      completed: '已完成',
      running: '运行中',
      paused: '已暂停',
      failed: '失败',
      cancelled: '已取消',
      pending: '准备中',
      idle: '空闲'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  // 获取模式显示样式
  const getModeBadge = (mode: SyncMode) => {
    const styles = {
      full: 'bg-orange-100 text-orange-800',
      incremental: 'bg-green-100 text-green-800',
      selective: 'bg-blue-100 text-blue-800'
    };

    const labels = {
      full: '全量',
      incremental: '增量',
      selective: '选择性'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${styles[mode]}`}>
        {labels[mode]}
      </span>
    );
  };

  // 格式化时长
  const formatDuration = (duration?: number) => {
    if (!duration) return '-';
    
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    
    if (hours > 0) {
      return `${hours}小时${minutes}分${seconds}秒`;
    }
    if (minutes > 0) {
      return `${minutes}分${seconds}秒`;
    }
    return `${seconds}秒`;
  };

  // 处理过滤器变更
  const handleFilterChange = (key: string, value: any) => {
    setFilters({ [key]: value || undefined });
  };

  // 清除过滤器
  const clearFilters = () => {
    setFilters({});
  };

  return (
    <div className="space-y-6">
      {/* 头部控制 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">
            同步历史记录
          </h2>
          <p className="text-sm text-gray-500">
            共 {pagination.total} 条记录
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            筛选
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? '刷新中...' : '刷新'}
          </Button>
        </div>
      </div>

      {/* 过滤器 */}
      {showFilters && (
        <Card>
          <Card.Header>
            <Card.Title>筛选条件</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  状态
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  同步模式
                </label>
                <select
                  value={filters.mode || ''}
                  onChange={(e) => handleFilterChange('mode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {modeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  开始日期
                </label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  结束日期
                </label>
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
              >
                清除筛选
              </Button>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* 错误显示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                加载历史记录失败
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 历史记录列表 */}
      {records.length === 0 ? (
        <Card>
          <Card.Content className="pt-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📝</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900">暂无同步记录</h3>
              <p className="text-sm text-gray-500 mt-2">
                还没有执行过同步操作
              </p>
            </div>
          </Card.Content>
        </Card>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <Card.Content className="pt-6">
                {/* 记录摘要 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(record.status)}
                      {getModeBadge(record.mode)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        同步ID: {record.id}
                      </p>
                      <p className="text-xs text-gray-500">
                        开始时间: {new Date(record.startTime).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        处理: {record.results.processedRecords}/{record.results.totalRecords}
                      </p>
                      <p className="text-xs text-gray-500">
                        耗时: {formatDuration(record.duration)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedRecord(
                        expandedRecord === record.id ? null : record.id
                      )}
                    >
                      {expandedRecord === record.id ? '收起' : '详情'}
                    </Button>
                  </div>
                </div>

                {/* 结果统计 */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-green-600">
                      {record.results.createdRecords}
                    </p>
                    <p className="text-xs text-gray-500">新增</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-blue-600">
                      {record.results.updatedRecords}
                    </p>
                    <p className="text-xs text-gray-500">更新</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-600">
                      {record.results.skippedRecords}
                    </p>
                    <p className="text-xs text-gray-500">跳过</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-orange-600">
                      {record.results.downloadedImages}
                    </p>
                    <p className="text-xs text-gray-500">图片</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-semibold ${
                      record.results.errorRecords > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {record.results.errorRecords}
                    </p>
                    <p className="text-xs text-gray-500">错误</p>
                  </div>
                </div>

                {/* 展开的详细信息 */}
                {expandedRecord === record.id && (
                  <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                    {/* 配置选项 */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">同步配置</h4>
                      <div className="bg-gray-50 p-3 rounded-md text-sm">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div>批处理大小: {record.options.batchSize}</div>
                          <div>并发图片: {record.options.concurrentImages}</div>
                          <div>重试次数: {record.options.retryCount}</div>
                          <div>跳过图片: {record.options.skipImageDownload ? '是' : '否'}</div>
                        </div>
                      </div>
                    </div>

                    {/* 错误信息 */}
                    {record.errors.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          错误详情 ({record.errors.length})
                        </h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {record.errors.slice(0, 5).map((error, index) => (
                            <div key={index} className="bg-red-50 p-2 rounded text-sm">
                              <p className="font-medium text-red-800">
                                {error.type}: {error.message}
                              </p>
                              {error.productId && (
                                <p className="text-red-600">产品ID: {error.productId}</p>
                              )}
                            </div>
                          ))}
                          {record.errors.length > 5 && (
                            <p className="text-xs text-gray-500 text-center">
                              还有 {record.errors.length - 5} 个错误...
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 操作日志 */}
                    {record.logs.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          操作日志
                        </h4>
                        <div className="bg-gray-900 text-green-400 p-3 rounded-md font-mono text-xs max-h-32 overflow-y-auto">
                          {record.logs.slice(-10).map((log, index) => (
                            <div key={index}>{log}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card.Content>
            </Card>
          ))}
        </div>
      )}

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setFilters({ ...filters, page })}
            className="mt-6"
          />
        </div>
      )}
    </div>
  );
};