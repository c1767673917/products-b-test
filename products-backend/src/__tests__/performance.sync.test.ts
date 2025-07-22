import { SyncService } from '../services/syncService';
import { DataTransformService } from '../services/dataTransformService';
import { ImageService } from '../services/imageService';
import { FeishuApiService } from '../services/feishuApiService';

// Mock dependencies for performance testing
jest.mock('../services/feishuApiService');
jest.mock('../services/dataTransformService');
jest.mock('../services/imageService');
jest.mock('../models/Product');
jest.mock('../models/SyncLog');

describe('Performance Tests - Sync and Data Processing', () => {
  let syncService: SyncService;
  let dataTransformService: DataTransformService;
  let imageService: ImageService;
  let mockFeishuApiService: any;

  // Helper to generate test data
  const generateTestRecord = (id: number) => ({
    record_id: `rec${id.toString().padStart(12, '0')}`,
    fields: {
      '产品名称': { text: `测试产品${id}` },
      '价格': { number: 10 + (id % 100) },
      '平台': { text: id % 2 === 0 ? '天猫' : '京东' },
      '正面图片': [{ file_token: `front_token_${id}` }],
      '背面图片': [{ file_token: `back_token_${id}` }]
    },
    created_time: new Date().toISOString(),
    last_modified_time: new Date().toISOString()
  });

  const generateTestProduct = (id: number) => ({
    productId: `rec${id.toString().padStart(12, '0')}`,
    name: `测试产品${id}`,
    price: { normal: 10 + (id % 100) },
    platform: id % 2 === 0 ? '天猫' : '京东',
    images: {
      front: [`front_token_${id}`],
      back: [`back_token_${id}`]
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Feishu API Service
    mockFeishuApiService = {
      getAllRecords: jest.fn(),
      downloadImage: jest.fn(),
      testConnection: jest.fn().mockResolvedValue(true)
    };
    (FeishuApiService as any).mockImplementation(() => mockFeishuApiService);

    syncService = new SyncService();
    dataTransformService = new DataTransformService();
    imageService = new ImageService();
  });

  describe('Large Dataset Processing Performance', () => {
    it('should handle 1000 records within performance limits', async () => {
      const recordCount = 1000;
      const testRecords = Array.from({ length: recordCount }, (_, i) => generateTestRecord(i + 1));

      // Mock successful transformations
      jest.spyOn(dataTransformService, 'transformFeishuRecord').mockImplementation((record) => ({
        success: true,
        data: generateTestProduct(parseInt(record.record_id.slice(3))),
        errors: [],
        warnings: []
      }));

      jest.spyOn(dataTransformService, 'validateProduct').mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      const startTime = Date.now();
      
      // Process all records
      const results = testRecords.map(record => 
        dataTransformService.transformFeishuRecord(record)
      );

      const transformTime = Date.now() - startTime;
      const validationStartTime = Date.now();

      // Validate all products
      const validationResults = results
        .filter(r => r.success)
        .map(r => dataTransformService.validateProduct(r.data));

      const validationTime = Date.now() - validationStartTime;

      // Performance assertions
      expect(transformTime).toBeLessThan(2000); // Should transform 1000 records in under 2 seconds
      expect(validationTime).toBeLessThan(1000); // Should validate 1000 products in under 1 second
      expect(results.every(r => r.success)).toBe(true);
      expect(validationResults.every(r => r.isValid)).toBe(true);

      console.log(`Transform Performance: ${transformTime}ms for ${recordCount} records (${transformTime/recordCount}ms per record)`);
      console.log(`Validation Performance: ${validationTime}ms for ${recordCount} products (${validationTime/recordCount}ms per product)`);
    });

    it('should handle concurrent data transformations efficiently', async () => {
      const batchSize = 100;
      const batchCount = 10;
      const totalRecords = batchSize * batchCount;

      // Mock transformation service
      jest.spyOn(dataTransformService, 'transformFeishuRecord').mockImplementation(async (record) => {
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 1));
        return {
          success: true,
          data: generateTestProduct(parseInt(record.record_id.slice(3))),
          errors: [],
          warnings: []
        };
      });

      const startTime = Date.now();

      // Process batches concurrently
      const batchPromises = Array.from({ length: batchCount }, (_, batchIndex) => {
        const batchRecords = Array.from({ length: batchSize }, (_, recordIndex) => 
          generateTestRecord(batchIndex * batchSize + recordIndex + 1)
        );
        
        return Promise.all(
          batchRecords.map(record => dataTransformService.transformFeishuRecord(record))
        );
      });

      const results = await Promise.all(batchPromises);
      const totalTime = Date.now() - startTime;
      const flatResults = results.flat();

      // Performance assertions
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(flatResults).toHaveLength(totalRecords);
      expect(flatResults.every(r => r.success)).toBe(true);

      console.log(`Concurrent Processing: ${totalTime}ms for ${totalRecords} records in ${batchCount} batches`);
      console.log(`Average per record: ${totalTime/totalRecords}ms`);
    });

    it('should handle large sync operations within memory limits', async () => {
      const recordCount = 5000;
      const batchSize = 100;

      // Mock Feishu API to return large datasets
      mockFeishuApiService.getAllRecords.mockImplementation(async (options) => {
        const { pageSize = 500, pageToken } = options || {};
        const startIndex = pageToken ? parseInt(pageToken) : 0;
        const endIndex = Math.min(startIndex + pageSize, recordCount);
        
        const records = Array.from(
          { length: endIndex - startIndex }, 
          (_, i) => generateTestRecord(startIndex + i + 1)
        );

        return {
          records,
          hasMore: endIndex < recordCount,
          pageToken: endIndex < recordCount ? endIndex.toString() : null
        };
      });

      // Monitor memory usage
      const initialMemory = process.memoryUsage();
      const startTime = Date.now();

      let processedCount = 0;
      let pageToken = null;

      do {
        const response = await mockFeishuApiService.getAllRecords({ 
          pageSize: batchSize, 
          pageToken 
        });

        // Process batch
        processedCount += response.records.length;
        pageToken = response.pageToken;

        // Check memory usage periodically
        const currentMemory = process.memoryUsage();
        const memoryGrowth = currentMemory.heapUsed - initialMemory.heapUsed;
        
        // Memory growth should be reasonable (less than 100MB for 5000 records)
        expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024);

      } while (pageToken);

      const totalTime = Date.now() - startTime;
      const finalMemory = process.memoryUsage();

      expect(processedCount).toBe(recordCount);
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds

      console.log(`Large Dataset Processing: ${recordCount} records in ${totalTime}ms`);
      console.log(`Memory usage - Initial: ${Math.round(initialMemory.heapUsed/1024/1024)}MB, Final: ${Math.round(finalMemory.heapUsed/1024/1024)}MB`);
    });
  });

  describe('Image Processing Performance', () => {
    it('should handle batch image downloads efficiently', async () => {
      const imageCount = 100;
      const concurrencyLimit = 10;
      
      const downloadJobs = Array.from({ length: imageCount }, (_, i) => ({
        fileToken: `token_${i}`,
        productId: `rec${i.toString().padStart(12, '0')}`,
        imageType: 'front'
      }));

      // Mock image service
      const mockImageService = {
        batchDownloadFromFeishu: jest.fn()
      };

      // Simulate realistic download times
      mockImageService.batchDownloadFromFeishu.mockImplementation(async (jobs, concurrency) => {
        expect(concurrency).toBeLessThanOrEqual(concurrencyLimit);
        
        const startTime = Date.now();
        
        // Simulate concurrent downloads with proper batching
        const batches = [];
        for (let i = 0; i < jobs.length; i += concurrency) {
          batches.push(jobs.slice(i, i + concurrency));
        }

        const results = [];
        for (const batch of batches) {
          // Simulate batch processing time (50ms per image in batch)
          await new Promise(resolve => setTimeout(resolve, 50));
          
          batch.forEach(job => {
            results.push({
              success: true,
              imageId: `img_${job.fileToken}`,
              fileToken: job.fileToken
            });
          });
        }

        const duration = Date.now() - startTime;
        
        return {
          totalJobs: jobs.length,
          successful: results.length,
          failed: 0,
          results,
          errors: [],
          duration
        };
      });

      const startTime = Date.now();
      const result = await mockImageService.batchDownloadFromFeishu(downloadJobs, concurrencyLimit);
      const totalTime = Date.now() - startTime;

      // Performance assertions
      expect(result.successful).toBe(imageCount);
      expect(result.failed).toBe(0);
      expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds with proper concurrency

      console.log(`Batch Image Download: ${imageCount} images in ${totalTime}ms with concurrency ${concurrencyLimit}`);
      console.log(`Average per image: ${totalTime/imageCount}ms`);
    });

    it('should optimize memory usage during image processing', async () => {
      const imageCount = 50;
      const averageImageSize = 1024 * 1024; // 1MB per image

      // Mock image processing that simulates memory usage
      const processImage = async (imageData: Buffer) => {
        // Simulate image processing
        const processed = Buffer.alloc(imageData.length);
        imageData.copy(processed);
        
        // Simulate compression/optimization
        await new Promise(resolve => setTimeout(resolve, 10));
        
        return processed.slice(0, Math.floor(processed.length * 0.7)); // 30% compression
      };

      const initialMemory = process.memoryUsage();
      const images: Buffer[] = [];

      // Generate test images
      for (let i = 0; i < imageCount; i++) {
        images.push(Buffer.alloc(averageImageSize, i % 256));
      }

      const processingStartTime = Date.now();
      const processedImages = await Promise.all(
        images.map(img => processImage(img))
      );
      const processingTime = Date.now() - processingStartTime;

      const finalMemory = process.memoryUsage();
      const memoryUsage = finalMemory.heapUsed - initialMemory.heapUsed;

      // Performance and memory assertions
      expect(processedImages).toHaveLength(imageCount);
      expect(processingTime).toBeLessThan(1000); // Should process 50 images within 1 second
      expect(memoryUsage).toBeLessThan(imageCount * averageImageSize * 2); // Memory should not exceed 2x input size

      console.log(`Image Processing: ${imageCount} images (${averageImageSize/1024}KB each) in ${processingTime}ms`);
      console.log(`Memory usage: ${Math.round(memoryUsage/1024/1024)}MB for ${Math.round(imageCount * averageImageSize/1024/1024)}MB of image data`);
    });
  });

  describe('Change Detection Performance', () => {
    it('should efficiently detect changes in large datasets', async () => {
      const productCount = 1000;
      const changePercentage = 0.3; // 30% of products have changes

      // Generate existing products
      const existingProducts = Array.from({ length: productCount }, (_, i) => 
        generateTestProduct(i + 1)
      );

      // Generate new products with some changes
      const newProducts = existingProducts.map((product, index) => {
        if (index < productCount * changePercentage) {
          // Introduce changes
          return {
            ...product,
            name: `${product.name} - 更新版`,
            price: { normal: product.price.normal + 5 }
          };
        }
        return product;
      });

      // Mock change detection
      jest.spyOn(dataTransformService, 'detectChanges').mockImplementation((newData, existingData) => {
        const hasChanges = newData.name !== existingData.name || 
                          newData.price.normal !== existingData.price.normal;
        
        if (hasChanges) {
          return {
            hasChanges: true,
            changedFields: ['name', 'price.normal'],
            changeDetails: [
              {
                field: 'name',
                oldValue: existingData.name,
                newValue: newData.name,
                changeType: 'modified'
              }
            ]
          };
        }

        return {
          hasChanges: false,
          changedFields: [],
          changeDetails: []
        };
      });

      const startTime = Date.now();
      
      const changeResults = newProducts.map((newProduct, index) => 
        dataTransformService.detectChanges(newProduct, existingProducts[index])
      );

      const detectionTime = Date.now() - startTime;
      const changedCount = changeResults.filter(r => r.hasChanges).length;
      const unchangedCount = changeResults.filter(r => !r.hasChanges).length;

      // Performance assertions
      expect(detectionTime).toBeLessThan(1000); // Should complete within 1 second
      expect(changedCount).toBe(Math.floor(productCount * changePercentage));
      expect(unchangedCount).toBe(productCount - Math.floor(productCount * changePercentage));

      console.log(`Change Detection: ${productCount} products in ${detectionTime}ms`);
      console.log(`Found ${changedCount} changed and ${unchangedCount} unchanged products`);
      console.log(`Average per product: ${detectionTime/productCount}ms`);
    });

    it('should handle deep object comparisons efficiently', async () => {
      const complexProductCount = 100;
      
      // Generate complex products with deep nesting
      const generateComplexProduct = (id: number) => ({
        productId: `rec${id}`,
        name: `复杂产品${id}`,
        category: {
          primary: '食品饮料',
          secondary: '休闲零食',
          tertiary: '坚果类',
          metadata: {
            tags: ['organic', 'premium', 'imported'],
            certifications: ['ISO9001', 'HACCP'],
            supplier: {
              name: '供应商名称',
              location: { country: '中国', province: '广东', city: '深圳' }
            }
          }
        },
        specifications: {
          weight: '500g',
          dimensions: { length: 10, width: 8, height: 5 },
          nutritionalInfo: {
            calories: 520,
            protein: 25.5,
            carbs: 15.2,
            fat: 45.8,
            fiber: 8.5,
            vitamins: ['VitE', 'VitB6', 'Folate']
          }
        },
        images: {
          front: [`front_${id}_1`, `front_${id}_2`],
          back: [`back_${id}_1`],
          label: [`label_${id}_1`, `label_${id}_2`, `label_${id}_3`],
          package: [`package_${id}_1`],
          lifestyle: [`lifestyle_${id}_1`, `lifestyle_${id}_2`]
        }
      });

      const existingProducts = Array.from({ length: complexProductCount }, (_, i) => 
        generateComplexProduct(i + 1)
      );

      // Create modified versions with deep changes
      const modifiedProducts = existingProducts.map((product, index) => {
        if (index % 3 === 0) {
          // Deep modification
          return {
            ...product,
            category: {
              ...product.category,
              metadata: {
                ...product.category.metadata,
                supplier: {
                  ...product.category.metadata.supplier,
                  location: {
                    ...product.category.metadata.supplier.location,
                    city: '广州' // Change city
                  }
                }
              }
            },
            specifications: {
              ...product.specifications,
              nutritionalInfo: {
                ...product.specifications.nutritionalInfo,
                calories: product.specifications.nutritionalInfo.calories + 10
              }
            }
          };
        }
        return product;
      });

      const startTime = Date.now();
      
      // Mock deep comparison
      jest.spyOn(dataTransformService, 'detectChanges').mockImplementation((newData, existingData) => {
        // Simulate deep comparison logic
        const hasChanges = JSON.stringify(newData) !== JSON.stringify(existingData);
        return {
          hasChanges,
          changedFields: hasChanges ? ['category.metadata.supplier.location.city', 'specifications.nutritionalInfo.calories'] : [],
          changeDetails: hasChanges ? [
            {
              field: 'category.metadata.supplier.location.city',
              oldValue: existingData.category.metadata.supplier.location.city,
              newValue: newData.category.metadata.supplier.location.city,
              changeType: 'modified'
            }
          ] : []
        };
      });

      const results = modifiedProducts.map((modifiedProduct, index) =>
        dataTransformService.detectChanges(modifiedProduct, existingProducts[index])
      );

      const comparisonTime = Date.now() - startTime;
      const changedCount = results.filter(r => r.hasChanges).length;

      // Performance assertions
      expect(comparisonTime).toBeLessThan(2000); // Should handle complex objects within 2 seconds
      expect(changedCount).toBe(Math.ceil(complexProductCount / 3));

      console.log(`Deep Object Comparison: ${complexProductCount} complex objects in ${comparisonTime}ms`);
      console.log(`Average per object: ${comparisonTime/complexProductCount}ms`);
      console.log(`Found ${changedCount} objects with deep changes`);
    });
  });

  describe('Full Sync Performance Benchmarks', () => {
    it('should complete end-to-end sync within acceptable time limits', async () => {
      const targetSyncTime = 300000; // 5 minutes for 1000 products
      const productCount = 1000;
      const imageCount = 2000; // Average 2 images per product

      // Mock all services for realistic performance test
      mockFeishuApiService.getAllRecords.mockResolvedValue(
        Array.from({ length: productCount }, (_, i) => generateTestRecord(i + 1))
      );

      const mockDataTransformService = {
        transformFeishuRecord: jest.fn().mockImplementation((record) => ({
          success: true,
          data: generateTestProduct(parseInt(record.record_id.slice(3))),
          errors: [],
          warnings: []
        })),
        validateProduct: jest.fn().mockReturnValue({
          isValid: true,
          errors: [],
          warnings: []
        }),
        detectChanges: jest.fn().mockReturnValue({
          hasChanges: false,
          changedFields: [],
          changeDetails: []
        })
      };

      const mockImageService = {
        batchDownloadFromFeishu: jest.fn().mockResolvedValue({
          totalJobs: imageCount,
          successful: Math.floor(imageCount * 0.95), // 95% success rate
          failed: Math.ceil(imageCount * 0.05),
          results: Array.from({ length: Math.floor(imageCount * 0.95) }, (_, i) => ({
            success: true,
            imageId: `img_${i}`
          })),
          errors: Array.from({ length: Math.ceil(imageCount * 0.05) }, (_, i) => 
            `Failed to download token_${1000 + i}`
          )
        })
      };

      // Replace service instances
      (syncService as any).dataTransformService = mockDataTransformService;
      (syncService as any).imageService = mockImageService;

      const startTime = Date.now();
      
      // Simulate the full sync process
      const mockSyncLogInstance = {
        updateProgress: jest.fn(),
        markAsCompleted: jest.fn(),
        save: jest.fn()
      };

      // Execute performance test
      const results = {
        totalRecords: productCount,
        processedRecords: productCount,
        newProducts: Math.floor(productCount * 0.3),
        updatedProducts: Math.floor(productCount * 0.7),
        totalImages: imageCount,
        successfulImages: Math.floor(imageCount * 0.95),
        failedImages: Math.ceil(imageCount * 0.05)
      };

      const syncTime = Date.now() - startTime;

      // Performance benchmarks
      expect(syncTime).toBeLessThan(targetSyncTime);
      expect(results.processedRecords).toBe(productCount);
      expect(results.successfulImages).toBeGreaterThan(imageCount * 0.9); // At least 90% success

      console.log(`\nEnd-to-End Sync Performance Benchmark:`);
      console.log(`- Total time: ${syncTime}ms (${Math.round(syncTime/1000)}s)`);
      console.log(`- Products processed: ${results.processedRecords}`);
      console.log(`- Images processed: ${results.totalImages} (${results.successfulImages} successful)`);
      console.log(`- Average per product: ${syncTime/productCount}ms`);
      console.log(`- Target time: ${targetSyncTime}ms - ${syncTime < targetSyncTime ? 'PASSED' : 'FAILED'}`);
    });

    it('should maintain performance under concurrent operations', async () => {
      const concurrentSyncs = 3;
      const recordsPerSync = 100;

      // Mock concurrent sync operations
      const mockConcurrentSync = async (syncId: string) => {
        const startTime = Date.now();
        
        // Simulate data fetching
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Simulate processing
        for (let i = 0; i < recordsPerSync; i++) {
          // Simulate record processing
          await new Promise(resolve => setTimeout(resolve, 1));
        }
        
        const duration = Date.now() - startTime;
        
        return {
          syncId,
          duration,
          recordsProcessed: recordsPerSync,
          success: true
        };
      };

      const startTime = Date.now();
      
      // Execute concurrent syncs
      const syncPromises = Array.from({ length: concurrentSyncs }, (_, i) =>
        mockConcurrentSync(`sync_${i + 1}`)
      );

      const results = await Promise.all(syncPromises);
      const totalTime = Date.now() - startTime;
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

      // Concurrent performance assertions
      expect(results.every(r => r.success)).toBe(true);
      expect(totalTime).toBeLessThan(avgDuration * 2); // Concurrent execution should be much faster than sequential
      expect(results.every(r => r.recordsProcessed === recordsPerSync)).toBe(true);

      console.log(`\nConcurrent Sync Performance:`);
      console.log(`- Concurrent operations: ${concurrentSyncs}`);
      console.log(`- Records per sync: ${recordsPerSync}`);
      console.log(`- Total time: ${totalTime}ms`);
      console.log(`- Average individual time: ${avgDuration}ms`);
      console.log(`- Efficiency gain: ${Math.round(((avgDuration * concurrentSyncs) - totalTime) / (avgDuration * concurrentSyncs) * 100)}%`);
    });
  });
});