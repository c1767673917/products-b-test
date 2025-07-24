import { ImageService } from './imageService';
import { Image, IImage } from '../models/Image';
import { Product } from '../models/Product';
import { getFeishuApiService } from './feishuApiService';
import winston from 'winston';

// 图片同步结果类型
export interface ImageSyncResult {
  success: boolean;
  imageId?: string;
  url?: string;
  error?: string;
  action: 'created' | 'updated' | 'skipped' | 'failed';
}

// 数据一致性检查结果
export interface ConsistencyCheck {
  productId: string;
  imageType: string;
  issues: {
    productRecordMissing: boolean;
    imageRecordMissing: boolean;
    fileNotExists: boolean;
    urlMismatch: boolean;
    metadataMismatch: boolean;
  };
  suggestedActions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// 修复结果类型
export interface RepairResult {
  productId: string;
  repaired: number;
  failed: number;
  details: Array<{
    imageType: string;
    action: string;
    success: boolean;
    error?: string;
  }>;
}

// 清理结果类型
export interface CleanupResult {
  orphanedImages: number;
  invalidReferences: number;
  freedSpace: number;
  errors: string[];
}

/**
 * 增强的图片服务
 * 提供数据一致性检查、修复和高级图片管理功能
 */
export class EnhancedImageService extends ImageService {
  constructor() {
    super();
    // 使用父类的logger，不需要重新定义
  }

  /**
   * 从飞书同步单个图片
   */
  async syncImageFromFeishu(
    productId: string, 
    imageType: string, 
    fileToken: string
  ): Promise<ImageSyncResult> {
    try {
      this.logger.info('开始从飞书同步图片', { productId, imageType, fileToken });

      // 检查是否已存在相同的图片记录
      const existingImage = await Image.findOne({
        productId,
        type: imageType,
        'metadata.feishuFileToken': fileToken
      });

      if (existingImage && existingImage.syncStatus === 'synced') {
        this.logger.info('图片已存在且已同步', { imageId: existingImage.imageId });
        return {
          success: true,
          imageId: existingImage.imageId,
          url: existingImage.publicUrl,
          action: 'skipped'
        };
      }

      // 从飞书下载图片
      const feishuService = getFeishuApiService();
      const imageBuffer = await feishuService.downloadImage(fileToken);

      // 生成文件名
      const filename = this.generateFeishuImageName(productId, imageType, fileToken);

      // 上传到MinIO
      const imageRecord = await this.uploadImage(imageBuffer, filename, productId, imageType);

      // 更新图片记录的飞书相关信息
      await Image.updateOne(
        { imageId: imageRecord.imageId },
        {
          $set: {
            'metadata.feishuFileToken': fileToken,
            'metadata.source': 'feishu',
            'metadata.downloadTime': new Date(),
            syncStatus: 'synced',
            lastSyncTime: new Date(),
            syncAttempts: 1
          }
        }
      );

      // 更新Product表中的图片引用
      await this.updateProductImageReference(productId, imageType, imageRecord);

      this.logger.info('飞书图片同步成功', {
        imageId: imageRecord.imageId,
        productId,
        imageType,
        fileToken
      });

      return {
        success: true,
        imageId: imageRecord.imageId,
        url: imageRecord.publicUrl,
        action: existingImage ? 'updated' : 'created'
      };

    } catch (error) {
      this.logger.error('飞书图片同步失败', { productId, imageType, fileToken, error });
      
      // 更新失败状态
      await Image.updateOne(
        { productId, type: imageType },
        {
          $set: {
            syncStatus: 'failed',
            lastSyncTime: new Date()
          },
          $inc: { syncAttempts: 1 }
        }
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        action: 'failed'
      };
    }
  }

  /**
   * 验证产品图片的数据一致性
   */
  async validateImageConsistency(productId: string): Promise<ConsistencyCheck[]> {
    const checks: ConsistencyCheck[] = [];
    
    try {
      this.logger.info('开始验证图片数据一致性', { productId });

      // 获取产品记录
      const product = await Product.findOne({ productId }).lean();
      if (!product) {
        return [{
          productId,
          imageType: 'all',
          issues: {
            productRecordMissing: true,
            imageRecordMissing: false,
            fileNotExists: false,
            urlMismatch: false,
            metadataMismatch: false
          },
          suggestedActions: ['重新同步产品数据'],
          severity: 'critical'
        }];
      }

      // 检查每种图片类型
      const imageTypes = ['front', 'back', 'label', 'package', 'gift'];
      
      for (const imageType of imageTypes) {
        const productImageData = product.images?.[imageType as keyof typeof product.images];
        
        if (productImageData) {
          const check = await this.checkSingleImageConsistency(
            productId, 
            imageType, 
            productImageData
          );
          checks.push(check);
        }
      }

      this.logger.info('图片数据一致性验证完成', { 
        productId, 
        totalChecks: checks.length,
        issues: checks.filter(c => Object.values(c.issues).some(Boolean)).length
      });

      return checks;

    } catch (error) {
      this.logger.error('图片数据一致性验证失败', { productId, error });
      throw error;
    }
  }

