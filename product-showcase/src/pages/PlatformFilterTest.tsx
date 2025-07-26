import React from 'react';
import { PlatformFilter } from '../components/filters/PlatformFilter';

export const PlatformFilterTestPage: React.FC = () => {
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<string[]>([]);

  // 模拟数据，包含所有平台
  const mockOptions = [
    { value: '大润发', label: '大润发', count: 279 },
    { value: '零食很忙', label: '零食很忙', count: 210 },
    { value: '猫超', label: '猫超', count: 175 },
    { value: '盒马APP', label: '盒马APP', count: 134 },
    { value: '天猫旗舰店', label: '天猫旗舰店', count: 126 },
    { value: '山姆APP', label: '山姆APP', count: 80 },
    { value: '胖东来', label: '胖东来', count: 26 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">平台筛选器测试</h1>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">问题修复验证</h2>
          <div className="bg-white rounded-lg p-4 shadow mb-6">
            <p className="text-gray-700 mb-2">
              <strong>问题描述：</strong>"零食很忙"和"天猫旗舰店"平台的条形图显示为空
            </p>
            <p className="text-gray-700 mb-2">
              <strong>原因：</strong>Tailwind CSS 不支持动态类名（如 bg-pink-500, bg-indigo-500）
            </p>
            <p className="text-gray-700">
              <strong>修复方案：</strong>使用内联样式替代动态类名
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">默认状态（展开）</h3>
            <PlatformFilter 
              value={selectedPlatforms}
              onChange={setSelectedPlatforms}
              options={mockOptions}
              defaultCollapsed={false}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">选中状态测试</h3>
            <PlatformFilter 
              value={['零食很忙', '天猫旗舰店']}
              onChange={() => {}}
              options={mockOptions}
              defaultCollapsed={false}
            />
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold mb-4">验证清单</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>零食很忙（210个产品）- 条形图应显示为 indigo 色（#6366F1）</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>天猫旗舰店（126个产品）- 条形图应显示为 pink 色（#EC4899）</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>所有平台的条形图都应正确显示对应的颜色和百分比</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>选中的平台标签应显示正确的背景色和文字颜色</span>
            </li>
          </ul>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">当前选中的平台</h3>
          <div className="bg-white rounded-lg p-4 shadow">
            <pre className="text-sm text-gray-700">
              {JSON.stringify(selectedPlatforms, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformFilterTestPage;