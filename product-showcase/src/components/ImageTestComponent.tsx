import React, { useEffect, useState } from 'react';
import { FrontendImageUtils } from '../config/api';
import { processProductImages } from '../utils/imageMapper';
import LazyImage from '../components/product/LazyImage';

// 测试组件
const ImageTestComponent: React.FC = () => {
  const [transformedUrls, setTransformedUrls] = useState<string[]>([]);
  const [originalPaths, setOriginalPaths] = useState<string[]>([]);

  useEffect(() => {
    // 测试图片路径
    const testPaths = [
      '/images/20250708-002_正面图片_0.jpg',
      '/images/20250708-002_背面图片_0.jpg',
      '/images/20250708-002_标签照片_0.jpg'
    ];

    setOriginalPaths(testPaths);

    // 使用FrontendImageUtils转换路径
    const transformed = testPaths.map(path => FrontendImageUtils.buildImageUrl(path));
    setTransformedUrls(transformed);

    console.log('原始路径:', testPaths);
    console.log('转换后路径:', transformed);
  }, []);

  const handleImageLoad = (index: number) => {
    console.log(`图片 ${index + 1} 加载成功`);
  };

  const handleImageError = (index: number) => {
    console.log(`图片 ${index + 1} 加载失败`);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">图片加载测试</h1>
      
      <div className="space-y-6">
        {transformedUrls.map((url, index) => (
          <div key={index} className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">测试图片 {index + 1}</h3>
            
            <div className="mb-2">
              <strong>原始路径:</strong>
              <code className="bg-gray-100 px-2 py-1 rounded ml-2 text-sm">
                {originalPaths[index]}
              </code>
            </div>
            
            <div className="mb-4">
              <strong>转换后URL:</strong>
              <code className="bg-gray-100 px-2 py-1 rounded ml-2 text-sm break-all">
                {url}
              </code>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <h4 className="font-medium mb-2">使用LazyImage组件:</h4>
                <div className="w-48 h-48 border rounded">
                  <LazyImage
                    src={url}
                    alt={`测试图片 ${index + 1}`}
                    className="w-full h-full"
                    onLoad={() => handleImageLoad(index)}
                    onError={() => handleImageError(index)}
                    priority={index === 0}
                  />
                </div>
              </div>
              
              <div className="flex-1">
                <h4 className="font-medium mb-2">使用普通img标签:</h4>
                <img 
                  src={url}
                  alt={`测试图片 ${index + 1}`}
                  className="w-48 h-48 object-cover border rounded"
                  onLoad={() => console.log(`普通img ${index + 1} 加载成功`)}
                  onError={() => console.log(`普通img ${index + 1} 加载失败`)}
                />
              </div>
            </div>
            
            <div className="mt-4">
              <button 
                onClick={() => window.open(url, '_blank')}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                在新窗口打开
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-semibold mb-2">测试说明:</h3>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>检查浏览器开发者工具的Network面板查看图片请求</li>
          <li>如果图片显示为占位符，说明MinIO中没有对应的图片文件</li>
          <li>如果图片请求返回404，说明路径转换有问题</li>
          <li>如果图片请求返回403，说明MinIO访问权限有问题</li>
        </ul>
      </div>
    </div>
  );
};

export default ImageTestComponent;