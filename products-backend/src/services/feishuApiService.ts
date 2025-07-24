import axios, { AxiosInstance, AxiosResponse } from 'axios';
import winston from 'winston';

// 飞书API类型定义
export interface FeishuAuthResponse {
  code: number;
  msg: string;
  tenant_access_token?: string;
  expire?: number;
}

export interface FeishuField {
  field_id: string;
  field_name: string;
  type: number;
  property?: any;
}

export interface FeishuRecord {
  record_id: string;
  fields: { [key: string]: any };
}

export interface FeishuTableResponse {
  code: number;
  msg: string;
  data?: {
    items?: FeishuRecord[];
    total?: number;
    has_more?: boolean;
    page_token?: string;
  };
}

export interface FeishuFieldsResponse {
  code: number;
  msg: string;
  data?: {
    items?: FeishuField[];
  };
}

export interface FeishuDownloadTokenResponse {
  code: number;
  msg: string;
  data?: {
    download_url?: string;
  };
}

// 飞书API服务配置
export interface FeishuConfig {
  appId: string;
  appSecret: string;
  appToken: string;
  tableId: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

// 请求选项
export interface FetchOptions {
  pageSize?: number;
  pageToken?: string;
  filter?: string;
  sort?: string[];
  fieldNames?: string[];
}

/**
 * 飞书API集成服务
 * 负责与飞书开放平台API的交互，包括认证、数据获取、图片下载等功能
 */
export class FeishuApiService {
  private axiosInstance: AxiosInstance;
  private logger: winston.Logger;
  private config: FeishuConfig;
  private accessToken: string | null = null;
  private tokenExpireTime: number = 0;
  private isRefreshingToken: boolean = false;
  private tokenRefreshPromise: Promise<string> | null = null;

  constructor(config: FeishuConfig) {
    this.config = {
      baseUrl: 'https://open.feishu.cn',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    // 创建axios实例
    this.axiosInstance = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // 配置请求拦截器
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // 自动添加访问令牌
        const token = await this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        this.logger.error('请求拦截器错误:', error);
        return Promise.reject(error);
      }
    );

