import { FastifyRequest, FastifyReply } from 'fastify';
import { syncService, SyncOptions, SyncResult } from '../services/syncService';
import { v4 as uuidv4 } from 'uuid';

interface SyncProductsRequest {
  mode: 'full' | 'incremental' | 'selective';
  forceUpdate?: boolean;
  dryRun?: boolean;
  productIds?: string[];
}

interface SyncImagesRequest {
  productIds?: string[];
  dryRun?: boolean;
}

// Phase 3: Enhanced interfaces following api-design.md
interface SyncFeishuRequest {
  mode: 'full' | 'incremental' | 'selective';
  productIds?: string[];
  options?: {
    downloadImages?: boolean;
    validateData?: boolean;
    dryRun?: boolean;
    batchSize?: number;
    concurrentImages?: number;
  };
}

interface SyncControlRequest {
  action: 'pause' | 'resume' | 'cancel';
  syncId?: string;
}

interface ValidationRequest {
  scope?: 'all' | 'recent' | 'selective';
  productIds?: string[];
  checks?: Array<'data_integrity' | 'image_existence' | 'field_validation'>;
}

interface RepairRequest {
  validationId?: string;
  issueTypes?: string[];
  productIds?: string[];
  dryRun?: boolean;
}

export class SyncController {
  /**
   * 同步产品数据
   * POST /api/v1/sync/products
   */
  async syncProducts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as SyncProductsRequest;
      
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
      const syncOptions: SyncOptions = {
        mode,
        productIds,
        options: {
          dryRun,
          downloadImages: true,
          validateData: true
        }
      };

