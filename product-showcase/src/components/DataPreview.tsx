// 数据预览组件 - 用于验证数据服务功能
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { Product } from '../types/product';

const DataPreview: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  useEffect(() => {
    // 加载数据
    const allProducts = dataService.getAllProducts();
    const dataStats = dataService.getStats();
    
    setProducts(allProducts);
    setStats(dataStats);
    setFilteredProducts(allProducts.slice(0, 12)); // 只显示前12个
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = dataService.searchProducts(query, 12);
      setFilteredProducts(results);
    } else {
      setFilteredProducts(products.slice(0, 12));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            产品展示系统 - 数据预览
          </h1>
          <p className="text-gray-600">
            验证数据处理和服务功能
          </p>
        </div>

        {/* 统计信息 */}
        {stats && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">数据统计</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalProducts}</div>
                <div className="text-sm text-gray-600">总产品数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Object.keys(stats.categoryDistribution).length}
                </div>
                <div className="text-sm text-gray-600">品类数量</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Object.keys(stats.platformDistribution).length}
                </div>
                <div className="text-sm text-gray-600">采集平台</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  ¥{stats.priceStats.average}
                </div>
                <div className="text-sm text-gray-600">平均价格</div>
              </div>
            </div>
          </div>
        )}

        {/* 搜索框 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">搜索测试</h2>
          <input
            type="text"
            placeholder="搜索产品名称、品类、口味等..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-600 mt-2">
            找到 {filteredProducts.length} 个产品
          </p>
        </div>

        {/* 产品列表 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">产品展示</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* 产品图片 */}
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                  {product.images.front ? (
                    <img
                      src={product.images.front}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBDMTA4LjI4NCA3MCA5NS4yODQgNzAgMTAwIDcwWk0xMDAgMTMwQzEwOC4yODQgMTMwIDkxLjcxNiAxMzAgMTAwIDEzMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPgo=';
                      }}
                    />
                  ) : (
                    <div className="text-gray-400 text-sm">暂无图片</div>
                  )}
                </div>

                {/* 产品信息 */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {product.category.primary}
                  </p>

                  {/* 口味和规格信息 */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {product.flavor && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 truncate">
                        {product.flavor}
                      </span>
                    )}
                    {product.specification && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 truncate">
                        {product.specification}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      {product.price.discount ? (
                        <div>
                          <span className="text-lg font-bold text-red-600">
                            ¥{product.price.discount}
                          </span>
                          <span className="text-sm text-gray-500 line-through ml-2">
                            ¥{product.price.normal}
                          </span>
                        </div>
                      ) : (
                        <span className="text-lg font-bold text-gray-900">
                          ¥{product.price.normal}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {product.platform}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {product.origin.province}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 品类分布 */}
        {stats && (
          <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
            <h2 className="text-xl font-semibold mb-4">品类分布</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(stats.categoryDistribution)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .map(([category, count]) => (
                  <div key={category} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-semibold text-gray-900">{count as number}</div>
                    <div className="text-sm text-gray-600">{category}</div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataPreview;
