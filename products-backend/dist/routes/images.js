"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageRoutes = imageRoutes;
const imageController_1 = require("../controllers/imageController");
async function imageRoutes(fastify) {
    /**
     * 获取图片信息
     * GET /api/v1/images/:imageId
     */
    fastify.get('/:imageId', imageController_1.ImageController.getImageInfo);
    /**
     * 图片代理访问（支持实时处理）
     * GET /api/v1/images/proxy/:imageId
     */
    fastify.get('/proxy/:imageId', imageController_1.ImageController.proxyImage);
    /**
     * 上传单个图片
     * POST /api/v1/images/upload
     */
    fastify.post('/upload', imageController_1.ImageController.uploadSingle);
    /**
     * 批量上传产品图片
     * POST /api/v1/images/upload/batch
     */
    fastify.post('/upload/batch', imageController_1.ImageController.uploadBatch);
    /**
     * 获取产品的所有图片
     * GET /api/v1/images/product/:productId
     */
    fastify.get('/product/:productId', imageController_1.ImageController.getProductImages);
    /**
     * 删除图片
     * DELETE /api/v1/images/:imageId
     */
    fastify.delete('/:imageId', imageController_1.ImageController.deleteImage);
    /**
     * 图片服务健康检查
     * GET /api/v1/images/health
     */
    fastify.get('/health', imageController_1.ImageController.healthCheck);
    /**
     * 获取图片统计信息
     * GET /api/v1/images/stats
     */
    fastify.get('/stats', imageController_1.ImageController.getStats);
}
//# sourceMappingURL=images.js.map