      // 执行同步
      const result = await syncService.syncFromFeishu(syncOptions);

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

    } catch (error) {
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
  async syncImages(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as SyncImagesRequest;
      const { productIds, dryRun = false } = body;

      // 执行图片同步 (included in main sync process)
      const result = await syncService.syncFromFeishu({
        mode: 'selective',
        productIds,
        options: {
          dryRun,
          downloadImages: true,
          validateData: false
        }
      });

      return reply.send({
        success: result.success,
        data: {
          syncResult: result,
          options: { productIds, dryRun },
          timestamp: new Date().toISOString()
        },
        message: result.message
      });

    } catch (error) {
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
  async getSyncStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const status = syncService.getSyncStatus();

      return reply.send({
        success: true,
        data: {
          ...status,
          timestamp: new Date().toISOString()
        },
        message: '获取同步状态成功'
      });

    } catch (error) {
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
  async getSyncHistory(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as { limit?: string };
      const limit = parseInt(query.limit || '20');

      const history = await syncService.getSyncHistory(limit);

      return reply.send({
        success: true,
        data: {
          history,
          total: history.length,
          limit,
          timestamp: new Date().toISOString()
        },
        message: '获取同步历史成功'
      });

    } catch (error) {
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
  async validateDataConsistency(request: FastifyRequest, reply: FastifyReply) {
    try {
      const startTime = Date.now();
      const issues: Array<{ type: string; message: string; details?: any }> = [];

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

    } catch (error) {
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
  async repairDataIssues(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as { issueTypes?: string[]; dryRun?: boolean };
      const { issueTypes = [], dryRun = false } = body;

      const startTime = Date.now();
      const repaired: string[] = [];
      const failed: Array<{ issue: string; error: string }> = [];

      // 修复缺失图片记录
      if (issueTypes.includes('missing_images') || issueTypes.length === 0) {
        try {
          if (!dryRun) {
            await this.repairMissingImageRecords();
          }
          repaired.push('missing_images');
        } catch (error) {
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
        } catch (error) {
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

    } catch (error) {
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

  private async checkProductsWithoutImages() {
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

  private async checkDuplicateProducts() {
    const { Product } = require('../models');
    return await Product.aggregate([
      { $group: { _id: '$productId', count: { $sum: 1 }, docs: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } },
      { $project: { productId: '$_id', count: 1, docs: 1 } }
    ]);
  }

  private async checkMissingImageFiles() {
    // 这里可以实现检查MinIO中文件是否存在的逻辑
    // 暂时返回空数组
    return [];
  }

  private async repairMissingImageRecords() {
    // 实现修复缺失图片记录的逻辑
    console.log('修复缺失图片记录...');
  }

  private async repairDuplicateProducts() {
    const { Product } = require('../models');
    
    // 查找重复产品
    const duplicates = await this.checkDuplicateProducts();
    
    for (const duplicate of duplicates) {
      // 保留最新的一个，删除其他的
      const docs = duplicate.docs;
      const toDelete = docs.slice(1); // 删除除第一个外的所有记录
      
      await Product.deleteMany({ _id: { $in: toDelete } });
    }
  }

  // Phase 3: Enhanced API methods following api-design.md specifications

  /**
   * 触发飞书数据同步 (新的主要同步端点)
   * POST /api/v1/sync/feishu
   */
  async syncFromFeishu(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as SyncFeishuRequest;
      const requestId = uuidv4();
      
      // 验证请求参数
      const { mode, productIds, options = {} } = body;
      
      if (!['full', 'incremental', 'selective'].includes(mode)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: '同步模式必须是 full、incremental 或 selective'
          },
          timestamp: Date.now(),
          requestId
        });
      }

      if (mode === 'selective' && (!productIds || productIds.length === 0)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: '选择性同步需要提供产品ID列表'
          },
          timestamp: Date.now(),
          requestId
        });
      }

      // 检查是否有正在运行的同步任务
      const currentStatus = syncService.getSyncStatus();
      if (currentStatus.status === 'running') {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'CONFLICT',
            message: '已有同步任务正在运行',
            details: {
              currentSyncId: currentStatus.currentSyncId,
              currentSyncStatus: currentStatus.status
            }
          },
          timestamp: Date.now(),
          requestId
        });
      }

      // 生成同步ID
      const syncId = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // 构建同步选项
      const syncOptions: SyncOptions = {
        mode,
        productIds,
        options: {
          downloadImages: options.downloadImages ?? true,
          validateData: options.validateData ?? true,
          dryRun: options.dryRun ?? false,
          batchSize: options.batchSize ?? 50,
          concurrentImages: options.concurrentImages ?? 5
        }
      };

      // 估算同步时间 (简单实现)
      const estimatedDuration = this.estimateSyncDuration(mode, productIds);
      
      // 异步执行同步 (不阻塞响应)
      setImmediate(() => {
        syncService.syncFromFeishuWithId(syncOptions, syncId).catch(error => {
          request.log.error('后台同步失败:', error);
        });
      });

      // 返回同步启动结果
      return reply.send({
        success: true,
        data: {
          syncId,
          status: 'started',
          estimatedDuration,
          websocketUrl: `ws://${request.hostname}:${process.env.PORT || 3000}/api/v1/sync/progress?syncId=${syncId}`
        },
        message: '同步任务已启动',
        timestamp: Date.now(),
        requestId
      });

    } catch (error) {
      request.log.error('启动飞书同步失败:', error);
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '启动同步失败'
        },
        timestamp: Date.now()
      });
    }
  }

  /**
   * 获取增强的同步状态
   * GET /api/v1/sync/status
   */
  async getSyncStatusEnhanced(request: FastifyRequest, reply: FastifyReply) {
    try {
      const status = syncService.getEnhancedSyncStatus();

      return reply.send({
        success: true,
        data: status,
        message: '获取同步状态成功',
        timestamp: Date.now()
      });

    } catch (error) {
      request.log.error('获取增强同步状态失败:', error);
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取同步状态失败'
        },
        timestamp: Date.now()
      });
    }
  }

  /**
   * 控制同步任务
   * POST /api/v1/sync/control
   */
  async controlSync(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as SyncControlRequest;
      const { action, syncId } = body;
      
      if (!['pause', 'resume', 'cancel'].includes(action)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: '操作必须是 pause、resume 或 cancel'
          },
          timestamp: Date.now()
        });
      }

      // 执行同步控制操作
      const result = await syncService.controlSync(action, syncId);
      
      return reply.send({
        success: result.success,
        data: {
          syncId: syncId || 'current',
          action,
          status: result.success ? 'success' : 'failed',
          message: result.message
        },
        message: `同步任务${action}操作${result.success ? '成功' : '失败'}`,
        timestamp: Date.now()
      });

    } catch (error) {
      request.log.error('同步控制操作失败:', error);
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '同步控制操作失败'
        },
        timestamp: Date.now()
      });
    }
  }

  /**
   * 获取增强的同步历史
   * GET /api/v1/sync/history
   */
  async getSyncHistoryEnhanced(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as {
        page?: string;
        limit?: string;
        status?: string;
        mode?: string;
        startDate?: string;
        endDate?: string;
      };
      
      const page = parseInt(query.page || '1');
      const limit = parseInt(query.limit || '20');
      const filters = {
        status: query.status,
        mode: query.mode,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined
      };

      const result = await syncService.getSyncHistoryEnhanced({
        page,
        limit,
        ...filters
      });

      return reply.send({
        success: true,
        data: result,
        message: '获取同步历史成功',
        timestamp: Date.now()
      });

    } catch (error) {
      request.log.error('获取增强同步历史失败:', error);
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取同步历史失败'
        },
        timestamp: Date.now()
      });
    }
  }

  /**
   * 增强的数据一致性验证
   * POST /api/v1/sync/validate
   */
  async validateDataConsistencyEnhanced(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as ValidationRequest;
      const {
        scope = 'all',
        productIds,
        checks = ['data_integrity', 'image_existence', 'field_validation']
      } = body;

      const validationId = `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // 执行验证
      const result = await syncService.validateDataConsistencyEnhanced({
        validationId,
        scope,
        productIds,
        checks
      });

      return reply.send({
        success: true,
        data: result,
        message: result.summary.issuesFound > 0 
          ? `发现 ${result.summary.issuesFound} 个数据一致性问题`
          : '数据一致性验证通过',
        timestamp: Date.now()
      });

    } catch (error) {
      request.log.error('增强数据一致性验证失败:', error);
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '数据一致性验证失败'
        },
        timestamp: Date.now()
      });
    }
  }

  /**
   * 增强的数据修复
   * POST /api/v1/sync/repair
   */
  async repairDataIssuesEnhanced(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as RepairRequest;
      const {
        validationId,
        issueTypes = [],
        productIds,
        dryRun = false
      } = body;

      const repairId = `repair-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // 执行修复
      const result = await syncService.repairDataIssuesEnhanced({
        repairId,
        validationId,
        issueTypes,
        productIds,
        dryRun
      });

      return reply.send({
        success: true,
        data: result,
        message: dryRun
          ? `[预览] 将修复 ${result.summary.repairedIssues} 个问题`
          : `修复完成: 成功 ${result.summary.repairedIssues} 个，失败 ${result.summary.failedRepairs} 个`,
        timestamp: Date.now()
      });

    } catch (error) {
      request.log.error('增强数据修复失败:', error);
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '数据修复失败'
        },
        timestamp: Date.now()
      });
    }
  }

  /**
   * 获取同步服务状态
   * GET /api/v1/sync/service-status
   */
  async getSyncServiceStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const status = await syncService.getSyncServiceStatus();

      return reply.send({
        success: true,
        data: status,
        message: '获取同步服务状态成功',
        timestamp: Date.now()
      });

    } catch (error) {
      request.log.error('获取同步服务状态失败:', error);
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取同步服务状态失败'
        },
        timestamp: Date.now()
      });
    }
  }

  // 私有辅助方法

  private estimateSyncDuration(mode: string, productIds?: string[]): number {
    // 简单的时间估算逻辑
    switch (mode) {
      case 'full':
        return 300; // 5分钟
      case 'incremental':
        return 120; // 2分钟
      case 'selective':
        return Math.min(60 + (productIds?.length || 0) * 2, 300); // 基于产品数量
      default:
        return 120;
    }
  }
}

export const syncController = new SyncController();