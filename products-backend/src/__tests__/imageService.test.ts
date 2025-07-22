import { ImageService } from '../services/imageService';
import { Image } from '../models/Image';
import { getFeishuApiService } from '../services/feishuApiService';
import sharp from 'sharp';
import crypto from 'crypto';

// Mock dependencies
jest.mock('../models/Image');
jest.mock('../services/feishuApiService');
jest.mock('sharp');
jest.mock('minio');
jest.mock('crypto');

describe('ImageService - Image Management', () => {
  let imageService: ImageService;
  let mockMinioClient: any;
  let mockFeishuApiService: any;

  // Test data
  const testProductId = 'rec12345abcd';
  const testImageType = 'front';
  const testFilename = 'test-image.jpg';
  const testBuffer = Buffer.from('test image data');
  const testMd5Hash = 'test-md5-hash';
  const testSha256Hash = 'test-sha256-hash';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock crypto
    const mockMd5Hash = { update: jest.fn().mockReturnThis(), digest: jest.fn().mockReturnValue(testMd5Hash) };
    const mockSha256Hash = { update: jest.fn().mockReturnThis(), digest: jest.fn().mockReturnValue(testSha256Hash) };
    (crypto.createHash as jest.Mock)
      .mockImplementation((algorithm: string) => {
        if (algorithm === 'md5') return mockMd5Hash;
        if (algorithm === 'sha256') return mockSha256Hash;
        return mockMd5Hash;
      });

    // Mock sharp
    const mockSharp = {
      metadata: jest.fn().mockResolvedValue({
        format: 'jpeg',
        width: 800,
        height: 600,
        size: 102400
      }),
      resize: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(testBuffer)
    };
    (sharp as any).mockImplementation(() => mockSharp);

    // Mock MinIO client
    mockMinioClient = {
      putObject: jest.fn().mockResolvedValue({ etag: 'test-etag', versionId: 'test-version' }),
      statObject: jest.fn().mockResolvedValue({
        size: 102400,
        etag: 'test-etag',
        lastModified: new Date()
      }),
      getObject: jest.fn().mockResolvedValue({
        pipe: jest.fn(),
        on: jest.fn()
      }),
      removeObject: jest.fn().mockResolvedValue(undefined),
      bucketExists: jest.fn().mockResolvedValue(true)
    };

    // Mock Image model
    const mockImageDocument = {
      _id: 'mock-image-id',
      imageId: 'img_test123',
      productId: testProductId,
      type: testImageType,
      filename: testFilename,
      objectName: 'products/rec12345abcd/front_0.jpg',
      url: 'http://localhost:9000/products/products/rec12345abcd/front_0.jpg',
      size: 102400,
      mimeType: 'image/jpeg',
      md5Hash: testMd5Hash,
      sha256Hash: testSha256Hash,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn().mockResolvedValue(this)
    };

    (Image.findOne as jest.Mock) = jest.fn();
    (Image.find as jest.Mock) = jest.fn();
    (Image.findByIdAndUpdate as jest.Mock) = jest.fn();
    (Image.findByIdAndDelete as jest.Mock) = jest.fn();
    (Image.prototype.save as jest.Mock) = jest.fn().mockResolvedValue(mockImageDocument);
    (Image as any).mockImplementation(() => mockImageDocument);

    // Mock Feishu API service
    mockFeishuApiService = {
      downloadImage: jest.fn().mockResolvedValue(testBuffer)
    };
    (getFeishuApiService as jest.Mock).mockReturnValue(mockFeishuApiService);

    // Create ImageService instance
    imageService = new ImageService();
    (imageService as any).minioClient = mockMinioClient;
  });

  describe('Upload Image Operations', () => {
    it('should upload new image successfully', async () => {
      // Mock no existing image
      (Image.findOne as jest.Mock).mockResolvedValue(null);

      const result = await imageService.uploadImage(testBuffer, testFilename, testProductId, testImageType);

      expect(crypto.createHash).toHaveBeenCalledWith('md5');
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(sharp).toHaveBeenCalledWith(testBuffer);
      expect(mockMinioClient.putObject).toHaveBeenCalled();
      expect(Image.prototype.save).toHaveBeenCalled();
    });

    it('should reuse existing image with same hash', async () => {
      const existingImage = {
        _id: 'existing-id',
        imageId: 'img_existing123',
        productId: testProductId,
        type: testImageType,
        md5Hash: testMd5Hash
      };
      (Image.findOne as jest.Mock).mockResolvedValue(existingImage);

      const result = await imageService.uploadImage(testBuffer, testFilename, testProductId, testImageType);

      expect(result).toEqual(existingImage);
      expect(mockMinioClient.putObject).not.toHaveBeenCalled();
      expect(Image.prototype.save).not.toHaveBeenCalled();
    });

    it('should reject invalid image type', async () => {
      await expect(
        imageService.uploadImage(testBuffer, testFilename, testProductId, 'invalid-type')
      ).rejects.toThrow('不支持的图片类型: invalid-type');
    });

    it('should handle upload errors gracefully', async () => {
      (Image.findOne as jest.Mock).mockResolvedValue(null);
      mockMinioClient.putObject.mockRejectedValue(new Error('MinIO upload failed'));

      await expect(
        imageService.uploadImage(testBuffer, testFilename, testProductId, testImageType)
      ).rejects.toThrow('MinIO upload failed');
    });

    it('should generate thumbnails during upload', async () => {
      (Image.findOne as jest.Mock).mockResolvedValue(null);
      
      await imageService.uploadImage(testBuffer, testFilename, testProductId, testImageType);

      // Verify thumbnail generation calls
      expect(sharp).toHaveBeenCalledWith(testBuffer);
      expect(mockMinioClient.putObject).toHaveBeenCalled();
    });
  });

  describe('Feishu Image Download', () => {
    it('should download image from Feishu successfully', async () => {
      const fileToken = 'test-file-token';
      (Image.findOne as jest.Mock).mockResolvedValue(null);

      const result = await imageService.downloadFromFeishu(fileToken, testProductId, testImageType);

      expect(mockFeishuApiService.downloadImage).toHaveBeenCalledWith(fileToken);
      expect(mockMinioClient.putObject).toHaveBeenCalled();
      expect(Image.prototype.save).toHaveBeenCalled();
    });

    it('should skip download if image already exists', async () => {
      const fileToken = 'test-file-token';
      const existingImage = {
        _id: 'existing-id',
        imageId: 'img_existing123',
        fileToken: fileToken
      };
      (Image.findOne as jest.Mock).mockResolvedValue(existingImage);

      const result = await imageService.downloadFromFeishu(fileToken, testProductId, testImageType);

      expect(result).toEqual(existingImage);
      expect(mockFeishuApiService.downloadImage).not.toHaveBeenCalled();
      expect(mockMinioClient.putObject).not.toHaveBeenCalled();
    });

    it('should handle Feishu download errors', async () => {
      const fileToken = 'test-file-token';
      (Image.findOne as jest.Mock).mockResolvedValue(null);
      mockFeishuApiService.downloadImage.mockRejectedValue(new Error('Feishu API error'));

      await expect(
        imageService.downloadFromFeishu(fileToken, testProductId, testImageType)
      ).rejects.toThrow('Feishu API error');
    });

    it('should validate downloaded image format', async () => {
      const fileToken = 'test-file-token';
      (Image.findOne as jest.Mock).mockResolvedValue(null);
      
      // Mock invalid image data
      const mockSharpMetadata = sharp as any;
      mockSharpMetadata.mockImplementation(() => ({
        metadata: jest.fn().mockRejectedValue(new Error('Invalid image format'))
      }));

      await expect(
        imageService.downloadFromFeishu(fileToken, testProductId, testImageType)
      ).rejects.toThrow();
    });
  });

  describe('Batch Image Download', () => {
    it('should download multiple images with concurrency control', async () => {
      const downloadJobs = [
        { fileToken: 'token1', productId: 'rec1', imageType: 'front' },
        { fileToken: 'token2', productId: 'rec2', imageType: 'back' },
        { fileToken: 'token3', productId: 'rec3', imageType: 'label' }
      ];

      (Image.findOne as jest.Mock).mockResolvedValue(null);

      const result = await imageService.batchDownloadFromFeishu(downloadJobs, 2);

      expect(result.totalJobs).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockFeishuApiService.downloadImage).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in batch download', async () => {
      const downloadJobs = [
        { fileToken: 'token1', productId: 'rec1', imageType: 'front' },
        { fileToken: 'token2', productId: 'rec2', imageType: 'back' },
        { fileToken: 'token3', productId: 'rec3', imageType: 'label' }
      ];

      (Image.findOne as jest.Mock).mockResolvedValue(null);
      
      // Mock one failure
      mockFeishuApiService.downloadImage
        .mockResolvedValueOnce(testBuffer)
        .mockRejectedValueOnce(new Error('Download failed'))
        .mockResolvedValueOnce(testBuffer);

      const result = await imageService.batchDownloadFromFeishu(downloadJobs, 2);

      expect(result.totalJobs).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('token2');
    });

    it('should respect concurrency limit', async () => {
      const downloadJobs = Array.from({ length: 10 }, (_, i) => ({
        fileToken: `token${i}`,
        productId: `rec${i}`,
        imageType: 'front'
      }));

      (Image.findOne as jest.Mock).mockResolvedValue(null);

      // Track concurrent executions
      let concurrentCount = 0;
      let maxConcurrent = 0;
      
      mockFeishuApiService.downloadImage.mockImplementation(async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate processing time
        concurrentCount--;
        return testBuffer;
      });

      await imageService.batchDownloadFromFeishu(downloadJobs, 3);

      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });
  });

  describe('Image Validation and Integrity', () => {
    it('should validate image integrity successfully', async () => {
      const objectName = 'products/rec12345/front_0.jpg';
      
      mockMinioClient.statObject.mockResolvedValue({
        size: 102400,
        etag: 'test-etag'
      });

      const mockStream = {
        pipe: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'end') setTimeout(callback, 10);
          if (event === 'error') return;
          if (event === 'data') setTimeout(() => callback(testBuffer), 5);
        })
      };
      mockMinioClient.getObject.mockResolvedValue(mockStream);

      const result = await imageService.validateImageIntegrity(objectName);

      expect(result.isValid).toBe(true);
      expect(result.exists).toBe(true);
      expect(result.isImage).toBe(true);
      expect(result.size).toBe(102400);
      expect(mockMinioClient.statObject).toHaveBeenCalledWith('products', objectName);
    });

    it('should detect missing images', async () => {
      const objectName = 'products/rec12345/missing_0.jpg';
      
      mockMinioClient.statObject.mockRejectedValue(new Error('Object not found'));

      const result = await imageService.validateImageIntegrity(objectName);

      expect(result.isValid).toBe(false);
      expect(result.exists).toBe(false);
      expect(result.error).toContain('Object not found');
    });

    it('should detect corrupted images', async () => {
      const objectName = 'products/rec12345/corrupted_0.jpg';
      
      mockMinioClient.statObject.mockResolvedValue({
        size: 102400,
        etag: 'test-etag'
      });

      const mockStream = {
        pipe: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'end') setTimeout(callback, 10);
          if (event === 'error') return;
          if (event === 'data') setTimeout(() => callback(Buffer.from('corrupted data')), 5);
        })
      };
      mockMinioClient.getObject.mockResolvedValue(mockStream);

      // Mock sharp to fail on corrupted data
      const mockSharpCorrupted = {
        metadata: jest.fn().mockRejectedValue(new Error('Invalid image data'))
      };
      (sharp as any).mockImplementation(() => mockSharpCorrupted);

      const result = await imageService.validateImageIntegrity(objectName);

      expect(result.isValid).toBe(false);
      expect(result.exists).toBe(true);
      expect(result.isImage).toBe(false);
      expect(result.error).toContain('Invalid image data');
    });
  });

  describe('Image Repair Operations', () => {
    it('should repair broken images successfully', async () => {
      const brokenImages = [
        {
          _id: 'img1',
          objectName: 'products/rec1/front_0.jpg',
          fileToken: 'token1',
          productId: 'rec1',
          type: 'front',
          status: 'active'
        },
        {
          _id: 'img2', 
          objectName: 'products/rec2/back_0.jpg',
          fileToken: 'token2',
          productId: 'rec2',
          type: 'back',
          status: 'active'
        }
      ];

      (Image.find as jest.Mock).mockResolvedValue(brokenImages);
      
      // Mock first image as broken, second as valid
      mockMinioClient.statObject
        .mockRejectedValueOnce(new Error('Object not found'))
        .mockResolvedValueOnce({ size: 102400 });

      const mockStream = {
        pipe: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'end') setTimeout(callback, 10);
          if (event === 'data') setTimeout(() => callback(testBuffer), 5);
        })
      };
      mockMinioClient.getObject.mockResolvedValue(mockStream);

      const result = await imageService.repairBrokenImages();

      expect(result.totalChecked).toBe(2);
      expect(result.brokenFound).toBe(1);
      expect(result.repaired).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockFeishuApiService.downloadImage).toHaveBeenCalledWith('token1');
    });

    it('should handle repair failures gracefully', async () => {
      const brokenImages = [
        {
          _id: 'img1',
          objectName: 'products/rec1/front_0.jpg',
          fileToken: 'token1',
          productId: 'rec1',
          type: 'front',
          status: 'active'
        }
      ];

      (Image.find as jest.Mock).mockResolvedValue(brokenImages);
      mockMinioClient.statObject.mockRejectedValue(new Error('Object not found'));
      mockFeishuApiService.downloadImage.mockRejectedValue(new Error('Feishu API failed'));

      const result = await imageService.repairBrokenImages();

      expect(result.totalChecked).toBe(1);
      expect(result.brokenFound).toBe(1);
      expect(result.repaired).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('token1');
    });

    it('should skip images without fileToken', async () => {
      const brokenImages = [
        {
          _id: 'img1',
          objectName: 'products/rec1/front_0.jpg',
          fileToken: null, // No token for repair
          productId: 'rec1',
          type: 'front',
          status: 'active'
        }
      ];

      (Image.find as jest.Mock).mockResolvedValue(brokenImages);
      mockMinioClient.statObject.mockRejectedValue(new Error('Object not found'));

      const result = await imageService.repairBrokenImages();

      expect(result.totalChecked).toBe(1);
      expect(result.brokenFound).toBe(1);
      expect(result.repaired).toBe(0);
      expect(result.failed).toBe(1);
      expect(mockFeishuApiService.downloadImage).not.toHaveBeenCalled();
    });
  });

  describe('Image Retrieval and Management', () => {
    it('should get product images successfully', async () => {
      const productImages = [
        { _id: 'img1', type: 'front', status: 'active' },
        { _id: 'img2', type: 'back', status: 'active' },
        { _id: 'img3', type: 'label', status: 'inactive' }
      ];

      (Image.find as jest.Mock).mockResolvedValue(productImages);

      const result = await imageService.getProductImages(testProductId);

      expect(Image.find).toHaveBeenCalledWith({ 
        productId: testProductId, 
        status: 'active' 
      });
      expect(result).toHaveLength(2); // Only active images
    });

    it('should get image info by ID', async () => {
      const imageInfo = {
        _id: 'img1',
        imageId: 'img_test123',
        productId: testProductId,
        type: testImageType,
        status: 'active'
      };

      (Image.findOne as jest.Mock).mockResolvedValue(imageInfo);

      const result = await imageService.getImageInfo('img_test123');

      expect(Image.findOne).toHaveBeenCalledWith({ 
        imageId: 'img_test123', 
        status: 'active' 
      });
      expect(result).toEqual(imageInfo);
    });

    it('should delete image successfully', async () => {
      const imageToDelete = {
        _id: 'img1',
        objectName: 'products/rec1/front_0.jpg',
        status: 'active'
      };

      (Image.findOne as jest.Mock).mockResolvedValue(imageToDelete);
      (Image.findByIdAndUpdate as jest.Mock).mockResolvedValue({
        ...imageToDelete,
        status: 'deleted'
      });

      const result = await imageService.deleteImage('img_test123');

      expect(Image.findByIdAndUpdate).toHaveBeenCalledWith(
        'img1',
        { status: 'deleted', deletedAt: expect.any(Date) },
        { new: true }
      );
      expect(mockMinioClient.removeObject).toHaveBeenCalledWith('products', 'products/rec1/front_0.jpg');
      expect(result).toBe(true);
    });

    it('should handle delete errors gracefully', async () => {
      (Image.findOne as jest.Mock).mockResolvedValue(null);

      const result = await imageService.deleteImage('nonexistent');

      expect(result).toBe(false);
      expect(mockMinioClient.removeObject).not.toHaveBeenCalled();
    });
  });

  describe('Health Check and Connection', () => {
    it('should perform health check successfully', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);

      const result = await imageService.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.bucketExists).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should detect bucket issues', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);

      const result = await imageService.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.bucketExists).toBe(false);
    });

    it('should handle connection errors', async () => {
      mockMinioClient.bucketExists.mockRejectedValue(new Error('Connection failed'));

      const result = await imageService.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toContain('Connection failed');
    });

    it('should check connection status', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);

      const result = await imageService.checkConnection();

      expect(result).toBe(true);
      expect(mockMinioClient.bucketExists).toHaveBeenCalled();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle concurrent uploads efficiently', async () => {
      (Image.findOne as jest.Mock).mockResolvedValue(null);

      const uploadPromises = Array.from({ length: 5 }, (_, i) => 
        imageService.uploadImage(
          testBuffer, 
          `test-${i}.jpg`, 
          `rec${i}`, 
          testImageType
        )
      );

      const startTime = Date.now();
      const results = await Promise.all(uploadPromises);
      const endTime = Date.now();

      expect(results).toHaveLength(5);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(mockMinioClient.putObject).toHaveBeenCalledTimes(5);
    });

    it('should handle large file uploads', async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB file
      (Image.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        imageService.uploadImage(largeBuffer, 'large-image.jpg', testProductId, testImageType)
      ).resolves.toBeDefined();
    });

    it('should handle empty or null buffers', async () => {
      await expect(
        imageService.uploadImage(Buffer.alloc(0), testFilename, testProductId, testImageType)
      ).rejects.toThrow();

      await expect(
        imageService.uploadImage(null as any, testFilename, testProductId, testImageType)
      ).rejects.toThrow();
    });

    it('should validate image dimensions', async () => {
      (Image.findOne as jest.Mock).mockResolvedValue(null);

      // Mock very large image
      const mockSharpLarge = {
        metadata: jest.fn().mockResolvedValue({
          format: 'jpeg',
          width: 10000,
          height: 10000,
          size: 100 * 1024 * 1024
        }),
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(testBuffer)
      };
      (sharp as any).mockImplementation(() => mockSharpLarge);

      // Should still process but may generate warnings
      const result = await imageService.uploadImage(testBuffer, testFilename, testProductId, testImageType);
      expect(result).toBeDefined();
    });
  });
});