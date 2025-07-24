import { FastifyRequest, FastifyReply } from 'fastify';
import { enhancedImageService } from '../services/enhancedImageService';
import { Product } from '../models/Product';
import { Image } from '../models/Image';

interface ProductImageParams {
  productId: string;
  imageType?: string;
}

/**
 * 产品图片控制器
 * 处理产品图片相关的API请求
 */
export class ProductImageController {
  /**
   * 获取产品的单个图片信息
   * GET /api/v1/products/:productId/images/:imageType
   */
  static async getProductImage(
    request: FastifyRequest<{ Params: ProductImageParams }>,
    reply: FastifyReply
  ) {
    try {
      const { productId, imageType } = request.params;

      if (!imageType) {
        return reply.status(400).send({
          success: false,
          error: { message: '缺少图片类型参数' }
        });
      }

      // 获取产品记录
      const product = await Product.findOne({ productId }).lean();
      if (!product) {
        return reply.status(404).send({
          success: false,
          error: { message: '产品不存在' }
        });
      }

      // 获取图片信息
      const productImageData = product.images?.[imageType as keyof typeof product.images];
      if (!productImageData) {
        return reply.status(404).send({
          success: false,
          error: { message: `产品不存在${imageType}图片` }
        });
      }

      // 获取Image记录
      const imageRecord = await Image.findOne({ productId, type: imageType });

      let responseData: any;

      if (typeof productImageData === 'object' && 'imageId' in productImageData) {
        // 新的对象结构
        responseData = {
          imageId: productImageData.imageId,
          url: productImageData.url,
          objectName: productImageData.objectName,
          lastUpdated: productImageData.lastUpdated,
          fileSize: productImageData.fileSize,
          mimeType: productImageData.mimeType,
          width: productImageData.width,
          height: productImageData.height,
          hasImageRecord: !!imageRecord
        };
      } else {
        // 旧的字符串结构
        responseData = {
          url: productImageData as string,
          hasImageRecord: !!imageRecord
        };

        // 如果有Image记录，补充详细信息
        if (imageRecord) {
          responseData = {
            ...responseData,
            imageId: imageRecord.imageId,
            objectName: imageRecord.objectName,
            fileSize: imageRecord.fileSize,
            mimeType: imageRecord.mimeType,
            width: imageRecord.width,
            height: imageRecord.height,
            lastUpdated: (imageRecord as any).updatedAt || (imageRecord as any).createdAt
          };
        }
      }

      return {
        success: true,
        data: responseData,
        message: '获取图片信息成功'
      };

    } catch (error) {
      request.log.error('获取产品图片信息失败:', error);
      return reply.status(500).send({
        success: false,
        error: { message: '获取图片信息失败' }
      });
    }
  }

