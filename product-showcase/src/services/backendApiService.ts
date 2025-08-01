// 新的API服务 - 连接后端API
import { AxiosResponse } from 'axios';
import httpClient, { imageUtils } from './httpClient';
import { API_CONFIG } from '../config/api';
import type { Product } from '../types/product';

// API响应接口
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
  requestId?: string;
}

// 分页响应接口
interface PaginatedResponse<T> {
  success: boolean;
  data: {
    products: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    filters?: {
      categories: string[];
      platforms: string[];
      priceRange: { min: number; max: number };
      provinces: string[];
    };
  };
  message?: string;
  timestamp?: string;
}

// 搜索响应接口
interface SearchResponse {
  success: boolean;
  data: {
    products: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    query: string;
    suggestions?: string[];
  };
  message?: string;
}

// 分类响应接口
interface CategoryNode {
  id: string;
  name: string;
  level: number;
  productCount: number;
  children?: CategoryNode[];
}

interface CategoryResponse {
  success: boolean;
  data: {
    categories: CategoryNode[];
  };
  message?: string;
}

// 统计响应接口
interface StatsResponse {
  success: boolean;
  data: {
    totalProducts: number;
    totalImages: number;
    categoryDistribution: Record<string, number>;
    platformDistribution: Record<string, number>;
    locationDistribution: Record<string, number>;
    priceStats: {
      min: number;
      max: number;
      average: number;
      median: number;
      distribution: number[];
      // USD价格统计
      minUSD?: number;
      maxUSD?: number;
      averageUSD?: number;
      medianUSD?: number;
      distributionUSD?: number[];
    };
    recentActivity: {
      newProductsToday: number;
      newProductsWeek: number;
      lastUpdateTime: string;
    };
  };
  message?: string;
}

// 产品查询参数接口
interface ProductListParams {
  page?: number;
  limit?: number;
  category?: string;
  platform?: string;
  province?: string;
  priceMin?: number;
  priceMax?: number;
  sortBy?: 'price' | 'time' | 'name';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: 'active' | 'inactive';
  lang?: string; // 添加语言参数
}

// 搜索参数接口
interface SearchParams {
  q: string;
  page?: number;
  limit?: number;
  category?: string;
  platform?: string;
  highlight?: boolean;
}

// API服务类
export class ApiService {
  // 获取产品列表（支持分页和筛选）
  async getProducts(params: ProductListParams = {}): Promise<PaginatedResponse<Product>> {
    try {
      const response: AxiosResponse<PaginatedResponse<Product>> = await httpClient.get(
        API_CONFIG.endpoints.products,
        { params }
      );
      
      // 处理图片URL
      if (response.data.data.products) {
        response.data.data.products = response.data.data.products.map(this.processProductImages);
      }
      
      return response.data;
    } catch (error) {
      console.error('获取产品列表失败:', error);
      throw this.handleError(error, 'getProducts');
    }
  }

