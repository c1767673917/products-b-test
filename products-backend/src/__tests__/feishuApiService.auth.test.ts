import axios from 'axios';
import { FeishuApiService, FeishuConfig, FeishuAuthResponse } from '../services/feishuApiService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FeishuApiService - Authentication', () => {
  let feishuService: FeishuApiService;
  let mockAxiosInstance: jest.Mocked<any>;

  const mockConfig: FeishuConfig = {
    appId: 'test_app_id',
    appSecret: 'test_app_secret',
    appToken: 'test_app_token',
    tableId: 'test_table_id',
    baseUrl: 'https://open.feishu.cn',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);
    
    feishuService = new FeishuApiService(mockConfig);
  });

  afterEach(() => {
    feishuService.destroy();
  });

  describe('Token Management', () => {
    it('should successfully refresh access token', async () => {
      const mockTokenResponse: FeishuAuthResponse = {
        code: 0,
        msg: 'success',
        tenant_access_token: 'mock_access_token_123',
        expire: 7200,
      };

      mockedAxios.post = jest.fn().mockResolvedValue({
        data: mockTokenResponse,
      });

      const token = await feishuService.getAccessToken();

      expect(token).toBe('mock_access_token_123');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
        {
          app_id: 'test_app_id',
          app_secret: 'test_app_secret',
        },
        expect.any(Object)
      );
    });

    it('should cache access token and not refresh if not expired', async () => {
      const mockTokenResponse: FeishuAuthResponse = {
        code: 0,
        msg: 'success',
        tenant_access_token: 'cached_token_456',
        expire: 7200,
      };

      mockedAxios.post = jest.fn().mockResolvedValue({
        data: mockTokenResponse,
      });

      // First call - should make API request
      const token1 = await feishuService.getAccessToken();
      expect(token1).toBe('cached_token_456');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);

      // Second call - should use cached token
      const token2 = await feishuService.getAccessToken();
      expect(token2).toBe('cached_token_456');
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // No additional call
    });

    it('should handle token refresh failure', async () => {
      const mockErrorResponse = {
        code: 99991663,
        msg: 'app_id or app_secret is invalid',
      };

      mockedAxios.post = jest.fn().mockResolvedValue({
        data: mockErrorResponse,
      });

      await expect(feishuService.getAccessToken()).rejects.toThrow(
        '飞书令牌刷新失败: 飞书认证失败: app_id or app_secret is invalid'
      );
    });

    it('should handle network errors during token refresh', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.post = jest.fn().mockRejectedValue(networkError);

      await expect(feishuService.getAccessToken()).rejects.toThrow(
        '飞书令牌刷新失败: Network Error'
      );
    });

    it('should handle incomplete token response', async () => {
      const incompleteResponse = {
        code: 0,
        msg: 'success',
        // Missing tenant_access_token or expire
      };

      mockedAxios.post = jest.fn().mockResolvedValue({
        data: incompleteResponse,
      });

      await expect(feishuService.getAccessToken()).rejects.toThrow(
        '飞书令牌刷新失败: 飞书API返回的令牌信息不完整'
      );
    });

    it('should refresh token when close to expiry', async () => {
      const mockTokenResponse: FeishuAuthResponse = {
        code: 0,
        msg: 'success',
        tenant_access_token: 'expiring_token_789',
        expire: 0.1, // 0.1 second - will expire quickly
      };

      mockedAxios.post = jest.fn().mockResolvedValue({
        data: mockTokenResponse,
      });

      // First call
      const token1 = await feishuService.getAccessToken();
      expect(token1).toBe('expiring_token_789');

      // Wait a bit and call again - should refresh due to expiry
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const refreshedResponse: FeishuAuthResponse = {
        code: 0,
        msg: 'success',
        tenant_access_token: 'new_refreshed_token_999',
        expire: 7200,
      };

      mockedAxios.post = jest.fn().mockResolvedValue({
        data: refreshedResponse,
      });

      const token2 = await feishuService.getAccessToken();
      expect(token2).toBe('new_refreshed_token_999');
    });

    it('should handle concurrent token refresh requests', async () => {
      const mockTokenResponse: FeishuAuthResponse = {
        code: 0,
        msg: 'success',
        tenant_access_token: 'concurrent_token_111',
        expire: 7200,
      };

      let callCount = 0;
      mockedAxios.post = jest.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({ data: mockTokenResponse });
      });

      // Make concurrent requests
      const promises = [
        feishuService.getAccessToken(),
        feishuService.getAccessToken(),
        feishuService.getAccessToken(),
      ];

      const tokens = await Promise.all(promises);

      // All should return the same token
      expect(tokens).toEqual(['concurrent_token_111', 'concurrent_token_111', 'concurrent_token_111']);
      
      // Should only make one API call despite concurrent requests
      expect(callCount).toBe(1);
    });
  });

  describe('Configuration Management', () => {
    it('should return current configuration', () => {
      const config = feishuService.getConfig();
      
      expect(config).toEqual({
        appId: 'test_app_id',
        appToken: 'test_app_token',
        tableId: 'test_table_id',
        baseUrl: 'https://open.feishu.cn',
        timeout: 30000,
        retryAttempts: 3,
      });
      
      // Should not include appSecret for security
      expect(config).not.toHaveProperty('appSecret');
    });

    it('should update configuration and clear cached token', async () => {
      // First, get a token to cache it
      const mockTokenResponse: FeishuAuthResponse = {
        code: 0,
        msg: 'success',
        tenant_access_token: 'original_token',
        expire: 7200,
      };

      mockedAxios.post = jest.fn().mockResolvedValue({
        data: mockTokenResponse,
      });

      await feishuService.getAccessToken();
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);

      // Update config with new appId
      feishuService.updateConfig({
        appId: 'new_app_id',
        timeout: 60000,
      });

      // Verify config was updated
      const newConfig = feishuService.getConfig();
      expect(newConfig.appId).toBe('new_app_id');
      expect(newConfig.timeout).toBe(60000);

      // Next token request should make a new API call (token was cleared)
      const newTokenResponse: FeishuAuthResponse = {
        code: 0,
        msg: 'success',
        tenant_access_token: 'new_token_after_config_update',
        expire: 7200,
      };

      mockedAxios.post = jest.fn().mockResolvedValue({
        data: newTokenResponse,
      });

      const newToken = await feishuService.getAccessToken();
      expect(newToken).toBe('new_token_after_config_update');
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP timeout errors', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded');
      timeoutError.name = 'TimeoutError';
      
      mockedAxios.post = jest.fn().mockRejectedValue(timeoutError);

      await expect(feishuService.getAccessToken()).rejects.toThrow(
        '飞书令牌刷新失败: timeout of 30000ms exceeded'
      );
    });

    it('should handle HTTP status errors', async () => {
      const statusError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { message: 'Server Error' }
        }
      };
      
      mockedAxios.post = jest.fn().mockRejectedValue(statusError);

      await expect(feishuService.getAccessToken()).rejects.toThrow(
        '飞书令牌刷新失败:'
      );
    });

    it('should handle malformed response', async () => {
      // Response without proper structure
      mockedAxios.post = jest.fn().mockResolvedValue({
        data: 'invalid response format'
      });

      await expect(feishuService.getAccessToken()).rejects.toThrow();
    });
  });

  describe('Service Lifecycle', () => {
    it('should properly destroy service instance', () => {
      // This test verifies the destroy method works without errors
      expect(() => feishuService.destroy()).not.toThrow();
      
      // After destruction, these properties should be reset
      const config = feishuService.getConfig();
      expect(config).toBeDefined(); // Config should still be accessible
    });
  });
});