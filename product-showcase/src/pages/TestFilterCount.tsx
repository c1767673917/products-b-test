import React, { useEffect } from 'react';
import { useProductStore } from '../stores/productStore';
import { FilterPanel } from '../components/filters/FilterPanel';
import mockProducts from '../data/mockProducts.json';

export const TestFilterCount: React.FC = () => {
  const setProducts = useProductStore(state => state.setProducts);
  const products = useProductStore(state => state.products);
  const filteredProducts = useProductStore(state => state.filteredProducts);

  useEffect(() => {
    // 加载模拟数据
    setProducts(mockProducts as any, {
      total: mockProducts.length,
      totalPages: 1,
      hasNext: false,
      hasPrev: false
    });
  }, [setProducts]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">测试筛选器计数</h1>
      
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <p>Store中的产品数量: {products.length}</p>
        <p>Store中的筛选后产品数量: {filteredProducts.length}</p>
      </div>

      <div className="w-1/3">
        <FilterPanel />
      </div>
    </div>
  );
};