    // 配置响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // 如果是认证错误，尝试刷新令牌
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            await this.refreshToken();
            const token = await this.getAccessToken();
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            this.logger.error('刷新令牌失败:', refreshError);
            return Promise.reject(error);
          }
        }
        
        return Promise.reject(error);
      }
    );

    // 创建日志器
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  /**
   * 获取访问令牌（带缓存和自动刷新）
   */
  async getAccessToken(): Promise<string> {
    // 如果令牌存在且未过期，直接返回
    if (this.accessToken && Date.now() < this.tokenExpireTime - 60000) { // 提前1分钟刷新
      return this.accessToken;
    }

    // 如果正在刷新令牌，等待刷新完成
    if (this.isRefreshingToken && this.tokenRefreshPromise) {
      return await this.tokenRefreshPromise;
    }

    return await this.refreshToken();
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(): Promise<string> {
    if (this.isRefreshingToken && this.tokenRefreshPromise) {
      return await this.tokenRefreshPromise;
    }

    this.isRefreshingToken = true;
    this.tokenRefreshPromise = this._doRefreshToken();

    try {
      const token = await this.tokenRefreshPromise;
      return token;
    } finally {
      this.isRefreshingToken = false;
      this.tokenRefreshPromise = null;
    }
  }

  /**
   * 执行令牌刷新的内部方法
   */
  private async _doRefreshToken(): Promise<string> {
    try {
      this.logger.info('正在刷新飞书访问令牌...');

      const response = await axios.post<FeishuAuthResponse>(
        `${this.config.baseUrl}/open-apis/auth/v3/tenant_access_token/internal`,
        {
          app_id: this.config.appId,
          app_secret: this.config.appSecret
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: this.config.timeout
        }
      );

      if (response.data.code !== 0) {
        throw new Error(`飞书认证失败: ${response.data.msg}`);
      }

      if (!response.data.tenant_access_token || !response.data.expire) {
        throw new Error('飞书API返回的令牌信息不完整');
      }

      this.accessToken = response.data.tenant_access_token;
      this.tokenExpireTime = Date.now() + (response.data.expire * 1000);

      this.logger.info('飞书访问令牌刷新成功', {
        expiresAt: new Date(this.tokenExpireTime).toISOString()
      });

      return this.accessToken;
    } catch (error) {
      this.logger.error('飞书令牌刷新失败:', error);
      throw new Error(`飞书令牌刷新失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取表格字段信息
   */
  async getTableFields(): Promise<FeishuField[]> {
    try {
      this.logger.info('获取飞书表格字段信息...');

      const response = await this.axiosInstance.get<FeishuFieldsResponse>(
        `/open-apis/bitable/v1/apps/${this.config.appToken}/tables/${this.config.tableId}/fields`
      );

      if (response.data.code !== 0) {
        throw new Error(`获取字段失败: ${response.data.msg}`);
      }

      const fields = response.data.data?.items || [];
      this.logger.info(`成功获取 ${fields.length} 个字段`);

      return fields;
    } catch (error) {
      this.logger.error('获取表格字段失败:', error);
      throw new Error(`获取表格字段失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取表格记录数据
   */
  async getTableRecords(options: FetchOptions = {}): Promise<{
    records: FeishuRecord[];
    hasMore: boolean;
    pageToken?: string;
  }> {
    try {
      const {
        pageSize = 500,
        pageToken,
        filter,
        sort,
        fieldNames
      } = options;

      this.logger.info('获取飞书表格记录...', { pageSize, hasPageToken: !!pageToken });

      const params: any = {
        page_size: pageSize
      };

      if (pageToken) {
        params.page_token = pageToken;
      }

      if (filter) {
        params.filter = filter;
      }

      if (sort && sort.length > 0) {
        params.sort = JSON.stringify(sort);
      }

      if (fieldNames && fieldNames.length > 0) {
        params.field_names = JSON.stringify(fieldNames);
      }

      const response = await this.axiosInstance.get<FeishuTableResponse>(
        `/open-apis/bitable/v1/apps/${this.config.appToken}/tables/${this.config.tableId}/records`,
        { params }
      );

      if (response.data.code !== 0) {
        throw new Error(`获取记录失败: ${response.data.msg}`);
      }

      const data = response.data.data;
      const records = data?.items || [];
      const hasMore = data?.has_more || false;
      const nextPageToken = data?.page_token;

      this.logger.info(`成功获取 ${records.length} 条记录`, { hasMore });

      return {
        records,
        hasMore,
        pageToken: nextPageToken
      };
    } catch (error) {
      this.logger.error('获取表格记录失败:', error);
      throw new Error(`获取表格记录失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量获取所有记录
   */
  async getAllRecords(options: Omit<FetchOptions, 'pageToken'> = {}): Promise<FeishuRecord[]> {
    const allRecords: FeishuRecord[] = [];
    let hasMore = true;
    let pageToken: string | undefined;

    try {
      this.logger.info('开始批量获取所有记录...');

      while (hasMore) {
        const result = await this.getTableRecords({
          ...options,
          pageToken
        });

        allRecords.push(...result.records);
        hasMore = result.hasMore;
        pageToken = result.pageToken;

        // 添加延时避免频率限制
        if (hasMore) {
          await this.sleep(200);
        }
      }

      this.logger.info(`成功获取全部 ${allRecords.length} 条记录`);
      return allRecords;
    } catch (error) {
      this.logger.error('批量获取记录失败:', error);
      throw new Error(`批量获取记录失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 下载图片文件
   */
  async downloadImage(fileToken: string): Promise<Buffer> {
    try {
      this.logger.info('下载飞书图片文件...', { fileToken });

      // 获取访问令牌
      const accessToken = await this.getAccessToken();
      this.logger.info('使用访问令牌:', { hasToken: !!accessToken, tokenLength: accessToken?.length });

      // 直接下载图片 - 飞书API直接返回图片数据而不是下载链接
      this.logger.info('发送飞书下载请求...', {
        url: `/open-apis/drive/v1/medias/${fileToken}/download`,
        fileToken
      });

      const imageResponse = await this.axiosInstance.get(
        `/open-apis/drive/v1/medias/${fileToken}/download`,
        {
          responseType: 'arraybuffer',
          timeout: 60000, // 图片下载超时时间更长
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      // 检查响应状态
      if (imageResponse.status !== 200) {
        throw new Error(`HTTP错误: ${imageResponse.status}`);
      }

      const imageBuffer = Buffer.from(imageResponse.data);

      // 验证是否是有效的图片数据
      if (imageBuffer.length === 0) {
        throw new Error('下载的图片数据为空');
      }

      // 简单验证图片格式
      const isValidImage = this.validateImageBuffer(imageBuffer);
      if (!isValidImage) {
        this.logger.warn('下载的数据可能不是有效的图片格式', {
          fileToken,
          size: imageBuffer.length,
          firstBytes: imageBuffer.slice(0, 16).toString('hex')
        });
      }

      this.logger.info('图片下载成功', {
        fileToken,
        size: imageBuffer.length,
        contentType: imageResponse.headers['content-type']
      });

      return imageBuffer;
    } catch (error: any) {
      this.logger.error('下载图片失败:', {
        fileToken,
        error: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
        response: error?.response?.data,
        status: error?.response?.status
      });
      throw new Error(`下载图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 验证图片缓冲区是否为有效的图片格式
   */
  private validateImageBuffer(buffer: Buffer): boolean {
    if (buffer.length < 8) return false;

    // 检查常见图片格式的魔数
    const header = buffer.slice(0, 8);

    // JPEG: FF D8
    if (header[0] === 0xFF && header[1] === 0xD8) return true;

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (header.equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return true;

    // WebP: RIFF....WEBP
    if (buffer.length >= 12 &&
        header.slice(0, 4).equals(Buffer.from('RIFF')) &&
        buffer.slice(8, 12).equals(Buffer.from('WEBP'))) return true;

    // GIF: GIF87a 或 GIF89a
    if (header.slice(0, 6).equals(Buffer.from('GIF87a')) ||
        header.slice(0, 6).equals(Buffer.from('GIF89a'))) return true;

    return false;
  }

  /**
   * 批量下载图片
   */
  async batchDownloadImages(fileTokens: string[]): Promise<Map<string, Buffer>> {
    const results = new Map<string, Buffer>();
    const errors: string[] = [];

    this.logger.info(`开始批量下载 ${fileTokens.length} 个图片文件...`);

    // 使用并发控制，避免过多的同时请求
    const concurrency = 5;
    for (let i = 0; i < fileTokens.length; i += concurrency) {
      const batch = fileTokens.slice(i, i + concurrency);
      
      const downloadPromises = batch.map(async (fileToken) => {
        try {
          const buffer = await this.downloadImage(fileToken);
          results.set(fileToken, buffer);
          return { fileToken, success: true };
        } catch (error) {
          const errorMsg = `${fileToken}: ${error instanceof Error ? error.message : '未知错误'}`;
          errors.push(errorMsg);
          this.logger.error('批量下载图片失败:', { fileToken, error });
          return { fileToken, success: false };
        }
      });

      await Promise.all(downloadPromises);

      // 批次间延时
      if (i + concurrency < fileTokens.length) {
        await this.sleep(500);
      }
    }

    this.logger.info(`批量下载完成: 成功${results.size}个, 失败${errors.length}个`);

    if (errors.length > 0) {
      this.logger.warn('部分图片下载失败:', errors);
    }

    return results;
  }

  /**
   * 检测API连接状态
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      this.logger.info('测试飞书API连接...');

      // 测试认证
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error('无法获取访问令牌');
      }

      // 测试获取字段信息
      const fields = await this.getTableFields();
      if (!fields || fields.length === 0) {
        throw new Error('无法获取表格字段信息');
      }

      // 测试获取记录（只获取1条）
      const records = await this.getTableRecords({ pageSize: 1 });
      
      return {
        success: true,
        message: '飞书API连接测试成功',
        details: {
          fieldsCount: fields.length,
          hasRecords: records.records.length > 0,
          tokenExpiry: new Date(this.tokenExpireTime).toISOString()
        }
      };
    } catch (error) {
      this.logger.error('飞书API连接测试失败:', error);
      return {
        success: false,
        message: `飞书API连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
        details: error
      };
    }
  }

  /**
   * 获取配置信息
   */
  getConfig(): Partial<FeishuConfig> {
    return {
      appId: this.config.appId,
      appToken: this.config.appToken,
      tableId: this.config.tableId,
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout,
      retryAttempts: this.config.retryAttempts
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<FeishuConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 如果更新了认证信息，清除现有令牌
    if (newConfig.appId || newConfig.appSecret) {
      this.accessToken = null;
      this.tokenExpireTime = 0;
    }
    
    this.logger.info('飞书API配置已更新');
  }

  /**
   * 睡眠函数，用于控制请求频率
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.accessToken = null;
    this.tokenExpireTime = 0;
    this.isRefreshingToken = false;
    this.tokenRefreshPromise = null;
    this.logger.info('飞书API服务已销毁');
  }
}

// 创建单例实例
let feishuApiServiceInstance: FeishuApiService | null = null;

/**
 * 获取飞书API服务实例
 */
export function getFeishuApiService(): FeishuApiService {
  if (!feishuApiServiceInstance) {
    const config: FeishuConfig = {
      appId: process.env.FEISHU_APP_ID || '',
      appSecret: process.env.FEISHU_APP_SECRET || '',
      appToken: process.env.FEISHU_APP_TOKEN || '',
      tableId: process.env.FEISHU_TABLE_ID || '',
    };

    if (!config.appId || !config.appSecret || !config.appToken || !config.tableId) {
      throw new Error('飞书API配置不完整，请检查环境变量');
    }

    feishuApiServiceInstance = new FeishuApiService(config);
  }

  return feishuApiServiceInstance;
}

/**
 * 重置飞书API服务实例（用于测试）
 */
export function resetFeishuApiService(): void {
  if (feishuApiServiceInstance) {
    feishuApiServiceInstance.destroy();
    feishuApiServiceInstance = null;
  }
}