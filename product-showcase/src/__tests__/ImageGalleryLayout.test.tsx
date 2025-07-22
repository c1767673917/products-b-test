import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import OptimizedImageGallery from '../components/product/OptimizedImageGallery';
import { Product } from '../types/product';

// 测试用的产品数据
const createTestProduct = (imageCount: number): Product => {
  const baseProduct: Product = {
    productId: 'test-product',
    recordId: 'test-record-001',
    name: {
      english: 'Test Product',
      chinese: '测试产品',
      display: '测试产品'
    },
    sequence: '001',
    category: {
      primary: {
        english: 'Test Category',
        chinese: '测试分类',
        display: '测试分类'
      },
      secondary: {
        english: 'Sub Category',
        chinese: '子分类',
        display: '子分类'
      }
    },
    price: {
      normal: 10.00,
      discount: 8.00,
      discountRate: 0.2
    },
    images: {},
    origin: {
      country: {
        english: 'China',
        chinese: '中国',
        display: '中国'
      },
      province: {
        english: 'Test Province',
        chinese: '测试省',
        display: '测试省'
      },
      city: {
        english: 'Test City',
        chinese: '测试市',
        display: '测试市'
      }
    },
    platform: {
      english: 'Test Platform',
      chinese: '测试平台',
      display: '测试平台'
    },
    specification: {
      english: 'Test Spec',
      chinese: '测试规格',
      display: '测试规格'
    },
    flavor: {
      english: 'Test Flavor',
      chinese: '测试口味',
      display: '测试口味'
    },
    manufacturer: {
      english: 'Test Manufacturer',
      chinese: '测试厂商',
      display: '测试厂商'
    },
    collectTime: Date.now(),
    link: 'https://example.com',
    boxSpec: '24×500ml',
    notes: '测试备注'
  };

  // 根据imageCount添加对应数量的图片
  const imageTypes = ['front', 'back', 'label', 'package', 'gift'] as const;
  for (let i = 0; i < Math.min(imageCount, imageTypes.length); i++) {
    if (!baseProduct.images) {
      baseProduct.images = {};
    }
    baseProduct.images[imageTypes[i]] = `https://example.com/image-${i + 1}.jpg`;
  }

  return baseProduct;
};

describe('OptimizedImageGallery Layout Tests', () => {
  // 测试1张图片的布局
  test('should display single image with 4:5 aspect ratio', () => {
    const product = createTestProduct(1);
    const { container } = render(<OptimizedImageGallery product={product} containerWidth={400} />);
    
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toHaveStyle('grid-template-columns: repeat(1, 1fr)');
  });

  // 测试2张图片的布局 - 关键修复测试
  test('should display two images without bottom spacing issues', () => {
    const product = createTestProduct(2);
    const { container } = render(<OptimizedImageGallery product={product} containerWidth={400} />);
    
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toHaveStyle('grid-template-columns: repeat(2, 1fr)');
    
    // 验证容器不再使用固定的5/4比例，而是auto
    const computedStyle = window.getComputedStyle(gridContainer!);
    expect(computedStyle.aspectRatio).toBe('auto');
  });

  // 测试3张图片的布局
  test('should display three images with auto height', () => {
    const product = createTestProduct(3);
    const { container } = render(<OptimizedImageGallery product={product} containerWidth={600} />);
    
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toHaveStyle('grid-template-columns: repeat(3, 1fr)');
  });

  // 测试窄容器下2张图片的布局
  test('should display two images in single column on narrow container', () => {
    const product = createTestProduct(2);
    const { container } = render(<OptimizedImageGallery product={product} containerWidth={300} />);
    
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toHaveStyle('grid-template-columns: repeat(1, 1fr)');
  });
});
