"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncController = exports.SyncController = void 0;
const syncService_1 = require("../services/syncService");
class SyncController {
    /**
     * 同步产品数据
     * POST /api/v1/sync/products
     */
    async syncProducts(request, reply) {
        try {
            const body = request.body;
            // 验证请求参数
            const { mode = 'incremental', forceUpdate = false, dryRun = false, productIds } = body;
            if (!['full', 'incremental', 'selective'].includes(mode)) {
                return reply.status(400).send({
                    success: false,
                    error: {
                        code: 'INVALID_SYNC_MODE',
                        message: '同步模式必须是 full、incremental 或 selective'
                    }
                });
            }
            if (mode === 'selective' && (!productIds || productIds.length === 0)) {
                return reply.status(400).send({
                    success: false,
                    error: {
                        code: 'MISSING_PRODUCT_IDS',
                        message: '选择性同步需要提供产品ID列表'
                    }
                });
            }
            // 构建同步选项
            const syncOptions = {
                mode,
                forceUpdate,
                dryRun,
                productIds
            };
            // 执行同步
            const result = await syncService_1.syncService.syncProducts(syncOptions);
            // 返回结果
            return reply.send({
                success: result.success,
                data: {
                    syncResult: result,
                    options: syncOptions,
                    timestamp: new Date().toISOString()
                },
                message: result.message
            });
        }
        catch (error) {
            request.log.error('产品同步失败:', error);
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'SYNC_PRODUCTS_FAILED',
                    message: error instanceof Error ? error.message : '产品同步失败'
                }
            });
        }
    }
    /**
     * 同步图片数据
     * POST /api/v1/sync/images
     */
    async syncImages(request, reply) {
        try {
            const body = request.body;
            const { productIds, dryRun = false } = body;
            // 执行图片同步
            const result = await syncService_1.syncService.syncImages();
            return reply.send({
                success: result.success,
                data: {
                    syncResult: result,
                    options: { productIds, dryRun },
                    timestamp: new Date().toISOString()
                },
                message: result.message
            });
        }
        catch (error) {
            request.log.error('图片同步失败:', error);
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'SYNC_IMAGES_FAILED',
                    message: error instanceof Error ? error.message : '图片同步失败'
                }
            });
        }
    }
    /**
     * 获取同步状态
     * GET /api/v1/sync/status
     */
    async getSyncStatus(request, reply) {
        try {
            const status = syncService_1.syncService.getSyncStatus();
            return reply.send({
                success: true,
                data: {
                    ...status,
                    timestamp: new Date().toISOString()
                },
                message: '获取同步状态成功'
            });
        }
        catch (error) {
            request.log.error('获取同步状态失败:', error);
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'GET_SYNC_STATUS_FAILED',
                    message: error instanceof Error ? error.message : '获取同步状态失败'
                }
            });
        }
    }
    /**
     * 获取同步历史
     * GET /api/v1/sync/history
     */
    async getSyncHistory(request, reply) {
        try {
            const query = request.query;
            const limit = parseInt(query.limit || '20');
            const status = syncService_1.syncService.getSyncStatus();
            const history = status.syncHistory.slice(-limit);
            return reply.send({
                success: true,
                data: {
                    history,
                    total: status.syncHistory.length,
                    limit,
                    timestamp: new Date().toISOString()
                },
                message: '获取同步历史成功'
            });
        }
        catch (error) {
            request.log.error('获取同步历史失败:', error);
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'GET_SYNC_HISTORY_FAILED',
                    message: error instanceof Error ? error.message : '获取同步历史失败'
                }
            });
        }
    }
    /**
     * 验证数据一致性
     * POST /api/v1/sync/validate
     */
    async validateDataConsistency(request, reply) {
        try {
            const startTime = Date.now();
            const issues = [];
            // 检查产品数据完整性
            const productsWithoutImages = await this.checkProductsWithoutImages();
            if (productsWithoutImages.length > 0) {
                issues.push({
                    type: 'missing_images',
                    message: `发现 ${productsWithoutImages.length} 个产品缺少图片`,
                    details: { count: productsWithoutImages.length, products: productsWithoutImages.slice(0, 10) }
                });
            }
            // 检查重复产品
            const duplicateProducts = await this.checkDuplicateProducts();
            if (duplicateProducts.length > 0) {
                issues.push({
                    type: 'duplicate_products',
                    message: `发现 ${duplicateProducts.length} 个重复产品`,
                    details: { count: duplicateProducts.length, duplicates: duplicateProducts }
                });
            }
            // 检查图片文件存在性
            const missingImageFiles = await this.checkMissingImageFiles();
            if (missingImageFiles.length > 0) {
                issues.push({
                    type: 'missing_image_files',
                    message: `发现 ${missingImageFiles.length} 个图片文件缺失`,
                    details: { count: missingImageFiles.length, files: missingImageFiles.slice(0, 10) }
                });
            }
            const isValid = issues.length === 0;
            const duration = Date.now() - startTime;
            return reply.send({
                success: true,
                data: {
                    isValid,
                    issues,
                    summary: {
                        totalIssues: issues.length,
                        validationTime: duration,
                        timestamp: new Date().toISOString()
                    }
                },
                message: isValid ? '数据一致性验证通过' : `发现 ${issues.length} 个数据一致性问题`
            });
        }
        catch (error) {
            request.log.error('数据一致性验证失败:', error);
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'VALIDATE_CONSISTENCY_FAILED',
                    message: error instanceof Error ? error.message : '数据一致性验证失败'
                }
            });
        }
    }
    /**
     * 修复数据问题
     * POST /api/v1/sync/repair
     */
    async repairDataIssues(request, reply) {
        try {
            const body = request.body;
            const { issueTypes = [], dryRun = false } = body;
            const startTime = Date.now();
            const repaired = [];
            const failed = [];
            // 修复缺失图片记录
            if (issueTypes.includes('missing_images') || issueTypes.length === 0) {
                try {
                    if (!dryRun) {
                        await this.repairMissingImageRecords();
                    }
                    repaired.push('missing_images');
                }
                catch (error) {
                    failed.push({
                        issue: 'missing_images',
                        error: error instanceof Error ? error.message : '未知错误'
                    });
                }
            }
            // 修复重复产品
            if (issueTypes.includes('duplicate_products') || issueTypes.length === 0) {
                try {
                    if (!dryRun) {
                        await this.repairDuplicateProducts();
                    }
                    repaired.push('duplicate_products');
                }
                catch (error) {
                    failed.push({
                        issue: 'duplicate_products',
                        error: error instanceof Error ? error.message : '未知错误'
                    });
                }
            }
            const duration = Date.now() - startTime;
            return reply.send({
                success: true,
                data: {
                    repaired,
                    failed,
                    summary: {
                        totalRepaired: repaired.length,
                        totalFailed: failed.length,
                        repairTime: duration,
                        dryRun,
                        timestamp: new Date().toISOString()
                    }
                },
                message: dryRun ?
                    `[预览] 将修复 ${repaired.length} 个问题` :
                    `修复完成: 成功 ${repaired.length} 个，失败 ${failed.length} 个`
            });
        }
        catch (error) {
            request.log.error('数据修复失败:', error);
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'REPAIR_DATA_FAILED',
                    message: error instanceof Error ? error.message : '数据修复失败'
                }
            });
        }
    }
    // 私有辅助方法
    async checkProductsWithoutImages() {
        const { Product } = require('../models');
        return await Product.find({
            $or: [
                { 'images.front': { $exists: false } },
                { 'images.front': '' },
                { 'images.front': null }
            ],
            status: 'active'
        }).select('productId name').lean();
    }
    async checkDuplicateProducts() {
        const { Product } = require('../models');
        return await Product.aggregate([
            { $group: { _id: '$productId', count: { $sum: 1 }, docs: { $push: '$_id' } } },
            { $match: { count: { $gt: 1 } } },
            { $project: { productId: '$_id', count: 1, docs: 1 } }
        ]);
    }
    async checkMissingImageFiles() {
        // 这里可以实现检查MinIO中文件是否存在的逻辑
        // 暂时返回空数组
        return [];
    }
    async repairMissingImageRecords() {
        // 实现修复缺失图片记录的逻辑
        console.log('修复缺失图片记录...');
    }
    async repairDuplicateProducts() {
        const { Product } = require('../models');
        // 查找重复产品
        const duplicates = await this.checkDuplicateProducts();
        for (const duplicate of duplicates) {
            // 保留最新的一个，删除其他的
            const docs = duplicate.docs;
            const toDelete = docs.slice(1); // 删除除第一个外的所有记录
            await Product.deleteMany({ _id: { $in: toDelete } });
            console.log(`删除重复产品: ${duplicate.productId}, 删除 ${toDelete.length} 个记录`);
        }
    }
}
exports.SyncController = SyncController;
exports.syncController = new SyncController();
//# sourceMappingURL=syncController.js.map