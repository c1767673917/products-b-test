import { FastifyRequest, FastifyReply } from 'fastify';
import { imageService } from '../services/imageService';
import { Image } from '../models/Image';

interface ImageProxyQuery {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

interface ImageUploadBody {
  productId: string;
  type: 'front' | 'back' | 'label' | 'package' | 'gift';
}

export class ImageController {
  /**
   * 获取图片信息
   */
  static async getImageInfo(
    request: FastifyRequest<{ Params: { imageId: string } }>, 
    reply: FastifyReply
  ) {
    try {
      const { imageId } = request.params;

      const image = await imageService.getImageInfo(imageId);
      if (!image) {
        return reply.status(404).send({
          success: false,
          error: { message: '图片不存在' }
        });
      }

      return {
        success: true,
        data: {
          imageId: image.imageId,
          productId: image.productId,
          type: image.type,
          originalName: image.originalName,
          fileSize: image.fileSize,
          mimeType: image.mimeType,
          width: image.width,
          height: image.height,
          publicUrl: image.publicUrl,
          thumbnails: image.thumbnails,
          processStatus: image.processStatus,
          uploadedAt: image.uploadedAt,
          accessCount: image.accessCount
        }
      };
    } catch (error) {
      request.log.error('获取图片信息失败:', error);
      return reply.status(500).send({
        success: false,
        error: { message: '获取图片信息失败' }
      });
    }
  }

  /**
   * 图片代理访问
   */
  static async proxyImage(
    request: FastifyRequest<{
      Params: { imageId: string };
      Querystring: ImageProxyQuery;
    }>, 
    reply: FastifyReply
  ) {
    try {
      const { imageId } = request.params;
      const { width, height, quality, format } = request.query;

      // 如果有处理参数，返回处理后的图片
      if (width || height || quality || format) {
        const processedBuffer = await imageService.processImageOnDemand(imageId, {
          width: width ? parseInt(String(width)) : undefined,
          height: height ? parseInt(String(height)) : undefined,
          quality: quality ? parseInt(String(quality)) : undefined,
          format
        });

        if (!processedBuffer) {
          return reply.status(404).send({
            success: false,
            error: { message: '图片不存在或处理失败' }
          });
        }

        // 设置响应头
        const mimeType = format ? `image/${format}` : 'image/jpeg';
        reply.header('Content-Type', mimeType);
        reply.header('Cache-Control', 'public, max-age=31536000'); // 1年缓存
        reply.header('ETag', `"${imageId}-${width || 0}-${height || 0}-${quality || 0}-${format || 'original'}"`);

        return reply.send(processedBuffer);
      }

      // 否则获取最佳匹配的URL并重定向
      const imageUrl = await imageService.getImageProxy(imageId, {
        width: width ? parseInt(String(width)) : undefined,
        height: height ? parseInt(String(height)) : undefined
      });

      if (!imageUrl) {
        return reply.status(404).send({
          success: false,
          error: { message: '图片不存在' }
        });
      }

      // 如果是内部URL，重定向到MinIO
      if (imageUrl.startsWith('http')) {
        return reply.redirect(imageUrl);
      }

      // 如果是相对URL，返回JSON响应
      return {
        success: true,
        data: { url: imageUrl }
      };
    } catch (error) {
      request.log.error('图片代理访问失败:', error);
      return reply.status(500).send({
        success: false,
        error: { message: '图片访问失败' }
      });
    }
  }

