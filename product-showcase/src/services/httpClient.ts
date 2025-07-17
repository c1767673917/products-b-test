// HTTP客户端配置
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_CONFIG } from '../config/api';

// 请求ID生成器
const generateRequestId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// 请求配置接口
interface RequestConfig extends AxiosRequestConfig {
  metadata?: {
    startTime?: number;
    requestId?: string;
  };
  _retry?: boolean;
  _retryCount?: number;
}

// 创建HTTP客户端实例
export const httpClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// 请求拦截器
httpClient.interceptors.request.use(
  (config: RequestConfig) => {
    // 添加请求ID用于追踪
    const requestId = generateRequestId();
    config.headers = config.headers || {};
    config.headers['X-Request-ID'] = requestId;
    
    // 添加时间戳用于性能监控
    config.metadata = {
      startTime: Date.now(),
      requestId
    };

    // 开发环境下输出请求信息
    if (API_CONFIG.baseURL.includes('localhost')) {
      console.log(`🚀 API Request [${requestId}]:`, {
        method: config.method?.toUpperCase(),
        url: config.url,
        params: config.params,
        data: config.data
      });
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('❌ Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const config = response.config as RequestConfig;
    const duration = config.metadata?.startTime 
      ? Date.now() - config.metadata.startTime 
      : 0;

    // 开发环境下输出响应信息
    if (API_CONFIG.baseURL.includes('localhost')) {
      console.log(`✅ API Response [${config.metadata?.requestId}]:`, {
        status: response.status,
        duration: `${duration}ms`,
        url: config.url,
        dataSize: JSON.stringify(response.data).length
      });
    }

    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as RequestConfig;
    const requestId = config?.metadata?.requestId || 'unknown';

    console.error(`❌ API Error [${requestId}]:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: config?.url,
      message: error.message
    });

    // 自动重试机制
    if (shouldRetry(error) && config && !config._retry) {
      config._retryCount = (config._retryCount || 0) + 1;

      if (config._retryCount <= API_CONFIG.retryAttempts) {
        config._retry = true;
        
        // 指数退避延迟
        const delay = API_CONFIG.retryDelay * Math.pow(2, config._retryCount - 1);
        console.log(`🔄 Retrying request [${requestId}] in ${delay}ms... (${config._retryCount}/${API_CONFIG.retryAttempts})`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return httpClient(config);
      }
    }

    return Promise.reject(enhanceError(error));
  }
);

// 判断是否应该重试
function shouldRetry(error: AxiosError): boolean {
  if (!error.response) {
    // 网络错误，应该重试
    return true;
  }

  const status = error.response.status;
  
  // 5xx 服务器错误应该重试
  if (status >= 500) {
    return true;
  }
  
  // 408 请求超时应该重试
  if (status === 408) {
    return true;
  }
  
  // 429 请求过多应该重试
  if (status === 429) {
    return true;
  }

  return false;
}

// 增强错误信息
function enhanceError(error: AxiosError): AxiosError {
  const config = error.config as RequestConfig;
  const enhancedError = error;
  
  // 添加自定义错误信息
  if (!error.response) {
    enhancedError.message = '网络连接失败，请检查网络设置';
  } else {
    const status = error.response.status;
    switch (status) {
      case 400:
        enhancedError.message = '请求参数错误';
        break;
      case 401:
        enhancedError.message = '未授权访问';
        break;
      case 403:
        enhancedError.message = '禁止访问';
        break;
      case 404:
        enhancedError.message = '请求的资源不存在';
        break;
      case 408:
        enhancedError.message = '请求超时';
        break;
      case 429:
        enhancedError.message = '请求过于频繁，请稍后重试';
        break;
      case 500:
        enhancedError.message = '服务器内部错误';
        break;
      case 502:
        enhancedError.message = '网关错误';
        break;
      case 503:
        enhancedError.message = '服务暂时不可用';
        break;
      default:
        enhancedError.message = `请求失败 (${status})`;
    }
  }

  return enhancedError;
}

// 图片URL处理工具
export const imageUtils = {
  // 获取MinIO图片完整URL
  getImageUrl: (imagePath: string): string => {
    if (!imagePath) return '';
    
    // 如果已经是完整URL，直接返回
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // 拼接MinIO基础URL
    return `${API_CONFIG.imageBaseURL}/${imagePath}`;
  },

  // 获取代理图片URL（支持实时处理）
  getProxyImageUrl: (imageId: string, options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  }): string => {
    if (!imageId) return '';
    
    const params = new URLSearchParams();
    if (options?.width) params.append('width', options.width.toString());
    if (options?.height) params.append('height', options.height.toString());
    if (options?.quality) params.append('quality', options.quality.toString());
    if (options?.format) params.append('format', options.format);
    
    const queryString = params.toString();
    return `${API_CONFIG.baseURL}/images/proxy/${imageId}${queryString ? `?${queryString}` : ''}`;
  },

  // 获取缩略图URL
  getThumbnailUrl: (imagePath: string, size: 'small' | 'medium' | 'large' = 'medium'): string => {
    if (!imagePath) return '';
    
    // 如果是MinIO的原始图片路径，转换为缩略图路径
    if (imagePath.includes('/products/')) {
      const fileName = imagePath.split('/').pop();
      if (fileName) {
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
        return `${API_CONFIG.imageBaseURL}/product-images/thumbnails/${size}/${nameWithoutExt}.webp`;
      }
    }
    
    return imagePath;
  }
};

export default httpClient;