  /**
   * 获取产品的所有图片
   * GET /api/v1/products/:productId/images
   */
  static async getProductImages(
    request: FastifyRequest<{ Params: { productId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { productId } = request.params;

      // 获取产品记录
      const product = await Product.findOne({ productId }).lean();
      if (!product) {
        return reply.status(404).send({
          success: false,
          error: { message: '产品不存在' }
        });
      }

      // 获取所有Image记录
      const imageRecords = await Image.find({ productId });
      const imageRecordMap = new Map(imageRecords.map(img => [img.type, img]));

      const images: any = {};
      const imageTypes = ['front', 'back', 'label', 'package', 'gift'];

      for (const imageType of imageTypes) {
        const productImageData = product.images?.[imageType as keyof typeof product.images];
        const imageRecord = imageRecordMap.get(imageType);

        if (productImageData || imageRecord) {
          let imageInfo: any = {};

          if (typeof productImageData === 'object' && 'imageId' in productImageData) {
            // 新的对象结构
            imageInfo = {
              imageId: productImageData.imageId,
              url: productImageData.url,
              objectName: productImageData.objectName,
              lastUpdated: productImageData.lastUpdated,
              fileSize: productImageData.fileSize,
              mimeType: productImageData.mimeType,
              width: productImageData.width,
              height: productImageData.height
            };
          } else if (typeof productImageData === 'string') {
            // 旧的字符串结构
            imageInfo = {
              url: productImageData
            };
          }

          // 补充Image记录信息
          if (imageRecord) {
            imageInfo = {
              ...imageInfo,
              imageId: imageRecord.imageId,
              objectName: imageRecord.objectName,
              fileSize: imageRecord.fileSize,
              mimeType: imageRecord.mimeType,
              width: imageRecord.width,
              height: imageRecord.height,
              lastUpdated: (imageRecord as any).updatedAt || (imageRecord as any).createdAt,
              syncStatus: imageRecord.syncStatus,
              processStatus: imageRecord.processStatus
            };
          }

          if (Object.keys(imageInfo).length > 0) {
            images[imageType] = imageInfo;
          }
        }
      }

      return {
        success: true,
        data: {
          productId,
          images,
          total: Object.keys(images).length
        },
        message: '获取产品图片成功'
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
   * 验证产品图片一致性
   * GET /api/v1/products/:productId/images/validate
   */
  static async validateImageConsistency(
    request: FastifyRequest<{ Params: { productId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { productId } = request.params;

      // 验证产品是否存在
      const product = await Product.findOne({ productId });
      if (!product) {
        return reply.status(404).send({
          success: false,
          error: { message: '产品不存在' }
        });
      }

      // 执行一致性检查
      const consistencyChecks = await enhancedImageService.validateImageConsistency(productId);

      // 统计结果
      const stats = {
        total: consistencyChecks.length,
        valid: consistencyChecks.filter((c: any) => !Object.values(c.issues).some(Boolean)).length,
        invalid: consistencyChecks.filter((c: any) => Object.values(c.issues).some(Boolean)).length,
        critical: consistencyChecks.filter((c: any) => c.severity === 'critical').length,
        high: consistencyChecks.filter((c: any) => c.severity === 'high').length,
        medium: consistencyChecks.filter((c: any) => c.severity === 'medium').length,
        low: consistencyChecks.filter((c: any) => c.severity === 'low').length
      };

      return {
        success: true,
        data: {
          productId,
          checks: consistencyChecks,
          stats
        },
        message: '图片一致性验证完成'
      };

    } catch (error) {
      request.log.error('验证图片一致性失败:', error);
      return reply.status(500).send({
        success: false,
        error: { message: '验证图片一致性失败' }
      });
    }
  }

  /**
   * 修复产品图片引用
   * POST /api/v1/products/:productId/images/repair
   */
  static async repairProductImages(
    request: FastifyRequest<{ Params: { productId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { productId } = request.params;

      // 验证产品是否存在
      const product = await Product.findOne({ productId });
      if (!product) {
        return reply.status(404).send({
          success: false,
          error: { message: '产品不存在' }
        });
      }

      // 执行修复
      const repairResult = await enhancedImageService.repairImageReferences(productId);

      return {
        success: true,
        data: repairResult,
        message: `图片修复完成，成功修复 ${repairResult.repaired} 个问题`
      };

    } catch (error) {
      request.log.error('修复产品图片失败:', error);
      return reply.status(500).send({
        success: false,
        error: { message: '修复产品图片失败' }
      });
    }
  }

  /**
   * 重新同步产品图片
   * POST /api/v1/products/:productId/images/sync
   */
  static async syncProductImages(
    request: FastifyRequest<{ Params: { productId: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { productId } = request.params;

      // 验证产品是否存在
      const product = await Product.findOne({ productId });
      if (!product) {
        return reply.status(404).send({
          success: false,
          error: { message: '产品不存在' }
        });
      }

      // TODO: 实现从飞书重新同步图片的逻辑
      // 这里需要获取飞书中的图片信息并重新下载

      return {
        success: true,
        data: {
          productId,
          message: '图片同步功能正在开发中'
        },
        message: '图片同步请求已接收'
      };

    } catch (error) {
      request.log.error('同步产品图片失败:', error);
      return reply.status(500).send({
        success: false,
        error: { message: '同步产品图片失败' }
      });
    }
  }
}

export default ProductImageController;