  /**
   * 上传单个图片
   */
  static async uploadSingle(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          success: false,
          error: { message: '未找到上传文件' }
        });
      }

      const buffer = await data.toBuffer();
      const filename = data.filename;

      // 从fields中获取productId和type
      const productId = (request.body as any)?.productId;
      const type = (request.body as any)?.type;

      if (!productId || !type) {
        return reply.status(400).send({
          success: false,
          error: { message: 'productId和type参数必需' }
        });
      }

      // 验证参数
      const validationResult = ImageController.validateUploadParams(data, type, buffer);
      if (!validationResult.valid) {
        return reply.status(400).send({
          success: false,
          error: { message: validationResult.message }
        });
      }

      const image = await imageService.uploadImage(buffer, filename, productId, type);

      return {
        success: true,
        data: {
          imageId: image.imageId,
          productId: image.productId,
          type: image.type,
          publicUrl: image.publicUrl,
          thumbnails: image.thumbnails,
          fileSize: image.fileSize,
          width: image.width,
          height: image.height
        },
        message: '图片上传成功'
      };
    } catch (error) {
      request.log.error('图片上传失败:', error);
      return reply.status(500).send({
        success: false,
        error: { message: `图片上传失败: ${(error as Error).message}` }
      });
    }
  }

  /**
   * 批量上传产品图片
   */
  static async uploadBatch(request: FastifyRequest, reply: FastifyReply) {
    try {
      const parts = request.parts();
      const files: { buffer: Buffer; filename: string; type: string }[] = [];
      let productId = '';

      for await (const part of parts) {
        if (part.type === 'field') {
          if (part.fieldname === 'productId') {
            productId = part.value as string;
          }
        } else if (part.type === 'file') {
          const buffer = await part.toBuffer();
          const type = part.fieldname; // 假设fieldname就是图片类型

          // 验证图片类型
          const validTypes = ['front', 'back', 'label', 'package', 'gift'];
          if (!validTypes.includes(type)) {
            continue; // 跳过无效类型
          }

          // 验证文件类型
          const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
          if (!allowedMimeTypes.includes(part.mimetype)) {
            continue; // 跳过不支持的格式
          }

          files.push({
            buffer,
            filename: part.filename,
            type
          });
        }
      }

      if (!productId) {
        return reply.status(400).send({
          success: false,
          error: { message: 'productId参数必需' }
        });
      }

      if (files.length === 0) {
        return reply.status(400).send({
          success: false,
          error: { message: '未找到有效的图片文件' }
        });
      }

      const results = await imageService.uploadProductImages(productId, files);

      return {
        success: true,
        data: {
          productId,
          images: results.map(img => ({
            imageId: img.imageId,
            type: img.type,
            publicUrl: img.publicUrl,
            thumbnails: img.thumbnails,
            fileSize: img.fileSize,
            width: img.width,
            height: img.height
          })),
          total: results.length
        },
        message: `成功上传 ${results.length} 张图片`
      };
    } catch (error) {
      request.log.error('批量图片上传失败:', error);
      return reply.status(500).send({
        success: false,
        error: { message: `批量图片上传失败: ${(error as Error).message}` }
      });
    }
  }

  /**
   * 获取产品的所有图片
   */
  static async getProductImages(
    request: FastifyRequest<{ Params: { productId: string } }>, 
    reply: FastifyReply
  ) {
    try {
      const { productId } = request.params;

      const images = await imageService.getProductImages(productId);

      return {
        success: true,
        data: {
          productId,
          images: images.map(img => ({
            imageId: img.imageId,
            type: img.type,
            publicUrl: img.publicUrl,
            thumbnails: img.thumbnails,
            fileSize: img.fileSize,
            width: img.width,
            height: img.height,
            uploadedAt: img.uploadedAt,
            accessCount: img.accessCount
          })),
          total: images.length
        }
      };
    } catch (error) {
      request.log.error('获取产品图片失败:', error);
      return reply.status(500).send({
        success: false,
        error: { message: '获取产品图片失败' }
      });
    }
  }

  /**
   * 删除图片
   */
  static async deleteImage(
    request: FastifyRequest<{ Params: { imageId: string } }>, 
    reply: FastifyReply
  ) {
    try {
      const { imageId } = request.params;

      const success = await imageService.deleteImage(imageId);
      if (!success) {
        return reply.status(404).send({
          success: false,
          error: { message: '图片不存在或删除失败' }
        });
      }

      return {
        success: true,
        message: '图片删除成功'
      };
    } catch (error) {
      request.log.error('删除图片失败:', error);
      return reply.status(500).send({
        success: false,
        error: { message: '删除图片失败' }
      });
    }
  }

  /**
   * 图片服务健康检查
   */
  static async healthCheck(request: FastifyRequest, reply: FastifyReply) {
    try {
      const healthStatus = await imageService.healthCheck();
      
      const statusCode = healthStatus.status === 'ok' ? 200 : 503;
      
      return reply.status(statusCode).send({
        success: healthStatus.status === 'ok',
        data: {
          status: healthStatus.status,
          minioConnection: healthStatus.bucketExists ? 'connected' : 'disconnected',
          bucketExists: healthStatus.bucketExists,
          timestamp: new Date().toISOString()
        },
        error: healthStatus.error ? { message: healthStatus.error } : undefined
      });
    } catch (error) {
      request.log.error('图片服务健康检查失败:', error);
      return reply.status(503).send({
        success: false,
        error: { message: '图片服务健康检查失败' }
      });
    }
  }

  /**
   * 获取图片统计信息
   */
  static async getStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await Image.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: null,
            totalImages: { $sum: 1 },
            totalSize: { $sum: '$fileSize' },
            avgAccessCount: { $avg: '$accessCount' },
            typeDistribution: {
              $push: '$type'
            }
          }
        },
        {
          $project: {
            _id: 0,
            totalImages: 1,
            totalSize: 1,
            avgAccessCount: { $round: ['$avgAccessCount', 2] },
            typeDistribution: 1
          }
        }
      ]);

      const typeStats = await Image.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalSize: { $sum: '$fileSize' }
          }
        }
      ]);

      const result = stats[0] || {
        totalImages: 0,
        totalSize: 0,
        avgAccessCount: 0
      };

      // 处理类型分布
      const typeDistribution = typeStats.reduce((acc, item) => {
        acc[item._id] = {
          count: item.count,
          totalSize: item.totalSize
        };
        return acc;
      }, {});

      return {
        success: true,
        data: {
          ...result,
          typeDistribution,
          totalSizeMB: Math.round(result.totalSize / (1024 * 1024) * 100) / 100
        }
      };
    } catch (error) {
      request.log.error('获取图片统计失败:', error);
      return reply.status(500).send({
        success: false,
        error: { message: '获取图片统计失败' }
      });
    }
  }

  /**
   * 验证上传参数
   */
  private static validateUploadParams(data: any, type: string, buffer: Buffer): { valid: boolean; message?: string } {
    // 验证图片类型
    const validTypes = ['front', 'back', 'label', 'package', 'gift'];
    if (!validTypes.includes(type)) {
      return { valid: false, message: '无效的图片类型' };
    }

    // 验证文件类型
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(data.mimetype)) {
      return { valid: false, message: '不支持的文件格式，请上传 JPEG、PNG 或 WebP 格式' };
    }

    // 验证文件大小 (最大 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (buffer.length > maxSize) {
      return { valid: false, message: '文件大小不能超过 10MB' };
    }

    return { valid: true };
  }
}