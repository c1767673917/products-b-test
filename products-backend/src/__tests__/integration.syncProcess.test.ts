import { SyncService } from '../services/syncService';
import { FeishuApiService } from '../services/feishuApiService';
import { DataTransformService } from '../services/dataTransformService';
import { ImageService } from '../services/imageService';
import { Product } from '../models/Product';
import { SyncLog } from '../models/SyncLog';

// Mock external dependencies
jest.mock('../services/feishuApiService');
jest.mock('../services/dataTransformService');
jest.mock('../services/imageService');
jest.mock('../models/Product');
jest.mock('../models/SyncLog');

describe('Integration Tests - End-to-End Sync Process', () => {
  let syncService: SyncService;
  let mockFeishuApiService: any;
  let mockDataTransformService: any;
  let mockImageService: any;

  const testProductData = {
    productId: 'rec12345abcd',
    name: '测试产品',
    internalId: '98765',
    sequence: 'SEQ001',
    category: {
      primary: '食品饮料',
      secondary: '休闲零食'
    },
    price: {
      normal: 29.99,
      discount: 25.99
    },
    origin: {
      country: '中国',
      province: '广东省'
    },
    platform: '天猫',
    collectTime: new Date('2025-01-15T10:30:00Z'),
    images: {
      front: ['front_token_1'],
      back: ['back_token_1'],
      label: ['label_token_1']
    }
  };

  const testFeishuRecord = {
    record_id: 'rec12345abcd',
    fields: {
      '产品名称': { text: '测试产品' },
      '价格': { number: 29.99 },
      '平台': { text: '天猫' },
      '正面图片': [{ file_token: 'front_token_1' }],
      '背面图片': [{ file_token: 'back_token_1' }],
      '标签照片': [{ file_token: 'label_token_1' }]
    },
    created_time: '2025-01-15T10:30:00.000Z',
    last_modified_time: '2025-01-15T10:30:00.000Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Feishu API Service
    mockFeishuApiService = {
      getAllRecords: jest.fn(),
      downloadImage: jest.fn(),
      testConnection: jest.fn()
    };
    (FeishuApiService as any).mockImplementation(() => mockFeishuApiService);

    // Mock Data Transform Service
    mockDataTransformService = {
      transformFeishuRecord: jest.fn(),
      detectChanges: jest.fn(),
      validateProduct: jest.fn()
    };
    (DataTransformService as any).mockImplementation(() => mockDataTransformService);

    // Mock Image Service
    mockImageService = {
      downloadFromFeishu: jest.fn(),
      batchDownloadFromFeishu: jest.fn(),
      validateImageIntegrity: jest.fn(),
      repairBrokenImages: jest.fn()
    };
    (ImageService as any).mockImplementation(() => mockImageService);

    // Mock Product model
    (Product.findOne as jest.Mock) = jest.fn();
    (Product.findOneAndUpdate as jest.Mock) = jest.fn();
    (Product.find as jest.Mock) = jest.fn();
    (Product.countDocuments as jest.Mock) = jest.fn();
    (Product.prototype.save as jest.Mock) = jest.fn();

    // Mock SyncLog model
    const mockSyncLogDocument = {
      _id: 'sync-log-id',
      syncId: 'sync_123',
      syncType: 'full',
      status: 'pending',
      save: jest.fn().mockResolvedValue(this),
      markAsCompleted: jest.fn(),
      markAsFailed: jest.fn(),
      updateProgress: jest.fn()
    };
    (SyncLog as any).mockImplementation(() => mockSyncLogDocument);
    (SyncLog.prototype.save as jest.Mock) = jest.fn().mockResolvedValue(mockSyncLogDocument);

    syncService = new SyncService();
  });

  describe('Full Sync Integration', () => {
    it('should complete full sync successfully', async () => {
      // Setup mocks for successful full sync
      mockFeishuApiService.testConnection.mockResolvedValue(true);
      mockFeishuApiService.getAllRecords.mockResolvedValue([testFeishuRecord]);
      
      mockDataTransformService.transformFeishuRecord.mockReturnValue({
        success: true,
        data: testProductData,
        errors: [],
        warnings: []
      });

      mockDataTransformService.validateProduct.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      (Product.findOne as jest.Mock).mockResolvedValue(null); // New product
      (Product.prototype.save as jest.Mock).mockResolvedValue(testProductData);

      mockImageService.batchDownloadFromFeishu.mockResolvedValue({
        totalJobs: 3,
        successful: 3,
        failed: 0,
        results: [
          { success: true, imageId: 'img1' },
          { success: true, imageId: 'img2' },
          { success: true, imageId: 'img3' }
        ],
        errors: []
      });

      // Execute full sync
      const result = await syncService.syncFromFeishu('full');

      // Verify the full sync process
      expect(result.success).toBe(true);
      expect(result.syncId).toBeDefined();
      expect(result.summary?.totalRecords).toBe(1);
      expect(result.summary?.newProducts).toBe(1);
      expect(result.summary?.updatedProducts).toBe(0);
      expect(result.summary?.totalImages).toBe(3);
      expect(result.summary?.successfulImages).toBe(3);

      // Verify service calls
      expect(mockFeishuApiService.testConnection).toHaveBeenCalled();
      expect(mockFeishuApiService.getAllRecords).toHaveBeenCalled();
      expect(mockDataTransformService.transformFeishuRecord).toHaveBeenCalledWith(testFeishuRecord);
      expect(Product.prototype.save).toHaveBeenCalled();
      expect(mockImageService.batchDownloadFromFeishu).toHaveBeenCalled();
    });

    it('should handle partial failures during full sync', async () => {
      // Setup partial failure scenario
      mockFeishuApiService.testConnection.mockResolvedValue(true);
      mockFeishuApiService.getAllRecords.mockResolvedValue([testFeishuRecord]);
      
      mockDataTransformService.transformFeishuRecord.mockReturnValue({
        success: false,
        data: null,
        errors: [{ field: 'name', message: '产品名称缺失', value: null }],
        warnings: []
      });

      // Execute full sync
      const result = await syncService.syncFromFeishu('full');

      // Verify handling of failures
      expect(result.success).toBe(true); // Sync completed but with errors
      expect(result.summary?.totalRecords).toBe(1);
      expect(result.summary?.failedRecords).toBe(1);
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should handle Feishu API connection failures', async () => {
      mockFeishuApiService.testConnection.mockResolvedValue(false);

      await expect(
        syncService.syncFromFeishu('full')
      ).rejects.toThrow('飞书API连接测试失败');

      expect(mockFeishuApiService.getAllRecords).not.toHaveBeenCalled();
    });
  });

  describe('Incremental Sync Integration', () => {
    it('should detect and sync only changed products', async () => {
      const existingProduct = { ...testProductData, name: '旧产品名称' };
      const updatedRecord = {
        ...testFeishuRecord,
        fields: {
          ...testFeishuRecord.fields,
          '产品名称': { text: '新产品名称' }
        }
      };

      // Setup mocks for incremental sync
      mockFeishuApiService.testConnection.mockResolvedValue(true);
      mockFeishuApiService.getAllRecords.mockResolvedValue([updatedRecord]);
      
      mockDataTransformService.transformFeishuRecord.mockReturnValue({
        success: true,
        data: { ...testProductData, name: '新产品名称' },
        errors: [],
        warnings: []
      });

      (Product.findOne as jest.Mock).mockResolvedValue(existingProduct);

      mockDataTransformService.detectChanges.mockReturnValue({
        hasChanges: true,
        changedFields: ['name'],
        changeDetails: [{
          field: 'name',
          oldValue: '旧产品名称',
          newValue: '新产品名称',
          changeType: 'modified'
        }]
      });

      mockDataTransformService.validateProduct.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      (Product.findOneAndUpdate as jest.Mock).mockResolvedValue({
        ...testProductData,
        name: '新产品名称'
      });

      // Execute incremental sync
      const result = await syncService.syncFromFeishu('incremental');

      // Verify incremental sync behavior
      expect(result.success).toBe(true);
      expect(result.summary?.totalRecords).toBe(1);
      expect(result.summary?.updatedProducts).toBe(1);
      expect(result.summary?.newProducts).toBe(0);

      // Verify change detection was called
      expect(mockDataTransformService.detectChanges).toHaveBeenCalled();
      expect(Product.findOneAndUpdate).toHaveBeenCalled();
    });

    it('should skip unchanged products in incremental sync', async () => {
      // Setup mocks for no changes
      mockFeishuApiService.testConnection.mockResolvedValue(true);
      mockFeishuApiService.getAllRecords.mockResolvedValue([testFeishuRecord]);
      
      mockDataTransformService.transformFeishuRecord.mockReturnValue({
        success: true,
        data: testProductData,
        errors: [],
        warnings: []
      });

      (Product.findOne as jest.Mock).mockResolvedValue(testProductData);

      mockDataTransformService.detectChanges.mockReturnValue({
        hasChanges: false,
        changedFields: [],
        changeDetails: []
      });

      // Execute incremental sync
      const result = await syncService.syncFromFeishu('incremental');

      // Verify no updates occurred
      expect(result.success).toBe(true);
      expect(result.summary?.totalRecords).toBe(1);
      expect(result.summary?.skippedRecords).toBe(1);
      expect(result.summary?.updatedProducts).toBe(0);
      expect(result.summary?.newProducts).toBe(0);

      // Verify no database updates
      expect(Product.findOneAndUpdate).not.toHaveBeenCalled();
      expect(Product.prototype.save).not.toHaveBeenCalled();
    });
  });

  describe('Selective Sync Integration', () => {
    it('should sync only specified product IDs', async () => {
      const productIds = ['rec12345abcd'];
      
      // Setup mocks for selective sync
      mockFeishuApiService.testConnection.mockResolvedValue(true);
      mockFeishuApiService.getAllRecords.mockImplementation((options) => {
        // Verify filter is applied
        expect(options.filter).toContain('rec12345abcd');
        return Promise.resolve([testFeishuRecord]);
      });
      
      mockDataTransformService.transformFeishuRecord.mockReturnValue({
        success: true,
        data: testProductData,
        errors: [],
        warnings: []
      });

      mockDataTransformService.validateProduct.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      (Product.findOne as jest.Mock).mockResolvedValue(null);
      (Product.prototype.save as jest.Mock).mockResolvedValue(testProductData);

      // Execute selective sync
      const result = await syncService.syncFromFeishu('selective', { productIds });

      // Verify selective sync behavior
      expect(result.success).toBe(true);
      expect(result.summary?.totalRecords).toBe(1);
      expect(mockFeishuApiService.getAllRecords).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringContaining('rec12345abcd')
        })
      );
    });

    it('should handle empty product ID list in selective sync', async () => {
      await expect(
        syncService.syncFromFeishu('selective', { productIds: [] })
      ).rejects.toThrow('选择性同步需要指定产品ID列表');
    });
  });

  describe('Image Sync Integration', () => {
    it('should download and process images during sync', async () => {
      // Setup mocks for image sync
      mockFeishuApiService.testConnection.mockResolvedValue(true);
      mockFeishuApiService.getAllRecords.mockResolvedValue([testFeishuRecord]);
      
      mockDataTransformService.transformFeishuRecord.mockReturnValue({
        success: true,
        data: testProductData,
        errors: [],
        warnings: []
      });

      mockDataTransformService.validateProduct.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      (Product.findOne as jest.Mock).mockResolvedValue(null);
      (Product.prototype.save as jest.Mock).mockResolvedValue(testProductData);

      // Mock image download with mixed results
      mockImageService.batchDownloadFromFeishu.mockResolvedValue({
        totalJobs: 3,
        successful: 2,
        failed: 1,
        results: [
          { success: true, imageId: 'img1', fileToken: 'front_token_1' },
          { success: true, imageId: 'img2', fileToken: 'back_token_1' },
          { success: false, error: 'Download failed', fileToken: 'label_token_1' }
        ],
        errors: ['Failed to download label_token_1: Download failed']
      });

      // Execute sync with images
      const result = await syncService.syncFromFeishu('full');

      // Verify image processing
      expect(result.success).toBe(true);
      expect(result.summary?.totalImages).toBe(3);
      expect(result.summary?.successfulImages).toBe(2);
      expect(result.summary?.failedImages).toBe(1);
      expect(result.warnings?.some(w => w.includes('图片下载失败'))).toBe(true);

      // Verify batch download was called with correct parameters
      expect(mockImageService.batchDownloadFromFeishu).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ 
            fileToken: 'front_token_1',
            productId: 'rec12345abcd',
            imageType: 'front'
          }),
          expect.objectContaining({ 
            fileToken: 'back_token_1',
            productId: 'rec12345abcd',
            imageType: 'back'
          }),
          expect.objectContaining({ 
            fileToken: 'label_token_1',
            productId: 'rec12345abcd',
            imageType: 'label'
          })
        ]),
        expect.any(Number) // concurrency limit
      );
    });

    it('should continue sync even if image downloads fail', async () => {
      // Setup mocks with total image download failure
      mockFeishuApiService.testConnection.mockResolvedValue(true);
      mockFeishuApiService.getAllRecords.mockResolvedValue([testFeishuRecord]);
      
      mockDataTransformService.transformFeishuRecord.mockReturnValue({
        success: true,
        data: testProductData,
        errors: [],
        warnings: []
      });

      mockDataTransformService.validateProduct.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      (Product.findOne as jest.Mock).mockResolvedValue(null);
      (Product.prototype.save as jest.Mock).mockResolvedValue(testProductData);

      // Mock complete image download failure
      mockImageService.batchDownloadFromFeishu.mockResolvedValue({
        totalJobs: 3,
        successful: 0,
        failed: 3,
        results: [],
        errors: ['Network timeout', 'File not found', 'Permission denied']
      });

      // Execute sync
      const result = await syncService.syncFromFeishu('full');

      // Verify sync completed despite image failures
      expect(result.success).toBe(true);
      expect(result.summary?.newProducts).toBe(1);
      expect(result.summary?.totalImages).toBe(3);
      expect(result.summary?.failedImages).toBe(3);
      expect(result.warnings?.length).toBeGreaterThan(0);
    });
  });

  describe('Sync Progress and Status', () => {
    it('should track sync progress throughout the process', async () => {
      const mockSyncLogInstance = {
        _id: 'sync-log-id',
        syncId: 'sync_123',
        updateProgress: jest.fn(),
        save: jest.fn().mockResolvedValue(this),
        markAsCompleted: jest.fn(),
        markAsFailed: jest.fn()
      };

      (SyncLog as any).mockImplementation(() => mockSyncLogInstance);

      // Setup successful sync
      mockFeishuApiService.testConnection.mockResolvedValue(true);
      mockFeishuApiService.getAllRecords.mockResolvedValue([testFeishuRecord]);
      
      mockDataTransformService.transformFeishuRecord.mockReturnValue({
        success: true,
        data: testProductData,
        errors: [],
        warnings: []
      });

      (Product.findOne as jest.Mock).mockResolvedValue(null);

      const result = await syncService.syncFromFeishu('full');

      // Verify progress tracking
      expect(mockSyncLogInstance.updateProgress).toHaveBeenCalledWith('initializing', expect.any(Object));
      expect(mockSyncLogInstance.updateProgress).toHaveBeenCalledWith('fetching_data', expect.any(Object));
      expect(mockSyncLogInstance.updateProgress).toHaveBeenCalledWith('processing_records', expect.any(Object));
      expect(mockSyncLogInstance.markAsCompleted).toHaveBeenCalled();
    });

    it('should handle sync cancellation', async () => {
      // Setup long-running sync
      mockFeishuApiService.testConnection.mockResolvedValue(true);
      mockFeishuApiService.getAllRecords.mockImplementation(async () => {
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return [testFeishuRecord];
      });

      // Start sync
      const syncPromise = syncService.syncFromFeishu('full');

      // Cancel after a short delay
      setTimeout(() => {
        syncService.cancelSync('sync_123');
      }, 50);

      const result = await syncPromise;

      // Verify cancellation was handled
      expect(result.success).toBe(false);
      expect(result.error).toContain('同步已被取消');
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should retry failed operations', async () => {
      // Setup with initial failures then success
      mockFeishuApiService.testConnection.mockResolvedValue(true);
      mockFeishuApiService.getAllRecords
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce([testFeishuRecord]);
      
      mockDataTransformService.transformFeishuRecord.mockReturnValue({
        success: true,
        data: testProductData,
        errors: [],
        warnings: []
      });

      (Product.findOne as jest.Mock).mockResolvedValue(null);

      // Execute sync with retry logic
      const result = await syncService.syncFromFeishu('full');

      // Verify retry behavior
      expect(mockFeishuApiService.getAllRecords).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
      expect(result.warnings?.some(w => w.includes('重试'))).toBe(true);
    });

    it('should fail after maximum retries', async () => {
      // Setup persistent failures
      mockFeishuApiService.testConnection.mockResolvedValue(true);
      mockFeishuApiService.getAllRecords.mockRejectedValue(new Error('Persistent error'));

      // Execute sync
      await expect(
        syncService.syncFromFeishu('full')
      ).rejects.toThrow('Persistent error');

      // Verify maximum retries were attempted
      expect(mockFeishuApiService.getAllRecords).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should handle database connection issues', async () => {
      // Setup successful API calls but database issues
      mockFeishuApiService.testConnection.mockResolvedValue(true);
      mockFeishuApiService.getAllRecords.mockResolvedValue([testFeishuRecord]);
      
      mockDataTransformService.transformFeishuRecord.mockReturnValue({
        success: true,
        data: testProductData,
        errors: [],
        warnings: []
      });

      (Product.findOne as jest.Mock).mockRejectedValue(new Error('Database connection lost'));

      // Execute sync
      const result = await syncService.syncFromFeishu('full');

      // Verify database errors are handled gracefully
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection lost');
    });
  });
});