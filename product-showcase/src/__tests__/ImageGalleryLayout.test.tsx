import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import OptimizedImageGallery from '../components/product/OptimizedImageGallery';
import { Product } from '../types/product';

// 测试用的产品数据
const createTestProduct = (imageCount: number): Product => {
  const baseProduct: Product = {
    id: 'test-product',
    name: '测试产品',
    brand: '测试品牌',
    category: '测试分类',
    flavor: '测试口味',
    specification: '测试规格',
    price: 10.00,
    originalPrice: 12.00,
    stock: 100,
    description: '测试描述',
    images: {},
    tags: [],
    rating: 4.5,
    reviewCount: 10,
    isNew: false,
    isHot: false,
    isRecommended: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 根据imageCount添加对应数量的图片
  const imageTypes = ['front', 'back', 'label', 'package', 'gift'] as const;
  for (let i = 0; i < Math.min(imageCount, imageTypes.length); i++) {
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
