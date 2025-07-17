// API服务层 - 统一管理所有API调用
import type { Product, FilterState, DataStats } from '../types/product';
import { DataService } from './dataService';
import { apiService as backendApiService } from './backendApiService';
import { ENV_CONFIG } from '../config/api';

// API响应类型
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: number;
}

// API错误类型
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// API服务类
export class ApiService {
  private dataService: DataService;
  private baseDelay: number = 300; // 基础延迟时间
  private useBackendApi: boolean;

  constructor() {
    this.dataService = new DataService();
    // 根据配置决定是否使用后端API
    this.useBackendApi = ENV_CONFIG.useBackendApi;
  }

  // 模拟网络延迟
  private async simulateNetworkDelay(customDelay?: number): Promise<void> {
    const delay = customDelay || this.baseDelay;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // 包装API响应
  private wrapResponse<T>(data: T, message?: string): ApiResponse<T> {
    return {
      data,
      success: true,
      message,
      timestamp: Date.now()
    };
  }

  // 处理API错误
  private handleError(error: unknown): never {
    if (error instanceof ApiError) {
      throw error;
    }
    
    const message = error instanceof Error ? error.message : '未知错误';
    throw new ApiError(message, 500, 'INTERNAL_ERROR');
  }

  // 获取所有产品
  async getProducts(params?: { 
    page?: number; 
    limit?: number; 
    category?: string; 
    platform?: string; 
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<ApiResponse<Product[]>> {
    try {
      if (this.useBackendApi) {
        // 使用后端API
        const response = await backendApiService.getProducts(params || {});
        return {
          data: response.data.products,
          success: true,
          message: response.message,
          timestamp: Date.now()
        };
      } else {
        // 使用本地数据
        await this.simulateNetworkDelay();
        const products = await this.dataService.fetchAllProducts();
        return this.wrapResponse(products, '产品数据获取成功');
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  // 根据ID获取产品
  async getProductById(id: string): Promise<ApiResponse<Product | null>> {
    try {
      if (this.useBackendApi) {
        // 使用后端API
        const response = await backendApiService.getProductById(id);
        return {
          data: response.data.product,
          success: true,
          message: response.message,
          timestamp: Date.now()
        };
      } else {
        // 使用本地数据
        await this.simulateNetworkDelay(200);
        const product = await this.dataService.fetchProductById(id);
        
        if (!product) {
          throw new ApiError(`产品 ${id} 不存在`, 404, 'PRODUCT_NOT_FOUND');
        }
        
        return this.wrapResponse(product, '产品详情获取成功');
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  // 获取数据统计
  async getStats(): Promise<ApiResponse<DataStats>> {
    try {
      if (this.useBackendApi) {
        // 使用后端API
        const response = await backendApiService.getStats();
        return {
          data: response.data,
          success: true,
          message: response.message,
          timestamp: Date.now()
        };
      } else {
        // 使用本地数据
        await this.simulateNetworkDelay(100);
        const stats = await this.dataService.fetchStats();
        return this.wrapResponse(stats, '统计数据获取成功');
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  // 搜索产品
  async searchProducts(query: string, limit?: number): Promise<ApiResponse<Product[]>> {
    try {
      if (this.useBackendApi) {
        // 使用后端API
        const response = await backendApiService.searchProducts({ q: query, limit });
        return {
          data: response.data.products,
          success: true,
          message: response.message,
          timestamp: Date.now()
        };
      } else {
        // 使用本地数据
        await this.simulateNetworkDelay(400);
        const results = this.dataService.searchProducts(query, limit);
        return this.wrapResponse(results, `搜索到 ${results.length} 个结果`);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  // 获取热门产品
  async getPopularProducts(limit?: number): Promise<ApiResponse<Product[]>> {
    try {
      await this.simulateNetworkDelay(250);
      const products = this.dataService.getPopularProducts(limit);
      return this.wrapResponse(products, '热门产品获取成功');
    } catch (error) {
      this.handleError(error);
    }
  }

  // 获取最新产品
  async getLatestProducts(limit?: number): Promise<ApiResponse<Product[]>> {
    try {
      await this.simulateNetworkDelay(250);
      const products = this.dataService.getLatestProducts(limit);
      return this.wrapResponse(products, '最新产品获取成功');
    } catch (error) {
      this.handleError(error);
    }
  }

  // 获取筛选选项
  async getFilterOptions(): Promise<ApiResponse<{
    categories: { value: string; label: string; count: number }[];
    locations: { value: string; label: string; count: number }[];
    platforms: { value: string; label: string; count: number }[];
    priceRange: [number, number];
  }>> {
    try {
      await this.simulateNetworkDelay(150);
      
      const options = {
        categories: this.dataService.getCategoryOptions(),
        locations: this.dataService.getLocationOptions(),
        platforms: this.dataService.getPlatformOptions(),
        priceRange: this.dataService.getPriceRange()
      };
      
      return this.wrapResponse(options, '筛选选项获取成功');
    } catch (error) {
      this.handleError(error);
    }
  }

  // 筛选产品
  async filterProducts(filters: FilterState, searchQuery?: string): Promise<ApiResponse<Product[]>> {
    try {
      await this.simulateNetworkDelay(350);
      const results = this.dataService.filterProducts(filters, searchQuery);
      return this.wrapResponse(results, `筛选到 ${results.length} 个产品`);
    } catch (error) {
      this.handleError(error);
    }
  }

  // 批量获取产品（用于对比功能）
  async getProductsByIds(ids: string[]): Promise<ApiResponse<Product[]>> {
    try {
      await this.simulateNetworkDelay(200);
      const products = ids
        .map(id => this.dataService.getProductById(id))
        .filter((product): product is Product => product !== undefined);
      
      return this.wrapResponse(products, `获取到 ${products.length} 个产品`);
    } catch (error) {
      this.handleError(error);
    }
  }

  // 获取相关产品推荐
  async getRelatedProducts(productId: string, limit: number = 8): Promise<ApiResponse<Product[]>> {
    try {
      await this.simulateNetworkDelay(300);
      
      const currentProduct = this.dataService.getProductById(productId);
      if (!currentProduct) {
        throw new ApiError(`产品 ${productId} 不存在`, 404, 'PRODUCT_NOT_FOUND');
      }

      // 基于品类和价格范围推荐相关产品
      const allProducts = this.dataService.getAllProducts();
      const currentPrice = currentProduct.price.discount || currentProduct.price.normal;
      const priceRange = currentPrice * 0.3; // 30%的价格范围

      const related = allProducts
        .filter(product => 
          product.id !== productId && // 排除当前产品
          (
            product.category.primary === currentProduct.category.primary || // 同品类
            Math.abs((product.price.discount || product.price.normal) - currentPrice) <= priceRange // 相似价格
          )
        )
        .sort((a, b) => {
          // 按相似度排序
          let scoreA = 0;
          let scoreB = 0;

          // 品类相似度
          if (a.category.primary === currentProduct.category.primary) scoreA += 10;
          if (b.category.primary === currentProduct.category.primary) scoreB += 10;

          if (a.category.secondary === currentProduct.category.secondary) scoreA += 5;
          if (b.category.secondary === currentProduct.category.secondary) scoreB += 5;

          // 价格相似度
          const priceA = a.price.discount || a.price.normal;
          const priceB = b.price.discount || b.price.normal;
          const priceDiffA = Math.abs(priceA - currentPrice);
          const priceDiffB = Math.abs(priceB - currentPrice);
          
          if (priceDiffA < priceDiffB) scoreA += 3;
          if (priceDiffB < priceDiffA) scoreB += 3;

          // 平台相似度
          if (a.platform === currentProduct.platform) scoreA += 2;
          if (b.platform === currentProduct.platform) scoreB += 2;

          return scoreB - scoreA;
        })
        .slice(0, limit);

      return this.wrapResponse(related, `推荐 ${related.length} 个相关产品`);
    } catch (error) {
      this.handleError(error);
    }
  }
}

// 创建单例实例
export const apiService = new ApiService();
