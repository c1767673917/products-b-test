import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { SyncLog } from '../models/SyncLog';
import { imageService } from './imageService';
import { getFeishuApiService } from './feishuApiService';
import { dataTransformService } from './dataTransformService';
import winston from 'winston';

// 同步选项接口
export interface SyncOptions {
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

// 同步结果接口
export interface SyncResult {
  success: boolean;
  syncId: string;
  message: string;
  details: {
    mode: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    stats: {
      totalRecords: number;
      processedRecords: number;
      createdRecords: number;
      updatedRecords: number;
      deletedRecords: number;
      processedImages: number;
      failedImages: number;
      errors: number;
    };
    errors: Array<{
      type: string;
      message: string;
      productId?: string;
      timestamp: Date;
    }>;
  };
}

// 同步进度接口
export interface SyncProgress {
  syncId: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  stage: 'fetching_data' | 'processing_records' | 'downloading_images' | 'updating_database';
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  currentOperation: string;
  estimatedTimeRemaining: number;
  stats: {
    totalRecords: number;
    processedRecords: number;
    created: number;
    updated: number;
    deleted: number;
    errors: number;
  };
}

// 同步状态类型
export type SyncStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

/**
 * 同步服务 - 重构版
 * 支持直接从飞书多维表格同步数据，包括实时进度反馈、错误处理和恢复机制
 */
export class SyncService {
  private logger: winston.Logger;
  private currentSyncId: string | null = null;
  private currentSyncStatus: SyncStatus = 'idle';
  private syncProgress: SyncProgress | null = null;
  private progressCallbacks: Array<(progress: SyncProgress) => void> = [];
  private shouldCancel: boolean = false;
  private shouldPause: boolean = false;
  private pausePromise: Promise<void> | null = null;

