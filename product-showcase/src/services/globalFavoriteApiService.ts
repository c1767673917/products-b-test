import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { Product } from '../types/product';
import { API_CONFIG } from '../config/api';
import { imageUtils } from './httpClient';

// API 响应类型
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  error?: {
    code: string;
    message: string;
  };
}

// HTTP客户端配置
const httpClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 全局收藏API服务
export class GlobalFavoriteApiService {
  // 切换全局收藏状态
  async toggleFavorite(productId: string): Promise<ApiResponse<{
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
      }>> = await httpClient.post('/global-favorites/toggle', {
        productId,
        metadata: {
          source: 'web',
          timestamp: new Date().toISOString()
        }
      });

      return response.data;
    } catch (error) {
      console.error('切换全局收藏状态失败:', error);
      throw this.handleError(error, 'toggleFavorite');
    }
  }

  // 获取全局收藏列表
  async getFavorites(params: {
    page?: number;
    limit?: number;
    populate?: boolean;
    sortBy?: 'recent' | 'popular';
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
      const response = await httpClient.get('/global-favorites', { params });
      
      // 处理返回的收藏产品数据中的图片URL
      if (response.data.success && response.data.data.favorites) {
        response.data.data.favorites = response.data.data.favorites.map((favorite: any) => {
          if (favorite.product) {
            favorite.product = this.processProductImages(favorite.product);
          }
          return favorite;
        });
      }
      
      return response.data;
    } catch (error) {
      console.error('获取全局收藏列表失败:', error);
      throw this.handleError(error, 'getFavorites');
    }
  }

  // 检查全局收藏状态
  async checkFavoriteStatus(productId: string): Promise<ApiResponse<{
    productId: string;
    isFavorited: boolean;
    favoriteCount: number;
  }>> {
    try {
      const response = await httpClient.get('/global-favorites/status', {
        params: { productId }
      });

      return response.data;
    } catch (error) {
      console.error('检查全局收藏状态失败:', error);
      throw this.handleError(error, 'checkFavoriteStatus');
    }
  }

  // 批量检查全局收藏状态
  async batchCheckFavoriteStatus(productIds: string[]): Promise<ApiResponse<{
    favoriteMap: { [productId: string]: boolean };
    countMap: { [productId: string]: number };
  }>> {
    try {
      const response = await httpClient.get('/global-favorites/batch-status', {
        params: {
          productIds: productIds.join(',')
        }
      });

      return response.data;
    } catch (error) {
      console.error('批量检查全局收藏状态失败:', error);
      throw this.handleError(error, 'batchCheckFavoriteStatus');
    }
  }

  // 获取产品收藏统计
  async getProductFavoriteStats(productId: string): Promise<ApiResponse<{
    productId: string;
    favoriteCount: number;
  }>> {
    try {
      const response = await httpClient.get(`/api/v1/global-favorites/stats/${productId}`);
      return response.data;
    } catch (error) {
      console.error('获取产品收藏统计失败:', error);
      throw this.handleError(error, 'getProductFavoriteStats');
    }
  }

  // 处理产品图片URL
  private processProductImages(product: Product): Product {
    const processedProduct = { ...product };

    // 确保 images 对象存在
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
export const globalFavoriteApiService = new GlobalFavoriteApiService();

// 导出类型
export type { ApiResponse };