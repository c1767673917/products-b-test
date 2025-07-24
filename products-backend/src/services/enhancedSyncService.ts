import { SyncService } from './syncService';
import { enhancedImageService, ImageSyncResult } from './enhancedImageService';
import { Product } from '../models/Product';
import { Image } from '../models/Image';
import { getFeishuApiService, FeishuRecord } from './feishuApiService';
import { dataTransformService } from './dataTransformService';
import winston from 'winston';

// 飞书图片数据类型
export interface FeishuImageData {
  type: string;
  fileToken: string;
  url?: string;
}

// 完整性报告类型
export interface IntegrityReport {
  syncId: string;
  totalProducts: number;
  validProducts: number;
  invalidProducts: number;
  totalImages: number;
  validImages: number;
  invalidImages: number;
  issues: Array<{
    productId: string;
    type: 'missing_product' | 'missing_image' | 'invalid_reference' | 'file_not_found';
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

// 回滚结果类型
export interface RollbackResult {
  syncId: string;
  success: boolean;
  rolledBackProducts: number;
  rolledBackImages: number;
  errors: string[];
}

/**
 * 增强的同步服务
 * 集成图片同步和数据一致性保证功能
 */
export class EnhancedSyncService extends SyncService {
  private logger: winston.Logger;

  constructor() {
    super();
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
   * 同步产品图片
   */
  async syncProductImages(
    productId: string,
    imageData: FeishuImageData[]
  ): Promise<ImageSyncResult[]> {
    const results: ImageSyncResult[] = [];

    try {
      this.logger.info('开始同步产品图片', { productId, imageCount: imageData.length });

      for (const image of imageData) {
        try {
          const result = await enhancedImageService.syncImageFromFeishu(
            productId,
            image.type,
            image.fileToken
          );
          results.push(result);

          this.logger.debug('图片同步结果', {
            productId,
            imageType: image.type,
            success: result.success,
            action: result.action
          });

        } catch (error) {
          const errorResult: ImageSyncResult = {
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
            action: 'failed'
          };
          results.push(errorResult);

          this.logger.error('图片同步失败', {
            productId,
            imageType: image.type,
            error
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      this.logger.info('产品图片同步完成', {
        productId,
        total: results.length,
        success: successCount,
        failed: results.length - successCount
      });

      return results;

    } catch (error) {
      this.logger.error('产品图片同步失败', { productId, error });
      throw error;
    }
  }

  /**
   * 增强的全量同步，包含图片处理
   */
  async performEnhancedFullSync(syncId: string): Promise<any> {
    try {
      this.logger.info('开始增强的全量同步', { syncId });

      // 执行基础的数据同步
      const baseResult = await this.performFullSyncFromFeishu(syncId, {
        mode: 'full',
        downloadImages: false, // 我们将单独处理图片
        validateData: true
      });

      if (!baseResult.success) {
        throw new Error(`基础数据同步失败: ${baseResult.message}`);
      }

      // 获取所有飞书记录用于图片同步
      const feishuService = getFeishuApiService();
      const feishuRecords = await feishuService.getAllRecords();

      // 处理图片同步
      const imageStats = {
        totalProducts: 0,
        processedProducts: 0,
        totalImages: 0,
        successImages: 0,
        failedImages: 0
      };

      for (const record of feishuRecords) {
        try {
          imageStats.totalProducts++;

          // 转换飞书记录以获取产品ID
          const transformResult = dataTransformService.transformFeishuRecord(record);
          if (!transformResult.success || !transformResult.data) {
            continue;
          }

          const productId = transformResult.data.productId;
          const imageData = this.extractImageDataFromFeishuRecord(record);

          if (imageData.length > 0) {
            const imageResults = await this.syncProductImages(productId, imageData);
            
            imageStats.totalImages += imageResults.length;
            imageStats.successImages += imageResults.filter(r => r.success).length;
            imageStats.failedImages += imageResults.filter(r => !r.success).length;
          }

          imageStats.processedProducts++;

        } catch (error) {
          this.logger.error('产品图片处理失败', {
            recordId: record.record_id,
            error
          });
        }
      }

      this.logger.info('增强全量同步完成', {
        syncId,
        baseResult: baseResult.stats,
        imageStats
      });

      return {
        ...baseResult,
        imageStats,
        enhanced: true
      };

    } catch (error) {
      this.logger.error('增强全量同步失败', { syncId, error });
      throw error;
    }
  }

  /**
   * 验证同步完整性
   */
  async validateSyncIntegrity(syncId: string): Promise<IntegrityReport> {
    const report: IntegrityReport = {
      syncId,
      totalProducts: 0,
      validProducts: 0,
      invalidProducts: 0,
      totalImages: 0,
      validImages: 0,
      invalidImages: 0,
      issues: []
    };

    try {
      this.logger.info('开始验证同步完整性', { syncId });

      // 获取所有产品
      const products = await Product.find({}).lean();
      report.totalProducts = products.length;

      for (const product of products) {
        let productValid = true;

        // 验证产品基本信息
        if (!product.productId || !product.name?.display) {
          report.issues.push({
            productId: product.productId || 'unknown',
            type: 'missing_product',
            description: '产品缺少必要的基本信息',
            severity: 'critical'
          });
          productValid = false;
        }

        // 验证图片一致性
        const imageTypes = ['front', 'back', 'label', 'package', 'gift'];
        
        for (const imageType of imageTypes) {
          const productImageData = product.images?.[imageType as keyof typeof product.images];
          
          if (productImageData) {
            report.totalImages++;

            try {
              const consistencyChecks = await enhancedImageService.validateImageConsistency(
                product.productId
              );
              
              const imageCheck = consistencyChecks.find(c => c.imageType === imageType);
              
              if (imageCheck && Object.values(imageCheck.issues).some(Boolean)) {
                report.issues.push({
                  productId: product.productId,
                  type: 'invalid_reference',
                  description: `图片${imageType}存在一致性问题: ${imageCheck.suggestedActions.join(', ')}`,
                  severity: imageCheck.severity
                });
                report.invalidImages++;
                productValid = false;
              } else {
                report.validImages++;
              }

            } catch (error) {
              report.issues.push({
                productId: product.productId,
                type: 'invalid_reference',
                description: `图片${imageType}验证失败: ${error instanceof Error ? error.message : '未知错误'}`,
                severity: 'high'
              });
              report.invalidImages++;
              productValid = false;
            }
          }
        }

        if (productValid) {
          report.validProducts++;
        } else {
          report.invalidProducts++;
        }
      }

      this.logger.info('同步完整性验证完成', {
        syncId,
        totalProducts: report.totalProducts,
        validProducts: report.validProducts,
        totalIssues: report.issues.length
      });

      return report;

    } catch (error) {
      this.logger.error('同步完整性验证失败', { syncId, error });
      throw error;
    }
  }

  /**
   * 回滚图片变更
   */
  async rollbackImageChanges(syncId: string): Promise<RollbackResult> {
    const result: RollbackResult = {
      syncId,
      success: false,
      rolledBackProducts: 0,
      rolledBackImages: 0,
      errors: []
    };

    try {
      this.logger.info('开始回滚图片变更', { syncId });

      // 查找在指定同步ID之后创建或更新的图片记录
      const syncTime = new Date(); // 这里应该从同步日志中获取实际的同步时间
      
      const recentImages = await Image.find({
        lastSyncTime: { $gte: syncTime },
        'metadata.source': 'feishu'
      });

      this.logger.info(`找到 ${recentImages.length} 个需要回滚的图片记录`);

      const processedProducts = new Set<string>();

      for (const image of recentImages) {
        try {
          // 删除MinIO中的文件
          await enhancedImageService['minioClient'].removeObject(
            image.bucketName,
            image.objectName
          );

          // 删除缩略图
          for (const thumbnail of image.thumbnails) {
            try {
              const thumbnailObjectName = enhancedImageService['extractObjectNameFromUrl'](thumbnail.url);
              await enhancedImageService['minioClient'].removeObject(
                image.bucketName,
                thumbnailObjectName
              );
            } catch (error) {
              // 缩略图删除失败不影响主流程
            }
          }

          // 删除Image记录
          await Image.deleteOne({ _id: image._id });

          // 清除Product表中的图片引用
          await Product.updateOne(
            { productId: image.productId },
            { $unset: { [`images.${image.type}`]: 1 } }
          );

          processedProducts.add(image.productId);
          result.rolledBackImages++;

          this.logger.debug('回滚图片成功', {
            imageId: image.imageId,
            productId: image.productId,
            type: image.type
          });

        } catch (error) {
          const errorMsg = `回滚图片失败 ${image.imageId}: ${error instanceof Error ? error.message : '未知错误'}`;
          result.errors.push(errorMsg);
          this.logger.error(errorMsg);
        }
      }

      result.rolledBackProducts = processedProducts.size;
      result.success = result.errors.length === 0;

      this.logger.info('图片变更回滚完成', {
        syncId,
        rolledBackProducts: result.rolledBackProducts,
        rolledBackImages: result.rolledBackImages,
        errors: result.errors.length
      });

      return result;

    } catch (error) {
      this.logger.error('回滚图片变更失败', { syncId, error });
      result.errors.push(error instanceof Error ? error.message : '未知错误');
      return result;
    }
  }

  /**
   * 从飞书记录中提取图片数据
   */
  private extractImageDataFromFeishuRecord(record: FeishuRecord): FeishuImageData[] {
    const imageData: FeishuImageData[] = [];
    
    // 图片字段映射
    const imageFieldMapping = {
      'fldcnfJQVNhGG': 'front',    // Front image(正)
      'fldcnK5b5nh6G': 'back',     // Back image(背)
      'fldcnwjQVNhGG': 'label',    // Tag photo(标签)
      'fldcnpjQVNhGG': 'package',  // Outer packaging image(外包装)
      'fldcnqjQVNhGG': 'gift'      // Gift pictures(赠品图片)
    };

    for (const [fieldId, imageType] of Object.entries(imageFieldMapping)) {
      const fieldValue = record.fields[fieldId];
      
      if (fieldValue && Array.isArray(fieldValue) && fieldValue.length > 0) {
        // 飞书附件字段通常是数组格式
        for (const attachment of fieldValue) {
          if (attachment.file_token) {
            imageData.push({
              type: imageType,
              fileToken: attachment.file_token,
              url: attachment.url
            });
          }
        }
      }
    }

    return imageData;
  }
}

// 创建单例实例
export const enhancedSyncService = new EnhancedSyncService();
