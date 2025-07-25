import React from 'react';
import { FilterPanel } from '../components/filters/FilterPanel';
import { useFilterOptions } from '../hooks/useProducts';
import { FilterState } from '../types/product';

const initialFilters: FilterState = {
  priceRange: undefined,
  categories: [],
  locations: [],
  platforms: [],
  showDiscountOnly: false
};

export const FilterTest: React.FC = () => {
  const [filters, setFilters] = React.useState<FilterState>(initialFilters);
  const { data: filterOptions, isLoading, error } = useFilterOptions();

  const handleFiltersChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setFilters(initialFilters);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">筛选器测试页面</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">调试信息</h2>
        <div className="space-y-2 text-sm">
          <div>加载状态: {isLoading ? '加载中...' : '已完成'}</div>
          <div>错误信息: {error ? JSON.stringify(error) : '无'}</div>
          <div>筛选选项数据:</div>
          <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40">
            {JSON.stringify(filterOptions, null, 2)}
          </pre>
          <div>当前筛选状态:</div>
          <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40">
            {JSON.stringify(filters, null, 2)}
          </pre>
        </div>
      </div>

      <div className="max-w-md">
        <FilterPanel
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          collapsible={false}
          defaultCollapsed={false}
        />
      </div>
    </div>
  );
};
