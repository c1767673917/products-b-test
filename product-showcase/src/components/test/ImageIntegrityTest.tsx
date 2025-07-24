import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiService } from '../../services/apiService';
import { useImageErrorHandling } from '../../hooks/useImageErrorHandling';
import { LazyImage } from '../product/LazyImage';

interface ImageTestResult {
  productId: string;
  imageType: string;
  status: 'loading' | 'success' | 'error' | 'repaired';
  url?: string;
  error?: string;
  repairAttempts: number;
}

interface ConsistencyCheck {
  productId: string;
  imageType: string;
  issues: {
    productRecordMissing: boolean;
    imageRecordMissing: boolean;
    fileNotExists: boolean;
    urlMismatch: boolean;
    metadataMismatch: boolean;
  };
  suggestedActions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 图片完整性测试组件
 * 用于测试和验证图片存储和数据同步机制
 */
export const ImageIntegrityTest: React.FC = () => {
  const [testResults, setTestResults] = useState<ImageTestResult[]>([]);
  const [consistencyResults, setConsistencyResults] = useState<ConsistencyCheck[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [testStats, setTestStats] = useState({
    total: 0,
    success: 0,
    error: 0,
    repaired: 0
  });

  /**
   * 运行图片完整性测试
   */
  const runIntegrityTest = async () => {
    if (!selectedProductId.trim()) {
      alert('请输入产品ID');
      return;
    }

    setIsRunning(true);
    setTestResults([]);
    setConsistencyResults([]);

    try {
      // 1. 获取产品图片信息
      console.log('获取产品图片信息...');
      const imagesResponse = await apiService.getProductImages(selectedProductId);
      
      if (!imagesResponse.success) {
        throw new Error(imagesResponse.message || '获取产品图片失败');
      }

      const images = imagesResponse.data.images;
      const imageTypes = Object.keys(images);

      // 2. 验证图片一致性
      console.log('验证图片一致性...');
      const consistencyResponse = await apiService.validateImageConsistency(selectedProductId);
      
      if (consistencyResponse.success) {
        setConsistencyResults(consistencyResponse.data.checks);
      }

      // 3. 测试每个图片的加载
      const results: ImageTestResult[] = [];
      
      for (const imageType of imageTypes) {
        const imageInfo = images[imageType];
        
        const result: ImageTestResult = {
          productId: selectedProductId,
          imageType,
          status: 'loading',
          url: imageInfo.url,
          repairAttempts: 0
        };

        results.push(result);
        setTestResults([...results]);

        try {
          // 测试图片是否可以加载
          await testImageLoad(imageInfo.url);
          result.status = 'success';
        } catch (error) {
          result.status = 'error';
          result.error = error instanceof Error ? error.message : '图片加载失败';
          
          // 尝试修复
          try {
            console.log(`尝试修复图片: ${imageType}`);
            const repairResponse = await apiService.repairProductImages(selectedProductId);
            
            if (repairResponse.success) {
              result.status = 'repaired';
              result.repairAttempts = 1;
            }
          } catch (repairError) {
            console.error('修复失败:', repairError);
          }
        }

        setTestResults([...results]);
      }

      // 更新统计信息
      updateTestStats(results);

    } catch (error) {
      console.error('完整性测试失败:', error);
      alert(`测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsRunning(false);
    }
  };

  /**
   * 测试图片是否可以加载
   */
  const testImageLoad = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = url;
      
      // 设置超时
      setTimeout(() => reject(new Error('图片加载超时')), 10000);
    });
  };

  /**
   * 更新测试统计
   */
  const updateTestStats = (results: ImageTestResult[]) => {
    const stats = {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      error: results.filter(r => r.status === 'error').length,
      repaired: results.filter(r => r.status === 'repaired').length
    };
    setTestStats(stats);
  };

  /**
   * 获取状态颜色
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'repaired': return 'text-blue-600 bg-blue-100';
      case 'loading': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  /**
   * 获取严重程度颜色
   */
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-800 bg-red-200';
      case 'high': return 'text-orange-800 bg-orange-200';
      case 'medium': return 'text-yellow-800 bg-yellow-200';
      case 'low': return 'text-blue-800 bg-blue-200';
      default: return 'text-gray-800 bg-gray-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          图片完整性测试工具
        </h1>

        {/* 测试控制 */}
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="输入产品ID (例如: rec12345abcd)"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={runIntegrityTest}
            disabled={isRunning}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? '测试中...' : '开始测试'}
          </button>
        </div>

        {/* 测试统计 */}
        {testStats.total > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-900">{testStats.total}</div>
              <div className="text-sm text-gray-600">总计</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{testStats.success}</div>
              <div className="text-sm text-green-600">成功</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{testStats.error}</div>
              <div className="text-sm text-red-600">错误</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{testStats.repaired}</div>
              <div className="text-sm text-blue-600">已修复</div>
            </div>
          </div>
        )}
      </div>

      {/* 测试结果 */}
      {testResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">图片加载测试结果</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testResults.map((result, index) => (
              <motion.div
                key={`${result.productId}-${result.imageType}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-gray-900">{result.imageType}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                    {result.status}
                  </span>
                </div>

                {result.url && (
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <LazyImage
                      src={result.url}
                      alt={`${result.imageType} image`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {result.error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {result.error}
                  </div>
                )}

                {result.repairAttempts > 0 && (
                  <div className="text-sm text-blue-600">
                    修复尝试: {result.repairAttempts} 次
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 一致性检查结果 */}
      {consistencyResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">数据一致性检查结果</h2>
          
          <div className="space-y-4">
            {consistencyResults.map((check, index) => (
              <motion.div
                key={`${check.productId}-${check.imageType}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-medium text-gray-900">{check.imageType}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(check.severity)}`}>
                    {check.severity}
                  </span>
                </div>

                {/* 问题列表 */}
                <div className="space-y-2 mb-3">
                  {Object.entries(check.issues).map(([issue, hasIssue]) => (
                    hasIssue && (
                      <div key={issue} className="flex items-center text-sm text-red-600">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                        {issue.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </div>
                    )
                  ))}
                </div>

                {/* 建议操作 */}
                {check.suggestedActions.length > 0 && (
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="text-sm font-medium text-blue-800 mb-1">建议操作:</div>
                    <ul className="text-sm text-blue-700 space-y-1">
                      {check.suggestedActions.map((action, actionIndex) => (
                        <li key={actionIndex}>• {action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageIntegrityTest;
