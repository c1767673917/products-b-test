import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useDataValidation } from '../../hooks/useSyncOperations';
import type { ValidationIssue } from '../../types/sync';

export const DataValidator: React.FC = () => {
  const {
    result,
    loading,
    error,
    lastCheck,
    validateData,
    repairData,
    issueSummary,
    hasIssues
  } = useDataValidation();

  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [showIssueDetails, setShowIssueDetails] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | 'data' | 'image' | 'reference' | 'format'>('all');
  const [repairLoading, setRepairLoading] = useState(false);

  // 处理验证操作
  const handleValidate = async () => {
    const result = await validateData();
    if (!result.success) {
      alert(`验证失败: ${result.error}`);
    }
  };

  // 处理修复操作
  const handleRepair = async (issueIds?: string[]) => {
    setRepairLoading(true);
    try {
      const result = await repairData(issueIds);
      if (result.success) {
        alert('数据修复完成');
        setSelectedIssues([]);
      } else {
        alert(`修复失败: ${result.error}`);
      }
    } finally {
      setRepairLoading(false);
    }
  };

  // 获取问题类型样式
  const getIssueTypeBadge = (type: ValidationIssue['type']) => {
    const styles = {
      critical: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      info: 'bg-blue-100 text-blue-800'
    };

    const labels = {
      critical: '严重',
      warning: '警告',
      info: '信息'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[type]}`}>
        {labels[type]}
      </span>
    );
  };

  // 获取问题分类样式
  const getCategoryBadge = (category: ValidationIssue['category']) => {
    const styles = {
      data: 'bg-purple-100 text-purple-800',
      image: 'bg-green-100 text-green-800',
      reference: 'bg-orange-100 text-orange-800',
      format: 'bg-gray-100 text-gray-800'
    };

    const labels = {
      data: '数据',
      image: '图片',
      reference: '引用',
      format: '格式'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[category]}`}>
        {labels[category]}
      </span>
    );
  };

  // 过滤问题
  const filteredIssues = result?.issues.filter(issue => {
    if (filterType !== 'all' && issue.type !== filterType) return false;
    if (filterCategory !== 'all' && issue.category !== filterCategory) return false;
    return true;
  }) || [];

  // 可自动修复的问题
  const autoFixableIssues = filteredIssues.filter(issue => issue.canAutoFix);

  // 选择所有可修复的问题
  const selectAllAutoFixable = () => {
    const autoFixableIds = autoFixableIssues.map(issue => issue.id);
    setSelectedIssues(autoFixableIds);
  };

  // 切换问题选择状态
  const toggleIssueSelection = (issueId: string) => {
    setSelectedIssues(prev => 
      prev.includes(issueId) 
        ? prev.filter(id => id !== issueId)
        : [...prev, issueId]
    );
  };

  return (
    <div className="space-y-6">
      {/* 验证控制面板 */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <div>
              <Card.Title>数据完整性验证</Card.Title>
              <Card.Description>
                检查数据的完整性、一致性和正确性
                {lastCheck && (
                  <span className="ml-4">
                    上次检查: {new Date(lastCheck).toLocaleString()}
                  </span>
                )}
              </Card.Description>
            </div>
            <Button
              onClick={handleValidate}
              disabled={loading}
            >
              {loading ? '验证中...' : '开始验证'}
            </Button>
          </div>
        </Card.Header>

        {/* 验证结果摘要 */}
        {result && (
          <Card.Content>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {result.summary.totalChecked}
                </p>
                <p className="text-sm text-blue-800">已检查记录</p>
              </div>

              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {result.summary.criticalIssues}
                </p>
                <p className="text-sm text-red-800">严重问题</p>
              </div>

              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {result.summary.warningIssues}
                </p>
                <p className="text-sm text-yellow-800">警告问题</p>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {issueSummary?.canAutoFix || 0}
                </p>
                <p className="text-sm text-green-800">可自动修复</p>
              </div>
            </div>

            {/* 验证状态 */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {result.isValid ? (
                  <>
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    <span className="text-sm font-medium text-green-800">数据验证通过</span>
                  </>
                ) : (
                  <>
                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                    <span className="text-sm font-medium text-red-800">
                      发现 {result.summary.totalIssues} 个问题需要处理
                    </span>
                  </>
                )}
              </div>

              {/* 批量修复按钮 */}
              {autoFixableIssues.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllAutoFixable}
                  >
                    选择所有可修复项
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleRepair(selectedIssues)}
                    disabled={selectedIssues.length === 0 || repairLoading}
                  >
                    {repairLoading ? '修复中...' : `修复选中项 (${selectedIssues.length})`}
                  </Button>
                </div>
              )}
            </div>
          </Card.Content>
        )}
      </Card>

      {/* 错误显示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">验证失败</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* 问题列表 */}
      {hasIssues && (
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <Card.Title>发现的问题</Card.Title>
              <div className="flex items-center space-x-4">
                {/* 类型过滤 */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">全部类型</option>
                  <option value="critical">严重</option>
                  <option value="warning">警告</option>
                  <option value="info">信息</option>
                </select>

                {/* 分类过滤 */}
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as any)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">全部分类</option>
                  <option value="data">数据问题</option>
                  <option value="image">图片问题</option>
                  <option value="reference">引用问题</option>
                  <option value="format">格式问题</option>
                </select>
              </div>
            </div>
          </Card.Header>
          <Card.Content>
            <div className="space-y-3">
              {filteredIssues.map((issue) => (
                <div 
                  key={issue.id}
                  className={`p-4 border rounded-lg ${
                    issue.type === 'critical' ? 'border-red-200 bg-red-50' :
                    issue.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                    'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {/* 选择框 */}
                      {issue.canAutoFix && (
                        <input
                          type="checkbox"
                          checked={selectedIssues.includes(issue.id)}
                          onChange={() => toggleIssueSelection(issue.id)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      )}

                      <div className="flex-1">
                        {/* 问题标题 */}
                        <div className="flex items-center space-x-2 mb-2">
                          {getIssueTypeBadge(issue.type)}
                          {getCategoryBadge(issue.category)}
                          {issue.canAutoFix && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              可修复
                            </span>
                          )}
                        </div>

                        {/* 问题描述 */}
                        <h4 className="text-sm font-medium text-gray-900 mb-1">
                          {issue.message}
                        </h4>

                        {/* 详细信息 */}
                        <div className="text-sm text-gray-600">
                          {issue.productId && (
                            <p>产品ID: {issue.productId}</p>
                          )}
                          {issue.field && (
                            <p>字段: {issue.field}</p>
                          )}
                          {issue.description && (
                            <p className="mt-1">{issue.description}</p>
                          )}
                        </div>

                        {/* 当前值和期望值 */}
                        {(issue.currentValue || issue.expectedValue) && (
                          <div className="mt-2 text-xs">
                            {issue.currentValue && (
                              <p><span className="font-medium">当前值:</span> {JSON.stringify(issue.currentValue)}</p>
                            )}
                            {issue.expectedValue && (
                              <p><span className="font-medium">期望值:</span> {JSON.stringify(issue.expectedValue)}</p>
                            )}
                          </div>
                        )}

                        {/* 详细信息展开 */}
                        {showIssueDetails === issue.id && issue.description && (
                          <div className="mt-3 p-3 bg-white rounded border text-sm">
                            {issue.description}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center space-x-2 ml-4">
                      {issue.description && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowIssueDetails(
                            showIssueDetails === issue.id ? null : issue.id
                          )}
                        >
                          {showIssueDetails === issue.id ? '收起' : '详情'}
                        </Button>
                      )}

                      {issue.canAutoFix && (
                        <Button
                          size="sm"
                          onClick={() => handleRepair([issue.id])}
                          disabled={repairLoading}
                        >
                          {repairLoading ? '修复中...' : '修复'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredIssues.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  没有找到匹配的问题
                </div>
              )}
            </div>
          </Card.Content>
        </Card>
      )}

      {/* 无问题状态 */}
      {result && result.isValid && (
        <Card>
          <Card.Content className="pt-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900">数据验证通过</h3>
              <p className="text-sm text-gray-500 mt-2">
                所有数据都符合预期，没有发现问题
              </p>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* 首次使用提示 */}
      {!result && !loading && !error && (
        <Card>
          <Card.Content className="pt-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900">数据验证</h3>
              <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                点击"开始验证"按钮检查数据的完整性和一致性。
                验证过程会检查产品数据、图片文件、字段格式等方面的问题。
              </p>
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};