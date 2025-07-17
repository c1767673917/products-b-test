// 数据服务类
import type { Product, FilterState, DataStats } from '../types/product';
import productsData from '../data/products.json';
import statsData from '../data/stats.json';
import { processProductImages, processProductsImages } from '../utils/imageMapper';

// 模拟API延迟
const simulateDelay = (ms: number = 500) =>
  new Promise(resolve => setTimeout(resolve, ms));

export class DataService {
  private products: Product[] = [];
  private stats: DataStats;

  constructor() {
    this.products = processProductsImages(productsData as Product[]);
    this.stats = statsData as DataStats;
  }

  // 模拟异步获取所有产品
  async fetchAllProducts(): Promise<Product[]> {
    await simulateDelay(300);
    return this.products;
  }

  // 模拟异步根据ID获取产品
  async fetchProductById(id: string): Promise<Product | null> {
    await simulateDelay(200);
    const product = this.products.find(product => product.id === id);
    return product ? processProductImages(product) : null;
  }

  // 模拟异步获取数据统计
  async fetchStats(): Promise<DataStats> {
    await simulateDelay(100);
    return this.stats;
  }

  // 获取所有产品
  getAllProducts(): Product[] {
    return this.products;
  }

  // 根据ID获取产品
  getProductById(id: string): Product | undefined {
    const product = this.products.find(product => product.id === id);
    return product ? processProductImages(product) : undefined;
  }

  // 获取数据统计
  getStats(): DataStats {
    return this.stats;
  }

  // 筛选产品
  filterProducts(filters: FilterState, searchQuery?: string): Product[] {
    let filtered = [...this.products];

    // 价格筛选
    if (filters.priceRange) {
      const [minPrice, maxPrice] = filters.priceRange;
      filtered = filtered.filter(product => {
        const price = product.price.discount || product.price.normal;
        return price >= minPrice && price <= maxPrice;
      });
    }

    // 品类筛选
    if (filters.categories.length > 0) {
      filtered = filtered.filter(product =>
        filters.categories.includes(product.category.primary)
      );
    }

    // 产地筛选
    if (filters.locations.length > 0) {
      filtered = filtered.filter(product =>
        filters.locations.includes(product.origin.province)
      );
    }

    // 平台筛选
    if (filters.platforms.length > 0) {
      filtered = filtered.filter(product =>
        filters.platforms.includes(product.platform)
      );
    }

    // 只显示有优惠的产品
    if (filters.showDiscountOnly) {
      filtered = filtered.filter(product => product.price.discount !== undefined);
    }

    // 关键词搜索
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(product => {
        const searchFields = [
          product.name,
          product.category.primary,
          product.category.secondary,
          product.manufacturer || '',
          product.flavor || '',
          product.specification,
        ].join(' ').toLowerCase();

        return searchFields.includes(query);
      });
    }

    return filtered;
  }

  // 获取品类选项
  getCategoryOptions(): { value: string; label: string; count: number }[] {
    return Object.entries(this.stats.categoryDistribution).map(([category, count]) => ({
      value: category,
      label: category,
      count,
    }));
  }

  // 获取产地选项
  getLocationOptions(): { value: string; label: string; count: number }[] {
    return Object.entries(this.stats.locationDistribution).map(([location, count]) => ({
      value: location,
      label: location,
      count,
    }));
  }

  // 获取平台选项
  getPlatformOptions(): { value: string; label: string; count: number }[] {
    return Object.entries(this.stats.platformDistribution).map(([platform, count]) => ({
      value: platform,
      label: platform,
      count,
    }));
  }

  // 获取价格范围
  getPriceRange(): [number, number] {
    return [this.stats.priceRange.min, this.stats.priceRange.max];
  }

  // 搜索产品（模糊匹配）
  searchProducts(query: string, limit: number = 10): Product[] {
    if (!query.trim()) return [];

    const searchQuery = query.toLowerCase().trim();
    const results: { product: Product; score: number }[] = [];

    this.products.forEach(product => {
      let score = 0;

      // 产品名称匹配（权重最高）
      if (product.name.toLowerCase().includes(searchQuery)) {
        score += 10;
        if (product.name.toLowerCase().startsWith(searchQuery)) {
          score += 5; // 开头匹配额外加分
        }
      }

      // 品类匹配
      if (product.category.primary.toLowerCase().includes(searchQuery)) {
        score += 5;
      }
      if (product.category.secondary.toLowerCase().includes(searchQuery)) {
        score += 3;
      }

      // 口味匹配
      if (product.flavor && product.flavor.toLowerCase().includes(searchQuery)) {
        score += 3;
      }

      // 生产商匹配
      if (product.manufacturer && product.manufacturer.toLowerCase().includes(searchQuery)) {
        score += 2;
      }

      // 规格匹配
      if (product.specification.toLowerCase().includes(searchQuery)) {
        score += 1;
      }

      if (score > 0) {
        results.push({ product, score });
      }
    });

    // 按分数排序并返回指定数量的结果
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(result => result.product);
  }

  // 获取热门产品（有优惠的产品）
  getPopularProducts(limit: number = 8): Product[] {
    return this.products
      .filter(product => product.price.discount !== undefined)
      .sort((a, b) => {
        const aDiscount = a.price.discountRate || 0;
        const bDiscount = b.price.discountRate || 0;
        return bDiscount - aDiscount; // 按折扣率降序
      })
      .slice(0, limit);
  }

  // 获取最新产品（按采集时间）
  getLatestProducts(limit: number = 8): Product[] {
    return this.products
      .sort((a, b) => b.collectTime - a.collectTime)
      .slice(0, limit);
  }
}

// 创建单例实例
export const dataService = new DataService();