  /**
   * 检查单个图片的一致性
   */
  private async checkSingleImageConsistency(
    productId: string,
    imageType: string,
    productImageData: any
  ): Promise<ConsistencyCheck> {
    const issues = {
      productRecordMissing: false,
      imageRecordMissing: false,
      fileNotExists: false,
      urlMismatch: false,
      metadataMismatch: false
    };
    const suggestedActions: string[] = [];

    try {
      // 获取Image记录
      const imageRecord = await Image.findOne({ productId, type: imageType });
      
      if (!imageRecord) {
        issues.imageRecordMissing = true;
        suggestedActions.push('创建缺失的Image记录');
      } else {
        // 检查URL一致性
        const productUrl = typeof productImageData === 'string' 
          ? productImageData 
          : productImageData.url;
          
        if (productUrl !== imageRecord.publicUrl) {
          issues.urlMismatch = true;
          suggestedActions.push('同步图片URL');
        }

        // 检查文件是否存在（通过MinIO）
        try {
          await this.minioClient.statObject(imageRecord.bucketName, imageRecord.objectName);
        } catch (error) {
          issues.fileNotExists = true;
          suggestedActions.push('重新下载图片文件');
        }

        // 检查元数据一致性
        if (typeof productImageData === 'object') {
          if (productImageData.imageId !== imageRecord.imageId) {
            issues.metadataMismatch = true;
            suggestedActions.push('同步图片元数据');
          }
        }
      }

    } catch (error) {
      this.logger.error('单个图片一致性检查失败', { productId, imageType, error });
      suggestedActions.push('手动检查图片状态');
    }

    // 确定严重程度
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (issues.productRecordMissing || issues.fileNotExists) {
      severity = 'critical';
    } else if (issues.imageRecordMissing || issues.urlMismatch) {
      severity = 'high';
    } else if (issues.metadataMismatch) {
      severity = 'medium';
    }

    return {
      productId,
      imageType,
      issues,
      suggestedActions,
      severity
    };
  }

  /**
   * 修复产品图片引用
   */
  async repairImageReferences(productId: string): Promise<RepairResult> {
    const result: RepairResult = {
      productId,
      repaired: 0,
      failed: 0,
      details: []
    };

    try {
      this.logger.info('开始修复产品图片引用', { productId });

      // 获取一致性检查结果
      const checks = await this.validateImageConsistency(productId);
      
      for (const check of checks) {
        const detail = {
          imageType: check.imageType,
          action: '',
          success: false,
          error: undefined as string | undefined
        };

        try {
          if (check.issues.imageRecordMissing) {
            // 创建缺失的Image记录
            detail.action = 'create_image_record';
            await this.createMissingImageRecord(productId, check.imageType);
            detail.success = true;
            result.repaired++;
          } else if (check.issues.urlMismatch || check.issues.metadataMismatch) {
            // 同步图片引用
            detail.action = 'sync_reference';
            await this.syncImageReference(productId, check.imageType);
            detail.success = true;
            result.repaired++;
          } else if (check.issues.fileNotExists) {
            // 重新下载图片
            detail.action = 'redownload_image';
            await this.redownloadImage(productId, check.imageType);
            detail.success = true;
            result.repaired++;
          } else {
            detail.action = 'no_action_needed';
            detail.success = true;
          }

        } catch (error) {
          detail.success = false;
          detail.error = error instanceof Error ? error.message : '未知错误';
          result.failed++;
          this.logger.error('修复图片引用失败', { 
            productId, 
            imageType: check.imageType, 
            error 
          });
        }

        result.details.push(detail);
      }

      this.logger.info('产品图片引用修复完成', { 
        productId, 
        repaired: result.repaired, 
        failed: result.failed 
      });

      return result;

    } catch (error) {
      this.logger.error('修复产品图片引用失败', { productId, error });
      throw error;
    }
  }

  /**
   * 更新Product表中的图片引用
   */
  private async updateProductImageReference(
    productId: string,
    imageType: string,
    imageRecord: IImage
  ): Promise<void> {
    const imageData = {
      imageId: imageRecord.imageId,
      url: imageRecord.publicUrl,
      objectName: imageRecord.objectName,
      lastUpdated: new Date(),
      fileSize: imageRecord.fileSize,
      mimeType: imageRecord.mimeType,
      width: imageRecord.width,
      height: imageRecord.height
    };

    await Product.updateOne(
      { productId },
      { $set: { [`images.${imageType}`]: imageData } }
    );

    this.logger.debug('更新Product图片引用', { productId, imageType, imageId: imageRecord.imageId });
  }



  /**
   * 创建缺失的Image记录
   */
  private async createMissingImageRecord(productId: string, imageType: string): Promise<void> {
    try {
      this.logger.info('创建缺失的Image记录', { productId, imageType });

      // 获取产品记录中的图片信息
      const product = await Product.findOne({ productId }).lean();
      if (!product || !product.images) {
        throw new Error('产品记录不存在或缺少图片信息');
      }

      const productImageData = product.images[imageType as keyof typeof product.images];
      if (!productImageData) {
        throw new Error(`产品中不存在${imageType}图片信息`);
      }

      // 提取图片信息
      let url: string;
      let objectName: string;
      let fileSize: number | undefined;
      let mimeType: string | undefined;

      if (typeof productImageData === 'string') {
        url = productImageData;
        objectName = this.extractObjectNameFromUrl(url);
      } else {
        url = productImageData.url;
        objectName = productImageData.objectName;
        fileSize = productImageData.fileSize;
        mimeType = productImageData.mimeType;
      }

      // 生成imageId
      const imageId = `img_${productId}_${imageType}_${Date.now()}`;

      // 创建Image记录
      const imageRecord = new Image({
        imageId,
        productId,
        type: imageType,
        bucketName: 'product-images',
        objectName,
        originalName: this.extractFilenameFromObjectName(objectName),
        publicUrl: url,
        processStatus: 'completed',
        fileSize: fileSize || 0,
        mimeType: mimeType || 'image/jpeg',
        md5Hash: 'repair_placeholder',
        isActive: true,
        isPublic: true,
        syncStatus: 'synced',
        lastSyncTime: new Date(),
        syncAttempts: 1,
        productExists: true,
        fileExists: true,
        metadata: {
          source: 'repair',
          priority: 1
        }
      });

      await imageRecord.save();
      this.logger.info('成功创建Image记录', { imageId, productId, imageType });

    } catch (error) {
      this.logger.error('创建Image记录失败', { productId, imageType, error });
      throw error;
    }
  }

  /**
   * 同步图片引用
   */
  private async syncImageReference(productId: string, imageType: string): Promise<void> {
    try {
      this.logger.info('同步图片引用', { productId, imageType });

      // 获取Image记录
      const imageRecord = await Image.findOne({ productId, type: imageType });
      if (!imageRecord) {
        throw new Error('Image记录不存在');
      }

      // 更新Product表中的图片引用
      await this.updateProductImageReference(productId, imageType, imageRecord);

      // 更新Image记录的同步状态
      await Image.updateOne(
        { imageId: imageRecord.imageId },
        {
          $set: {
            syncStatus: 'synced',
            lastSyncTime: new Date(),
            productExists: true
          }
        }
      );

      this.logger.info('成功同步图片引用', { productId, imageType, imageId: imageRecord.imageId });

    } catch (error) {
      this.logger.error('同步图片引用失败', { productId, imageType, error });
      throw error;
    }
  }

  /**
   * 重新下载图片
   */
  private async redownloadImage(productId: string, imageType: string): Promise<void> {
    try {
      this.logger.info('重新下载图片', { productId, imageType });

      // 获取Image记录
      const imageRecord = await Image.findOne({ productId, type: imageType });
      if (!imageRecord) {
        throw new Error('Image记录不存在');
      }

      // 检查是否有飞书文件令牌
      const feishuFileToken = imageRecord.metadata?.feishuFileToken;
      if (!feishuFileToken) {
        throw new Error('缺少飞书文件令牌，无法重新下载');
      }

      // 从飞书重新下载图片
      const syncResult = await this.syncImageFromFeishu(productId, imageType, feishuFileToken);

      if (!syncResult.success) {
        throw new Error(`重新下载失败: ${syncResult.error}`);
      }

      this.logger.info('成功重新下载图片', { productId, imageType, imageId: syncResult.imageId });

    } catch (error) {
      this.logger.error('重新下载图片失败', { productId, imageType, error });
      throw error;
    }
  }

  /**
   * 清理孤立的图片文件（增强版）
   */
  async cleanupOrphanedImages(): Promise<CleanupResult> {
    const result: CleanupResult = {
      orphanedImages: 0,
      invalidReferences: 0,
      freedSpace: 0,
      errors: []
    };

    try {
      this.logger.info('开始清理孤立的图片文件');

      // 1. 清理没有对应产品记录的图片
      const orphanedImages = await this.findOrphanedImageRecords();

      for (const image of orphanedImages) {
        try {
          await this.deleteImageCompletely(image);
          result.orphanedImages++;
          result.freedSpace += image.fileSize;

          this.logger.info('删除孤立图片', { imageId: image.imageId, productId: image.productId });
        } catch (error) {
          result.errors.push(`删除孤立图片失败 ${image.imageId}: ${(error as Error).message}`);
        }
      }

      // 2. 清理没有对应数据库记录的文件
      const orphanedFiles = await this.findOrphanedFiles();

      for (const file of orphanedFiles) {
        try {
          await this.minioClient.removeObject(this.bucketName, file.objectName);
          result.orphanedImages++;
          result.freedSpace += file.size;

          this.logger.info('删除孤立文件', { objectName: file.objectName });
        } catch (error) {
          result.errors.push(`删除孤立文件失败 ${file.objectName}: ${(error as Error).message}`);
        }
      }

      // 3. 清理Product表中的无效引用
      const invalidRefs = await this.findInvalidImageReferences();

      for (const ref of invalidRefs) {
        try {
          await this.cleanupInvalidReference(ref);
          result.invalidReferences++;

          this.logger.info('清理无效引用', { productId: ref.productId, imageType: ref.imageType });

        } catch (error) {
          result.errors.push(`清理无效引用失败 ${ref.productId}.${ref.imageType}: ${(error as Error).message}`);
        }
      }

      this.logger.info('孤立图片清理完成', result);
      return result;

    } catch (error) {
      this.logger.error('清理孤立图片失败', error);
      throw error;
    }
  }

  /**
   * 从URL中提取对象名
   */
  private extractObjectNameFromUrl(url: string): string {
    if (!url) return '';

    try {
      const match = url.match(/\/product-images\/(.+)$/);
      return match ? match[1] : `products/unknown_${Date.now()}.jpg`;
    } catch (error) {
      return `products/unknown_${Date.now()}.jpg`;
    }
  }

  /**
   * 从对象名中提取文件名
   */
  private extractFilenameFromObjectName(objectName: string): string {
    if (!objectName) return 'unknown.jpg';

    const parts = objectName.split('/');
    return parts[parts.length - 1] || 'unknown.jpg';
  }

  /**
   * 查找孤立的图片记录
   */
  private async findOrphanedImageRecords() {
    return await Image.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: 'productId',
          as: 'product'
        }
      },
      {
        $match: {
          product: { $size: 0 }
        }
      }
    ]);
  }

  /**
   * 查找孤立的文件
   */
  private async findOrphanedFiles() {
    const orphanedFiles: Array<{ objectName: string; size: number }> = [];

    try {
      const objectStream = this.minioClient.listObjects(this.bucketName, 'products/', true);

      for await (const obj of objectStream) {
        const imageRecord = await Image.findOne({ objectName: obj.name });

        if (!imageRecord) {
          orphanedFiles.push({
            objectName: obj.name,
            size: obj.size || 0
          });
        }
      }
    } catch (error) {
      this.logger.error('扫描MinIO文件失败', { error });
    }

    return orphanedFiles;
  }

  /**
   * 查找无效的图片引用
   */
  private async findInvalidImageReferences() {
    const invalidRefs: Array<{ productId: string; imageType: string; imageId?: string }> = [];

    const products = await Product.find({}).lean();

    for (const product of products) {
      const imageTypes = ['front', 'back', 'label', 'package', 'gift'];

      for (const imageType of imageTypes) {
        const imageData = product.images?.[imageType as keyof typeof product.images];

        if (imageData && typeof imageData === 'object' && 'imageId' in imageData) {
          const imageRecord = await Image.findOne({ imageId: imageData.imageId });

          if (!imageRecord) {
            invalidRefs.push({
              productId: product.productId,
              imageType,
              imageId: imageData.imageId
            });
          }
        }
      }
    }

    return invalidRefs;
  }

  /**
   * 完全删除图片（包括文件和缩略图）
   */
  private async deleteImageCompletely(image: any) {
    // 删除主文件
    try {
      await this.minioClient.removeObject(image.bucketName, image.objectName);
    } catch (error) {
      // 文件可能已经不存在
    }

    // 删除缩略图
    for (const thumbnail of image.thumbnails || []) {
      try {
        const thumbnailObjectName = this.extractObjectNameFromUrl(thumbnail.url);
        await this.minioClient.removeObject(image.bucketName, thumbnailObjectName);
      } catch (error) {
        // 缩略图删除失败不影响主流程
      }
    }

    // 删除数据库记录
    await Image.deleteOne({ _id: image._id });
  }

  /**
   * 清理无效引用
   */
  private async cleanupInvalidReference(ref: { productId: string; imageType: string }) {
    await Product.updateOne(
      { productId: ref.productId },
      { $unset: { [`images.${ref.imageType}`]: "" } }
    );
  }
}

// 创建单例实例
export const enhancedImageService = new EnhancedImageService();