  // 获取单个产品详情
  async getProductById(id: string): Promise<ApiResponse<{ product: Product; relatedProducts: Product[] }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ product: Product; relatedProducts: Product[] }>> = 
        await httpClient.get(`${API_CONFIG.endpoints.products}/${id}`);
      
      // 处理图片URL
      if (response.data.data.product) {
        response.data.data.product = this.processProductImages(response.data.data.product);
      }
      
      if (response.data.data.relatedProducts) {
        response.data.data.relatedProducts = response.data.data.relatedProducts.map(this.processProductImages);
      }
      
      return response.data;
    } catch (error) {
      console.error('获取产品详情失败:', error);
      throw this.handleError(error, 'getProductById');
    }
  }

  // 搜索产品
  async searchProducts(params: SearchParams): Promise<SearchResponse> {
    try {
      const response: AxiosResponse<SearchResponse> = await httpClient.get(
        API_CONFIG.endpoints.search,
        { params }
      );
      
      // 处理图片URL
      if (response.data.data.products) {
        response.data.data.products = response.data.data.products.map(this.processProductImages);
      }
      
      return response.data;
    } catch (error) {
      console.error('搜索产品失败:', error);
      throw this.handleError(error, 'searchProducts');
    }
  }

  // 获取搜索建议
  async getSearchSuggestions(query: string, limit: number = 10): Promise<ApiResponse<string[]>> {
    try {
      const response: AxiosResponse<ApiResponse<string[]>> = await httpClient.get(
        `${API_CONFIG.endpoints.search}/suggestions`,
        { params: { q: query, limit } }
      );
      
      return response.data;
    } catch (error) {
      console.error('获取搜索建议失败:', error);
      throw this.handleError(error, 'getSearchSuggestions');
    }
  }

  // 批量获取产品（对比功能）
  async getProductsByIds(ids: string[], fields?: string[]): Promise<ApiResponse<Product[]>> {
    try {
      const response: AxiosResponse<ApiResponse<Product[]>> = await httpClient.post(
        `${API_CONFIG.endpoints.products}/batch`,
        { productIds: ids, fields }
      );
      
      // 处理图片URL
      if (response.data.data) {
        response.data.data = response.data.data.map(this.processProductImages);
      }
      
      return response.data;
    } catch (error) {
      console.error('批量获取产品失败:', error);
      throw this.handleError(error, 'getProductsByIds');
    }
  }

  // 获取分类树
  async getCategories(): Promise<CategoryResponse> {
    try {
      const response: AxiosResponse<CategoryResponse> = await httpClient.get(
        API_CONFIG.endpoints.categories
      );
      
      return response.data;
    } catch (error) {
      console.error('获取分类失败:', error);
      throw this.handleError(error, 'getCategories');
    }
  }

  // 获取统计数据
  async getStats(params?: { lang?: string }): Promise<StatsResponse> {
    try {
      const response: AxiosResponse<StatsResponse> = await httpClient.get(
        API_CONFIG.endpoints.stats,
        { params }
      );

      return response.data;
    } catch (error) {
      console.error('获取统计数据失败:', error);
      throw this.handleError(error, 'getStats');
    }
  }

  // 上传图片
  async uploadImage(file: File): Promise<ApiResponse<{ imageId: string; publicUrl: string }>> {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response: AxiosResponse<ApiResponse<{ imageId: string; publicUrl: string }>> = 
        await httpClient.post(
          `${API_CONFIG.endpoints.images}/upload`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );

      return response.data;
    } catch (error) {
      console.error('上传图片失败:', error);
      throw this.handleError(error, 'uploadImage');
    }
  }

  // 获取健康状态
  async getHealthStatus(): Promise<{ status: string; timestamp: string; services: Record<string, string> }> {
    try {
      const response = await httpClient.get('/health');
      return response.data;
    } catch (error) {
      console.error('获取健康状态失败:', error);
      throw this.handleError(error, 'getHealthStatus');
    }
  }

  // ===== 收藏功能 API =====

  // 切换收藏状态
  async toggleFavorite(productId: string, userId?: string, sessionId?: string): Promise<ApiResponse<{
    action: 'added' | 'removed';
    productId: string;
    isFavorited: boolean;
    favoriteCount: number;
  }>> {
    try {
      const response: AxiosResponse<ApiResponse<{
        action: 'added' | 'removed';
        productId: string;
        isFavorited: boolean;
        favoriteCount: number;
      }>> = await httpClient.post(`${API_CONFIG.endpoints.favorites}/toggle`, {
        productId,
        userId,
        sessionId: sessionId || this.getSessionId(),
        metadata: {
          source: 'web',
          timestamp: new Date().toISOString()
        }
      });

      return response.data;
    } catch (error) {
      console.error('切换收藏状态失败:', error);
      throw this.handleError(error, 'toggleFavorite');
    }
  }

  // 获取收藏列表
  async getFavorites(params: {
    userId?: string;
    sessionId?: string;
    page?: number;
    limit?: number;
    populate?: boolean;
  } = {}): Promise<ApiResponse<{
    favorites: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>> {
    try {
      const queryParams = {
        ...params,
        sessionId: params.sessionId || this.getSessionId()
      };

      const response = await httpClient.get(API_CONFIG.endpoints.favorites, { params: queryParams });
      return response.data;
    } catch (error) {
      console.error('获取收藏列表失败:', error);
      throw this.handleError(error, 'getFavorites');
    }
  }

  // 检查收藏状态
  async checkFavoriteStatus(productId: string, userId?: string, sessionId?: string): Promise<ApiResponse<{
    productId: string;
    isFavorited: boolean;
    favoriteCount: number;
  }>> {
    try {
      const response = await httpClient.get(`${API_CONFIG.endpoints.favorites}/status`, {
        params: {
          productId,
          userId,
          sessionId: sessionId || this.getSessionId()
        }
      });

      return response.data;
    } catch (error) {
      console.error('检查收藏状态失败:', error);
      throw this.handleError(error, 'checkFavoriteStatus');
    }
  }

  // 批量检查收藏状态
  async batchCheckFavoriteStatus(productIds: string[], userId?: string, sessionId?: string): Promise<ApiResponse<{
    favoriteMap: { [productId: string]: boolean };
  }>> {
    try {
      const response = await httpClient.get(`${API_CONFIG.endpoints.favorites}/batch-status`, {
        params: {
          productIds: productIds.join(','),
          userId,
          sessionId: sessionId || this.getSessionId()
        }
      });

      return response.data;
    } catch (error) {
      console.error('批量检查收藏状态失败:', error);
      throw this.handleError(error, 'batchCheckFavoriteStatus');
    }
  }

  // 获取产品收藏统计
  async getProductFavoriteStats(productId: string): Promise<ApiResponse<{
    productId: string;
    favoriteCount: number;
  }>> {
    try {
      const response = await httpClient.get(`/favorites/stats/${productId}`);
      return response.data;
    } catch (error) {
      console.error('获取产品收藏统计失败:', error);
      throw this.handleError(error, 'getProductFavoriteStats');
    }
  }

  // 获取或生成会话ID
  private getSessionId(): string {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  // 处理产品图片URL
  private processProductImages(product: Product): Product {
    const processedProduct = { ...product };

    // 确保 images 对象存在，如果不存在则创建一个空对象
    if (!processedProduct.images || typeof processedProduct.images !== 'object') {
      processedProduct.images = {};
    }

    // 处理每种类型的图片URL
    if (processedProduct.images) {
      Object.keys(processedProduct.images).forEach(key => {
        const imagePath = processedProduct.images![key as keyof typeof processedProduct.images];
        if (imagePath) {
          processedProduct.images![key as keyof typeof processedProduct.images] =
            imageUtils.getImageUrl(imagePath);
        }
      });
    }

    return processedProduct;
  }

  // 错误处理
  private handleError(error: any, operation: string): Error {
    const message = error.response?.data?.error?.message 
      || error.response?.data?.message 
      || error.message 
      || '未知错误';
      
    const statusCode = error.response?.status || 500;
    
    console.error(`${operation} 操作失败:`, {
      message,
      statusCode,
      operation,
      timestamp: new Date().toISOString()
    });

    // 创建增强的错误对象
    const enhancedError = new Error(`${operation}: ${message}`);
    (enhancedError as any).statusCode = statusCode;
    (enhancedError as any).operation = operation;
    
    return enhancedError;
  }
}

// 创建单例实例
export const apiService = new ApiService();

// 兼容性：保持原有接口
export class BackendApiService extends ApiService {}
export const backendApiService = new BackendApiService();

// 导出类型
export type {
  ApiResponse,
  PaginatedResponse,
  SearchResponse,
  CategoryResponse,
  StatsResponse,
  ProductListParams,
  SearchParams,
  CategoryNode
};