import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

export const SimpleFilterTest: React.FC = () => {
  const [filterOptions, setFilterOptions] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFilterOptions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('开始加载筛选选项...');
      const response = await apiService.getFilterOptions();
      console.log('筛选选项响应:', response);
      
      setFilterOptions(response.data);
      console.log('筛选选项设置成功:', response.data);
    } catch (err: any) {
      console.error('加载筛选选项失败:', err);
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilterOptions();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">简化筛选器测试</h1>
      
      <div className="mb-4">
        <button
          onClick={loadFilterOptions}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? '加载中...' : '重新加载筛选选项'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          错误: {error}
        </div>
      )}

      {loading && (
        <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          正在加载筛选选项...
        </div>
      )}

      {filterOptions && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">分类选项 ({filterOptions.categories?.length || 0})</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {filterOptions.categories?.map((category: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">{category.label}</span>
                  <span className="text-xs text-gray-500">({category.count})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">平台选项 ({filterOptions.platforms?.length || 0})</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {filterOptions.platforms?.map((platform: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">{platform.label}</span>
                  <span className="text-xs text-gray-500">({platform.count})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">地区选项 ({filterOptions.locations?.length || 0})</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {filterOptions.locations?.map((location: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">{location.label}</span>
                  <span className="text-xs text-gray-500">({location.count})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-3">价格范围</h2>
            <div className="text-sm">
              最低价格: ¥{filterOptions.priceRange?.[0] || 0}
              <br />
              最高价格: ¥{filterOptions.priceRange?.[1] || 0}
            </div>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-3">原始数据</h2>
            <pre className="text-xs overflow-auto max-h-96">
              {JSON.stringify(filterOptions, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
