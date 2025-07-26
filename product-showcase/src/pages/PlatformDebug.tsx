import React, { useEffect, useState } from 'react';
import { backendApiService } from '../services/backendApiService';
import { useFilterOptions } from '../hooks/useProducts';

export const PlatformDebugPage: React.FC = () => {
  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const filterOptions = useFilterOptions();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await backendApiService.getStats();
        setStatsData(response.data);
        console.log('Stats Response:', response);
        console.log('Platform Distribution:', response.data.platformDistribution);
        
        // 检查特定平台数据
        const platforms = response.data.platformDistribution;
        console.log('零食很忙 count:', platforms['零食很忙']);
        console.log('天猫旗舰店 count:', platforms['天猫旗舰店']);
        
        setError(null);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">平台数据调试</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">后端 API Stats 数据</h2>
        <div className="bg-gray-100 p-4 rounded">
          <pre className="text-xs overflow-x-auto">
            {JSON.stringify(statsData, null, 2)}
          </pre>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">平台分布数据</h2>
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">平台名称</th>
              <th className="border border-gray-300 px-4 py-2 text-right">产品数量</th>
              <th className="border border-gray-300 px-4 py-2 text-left">状态</th>
            </tr>
          </thead>
          <tbody>
            {statsData?.platformDistribution && Object.entries(statsData.platformDistribution).map(([platform, count]) => (
              <tr key={platform} className={count === 0 ? 'bg-red-50' : ''}>
                <td className="border border-gray-300 px-4 py-2">{platform}</td>
                <td className="border border-gray-300 px-4 py-2 text-right">{count as number}</td>
                <td className="border border-gray-300 px-4 py-2">
                  {count === 0 ? (
                    <span className="text-red-600 font-semibold">无数据（条形图为空）</span>
                  ) : (
                    <span className="text-green-600">正常</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Filter Options Hook 数据</h2>
        <div className="bg-gray-100 p-4 rounded">
          <pre className="text-xs overflow-x-auto">
            {JSON.stringify(filterOptions.data, null, 2)}
          </pre>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">问题分析</h2>
        <div className="space-y-2">
          <p>
            <strong>零食很忙：</strong> 
            {statsData?.platformDistribution?.['零食很忙'] === 0 
              ? '后端返回数量为0，所以条形图为空' 
              : `后端返回数量为 ${statsData?.platformDistribution?.['零食很忙'] || 'undefined'}`}
          </p>
          <p>
            <strong>天猫旗舰店：</strong> 
            {statsData?.platformDistribution?.['天猫旗舰店'] === 0 
              ? '后端返回数量为0，所以条形图为空' 
              : `后端返回数量为 ${statsData?.platformDistribution?.['天猫旗舰店'] || 'undefined'}`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlatformDebugPage;