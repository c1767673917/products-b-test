import { Client as MinioClient } from 'minio';
import crypto from 'crypto';
import path from 'path';
import sharp from 'sharp';
import { Image, IImage } from '../models/Image';
import { IMAGE_CONFIG, ImagePathUtils } from '../config/imageConfig';
import { getFeishuApiService } from './feishuApiService';
import winston from 'winston';

export class ImageService {
  protected minioClient: MinioClient;
  protected bucketName: string;
  protected logger: winston.Logger;

  constructor() {
    this.minioClient = new MinioClient({
      endPoint: IMAGE_CONFIG.MINIO.ENDPOINT,
      port: IMAGE_CONFIG.MINIO.PORT,
      useSSL: IMAGE_CONFIG.MINIO.USE_SSL,
      accessKey: IMAGE_CONFIG.MINIO.ACCESS_KEY,
      secretKey: IMAGE_CONFIG.MINIO.SECRET_KEY
    });

    this.bucketName = IMAGE_CONFIG.MINIO.BUCKET_NAME;

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
   * 上传图片到MinIO并创建数据库记录
   */
  async uploadImage(
    buffer: Buffer, 
    filename: string, 
    productId: string, 
    imageType: string
  ): Promise<IImage> {
    try {
      // 计算文件哈希
      const md5Hash = crypto.createHash('md5').update(buffer).digest('hex');
      const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex');

      // 检查是否已存在相同的图片
      const existingImage = await Image.findOne({ md5Hash, productId, type: imageType });
      if (existingImage) {
        console.log(`图片已存在，复用: ${existingImage.imageId}`);
        return existingImage;
      }

      // 验证图片类型
      if (!ImagePathUtils.isValidImageType(imageType)) {
        throw new Error(`不支持的图片类型: ${imageType}`);
      }

      // 获取图片信息
      const imageInfo = await sharp(buffer).metadata();
      const mimeType = ImagePathUtils.getMimeType(filename);

      // 使用统一的路径生成方法
      const ext = path.extname(filename) || `.${imageInfo.format}`;
      const objectName = ImagePathUtils.buildProductImagePath(productId, imageType) + ext;

      // 上传到MinIO
      await this.minioClient.putObject(
        this.bucketName,
        objectName,
        buffer,
        buffer.length,
        {
          'Content-Type': mimeType,
          'X-Amz-Meta-Original-Name': filename,
          'X-Amz-Meta-Upload-Time': new Date().toISOString(),
          'X-Amz-Meta-MD5': md5Hash,
          'X-Amz-Meta-SHA256': sha256Hash
        }
      );

      // 生成公开访问URL
      const publicUrl = ImagePathUtils.buildPublicUrl(objectName);

      // 生成缩略图
      const thumbnails = await this.generateThumbnails(buffer, objectName);

      // 创建数据库记录
      const imageRecord = new Image({
        imageId: this.generateImageId(productId, imageType),
        productId,
        type: imageType,
        bucketName: this.bucketName,
        objectName,
        originalName: filename,
        fileSize: buffer.length,
        mimeType,
        width: imageInfo.width,
        height: imageInfo.height,
        publicUrl,
        processStatus: 'completed',
        thumbnails,
        md5Hash,
        sha256Hash,
        isActive: true,
        isPublic: true
      });

      await imageRecord.save();
      console.log(`图片上传成功: ${imageRecord.imageId}`);

      return imageRecord;
    } catch (error) {
      console.error('图片上传失败:', error);
      throw new Error(`图片上传失败: ${(error as Error).message}`);
    }
  }

  /**
   * 生成缩略图
   */
  private async generateThumbnails(buffer: Buffer, originalObjectName: string): Promise<any[]> {
    const thumbnails = [];

    for (const [sizeName, sizeConfig] of Object.entries(IMAGE_CONFIG.THUMBNAIL_SIZES)) {
      try {
        // 生成缩略图
        const thumbnailBuffer = await sharp(buffer)
          .resize(sizeConfig.width, sizeConfig.height, {
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality: sizeConfig.quality })
          .toBuffer();

        // 使用统一的路径生成方法
        const thumbnailObjectName = ImagePathUtils.buildThumbnailPath(sizeName, originalObjectName)
          .replace(/\.(jpg|jpeg|png)$/i, '.webp');

        // 上传缩略图
        await this.minioClient.putObject(
          this.bucketName,
          thumbnailObjectName,
          thumbnailBuffer,
          thumbnailBuffer.length,
          {
            'Content-Type': 'image/webp',
            'X-Amz-Meta-Thumbnail-Size': sizeName,
            'X-Amz-Meta-Original-Object': originalObjectName
          }
        );

        const thumbnailUrl = ImagePathUtils.buildPublicUrl(thumbnailObjectName);

        thumbnails.push({
          size: sizeName,
          url: thumbnailUrl,
          width: sizeConfig.width,
          height: sizeConfig.height
        });

        console.log(`缩略图生成成功: ${thumbnailObjectName}`);
      } catch (error) {
        console.error(`生成${sizeName}缩略图失败:`, error);
      }
    }

    return thumbnails;
  }

  /**
   * 获取图片信息
   */
  async getImageInfo(imageId: string): Promise<IImage | null> {
    try {
      return await Image.findOne({ imageId, isActive: true });
    } catch (error) {
      console.error('获取图片信息失败:', error);
      return null;
    }
  }

  /**
   * 获取图片代理URL
   */
  async getImageProxy(
    imageId: string, 
    options: { width?: number; height?: number; quality?: number; format?: string } = {}
  ): Promise<string | null> {
    try {
      const image = await this.getImageInfo(imageId);
      if (!image) return null;

      // 更新访问统计
      await Image.updateOne(
        { imageId },
        { 
          $inc: { accessCount: 1 }, 
          $set: { lastAccessedAt: new Date() } 
        }
      );

      // 如果有指定参数，返回处理后的图片URL
      if (options.width || options.height || options.quality || options.format) {
        return this.generateProcessedImageUrl(image, options);
      }

      // 如果请求缩略图
      if (options.width && options.width <= 150) {
        const thumbnail = image.thumbnails.find(t => t.size === 'small');
        return thumbnail ? thumbnail.url : image.publicUrl;
      } else if (options.width && options.width <= 300) {
        const thumbnail = image.thumbnails.find(t => t.size === 'medium');
        return thumbnail ? thumbnail.url : image.publicUrl;
      } else if (options.width && options.width <= 600) {
        const thumbnail = image.thumbnails.find(t => t.size === 'large');
        return thumbnail ? thumbnail.url : image.publicUrl;
      }

      return image.publicUrl;
    } catch (error) {
      console.error('获取图片代理URL失败:', error);
      return null;
    }
  }

  /**
   * 实时图片处理
   */
  async processImageOnDemand(
    imageId: string,
    options: { width?: number; height?: number; quality?: number; format?: string }
  ): Promise<Buffer | null> {
    try {
      const image = await this.getImageInfo(imageId);
      if (!image) return null;

      // 获取原始图片
      const originalStream = await this.minioClient.getObject(this.bucketName, image.objectName);
      const originalBuffer = await this.streamToBuffer(originalStream);

      // 处理图片
      let processedBuffer = sharp(originalBuffer);

      if (options.width || options.height) {
        processedBuffer = processedBuffer.resize(options.width, options.height, {
          fit: 'cover',
          position: 'center'
        });
      }

      // 格式转换
      switch (options.format) {
        case 'webp':
          processedBuffer = processedBuffer.webp({ quality: options.quality || 85 });
          break;
        case 'jpeg':
          processedBuffer = processedBuffer.jpeg({ quality: options.quality || 90, progressive: true });
          break;
        case 'png':
          processedBuffer = processedBuffer.png({ compressionLevel: 6 });
          break;
        default:
          if (options.quality) {
            processedBuffer = processedBuffer.jpeg({ quality: options.quality, progressive: true });
          }
      }

      return await processedBuffer.toBuffer();
    } catch (error) {
      console.error('实时图片处理失败:', error);
      return null;
    }
  }

  /**
   * 删除图片
   */
  async deleteImage(imageId: string): Promise<boolean> {
    try {
      const image = await Image.findOne({ imageId });
      if (!image) return false;

      // 删除MinIO中的文件
      await this.minioClient.removeObject(this.bucketName, image.objectName);

      // 删除缩略图
      for (const thumbnail of image.thumbnails) {
        const thumbnailObjectName = thumbnail.url.split(`/${this.bucketName}/`)[1];
        try {
          await this.minioClient.removeObject(this.bucketName, thumbnailObjectName);
        } catch (error) {
          console.warn(`删除缩略图失败: ${thumbnailObjectName}`, error);
        }
      }

      // 软删除数据库记录
      await Image.updateOne({ imageId }, { isActive: false });

      console.log(`图片删除成功: ${imageId}`);
      return true;
    } catch (error) {
      console.error('删除图片失败:', error);
      return false;
    }
  }

  /**
   * 批量上传产品图片
   */
  async uploadProductImages(
    productId: string,
    images: { buffer: Buffer; filename: string; type: string }[]
  ): Promise<IImage[]> {
    const results: IImage[] = [];

    for (const imageData of images) {
      try {
        const result = await this.uploadImage(
          imageData.buffer,
          imageData.filename,
          productId,
          imageData.type
        );
        results.push(result);
      } catch (error) {
        console.error(`上传图片失败 ${imageData.filename}:`, error);
      }
    }

    return results;
  }

  /**
   * 获取产品的所有图片
   */
  async getProductImages(productId: string): Promise<IImage[]> {
    try {
      return await Image.find({ 
        productId, 
        isActive: true 
      }).sort({ type: 1 });
    } catch (error) {
      console.error('获取产品图片失败:', error);
      return [];
    }
  }

  /**
   * 辅助方法
   */
  private generateImageId(productId: string, type: string): string {
    return `${productId}_${type}_${Date.now()}`;
  }

  private generateProcessedImageUrl(
    image: IImage, 
    options: { width?: number; height?: number; quality?: number; format?: string }
  ): string {
    const params = new URLSearchParams();
    if (options.width) params.set('width', options.width.toString());
    if (options.height) params.set('height', options.height.toString());
    if (options.quality) params.set('quality', options.quality.toString());
    if (options.format) params.set('format', options.format);

    return `/api/v1/images/proxy/${image.imageId}?${params.toString()}`;
  }

  private async streamToBuffer(stream: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; bucketExists: boolean; error?: string }> {
    try {
      const bucketExists = await this.minioClient.bucketExists(this.bucketName);
      return { status: 'ok', bucketExists };
    } catch (error) {
      return { status: 'error', bucketExists: false, error: (error as Error).message };
    }
  }

  /**
   * 从飞书下载图片并上传到MinIO
   */
  async downloadFromFeishu(
    fileToken: string, 
    productId: string, 
    imageType: string
  ): Promise<IImage> {
    try {
      this.logger.info('从飞书下载图片', { fileToken, productId, imageType });

      // 检查是否已经下载过这个图片
      const existingImage = await Image.findOne({ 
        productId, 
        type: imageType,
        'metadata.feishuFileToken': fileToken,
        isActive: true 
      });

      if (existingImage) {
        this.logger.info('图片已存在，跳过下载', { 
          imageId: existingImage.imageId,
          fileToken 
        });
        return existingImage;
      }

      // 从飞书下载图片
      const feishuService = getFeishuApiService();
      const imageBuffer = await feishuService.downloadImage(fileToken);

      // 生成文件名
      const filename = this.generateFeishuImageName(productId, imageType, fileToken);

      // 上传到MinIO
      const imageRecord = await this.uploadImage(imageBuffer, filename, productId, imageType);

      // 添加飞书相关的元数据
      await Image.updateOne(
        { imageId: imageRecord.imageId },
        {
          $set: {
            'metadata.feishuFileToken': fileToken,
            'metadata.source': 'feishu',
            'metadata.downloadTime': new Date()
          }
        }
      );

      this.logger.info('飞书图片下载成功', {
        imageId: imageRecord.imageId,
        fileToken,
        size: imageBuffer.length
      });

      return imageRecord;
    } catch (error) {
      this.logger.error('飞书图片下载失败', error, { fileToken, productId, imageType });
      throw new Error(`飞书图片下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量下载飞书图片
   */
  async batchDownloadFromFeishu(
    imageJobs: Array<{
      productId: string;
      imageType: string;
      fileTokens: string[];
    }>
  ): Promise<{
    successful: IImage[];
    failed: Array<{
      productId: string;
      imageType: string;
      fileToken: string;
      error: string;
    }>;
  }> {
    const successful: IImage[] = [];
    const failed: Array<{
      productId: string;
      imageType: string;
      fileToken: string;
      error: string;
    }> = [];

    this.logger.info('开始批量下载飞书图片', { jobCount: imageJobs.length });

    // 并发控制，避免过多同时下载
    const concurrency = parseInt(process.env.SYNC_CONCURRENT_IMAGES || '5');
    
    for (let i = 0; i < imageJobs.length; i += concurrency) {
      const batch = imageJobs.slice(i, i + concurrency);
      
      const downloadPromises = batch.map(async (job) => {
        const { productId, imageType, fileTokens } = job;
        
        // 通常一个图片字段可能包含多个文件，我们取第一个
        const fileToken = fileTokens[0];
        if (!fileToken) return;

        try {
          const imageRecord = await this.downloadFromFeishu(fileToken, productId, imageType);
          successful.push(imageRecord);
        } catch (error) {
          failed.push({
            productId,
            imageType,
            fileToken,
            error: error instanceof Error ? error.message : '未知错误'
          });
        }
      });

      await Promise.all(downloadPromises);

      // 批次间延时，避免过于频繁的请求
      if (i + concurrency < imageJobs.length) {
        await this.sleep(500);
      }
    }

    this.logger.info('批量下载飞书图片完成', {
      total: imageJobs.length,
      successful: successful.length,
      failed: failed.length
    });

    return { successful, failed };
  }

  /**
   * 验证图片完整性
   */
  async validateImageIntegrity(objectName: string): Promise<{
    exists: boolean;
    accessible: boolean;
    size?: number;
    error?: string;
  }> {
    try {
      const stat = await this.minioClient.statObject(this.bucketName, objectName);
      
      return {
        exists: true,
        accessible: true,
        size: stat.size
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      return {
        exists: false,
        accessible: false,
        error: errorMessage
      };
    }
  }

  /**
   * 修复损坏的图片
   */
  async repairBrokenImages(): Promise<{
    total: number;
    repaired: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      total: 0,
      repaired: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      this.logger.info('开始检查和修复损坏的图片...');

      // 查找所有活跃的图片记录
      const images = await Image.find({ isActive: true }).lean();
      result.total = images.length;

      for (const image of images) {
        try {
          // 验证图片是否存在且可访问
          const integrity = await this.validateImageIntegrity(image.objectName);
          
          if (!integrity.exists || !integrity.accessible) {
            this.logger.warn('发现损坏的图片', {
              imageId: image.imageId,
              objectName: image.objectName,
              error: integrity.error
            });

            // 尝试从飞书重新下载（如果有飞书文件令牌）
            if (image.metadata?.feishuFileToken) {
              try {
                const feishuService = getFeishuApiService();
                const imageBuffer = await feishuService.downloadImage(image.metadata.feishuFileToken);
                
                // 重新上传到MinIO
                await this.minioClient.putObject(
                  this.bucketName,
                  image.objectName,
                  imageBuffer,
                  imageBuffer.length,
                  {
                    'Content-Type': image.mimeType,
                    'X-Amz-Meta-Repair-Time': new Date().toISOString(),
                    'X-Amz-Meta-Source': 'feishu-repair'
                  }
                );

                result.repaired++;
                this.logger.info('图片修复成功', {
                  imageId: image.imageId,
                  objectName: image.objectName
                });
              } catch (repairError) {
                result.failed++;
                const errorMsg = `修复失败 ${image.imageId}: ${repairError instanceof Error ? repairError.message : '未知错误'}`;
                result.errors.push(errorMsg);
                this.logger.error('图片修复失败', repairError, {
                  imageId: image.imageId
                });
              }
            } else {
              // 没有飞书文件令牌，标记为不可修复
              result.failed++;
              const errorMsg = `无法修复 ${image.imageId}: 缺少飞书文件令牌`;
              result.errors.push(errorMsg);
            }
          }
        } catch (error) {
          result.failed++;
          const errorMsg = `检查失败 ${image.imageId}: ${error instanceof Error ? error.message : '未知错误'}`;
          result.errors.push(errorMsg);
        }
      }

      this.logger.info('图片修复完成', result);
      return result;
    } catch (error) {
      this.logger.error('图片修复过程失败', error);
      throw new Error(`图片修复失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 清理未使用的图片
   */
  async cleanupUnusedImages(): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    const result = {
      cleaned: 0,
      errors: [] as string[]
    };

    try {
      this.logger.info('开始清理未使用的图片...');

      // 查找所有非活跃的图片
      const unusedImages = await Image.find({ isActive: false }).lean();

      for (const image of unusedImages) {
        try {
          // 从MinIO删除文件
          await this.minioClient.removeObject(this.bucketName, image.objectName);

          // 删除缩略图
          for (const thumbnail of image.thumbnails) {
            const thumbnailPath = thumbnail.url.split(`/${this.bucketName}/`)[1];
            if (thumbnailPath) {
              try {
                await this.minioClient.removeObject(this.bucketName, thumbnailPath);
              } catch (thumbError) {
                this.logger.warn('删除缩略图失败', thumbError, {
                  thumbnailPath,
                  imageId: image.imageId
                });
              }
            }
          }

          // 从数据库删除记录
          await Image.deleteOne({ imageId: image.imageId });

          result.cleaned++;
          this.logger.debug('清理图片成功', {
            imageId: image.imageId,
            objectName: image.objectName
          });
        } catch (error) {
          const errorMsg = `清理失败 ${image.imageId}: ${error instanceof Error ? error.message : '未知错误'}`;
          result.errors.push(errorMsg);
          this.logger.error('清理图片失败', error, {
            imageId: image.imageId
          });
        }
      }

      this.logger.info('图片清理完成', result);
      return result;
    } catch (error) {
      this.logger.error('图片清理过程失败', error);
      throw new Error(`图片清理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 生成飞书图片文件名
   */
  protected generateFeishuImageName(productId: string, imageType: string, fileToken: string): string {
    // 使用产品ID、图片类型和文件令牌的前8位来生成唯一文件名
    const tokenPrefix = fileToken.substring(0, 8);
    return `${productId}_${imageType}_${tokenPrefix}.jpg`;
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check MinIO connection for health check
   */
  async checkConnection(): Promise<boolean> {
    try {
      // Try to check if bucket exists as a simple connection test
      const exists = await this.minioClient.bucketExists(this.bucketName);
      return true; // If no error thrown, connection is working
    } catch (error) {
      this.logger.warn('MinIO连接检查失败', error);
      return false;
    }
  }
}

export const imageService = new ImageService();