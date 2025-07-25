// API服务层 - 统一管理所有API调用
import type { Product, FilterState, DataStats } from '../types/product';
import { apiService as backendApiService } from './backendApiService';

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
  private baseDelay: number = 300; // 基础延迟时间

  constructor() {
    // 统一使用后端API
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
    sortBy?: 'price' | 'time' | 'name';
    sortOrder?: 'asc' | 'desc';
    priceMin?: number;
    priceMax?: number;
    province?: string;
  }): Promise<ApiResponse<any>> {
    try {
      // 使用后端API
      const response = await backendApiService.getProducts(params || {});
      
      // 检查响应格式，如果有分页信息则返回完整响应
      if (response.data && typeof response.data === 'object' && 'pagination' in response.data) {
        return {
          data: response.data, // 包含products和pagination
          success: true,
          message: response.message,
          timestamp: Date.now()
        };
      }
      
      // 兼容旧格式：只有产品数组
      return {
        data: (response.data as any).products || response.data,
        success: true,
        message: response.message,
        timestamp: Date.now()
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // 根据ID获取产品
  async getProductById(id: string): Promise<ApiResponse<Product | null>> {
    try {
      // 使用后端API
      const response = await backendApiService.getProductById(id);
      return {
        data: response.data.product,
        success: true,
        message: response.message,
        timestamp: Date.now()
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // 获取数据统计
  async getStats(): Promise<ApiResponse<DataStats>> {
    try {
      // 使用后端API
      const response = await backendApiService.getStats();
      return {
        data: {
          ...response.data,
          priceRange: {
            min: response.data.priceStats.min,
            max: response.data.priceStats.max,
            average: response.data.priceStats.average
          }
        },
        success: true,
        message: response.message,
        timestamp: Date.now()
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // 搜索产品
  async searchProducts(query: string, limit?: number): Promise<ApiResponse<Product[]>> {
    try {
      // 使用后端API
      const response = await backendApiService.searchProducts({ q: query, limit });
      return {
        data: response.data.products,
        success: true,
        message: response.message,
        timestamp: Date.now()
      };
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
      const response = await backendApiService.getStats();
      const stats = response.data;
      
      const options = {
        categories: Object.entries(stats.categoryDistribution).map(([category, count]) => ({
          value: category,
          label: category,
          count: count as number
        })),
        locations: Object.entries(stats.locationDistribution).map(([location, count]) => ({
          value: location,
          label: location,
          count: count as number
        })),
        platforms: Object.entries(stats.platformDistribution).map(([platform, count]) => ({
          value: platform,
          label: platform,
          count: count as number
        })),
        priceRange: [stats.priceStats.min, stats.priceStats.max] as [number, number]
      };
      
      return this.wrapResponse(options, '筛选选项获取成功');
    } catch (error) {
      this.handleError(error);
    }
  }

  // 批量获取产品（用于对比功能）
  async getProductsByIds(ids: string[]): Promise<ApiResponse<Product[]>> {
    try {
      const promises = ids.map(id => this.getProductById(id));
      const responses = await Promise.all(promises);
      const products = responses
        .map(response => response.data)
        .filter((product): product is Product => product !== null);
      
      return {
        data: products,
        success: true,
        message: '批量获取产品成功',
        timestamp: Date.now()
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // 筛选产品
  async filterProducts(filters: FilterState, searchQuery?: string): Promise<ApiResponse<Product[]>> {
    try {
      const params: any = {};
      
      if (filters.categories.length > 0) {
        params.category = filters.categories.join(',');
      }
      if (filters.platforms.length > 0) {
        params.platform = filters.platforms.join(',');
      }
      if (filters.locations.length > 0) {
        params.province = filters.locations.join(',');
      }
      if (filters.priceRange) {
        params.priceMin = filters.priceRange[0];
        params.priceMax = filters.priceRange[1];
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      const response = await backendApiService.getProducts(params);
      return {
        data: response.data.products,
        success: true,
        message: response.message,
        timestamp: Date.now()
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // 获取最新产品
  async getLatestProducts(limit?: number): Promise<ApiResponse<Product[]>> {
    try {
      const response = await backendApiService.getProducts({ 
        limit, 
        sortBy: 'time', 
        sortOrder: 'desc' 
      });
      return {
        data: response.data.products,
        success: true,
        message: '最新产品获取成功',
        timestamp: Date.now()
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // 获取相关产品推荐
  async getRelatedProducts(productId: string, limit?: number): Promise<ApiResponse<Product[]>> {
    try {
      // 先获取当前产品
      const productResponse = await this.getProductById(productId);
      const currentProduct = productResponse.data;
      
      if (!currentProduct) {
        return {
          data: [],
          success: true,
          message: '未找到相关产品',
          timestamp: Date.now()
        };
      }
      
      // 基于分类获取相关产品
      const categoryValue = typeof currentProduct.category.primary === 'string' 
        ? currentProduct.category.primary 
        : currentProduct.category.primary.display || currentProduct.category.primary.chinese || currentProduct.category.primary.english || '';
      
      const response = await backendApiService.getProducts({
        category: categoryValue,
        limit: (limit || 8) + 1 // 多获取一个，用于排除当前产品
      });
      
      // 排除当前产品
      const relatedProducts = response.data.products.filter(p => p.productId !== productId);
      
      return {
        data: relatedProducts.slice(0, limit || 8),
        success: true,
        message: '相关产品获取成功',
        timestamp: Date.now()
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // 获取热门产品
  async getPopularProducts(limit?: number): Promise<ApiResponse<Product[]>> {
    try {
      const response = await backendApiService.getProducts({ limit, sortBy: 'price', sortOrder: 'desc' });
      return {
        data: response.data.products,
        success: true,
        message: '热门产品获取成功',
        timestamp: Date.now()
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  // 获取产品图片信息
  async getProductImage(productId: string, imageType: string): Promise<ApiResponse<any>> {
    try {
      const response = await backendApiService.get(`/products/${productId}/images/${imageType}`);
      return this.wrapResponse(response.data, response.message);
    } catch (error) {
      this.handleError(error);
    }
  }

  // 获取产品的所有图片
  async getProductImages(productId: string): Promise<ApiResponse<any>> {
    try {
      const response = await backendApiService.get(`/products/${productId}/images`);
      return this.wrapResponse(response.data, response.message);
    } catch (error) {
      this.handleError(error);
    }
  }

  // 修复产品图片引用
  async repairProductImages(productId: string): Promise<ApiResponse<any>> {
    try {
      const response = await backendApiService.post(`/products/${productId}/images/repair`);
      return this.wrapResponse(response.data, response.message);
    } catch (error) {
      this.handleError(error);
    }
  }

  // 验证图片一致性
  async validateImageConsistency(productId: string): Promise<ApiResponse<any>> {
    try {
      const response = await backendApiService.get(`/products/${productId}/images/validate`);
      return this.wrapResponse(response.data, response.message);
    } catch (error) {
      this.handleError(error);
    }
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

}

// 创建单例实例
export const apiService = new ApiService();