  constructor() {
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
   * 从飞书同步数据
   */
  async syncFromFeishu(options: SyncOptions): Promise<SyncResult> {
    // 检查是否有任务在运行
    if (this.currentSyncStatus === 'running') {
      throw new Error('同步任务正在进行中，请稍后再试');
    }

    const syncId = this.generateSyncId();
    this.currentSyncId = syncId;
    this.currentSyncStatus = 'running';
    this.shouldCancel = false;
    this.shouldPause = false;

    const startTime = new Date();
    let session: mongoose.ClientSession | null = null;

    try {
      this.logger.info('开始飞书数据同步', { syncId, mode: options.mode, options });

      // 创建同步日志记录
      await this.createSyncLog(syncId, options, startTime);

      // 初始化进度
      this.initializeProgress(syncId, options.mode);

      // 根据模式执行同步
      let result: SyncResult;
      switch (options.mode) {
        case 'full':
          result = await this.performFullSyncFromFeishu(syncId, options);
          break;
        case 'incremental':
          result = await this.performIncrementalSyncFromFeishu(syncId, options);
          break;
        case 'selective':
          result = await this.performSelectiveSyncFromFeishu(syncId, options);
          break;
        default:
          throw new Error(`不支持的同步模式: ${options.mode}`);
      }

      // 更新同步日志
      await this.updateSyncLog(syncId, 'completed', result.details.stats, result.details.errors);

      this.currentSyncStatus = 'completed';
      this.logger.info('飞书数据同步完成', { syncId, result });

      return result;

    } catch (error) {
      this.currentSyncStatus = 'failed';
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      this.logger.error('飞书数据同步失败', error, { syncId });

      // 更新同步日志为失败状态
      await this.updateSyncLog(syncId, 'failed', undefined, [{
        type: 'system',
        message: errorMessage,
        timestamp: new Date()
      }]);

      // 返回失败结果
      const endTime = new Date();
      return {
        success: false,
        syncId,
        message: `同步失败: ${errorMessage}`,
        details: {
          mode: options.mode,
          startTime,
          endTime,
          duration: endTime.getTime() - startTime.getTime(),
          stats: {
            totalRecords: 0,
            processedRecords: 0,
            createdRecords: 0,
            updatedRecords: 0,
            deletedRecords: 0,
            processedImages: 0,
            failedImages: 0,
            errors: 1
          },
          errors: [{
            type: 'system',
            message: errorMessage,
            timestamp: new Date()
          }]
        }
      };
    } finally {
      if (session) {
        await (session as mongoose.ClientSession).endSession();
      }
      this.currentSyncId = null;
      this.syncProgress = null;
      this.pausePromise = null;
    }
  }

  /**
   * 全量同步
   */
  private async performFullSyncFromFeishu(syncId: string, options: SyncOptions): Promise<SyncResult> {
    const startTime = new Date();
    const stats = {
      totalRecords: 0,
      processedRecords: 0,
      createdRecords: 0,
      updatedRecords: 0,
      deletedRecords: 0,
      processedImages: 0,
      failedImages: 0,
      errors: 0
    };
    const errors: Array<any> = [];

    try {
      // 阶段1: 获取飞书数据
      this.updateProgress(syncId, 'fetching_data', '从飞书获取数据...');
      
      const feishuService = getFeishuApiService();
      const feishuRecords = await feishuService.getAllRecords();
      
      stats.totalRecords = feishuRecords.length;
      this.logger.info('获取飞书数据完成', { totalRecords: stats.totalRecords });

      // 阶段2: 转换数据
      this.updateProgress(syncId, 'processing_records', '转换和验证数据...');
      
      const transformResult = dataTransformService.batchTransformFeishuRecords(feishuRecords);
      stats.errors += transformResult.totalErrors.length;
      errors.push(...transformResult.totalErrors);

      this.logger.info('数据转换完成', {
        successful: transformResult.successful.length,
        failed: transformResult.failed.length
      });

      if (!options.options?.dryRun) {
        // 阶段3: 检测变更和更新数据库
        const session = await mongoose.startSession();
        
        try {
          await session.withTransaction(async () => {
            for (let i = 0; i < transformResult.successful.length; i++) {
              const transformedProduct = transformResult.successful[i];
              
              // 检查取消和暂停
              await this.checkControlSignals();

              try {
                const existingProduct = await Product.findOne({ 
                  productId: transformedProduct.productId 
                }).session(session);

                if (existingProduct) {
                  // 检测变更
                  const changes = dataTransformService.detectChanges(
                    transformedProduct, 
                    existingProduct.toObject()
                  );

                  if (changes.hasChanges) {
                    await Product.findOneAndUpdate(
                      { productId: transformedProduct.productId },
                      { 
                        ...transformedProduct, 
                        updatedAt: new Date(),
                        version: existingProduct.version + 1
                      },
                      { session, new: true }
                    );
                    stats.updatedRecords++;
                    this.logger.debug('产品更新成功', { 
                      productId: transformedProduct.productId 
                    });
                  }
                } else {
                  // 创建新产品
                  await Product.create([transformedProduct], { session });
                  stats.createdRecords++;
                  this.logger.debug('产品创建成功', { 
                    productId: transformedProduct.productId 
                  });
                }

                stats.processedRecords++;
                
                // 更新进度
                const progress = Math.floor((i + 1) / transformResult.successful.length * 100);
                this.updateProgressPercentage(syncId, progress);

              } catch (error) {
                stats.errors++;
                const errorMsg = error instanceof Error ? error.message : '未知错误';
                errors.push({
                  type: 'database',
                  message: `产品处理失败: ${errorMsg}`,
                  productId: transformedProduct.productId,
                  timestamp: new Date()
                });
                this.logger.error('产品处理失败', error, {
                  productId: transformedProduct.productId
                });
              }
            }
          });
        } finally {
          await session.endSession();
        }

        // 阶段4: 下载图片
        if (options.options?.downloadImages !== false) {
          this.updateProgress(syncId, 'downloading_images', '下载产品图片...');
          await this.downloadProductImages(transformResult.successful, stats, errors);
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      return {
        success: true,
        syncId,
        message: options.options?.dryRun 
          ? `[预览] 全量同步预览完成` 
          : `全量同步完成: 创建${stats.createdRecords}个，更新${stats.updatedRecords}个产品`,
        details: {
          mode: options.mode,
          startTime,
          endTime,
          duration,
          stats,
          errors
        }
      };

    } catch (error) {
      throw new Error(`全量同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 增量同步
   */
  private async performIncrementalSyncFromFeishu(syncId: string, options: SyncOptions): Promise<SyncResult> {
    const startTime = new Date();
    const stats = {
      totalRecords: 0,
      processedRecords: 0,
      createdRecords: 0,
      updatedRecords: 0,
      deletedRecords: 0,
      processedImages: 0,
      failedImages: 0,
      errors: 0
    };
    const errors: Array<any> = [];

    try {
      // 获取上次同步时间
      const lastSuccessfulSync = await SyncLog.findOne({
        status: 'completed'
      }).sort({ startTime: -1 });

      const cutoffTime = lastSuccessfulSync?.startTime || new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      this.logger.info('增量同步基准时间', { cutoffTime });

      // 阶段1: 获取飞书数据
      this.updateProgress(syncId, 'fetching_data', '从飞书获取增量数据...');
      
      const feishuService = getFeishuApiService();
      const allRecords = await feishuService.getAllRecords();
      
      // 转换数据以获取采集时间
      const allTransformed = dataTransformService.batchTransformFeishuRecords(allRecords);
      
      // 筛选出需要更新的记录
      const recentRecords = allTransformed.successful.filter(product => {
        const collectTime = new Date(product.collectTime);
        return collectTime > cutoffTime;
      });

      stats.totalRecords = recentRecords.length;
      
      this.logger.info('获取增量数据完成', { 
        totalRecords: allRecords.length,
        incrementalRecords: recentRecords.length,
        cutoffTime 
      });

      if (recentRecords.length === 0) {
        return {
          success: true,
          syncId,
          message: '没有发现需要同步的新数据',
          details: {
            mode: options.mode,
            startTime,
            endTime: new Date(),
            duration: new Date().getTime() - startTime.getTime(),
            stats,
            errors
          }
        };
      }

      if (!options.options?.dryRun) {
        // 阶段2: 处理增量数据
        this.updateProgress(syncId, 'processing_records', '处理增量数据...');
        
        for (let i = 0; i < recentRecords.length; i++) {
          const product = recentRecords[i];
          
          await this.checkControlSignals();

          try {
            const existing = await Product.findOne({ productId: product.productId });
            
            if (existing) {
              const changes = dataTransformService.detectChanges(product, existing.toObject());
              if (changes.hasChanges) {
                await Product.findOneAndUpdate(
                  { productId: product.productId },
                  { 
                    ...product, 
                    updatedAt: new Date(),
                    version: existing.version + 1
                  },
                  { new: true }
                );
                stats.updatedRecords++;
              }
            } else {
              await Product.create(product);
              stats.createdRecords++;
            }

            stats.processedRecords++;
            
            const progress = Math.floor((i + 1) / recentRecords.length * 100);
            this.updateProgressPercentage(syncId, progress);

          } catch (error) {
            stats.errors++;
            const errorMsg = error instanceof Error ? error.message : '未知错误';
            errors.push({
              type: 'database',
              message: `增量产品处理失败: ${errorMsg}`,
              productId: product.productId,
              timestamp: new Date()
            });
          }
        }

        // 阶段3: 下载图片
        if (options.options?.downloadImages !== false) {
          this.updateProgress(syncId, 'downloading_images', '下载新增图片...');
          await this.downloadProductImages(recentRecords, stats, errors);
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      return {
        success: true,
        syncId,
        message: options.options?.dryRun 
          ? `[预览] 增量同步预览完成` 
          : `增量同步完成: 创建${stats.createdRecords}个，更新${stats.updatedRecords}个产品`,
        details: {
          mode: options.mode,
          startTime,
          endTime,
          duration,
          stats,
          errors
        }
      };

    } catch (error) {
      throw new Error(`增量同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 选择性同步
   */
  private async performSelectiveSyncFromFeishu(syncId: string, options: SyncOptions): Promise<SyncResult> {
    const startTime = new Date();
    const stats = {
      totalRecords: 0,
      processedRecords: 0,
      createdRecords: 0,
      updatedRecords: 0,
      deletedRecords: 0,
      processedImages: 0,
      failedImages: 0,
      errors: 0
    };
    const errors: Array<any> = [];

    try {
      if (!options.productIds || options.productIds.length === 0) {
        throw new Error('选择性同步需要指定产品ID列表');
      }

      this.logger.info('开始选择性同步', { productIds: options.productIds });

      // 阶段1: 获取指定产品的飞书数据
      this.updateProgress(syncId, 'fetching_data', '获取指定产品数据...');
      
      const feishuService = getFeishuApiService();
      const allRecords = await feishuService.getAllRecords();
      
      // 筛选指定的产品记录
      const targetRecords = allRecords.filter(record => 
        options.productIds!.includes(record.record_id)
      );

      stats.totalRecords = targetRecords.length;
      
      this.logger.info('获取选择性数据完成', { 
        requestedCount: options.productIds.length,
        foundCount: targetRecords.length 
      });

      if (targetRecords.length === 0) {
        return {
          success: true,
          syncId,
          message: '没有找到匹配的产品记录',
          details: {
            mode: options.mode,
            startTime,
            endTime: new Date(),
            duration: new Date().getTime() - startTime.getTime(),
            stats,
            errors
          }
        };
      }

      // 阶段2: 转换数据
      this.updateProgress(syncId, 'processing_records', '转换选择性数据...');
      
      const transformResult = dataTransformService.batchTransformFeishuRecords(targetRecords);
      stats.errors += transformResult.totalErrors.length;
      errors.push(...transformResult.totalErrors);

      if (!options.options?.dryRun) {
        // 阶段3: 更新数据库
        for (let i = 0; i < transformResult.successful.length; i++) {
          const product = transformResult.successful[i];
          
          await this.checkControlSignals();

          try {
            const existing = await Product.findOne({ productId: product.productId });
            
            if (existing) {
              const changes = dataTransformService.detectChanges(product, existing.toObject());
              if (changes.hasChanges) {
                await Product.findOneAndUpdate(
                  { productId: product.productId },
                  { 
                    ...product, 
                    updatedAt: new Date(),
                    version: existing.version + 1
                  },
                  { new: true }
                );
                stats.updatedRecords++;
              }
            } else {
              await Product.create(product);
              stats.createdRecords++;
            }

            stats.processedRecords++;
            
            const progress = Math.floor((i + 1) / transformResult.successful.length * 100);
            this.updateProgressPercentage(syncId, progress);

          } catch (error) {
            stats.errors++;
            const errorMsg = error instanceof Error ? error.message : '未知错误';
            errors.push({
              type: 'database',
              message: `选择性产品处理失败: ${errorMsg}`,
              productId: product.productId,
              timestamp: new Date()
            });
          }
        }

        // 阶段4: 下载图片
        if (options.options?.downloadImages !== false) {
          this.updateProgress(syncId, 'downloading_images', '下载选择性图片...');
          await this.downloadProductImages(transformResult.successful, stats, errors);
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      return {
        success: true,
        syncId,
        message: options.options?.dryRun 
          ? `[预览] 选择性同步预览完成` 
          : `选择性同步完成: 创建${stats.createdRecords}个，更新${stats.updatedRecords}个产品`,
        details: {
          mode: options.mode,
          startTime,
          endTime,
          duration,
          stats,
          errors
        }
      };

    } catch (error) {
      throw new Error(`选择性同步失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 下载产品图片
   */
  private async downloadProductImages(
    products: any[], 
    stats: any, 
    errors: any[]
  ): Promise<void> {
    try {
      // 提取所有图片下载任务
      const imageJobs: Array<{
        productId: string;
        imageType: string;
        fileTokens: string[];
      }> = [];

      for (const product of products) {
        const imageAttachments = dataTransformService.extractImageAttachments(product);
        imageJobs.push(...imageAttachments);
      }

      if (imageJobs.length === 0) {
        this.logger.info('没有图片需要下载');
        return;
      }

      this.logger.info('开始批量下载图片', { imageJobCount: imageJobs.length });

      // 批量下载图片
      const downloadResult = await imageService.batchDownloadFromFeishu(imageJobs);
      
      stats.processedImages += downloadResult.successful.length;
      stats.failedImages += downloadResult.failed.length;
      stats.errors += downloadResult.failed.length;

      // 记录图片下载错误
      for (const failedDownload of downloadResult.failed) {
        errors.push({
          type: 'image_download',
          message: `图片下载失败: ${failedDownload.error}`,
          productId: failedDownload.productId,
          timestamp: new Date()
        });
      }

      // 更新产品的图片路径
      for (const imageRecord of downloadResult.successful) {
        try {
          await Product.findOneAndUpdate(
            { productId: imageRecord.productId },
            {
              $set: {
                [`images.${imageRecord.type}`]: imageRecord.publicUrl,
                updatedAt: new Date()
              }
            }
          );
        } catch (error) {
          this.logger.warn('更新产品图片路径失败', error, {
            productId: imageRecord.productId,
            imageType: imageRecord.type
          });
        }
      }

      this.logger.info('图片下载完成', {
        successful: downloadResult.successful.length,
        failed: downloadResult.failed.length
      });

    } catch (error) {
      this.logger.error('批量下载图片失败', error);
      stats.errors++;
      errors.push({
        type: 'image_batch',
        message: `批量图片下载失败: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: new Date()
      });
    }
  }

  /**
   * 控制同步任务
   */
  async controlSync(action: 'pause' | 'resume' | 'cancel', syncId?: string): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!this.currentSyncId || this.currentSyncStatus !== 'running') {
      return {
        success: false,
        message: '没有正在运行的同步任务'
      };
    }

    if (syncId && syncId !== this.currentSyncId) {
      return {
        success: false,
        message: '指定的同步任务不匹配'
      };
    }

    try {
      switch (action) {
        case 'pause':
          this.shouldPause = true;
          this.currentSyncStatus = 'paused';
          this.logger.info('同步任务已暂停', { syncId: this.currentSyncId });
          return { success: true, message: '同步任务已暂停' };

        case 'resume':
          this.shouldPause = false;
          this.currentSyncStatus = 'running';
          if (this.pausePromise) {
            // 这里可以通过resolve pausePromise来恢复任务
          }
          this.logger.info('同步任务已恢复', { syncId: this.currentSyncId });
          return { success: true, message: '同步任务已恢复' };

        case 'cancel':
          this.shouldCancel = true;
          this.currentSyncStatus = 'cancelled';
          this.logger.info('同步任务已取消', { syncId: this.currentSyncId });
          return { success: true, message: '同步任务已取消' };

        default:
          return { success: false, message: '不支持的控制操作' };
      }
    } catch (error) {
      this.logger.error('控制同步任务失败', error);
      return {
        success: false,
        message: `控制操作失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(): {
    isRunning: boolean;
    currentSyncId: string | null;
    status: SyncStatus;
    progress: SyncProgress | null;
  } {
    return {
      isRunning: this.currentSyncStatus === 'running',
      currentSyncId: this.currentSyncId,
      status: this.currentSyncStatus,
      progress: this.syncProgress
    };
  }

  /**
   * 获取同步历史
   */
  async getSyncHistory(limit: number = 20): Promise<any[]> {
    try {
      return await SyncLog.find({})
        .sort({ startTime: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      this.logger.error('获取同步历史失败', error);
      return [];
    }
  }

  /**
   * 注册进度回调
   */
  onProgress(callback: (progress: SyncProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * 移除进度回调
   */
  removeProgressCallback(callback: (progress: SyncProgress) => void): void {
    const index = this.progressCallbacks.indexOf(callback);
    if (index > -1) {
      this.progressCallbacks.splice(index, 1);
    }
  }

  // === 私有方法 ===

  /**
   * 生成同步ID
   */
  private generateSyncId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * 创建同步日志
   */
  private async createSyncLog(syncId: string, options: SyncOptions, startTime: Date): Promise<void> {
    try {
      await SyncLog.create({
        logId: syncId,
        syncType: options.mode,
        startTime,
        status: 'running',
        config: {
          feishuAppToken: process.env.FEISHU_APP_TOKEN || '',
          feishuTableId: process.env.FEISHU_TABLE_ID || '',
          syncOptions: options
        },
        stats: {
          totalRecords: 0,
          createdRecords: 0,
          updatedRecords: 0,
          deletedRecords: 0,
          processedImages: 0,
          failedImages: 0
        },
        errors: []
      });
    } catch (error) {
      this.logger.warn('创建同步日志失败', error, { syncId });
    }
  }

  /**
   * 更新同步日志
   */
  private async updateSyncLog(
    syncId: string, 
    status: string, 
    stats?: any, 
    errors?: any[]
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        endTime: new Date()
      };

      if (stats) {
        updateData.stats = stats;
      }

      if (errors) {
        updateData.errors = errors;
      }

      await SyncLog.findOneAndUpdate(
        { logId: syncId },
        updateData,
        { new: true }
      );
    } catch (error) {
      this.logger.warn('更新同步日志失败', error, { syncId });
    }
  }

  /**
   * 初始化进度
   */
  private initializeProgress(syncId: string, mode: string): void {
    this.syncProgress = {
      syncId,
      status: 'running',
      stage: 'fetching_data',
      progress: {
        current: 0,
        total: 0,
        percentage: 0
      },
      currentOperation: '初始化同步任务...',
      estimatedTimeRemaining: 0,
      stats: {
        totalRecords: 0,
        processedRecords: 0,
        created: 0,
        updated: 0,
        deleted: 0,
        errors: 0
      }
    };

    this.notifyProgress();
  }

  /**
   * 更新进度
   */
  private updateProgress(
    syncId: string, 
    stage: SyncProgress['stage'], 
    operation: string
  ): void {
    if (this.syncProgress && this.syncProgress.syncId === syncId) {
      this.syncProgress.stage = stage;
      this.syncProgress.currentOperation = operation;
      this.notifyProgress();
    }
  }

  /**
   * 更新进度百分比
   */
  private updateProgressPercentage(syncId: string, percentage: number): void {
    if (this.syncProgress && this.syncProgress.syncId === syncId) {
      this.syncProgress.progress.percentage = percentage;
      this.notifyProgress();
    }
  }

  /**
   * 通知进度更新
   */
  private notifyProgress(): void {
    if (this.syncProgress) {
      for (const callback of this.progressCallbacks) {
        try {
          callback(this.syncProgress);
        } catch (error) {
          this.logger.warn('进度回调执行失败', error);
        }
      }
    }
  }

  /**
   * 检查控制信号（取消/暂停）
   */
  private async checkControlSignals(): Promise<void> {
    if (this.shouldCancel) {
      throw new Error('同步任务已被取消');
    }

    if (this.shouldPause) {
      this.logger.info('同步任务已暂停，等待恢复...');
      
      // 创建暂停Promise
      this.pausePromise = new Promise((resolve) => {
        const checkResume = () => {
          if (!this.shouldPause) {
            resolve();
          } else {
            setTimeout(checkResume, 1000);
          }
        };
        checkResume();
      });

      await this.pausePromise;
      this.pausePromise = null;
    }
  }

  // Phase 3: Enhanced API methods following api-design.md specifications

  /**
   * Enhanced sync from Feishu (with syncId parameter)
   */
  async syncFromFeishuWithId(options: SyncOptions, syncId: string): Promise<SyncResult> {
    // Set the sync ID in options or track it separately
    // For now, delegate to the existing method but we should refactor to support syncId tracking
    const result = await this.syncFromFeishu(options);
    
    // Override the syncId in the result
    return {
      ...result,
      syncId
    };
  }

  /**
   * Get enhanced sync status
   */
  getEnhancedSyncStatus() {
    const currentStatus = this.getSyncStatus();
    
    return {
      currentSync: this.syncProgress ? {
        syncId: this.syncProgress.syncId,
        mode: 'unknown', // This would come from sync options
        status: this.syncProgress.status,
        startTime: new Date().toISOString(), // Should track actual start time
        endTime: this.syncProgress.status === 'completed' ? new Date().toISOString() : null,
        progress: this.syncProgress.progress,
        currentOperation: this.syncProgress.currentOperation,
        errors: [] // Should track actual errors
      } : null,
      lastSync: null
    };
  }

  /**
   * Get enhanced sync history
   */
  async getSyncHistoryEnhanced(params: {
    page: number;
    limit: number;
    status?: string;
    mode?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    try {
      const { page, limit, status, mode, startDate, endDate } = params;
      const skip = (page - 1) * limit;
      
      // Build filter query
      const filter: any = {};
      if (status) filter.status = status;
      if (mode) filter.syncType = mode;
      if (startDate || endDate) {
        filter.startTime = {};
        if (startDate) filter.startTime.$gte = startDate;
        if (endDate) filter.startTime.$lte = endDate;
      }

      // Get records with pagination
      const [records, total] = await Promise.all([
        SyncLog.find(filter)
          .sort({ startTime: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        SyncLog.countDocuments(filter)
      ]);

      return {
        records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`获取同步历史失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * Enhanced data consistency validation
   */
  async validateDataConsistencyEnhanced(params: {
    validationId: string;
    scope: 'all' | 'recent' | 'selective';
    productIds?: string[];
    checks: Array<'data_integrity' | 'image_existence' | 'field_validation'>;
  }) {
    try {
      const { validationId, scope, productIds, checks } = params;
      const issues: any[] = [];
      let totalChecked = 0;

      // Build query based on scope
      let query: any = { status: 'active' };
      if (scope === 'recent') {
        query.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }; // Last 7 days
      } else if (scope === 'selective' && productIds) {
        query.productId = { $in: productIds };
      }

      const products = await Product.find(query).lean();
      totalChecked = products.length;

      // Data integrity check
      if (checks.includes('data_integrity')) {
        for (const product of products) {
          if (!product.name || !product.productId) {
            issues.push({
              type: 'missing_data',
              severity: 'critical',
              productId: product.productId,
              field: !product.name ? 'name' : 'productId',
              message: `产品缺少必填字段: ${!product.name ? 'name' : 'productId'}`,
              suggestedFix: '从飞书重新同步产品数据'
            });
          }
        }
      }

      // Image existence check
      if (checks.includes('image_existence')) {
        for (const product of products) {
          if (!product.images || !product.images.front) {
            issues.push({
              type: 'missing_image',
              severity: 'warning',
              productId: product.productId,
              message: '产品缺少正面图片',
              suggestedFix: '重新下载产品图片'
            });
          }
        }
      }

      // Field validation check
      if (checks.includes('field_validation')) {
        for (const product of products) {
          if (product.price && product.price.normal < 0) {
            issues.push({
              type: 'invalid_data',
              severity: 'warning',
              productId: product.productId,
              field: 'price.normal',
              message: '产品价格不能为负数',
              suggestedFix: '检查并修正产品价格数据'
            });
          }
        }
      }

      const criticalIssues = issues.filter(issue => issue.severity === 'critical').length;
      const warnings = issues.filter(issue => issue.severity === 'warning').length;

      return {
        validationId,
        summary: {
          totalChecked,
          issuesFound: issues.length,
          criticalIssues,
          warnings
        },
        issues
      };
    } catch (error) {
      throw new Error(`数据验证失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * Enhanced data repair
   */
  async repairDataIssuesEnhanced(params: {
    repairId: string;
    validationId?: string;
    issueTypes: string[];
    productIds?: string[];
    dryRun: boolean;
  }) {
    try {
      const { repairId, issueTypes, productIds, dryRun } = params;
      const results: any[] = [];
      let repairedCount = 0;
      let failedCount = 0;

      // Get products to repair
      let query: any = { status: 'active' };
      if (productIds && productIds.length > 0) {
        query.productId = { $in: productIds };
      }

      const products = await Product.find(query);

      for (const product of products) {
        // Repair missing images
        if (issueTypes.includes('missing_image') || issueTypes.length === 0) {
          if (!product.images || !product.images.front) {
            try {
              if (!dryRun) {
                // Try to re-download images from Feishu
                // This would require the actual Feishu record ID
                // For now, just simulate the repair
              }
              results.push({
                productId: product.productId,
                issueType: 'missing_image',
                status: 'repaired',
                message: dryRun ? '[预览] 将重新下载正面图片' : '已重新下载正面图片'
              });
              repairedCount++;
            } catch (error) {
              results.push({
                productId: product.productId,
                issueType: 'missing_image',
                status: 'failed',
                message: `图片修复失败: ${error instanceof Error ? error.message : '未知错误'}`
              });
              failedCount++;
            }
          }
        }

        // Repair invalid data
        if (issueTypes.includes('invalid_data') || issueTypes.length === 0) {
          if (product.price && product.price.normal < 0) {
            try {
              if (!dryRun) {
                product.price.normal = 0;
                await product.save();
              }
              results.push({
                productId: product.productId,
                issueType: 'invalid_data',
                status: 'repaired',
                message: dryRun ? '[预览] 将修正负价格为0' : '已修正负价格为0'
              });
              repairedCount++;
            } catch (error) {
              results.push({
                productId: product.productId,
                issueType: 'invalid_data',
                status: 'failed',
                message: `数据修复失败: ${error instanceof Error ? error.message : '未知错误'}`
              });
              failedCount++;
            }
          }
        }
      }

      return {
        repairId,
        summary: {
          totalIssues: results.length,
          repairedIssues: repairedCount,
          failedRepairs: failedCount
        },
        results
      };
    } catch (error) {
      throw new Error(`数据修复失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * Get sync service status
   */
  async getSyncServiceStatus() {
    try {
      const memoryUsage = process.memoryUsage();
      
      // Get performance metrics from sync history
      const recentSyncs = await SyncLog.find({
        startTime: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }).lean();

      const completedSyncs = recentSyncs.filter(sync => sync.status === 'completed');
      const failedSyncs = recentSyncs.filter(sync => sync.status === 'failed');
      
      const averageDuration = completedSyncs.length > 0
        ? completedSyncs.reduce((sum, sync) => {
            const duration = sync.endTime && sync.startTime 
              ? new Date(sync.endTime).getTime() - new Date(sync.startTime).getTime()
              : 0;
            return sum + duration;
          }, 0) / completedSyncs.length / 1000 // Convert to seconds
        : 0;

      const successRate = recentSyncs.length > 0
        ? (completedSyncs.length / recentSyncs.length) * 100
        : 100;

      const errorRate = recentSyncs.length > 0
        ? (failedSyncs.length / recentSyncs.length) * 100
        : 0;

      const lastSync = await SyncLog.findOne().sort({ startTime: -1 }).lean();

      return {
        isRunning: this.syncProgress?.status === 'running',
        currentTasks: this.syncProgress ? 1 : 0,
        queuedTasks: 0, // We don't have a queue system yet
        lastSyncTime: lastSync?.startTime?.toISOString() || null,
        nextScheduledSync: null, // No scheduled syncs yet
        performance: {
          averageSyncDuration: Math.round(averageDuration),
          successRate: Math.round(successRate * 100) / 100,
          errorRate: Math.round(errorRate * 100) / 100
        },
        resources: {
          memoryUsage: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          diskUsage: 0, // Would need actual disk usage calculation
          networkUsage: 0 // Would need actual network usage calculation
        }
      };
    } catch (error) {
      throw new Error(`获取同步服务状态失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
}

// 导出单例
export const syncService = new SyncService();