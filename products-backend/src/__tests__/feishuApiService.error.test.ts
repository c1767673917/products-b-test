import axios from 'axios';
import { FeishuApiService, FeishuConfig } from '../services/feishuApiService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FeishuApiService - Error Handling & Image Downloads', () => {
  let feishuService: FeishuApiService;
  let mockAxiosInstance: jest.Mocked<any>;

  const mockConfig: FeishuConfig = {
    appId: 'test_app_id',
    appSecret: 'test_app_secret',
    appToken: 'test_app_token',
    tableId: 'test_table_id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);
    
    // Mock successful token refresh
    mockedAxios.post = jest.fn().mockResolvedValue({
      data: {
        code: 0,
        msg: 'success',
        tenant_access_token: 'mock_token',
        expire: 7200,
      },
    });
    
    feishuService = new FeishuApiService(mockConfig);
  });

  afterEach(() => {
    feishuService.destroy();
  });

  describe('Image Download Error Handling', () => {
    it('should handle download token API errors', async () => {
      const mockErrorResponse = {
        code: 99991400,
        msg: 'invalid file_token',
      };

      mockAxiosInstance.get = jest.fn().mockResolvedValue({
        data: mockErrorResponse,
      });

      await expect(feishuService.downloadImage('invalid_token')).rejects.toThrow(
        'invalid file_token'
      );
    });

    it('should handle missing download URL', async () => {
      const mockIncompleteResponse = {
        code: 0,
        msg: 'success',
        data: {},
      };

      mockAxiosInstance.get = jest.fn().mockResolvedValue({
        data: mockIncompleteResponse,
      });

      await expect(feishuService.downloadImage('test_token')).rejects.toThrow(
        '飞书API返回的下载链接为空'
      );
    });

    it('should handle successful image download', async () => {
      const mockDownloadResponse = {
        code: 0,
        msg: 'success',
        data: {
          download_url: 'https://example.com/image.jpg',
        },
      };

      mockAxiosInstance.get = jest.fn().mockResolvedValue({
        data: mockDownloadResponse,
      });

      const mockImageData = Buffer.from('test_image_data');
      mockedAxios.get = jest.fn().mockResolvedValue({
        data: mockImageData.buffer,
      });

      const result = await feishuService.downloadImage('test_token');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Batch Download Error Handling', () => {
    it('should handle empty file tokens array', async () => {
      const results = await feishuService.batchDownloadImages([]);
      
      expect(results.size).toBe(0);
    });

    it('should handle mixed success and failure in batch download', async () => {
      const tokens = ['token1', 'token2', 'token3'];
      
      let callCount = 0;
      mockAxiosInstance.get = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          // Second token fails
          return Promise.reject(new Error('Download failed'));
        }
        return Promise.resolve({
          data: {
            code: 0,
            msg: 'success',
            data: { download_url: 'https://example.com/image.jpg' },
          },
        });
      });

      mockedAxios.get = jest.fn().mockResolvedValue({
        data: Buffer.from('test_image').buffer,
      });

      const results = await feishuService.batchDownloadImages(tokens);

      // Should have 2 successful downloads (3 - 1 failure)
      expect(results.size).toBe(2);
    });
  });

  describe('Network Error Handling', () => {
    it('should handle timeout errors', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded');
      timeoutError.name = 'TimeoutError';
      
      mockAxiosInstance.get = jest.fn().mockRejectedValue(timeoutError);

      await expect(feishuService.getTableFields()).rejects.toThrow(
        'timeout of 30000ms exceeded'
      );
    });

    it('should handle network connection errors', async () => {
      const networkError = new Error('Network Error');
      mockAxiosInstance.get = jest.fn().mockRejectedValue(networkError);

      await expect(feishuService.getTableFields()).rejects.toThrow(
        'Network Error'
      );
    });

    it('should handle API rate limiting', async () => {
      const rateLimitError = new Error('Too Many Requests');
      mockAxiosInstance.get = jest.fn().mockRejectedValue(rateLimitError);

      await expect(feishuService.getTableFields()).rejects.toThrow(
        'Too Many Requests'
      );
    });
  });

  describe('Data Validation Error Handling', () => {
    it('should handle malformed API responses', async () => {
      const malformedResponse = 'invalid json response';
      
      mockAxiosInstance.get = jest.fn().mockResolvedValue({
        data: malformedResponse,
      });

      await expect(feishuService.getTableFields()).rejects.toThrow();
    });

    it('should handle null response data', async () => {
      mockAxiosInstance.get = jest.fn().mockResolvedValue({
        data: null,
      });

      await expect(feishuService.getTableFields()).rejects.toThrow();
    });

    it('should handle API error codes', async () => {
      const errorResponse = {
        code: 99991400,
        msg: 'invalid app_token',
      };

      mockAxiosInstance.get = jest.fn().mockResolvedValue({
        data: errorResponse,
      });

      await expect(feishuService.getTableFields()).rejects.toThrow(
        'invalid app_token'
      );
    });
  });

  describe('Configuration Error Handling', () => {
    it('should handle invalid token configuration', async () => {
      // Mock token refresh failure
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: {
          code: 99991663,
          msg: 'invalid app_secret',
        },
      });

      const serviceWithBadConfig = new FeishuApiService({
        ...mockConfig,
        appSecret: 'invalid_secret',
      });

      await expect(serviceWithBadConfig.getAccessToken()).rejects.toThrow(
        'invalid app_secret'
      );

      serviceWithBadConfig.destroy();
    });

    it('should validate service state after destruction', () => {
      const config = feishuService.getConfig();
      expect(config).toBeDefined();
      expect(config.appId).toBe('test_app_id');
      
      feishuService.destroy();
      
      // Config should still be accessible after destruction
      const configAfterDestroy = feishuService.getConfig();
      expect(configAfterDestroy).toBeDefined();
    });
  });

  describe('Connection Testing Error Scenarios', () => {
    it('should return failure result for connection test errors', async () => {
      const testError = new Error('Test connection failed');
      mockAxiosInstance.get = jest.fn().mockRejectedValue(testError);

      const result = await feishuService.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Test connection failed');
    });

    it('should handle partial connection test failures', async () => {
      // Token success, but fields fail
      const fieldsError = new Error('Fields unavailable');
      mockAxiosInstance.get = jest.fn().mockRejectedValue(fieldsError);

      const result = await feishuService.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Fields unavailable');
    });
  });
});