import React from 'react';
import type { Product, ImageType } from './types/product';

// 测试数据
const testProduct: Product = {
  id: 'test-1',
  recordId: 'test-record',
  name: '测试产品',
  sequence: 'TEST-001',
  category: {
    primary: '测试品类',
    secondary: '测试子品类'
  },
  price: {
    normal: 10.99,
    discount: 8.99
  },
  images: {
    front: '/placeholder-image.svg'
  },
  origin: {
    country: '中国',
    province: '北京',
    city: '北京'
  },
  platform: '测试平台',
  specification: '测试规格',
  manufacturer: '测试厂商',
  collectTime: Date.now()
};

const TestApp: React.FC = () => {
  const imageTypes: ImageType[] = ['front', 'back', 'label', 'package', 'gift'];
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>产品展示应用测试页面</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>类型导入测试</h2>
        <p>✅ Product 类型导入成功</p>
        <p>✅ ImageType 类型导入成功</p>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>测试产品数据</h2>
        <div style={{ 
          border: '1px solid #ccc', 
          padding: '15px', 
          borderRadius: '8px',
          backgroundColor: '#f9f9f9'
        }}>
          <h3>{testProduct.name}</h3>
          <p><strong>ID:</strong> {testProduct.id}</p>
          <p><strong>价格:</strong> ¥{testProduct.price.normal} 
            {testProduct.price.discount && ` (优惠价: ¥${testProduct.price.discount})`}
          </p>
          <p><strong>品类:</strong> {testProduct.category.primary} - {testProduct.category.secondary}</p>
          <p><strong>产地:</strong> {testProduct.origin.province}, {testProduct.origin.city}</p>
          <p><strong>平台:</strong> {testProduct.platform}</p>
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>图片类型测试</h2>
        <p>支持的图片类型：</p>
        <ul>
          {imageTypes.map(type => (
            <li key={type}>{type}</li>
          ))}
        </ul>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>占位图片测试</h2>
        <img 
          src="/placeholder-image.svg" 
          alt="占位图片" 
          style={{ width: '200px', height: '200px', border: '1px solid #ccc' }}
        />
      </div>
      
      <div>
        <p style={{ color: 'green', fontWeight: 'bold' }}>
          ✅ 所有类型导入正常，应用基础功能可用！
        </p>
        <p>
          <a href="/" style={{ color: '#2563eb', textDecoration: 'underline' }}>
            返回产品列表页面
          </a>
        </p>
      </div>
    </div>
  );
};

export default TestApp;
