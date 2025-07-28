// API配置文件
console.log('API_CONFIG: VITE_API_BASE_URL =', import.meta.env.VITE_API_BASE_URL);

export const API_CONFIG = {
  // 后端API基础URL
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  
  // 图片服务URL  
  imageBaseURL: import.meta.env.VITE_IMAGE_BASE_URL || 'http://152.89.168.61:9000',
  
  // 图片服务配置
  imageService: {
    bucketName: 'product-images',
    paths: {
      products: 'products',
      thumbnails: 'thumbnails',
      temp: 'temp',
      deprecated: ['originals', 'originals/2025/07'] // 需要修复的废弃路径
    }
  },
  
  // 请求超时时间
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000,
  
  // 重试配置
  retryAttempts: 3,
  retryDelay: 1000,
  
  // API端点
  endpoints: {
    products: '/products',
    search: '/search',
    categories: '/categories', 
    stats: '/stats/overview',
    images: '/images',
    health: '/health',
    favorites: '/favorites'
  }
} as const;

// 环境配置
export const ENV_CONFIG = {
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  apiUrl: API_CONFIG.baseURL,
  imageUrl: API_CONFIG.imageBaseURL,
  enableImageOptimization: import.meta.env.VITE_ENABLE_IMAGE_OPTIMIZATION === 'true',
  defaultImageQuality: parseInt(import.meta.env.VITE_DEFAULT_IMAGE_QUALITY) || 85
} as const;

/**
 * 前端图片URL构建工具
 */
export class FrontendImageUtils {
  /**
   * 构建图片完整URL
   */
  static buildImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    
    // 如果已经是完整URL，直接返回
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // 如果是相对路径（以 /images/ 开头），提取文件名并构建正确的路径
    if (imagePath.startsWith('/images/')) {
      const filename = imagePath.split('/').pop(); // 获取文件名
      return `${API_CONFIG.imageBaseURL}/${API_CONFIG.imageService.bucketName}/${API_CONFIG.imageService.paths.products}/${filename}`;
    }
    
    // 如果是其他以 / 开头的路径，去掉开头的 / 并构建URL
    if (imagePath.startsWith('/')) {
      const cleanPath = imagePath.substring(1);
      return `${API_CONFIG.imageBaseURL}/${API_CONFIG.imageService.bucketName}/${cleanPath}`;
    }
    
    // 如果是对象名，构建完整URL
    return `${API_CONFIG.imageBaseURL}/${API_CONFIG.imageService.bucketName}/${imagePath}`;
  }
  
  /**
   * 构建缩略图URL
   */
  static buildThumbnailUrl(imagePath: string, size: 'small' | 'medium' | 'large'): string {
    if (!imagePath) return '';
    
    const filename = imagePath.split('/').pop();
    if (!filename) return this.buildImageUrl(imagePath);
    
    // 构建缩略图路径
    const thumbnailPath = `${API_CONFIG.imageService.paths.thumbnails}/${size}/${filename.replace(/\.(jpg|jpeg|png)$/i, '.webp')}`;
    
    return `${API_CONFIG.imageBaseURL}/${API_CONFIG.imageService.bucketName}/${thumbnailPath}`;
  }
  
  /**
   * 构建优化后的图片URL（带参数）
   */
  static buildOptimizedImageUrl(
    imagePath: string, 
    options: { width?: number; height?: number; quality?: number; format?: string } = {}
  ): string {
    const baseUrl = this.buildImageUrl(imagePath);
    const params = new URLSearchParams();
    
    if (options.width) params.append('width', options.width.toString());
    if (options.height) params.append('height', options.height.toString());
    if (options.quality) params.append('quality', options.quality.toString());
    if (options.format) params.append('format', options.format);
    
    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  }
  
  /**
   * 获取图片代理URL
   */
  static buildProxyUrl(imageId: string, options: { width?: number; height?: number; quality?: number; format?: string } = {}): string {
    const params = new URLSearchParams();
    
    if (options.width) params.append('width', options.width.toString());
    if (options.height) params.append('height', options.height.toString());
    if (options.quality) params.append('quality', options.quality.toString());
    if (options.format) params.append('format', options.format);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return `${API_CONFIG.baseURL}/images/proxy/${imageId}${queryString}`;
  }
  
  /**
   * 检查图片路径是否需要修复
   */
  static needsPathFix(imagePath: string): boolean {
    return API_CONFIG.imageService.paths.deprecated.some(deprecated => 
      imagePath.includes(deprecated)
    );
  }
  
  /**
   * 修复图片路径
   */
  static fixImagePath(imagePath: string): string {
    if (!this.needsPathFix(imagePath)) {
      return imagePath;
    }
    
    // 提取文件名
    const filename = imagePath.split('/').pop() || imagePath.split('\\').pop();
    if (!filename) return imagePath;
    
    // 构建新路径
    return `${API_CONFIG.imageService.paths.products}/${filename}`;
  }
  
  /**
   * 从完整URL中提取对象名
   */
  static extractObjectName(fullUrl: string): string {
    const baseUrl = `${API_CONFIG.imageBaseURL}/${API_CONFIG.imageService.bucketName}/`;
    return fullUrl.replace(baseUrl, '');
  }
}