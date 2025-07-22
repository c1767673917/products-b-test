import axios from 'axios';
import { FeishuApiService, FeishuConfig, FeishuTableResponse, FeishuFieldsResponse, FeishuField, FeishuRecord } from '../services/feishuApiService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FeishuApiService - Data Fetching', () => {
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
    
    // Mock successful token refresh for all tests
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

  describe('Table Fields Fetching', () => {
    const mockFields: FeishuField[] = [
      {
        field_id: 'field_001',
        field_name: '产品编号',
        type: 1, // 文本类型
      },
      {
        field_id: 'field_002',
        field_name: '产品名称',
        type: 1,
      },
      {
        field_id: 'field_003',
        field_name: '价格',
        type: 2, // 数字类型
      },
      {
        field_id: 'field_004',
        field_name: '正面图片',
        type: 17, // 附件类型
      },
    ];

    it('should successfully fetch table fields', async () => {
      const mockResponse: FeishuFieldsResponse = {
        code: 0,
        msg: 'success',
        data: {
          items: mockFields,
        },
      };

      mockAxiosInstance.get = jest.fn().mockResolvedValue({
        data: mockResponse,
      });

      const fields = await feishuService.getTableFields();

      expect(fields).toEqual(mockFields);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/open-apis/bitable/v1/apps/test_app_token/tables/test_table_id/fields`
      );
    });

    it('should handle empty fields response', async () => {
      const mockResponse: FeishuFieldsResponse = {
        code: 0,
        msg: 'success',
        data: {
          items: [],
        },
      };

      mockAxiosInstance.get = jest.fn().mockResolvedValue({
        data: mockResponse,
      });

      const fields = await feishuService.getTableFields();

      expect(fields).toEqual([]);
    });

    it('should handle fields API error response', async () => {
      const mockErrorResponse: FeishuFieldsResponse = {
        code: 99991400,
        msg: 'invalid app_token',
      };

      mockAxiosInstance.get = jest.fn().mockResolvedValue({
        data: mockErrorResponse,
      });

      await expect(feishuService.getTableFields()).rejects.toThrow(
        '获取表格字段失败: 获取字段失败: invalid app_token'
      );
    });

    it('should handle network errors when fetching fields', async () => {
      const networkError = new Error('Network Error');
      mockAxiosInstance.get = jest.fn().mockRejectedValue(networkError);

      await expect(feishuService.getTableFields()).rejects.toThrow(
        '获取表格字段失败: Network Error'
      );
    });
  });

  describe('Table Records Fetching', () => {
    const mockRecords: FeishuRecord[] = [
      {
        record_id: 'rec_001',
        fields: {
          'field_001': '20250708-001',
          'field_002': '测试产品1',
          'field_003': 99.99,
          'field_004': [{ file_token: 'file_token_001' }],
        },
      },
      {
        record_id: 'rec_002',
        fields: {
          'field_001': '20250708-002',
          'field_002': '测试产品2',
          'field_003': 199.99,
          'field_004': [{ file_token: 'file_token_002' }],
        },
      },
    ];

    it('should successfully fetch table records with default options', async () => {
      const mockResponse: FeishuTableResponse = {
        code: 0,
        msg: 'success',
        data: {
          items: mockRecords,
          total: 2,
          has_more: false,
        },
      };

      mockAxiosInstance.get = jest.fn().mockResolvedValue({
        data: mockResponse,
      });

      const result = await feishuService.getTableRecords();

      expect(result.records).toEqual(mockRecords);
      expect(result.hasMore).toBe(false);
      expect(result.pageToken).toBeUndefined();
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/open-apis/bitable/v1/apps/test_app_token/tables/test_table_id/records`,
        {
          params: {
            page_size: 500,
          },
        }
      );
    });

    it('should fetch records with custom options', async () => {
      const mockResponse: FeishuTableResponse = {
        code: 0,
        msg: 'success',
        data: {
          items: mockRecords.slice(0, 1),
          total: 2,
          has_more: true,
          page_token: 'next_page_token',
        },
      };

      mockAxiosInstance.get = jest.fn().mockResolvedValue({
        data: mockResponse,
      });

      const options = {
        pageSize: 1,
        pageToken: 'current_page_token',
        filter: 'CurrentValue.[字段名]="test"',
        sort: ['field_001 asc'],
        fieldNames: ['field_001', 'field_002'],
      };

      const result = await feishuService.getTableRecords(options);

      expect(result.records).toEqual(mockRecords.slice(0, 1));
      expect(result.hasMore).toBe(true);
      expect(result.pageToken).toBe('next_page_token');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/open-apis/bitable/v1/apps/test_app_token/tables/test_table_id/records`,
        {
          params: {
            page_size: 1,
            page_token: 'current_page_token',
            filter: 'CurrentValue.[字段名]="test"',
            sort: JSON.stringify(['field_001 asc']),
            field_names: JSON.stringify(['field_001', 'field_002']),
          },
        }
      );
    });

    it('should handle empty records response', async () => {
      const mockResponse: FeishuTableResponse = {
        code: 0,
        msg: 'success',
        data: {
          items: [],
          total: 0,
          has_more: false,
        },
      };

      mockAxiosInstance.get = jest.fn().mockResolvedValue({
        data: mockResponse,
      });

      const result = await feishuService.getTableRecords();

      expect(result.records).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it('should handle records API error response', async () => {
      const mockErrorResponse: FeishuTableResponse = {
        code: 99991400,
        msg: 'invalid table_id',
      };

      mockAxiosInstance.get = jest.fn().mockResolvedValue({
        data: mockErrorResponse,
      });

      await expect(feishuService.getTableRecords()).rejects.toThrow(
        '获取表格记录失败: 获取记录失败: invalid table_id'
      );
    });
  });

  describe('Batch Records Fetching', () => {
    it('should fetch all records across multiple pages', async () => {
      const page1Records: FeishuRecord[] = [
        { record_id: 'rec_001', fields: { name: 'Product 1' } },
        { record_id: 'rec_002', fields: { name: 'Product 2' } },
      ];
      
      const page2Records: FeishuRecord[] = [
        { record_id: 'rec_003', fields: { name: 'Product 3' } },
      ];

      // First page response
      const page1Response: FeishuTableResponse = {
        code: 0,
        msg: 'success',
        data: {
          items: page1Records,
          has_more: true,
          page_token: 'page_2_token',
        },
      };

      // Second page response
      const page2Response: FeishuTableResponse = {
        code: 0,
        msg: 'success',
        data: {
          items: page2Records,
          has_more: false,
        },
      };

      mockAxiosInstance.get = jest.fn()
        .mockResolvedValueOnce({ data: page1Response })
        .mockResolvedValueOnce({ data: page2Response });

      const allRecords = await feishuService.getAllRecords({ pageSize: 2 });

      expect(allRecords).toEqual([...page1Records, ...page2Records]);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      
      // Check first call
      expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(1,
        `/open-apis/bitable/v1/apps/test_app_token/tables/test_table_id/records`,
        { params: { page_size: 2 } }
      );
      
      // Check second call with page token
      expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(2,
        `/open-apis/bitable/v1/apps/test_app_token/tables/test_table_id/records`,
        { params: { page_size: 2, page_token: 'page_2_token' } }
      );
    });

    it('should handle single page when fetching all records', async () => {
      const singlePageRecords: FeishuRecord[] = [
        { record_id: 'rec_001', fields: { name: 'Product 1' } },
      ];

      const response: FeishuTableResponse = {
        code: 0,
        msg: 'success',
        data: {
          items: singlePageRecords,
          has_more: false,
        },
      };

      mockAxiosInstance.get = jest.fn().mockResolvedValue({ data: response });

      const allRecords = await feishuService.getAllRecords();

      expect(allRecords).toEqual(singlePageRecords);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    it('should handle errors during batch fetching', async () => {
      const page1Response: FeishuTableResponse = {
        code: 0,
        msg: 'success',
        data: {
          items: [{ record_id: 'rec_001', fields: { name: 'Product 1' } }],
          has_more: true,
          page_token: 'page_2_token',
        },
      };

      const networkError = new Error('Network timeout');

      mockAxiosInstance.get = jest.fn()
        .mockResolvedValueOnce({ data: page1Response })
        .mockRejectedValueOnce(networkError);

      await expect(feishuService.getAllRecords()).rejects.toThrow(
        '批量获取记录失败: 获取表格记录失败: Network timeout'
      );

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Connection Testing', () => {
    it('should successfully test API connection', async () => {
      // Mock successful field fetching
      const mockFieldsResponse: FeishuFieldsResponse = {
        code: 0,
        msg: 'success',
        data: {
          items: [
            { field_id: 'field_001', field_name: '测试字段', type: 1 },
          ],
        },
      };

      // Mock successful record fetching
      const mockRecordsResponse: FeishuTableResponse = {
        code: 0,
        msg: 'success',
        data: {
          items: [
            { record_id: 'rec_001', fields: { test: 'value' } },
          ],
          has_more: false,
        },
      };

      mockAxiosInstance.get = jest.fn()
        .mockResolvedValueOnce({ data: mockFieldsResponse })
        .mockResolvedValueOnce({ data: mockRecordsResponse });

      const result = await feishuService.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toBe('飞书API连接测试成功');
      expect(result.details?.fieldsCount).toBe(1);
      expect(result.details?.hasRecords).toBe(true);
    });

    it('should handle connection test failure when no fields returned', async () => {
      const mockFieldsResponse: FeishuFieldsResponse = {
        code: 0,
        msg: 'success',
        data: {
          items: [],
        },
      };

      mockAxiosInstance.get = jest.fn().mockResolvedValue({ data: mockFieldsResponse });

      const result = await feishuService.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('无法获取表格字段信息');
    });

    it('should handle connection test failure on API errors', async () => {
      const apiError = new Error('API Error');
      mockAxiosInstance.get = jest.fn().mockRejectedValue(apiError);

      const result = await feishuService.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('飞书API连接测试失败: 获取表格字段失败: API Error');
    });
  });

  describe('Rate Limiting and Delays', () => {
    it('should add delay between batch requests in getAllRecords', async () => {
      const page1Response: FeishuTableResponse = {
        code: 0,
        msg: 'success',
        data: {
          items: [{ record_id: 'rec_001', fields: {} }],
          has_more: true,
          page_token: 'page_2_token',
        },
      };

      const page2Response: FeishuTableResponse = {
        code: 0,
        msg: 'success',
        data: {
          items: [{ record_id: 'rec_002', fields: {} }],
          has_more: false,
        },
      };

      mockAxiosInstance.get = jest.fn()
        .mockResolvedValueOnce({ data: page1Response })
        .mockResolvedValueOnce({ data: page2Response });

      const startTime = Date.now();
      await feishuService.getAllRecords();
      const endTime = Date.now();

      // Should have taken at least 200ms due to the delay
      expect(endTime - startTime).toBeGreaterThanOrEqual(190); // Allow some margin for test timing
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Response Validation', () => {
    it('should handle malformed API response structure', async () => {
      // Response missing expected data structure
      const malformedResponse = {
        some_other_field: 'unexpected_value',
      };

      mockAxiosInstance.get = jest.fn().mockResolvedValue({
        data: malformedResponse,
      });

      await expect(feishuService.getTableFields()).rejects.toThrow();
    });

    it('should handle null/undefined response data', async () => {
      mockAxiosInstance.get = jest.fn().mockResolvedValue({
        data: null,
      });

      await expect(feishuService.getTableFields()).rejects.toThrow();
    });
  });
});