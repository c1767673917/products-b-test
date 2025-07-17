import { FastifyInstance } from 'fastify';
import { ImageController } from '../controllers/imageController';

export async function imageRoutes(fastify: FastifyInstance) {

  /**
   * 获取图片信息
   * GET /api/v1/images/:imageId
   */
  fastify.get('/:imageId', ImageController.getImageInfo);

  /**
   * 图片代理访问（支持实时处理）
   * GET /api/v1/images/proxy/:imageId
   */
  fastify.get('/proxy/:imageId', ImageController.proxyImage);

  /**
   * 上传单个图片
   * POST /api/v1/images/upload
   */
  fastify.post('/upload', ImageController.uploadSingle);

  /**
   * 批量上传产品图片
   * POST /api/v1/images/upload/batch
   */
  fastify.post('/upload/batch', ImageController.uploadBatch);

  /**
   * 获取产品的所有图片
   * GET /api/v1/images/product/:productId
   */
  fastify.get('/product/:productId', ImageController.getProductImages);

  /**
   * 删除图片
   * DELETE /api/v1/images/:imageId
   */
  fastify.delete('/:imageId', ImageController.deleteImage);

  /**
   * 图片服务健康检查
   * GET /api/v1/images/health
   */
  fastify.get('/health', ImageController.healthCheck);

  /**
   * 获取图片统计信息
   * GET /api/v1/images/stats
   */
  fastify.get('/stats', ImageController.getStats);
}