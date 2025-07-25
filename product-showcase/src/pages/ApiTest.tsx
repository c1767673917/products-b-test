import React, { useState } from 'react';
import { apiService } from '../services/apiService';
import { backendApiService } from '../services/backendApiService';
import { API_CONFIG } from '../config/api';

export const ApiTest: React.FC = () => {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState<string>('');

  const testDirectApi = async () => {
    setLoading('direct');
    try {
      console.log('测试直接API调用...');
      console.log('API_CONFIG.baseURL:', API_CONFIG.baseURL);
      console.log('API_CONFIG.endpoints.stats:', API_CONFIG.endpoints.stats);

      const response = await backendApiService.getStats();
      console.log('直接API调用成功:', response);
      setResults(prev => ({ ...prev, direct: response }));
    } catch (error) {
      console.error('直接API调用失败:', error);
      setResults(prev => ({ ...prev, direct: {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status
      } }));
    }
    setLoading('');
  };

  const testApiService = async () => {
    setLoading('service');
    try {
      console.log('测试API服务...');
      const response = await apiService.getStats();
      console.log('API服务调用成功:', response);
      setResults(prev => ({ ...prev, service: response }));
    } catch (error) {
      console.error('API服务调用失败:', error);
      setResults(prev => ({ ...prev, service: {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status
      } }));
    }
    setLoading('');
  };

  const testFilterOptions = async () => {
    setLoading('filter');
    try {
      console.log('测试筛选选项...');
      const response = await apiService.getFilterOptions();
      console.log('筛选选项调用成功:', response);
      setResults(prev => ({ ...prev, filter: response }));
    } catch (error) {
      console.error('筛选选项调用失败:', error);
      setResults(prev => ({ ...prev, filter: {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status
      } }));
    }
    setLoading('');
  };

  const testFetch = async () => {
    setLoading('fetch');
    try {
      console.log('测试原生fetch...');
      const url = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.stats}`;
      console.log('请求URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Fetch响应状态:', response.status);
      console.log('Fetch响应头:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetch调用成功:', data);
      setResults(prev => ({ ...prev, fetch: data }));
    } catch (error) {
      console.error('Fetch调用失败:', error);
      setResults(prev => ({ ...prev, fetch: {
        error: error.message,
        stack: error.stack
      } }));
    }
    setLoading('');
  };

  React.useEffect(() => {
    console.log('API测试页面加载完成');
    console.log('API_CONFIG:', API_CONFIG);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API测试页面</h1>

      <div className="mb-4 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">配置信息</h2>
        <div className="text-sm space-y-1">
          <div>API Base URL: {API_CONFIG.baseURL}</div>
          <div>Stats Endpoint: {API_CONFIG.endpoints.stats}</div>
          <div>完整URL: {API_CONFIG.baseURL + API_CONFIG.endpoints.stats}</div>
        </div>
      </div>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={testDirectApi}
          disabled={loading === 'direct'}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading === 'direct' ? '测试中...' : '测试直接API调用'}
        </button>
        
        <button
          onClick={testApiService}
          disabled={loading === 'service'}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          {loading === 'service' ? '测试中...' : '测试API服务'}
        </button>
        
        <button
          onClick={testFilterOptions}
          disabled={loading === 'filter'}
          className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
        >
          {loading === 'filter' ? '测试中...' : '测试筛选选项'}
        </button>

        <button
          onClick={testFetch}
          disabled={loading === 'fetch'}
          className="px-4 py-2 bg-orange-500 text-white rounded disabled:opacity-50"
        >
          {loading === 'fetch' ? '测试中...' : '测试原生Fetch'}
        </button>
      </div>

      <div className="space-y-6">
        {Object.entries(results).map(([key, value]) => (
          <div key={key} className="border p-4 rounded">
            <h3 className="text-lg font-semibold mb-2">{key} 结果:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};
