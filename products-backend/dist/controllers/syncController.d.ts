import { FastifyRequest, FastifyReply } from 'fastify';
export declare class SyncController {
    /**
     * 同步产品数据
     * POST /api/v1/sync/products
     */
    syncProducts(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * 同步图片数据
     * POST /api/v1/sync/images
     */
    syncImages(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * 获取同步状态
     * GET /api/v1/sync/status
     */
    getSyncStatus(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * 获取同步历史
     * GET /api/v1/sync/history
     */
    getSyncHistory(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * 验证数据一致性
     * POST /api/v1/sync/validate
     */
    validateDataConsistency(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * 修复数据问题
     * POST /api/v1/sync/repair
     */
    repairDataIssues(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    private checkProductsWithoutImages;
    private checkDuplicateProducts;
    private checkMissingImageFiles;
    private repairMissingImageRecords;
    private repairDuplicateProducts;
}
export declare const syncController: SyncController;
//# sourceMappingURL=syncController.d.ts.map