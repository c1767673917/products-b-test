import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SyncController } from '../../components/sync/SyncController';
import { SyncProgress } from '../../components/sync/SyncProgress';
import { SyncHistory } from '../../components/sync/SyncHistory';
import { DataValidator } from '../../components/sync/DataValidator';
import { ServiceStatus } from '../../components/sync/ServiceStatus';

// 标签页类型
type TabType = 'controller' | 'progress' | 'history' | 'validator' | 'status';

// 标签页配置
const tabs = [
  { id: 'controller' as TabType, label: '同步控制', icon: '🎛️', description: '启动和控制数据同步' },
  { id: 'progress' as TabType, label: '同步进度', icon: '📊', description: '实时查看同步进度' },
  { id: 'history' as TabType, label: '同步历史', icon: '📝', description: '查看历史同步记录' },
  { id: 'validator' as TabType, label: '数据验证', icon: '🔍', description: '验证和修复数据问题' },
  { id: 'status' as TabType, label: '系统状态', icon: '⚡', description: '监控系统服务状态' }
];

export const SyncManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('controller');

  // 渲染标签页内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'controller':
        return <SyncController />;
      case 'progress':
        return <SyncProgress />;
      case 'history':
        return <SyncHistory />;
      case 'validator':
        return <DataValidator />;
      case 'status':
        return <ServiceStatus />;
      default:
        return <SyncController />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面标题 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl">
                数据同步管理
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                管理飞书数据同步，监控同步状态，验证数据完整性
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                  transition-colors duration-200
                `}
              >
                <span className="mr-2 text-lg">{tab.icon}</span>
                <div className="text-left">
                  <div className="font-medium">{tab.label}</div>
                  <div className="text-xs text-gray-400 hidden lg:block">
                    {tab.description}
                  </div>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 标签页内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="animate-fadeIn">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default SyncManagement;