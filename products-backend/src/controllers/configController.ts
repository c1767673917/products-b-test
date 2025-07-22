import { FastifyRequest, FastifyReply } from 'fastify';
import { FEISHU_FIELD_MAPPING } from '../config/fieldMapping';

interface UpdateConfigRequest {
  appToken?: string;
  tableId?: string;
  syncSettings?: {
    batchSize?: number;
    concurrentImages?: number;
    retryAttempts?: number;
    timeout?: number;
  };
}

export class ConfigController {
  /**
   * 获取飞书配置
   * GET /api/v1/config/feishu
   */
  async getFeishuConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const config = {
        appId: process.env.FEISHU_APP_ID || '',
        appToken: process.env.FEISHU_APP_TOKEN || '',
        tableId: process.env.FEISHU_TABLE_ID || '',
        fieldMapping: FEISHU_FIELD_MAPPING,
        syncSettings: {
          batchSize: parseInt(process.env.SYNC_BATCH_SIZE || '50'),
          concurrentImages: parseInt(process.env.SYNC_CONCURRENT_IMAGES || '5'),
          retryAttempts: parseInt(process.env.SYNC_RETRY_ATTEMPTS || '3'),
          timeout: parseInt(process.env.SYNC_TIMEOUT || '300000')
        }
      };

      // 隐藏敏感信息
      const safeConfig = {
        ...config,
        appId: config.appId ? '***' + config.appId.slice(-4) : '',
        appToken: config.appToken ? '***' + config.appToken.slice(-4) : ''
      };

      return reply.send({
        success: true,
        data: safeConfig,
        message: '获取飞书配置成功',
        timestamp: Date.now()
      });

    } catch (error) {
      request.log.error('获取飞书配置失败:', error);
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '获取飞书配置失败'
        },
        timestamp: Date.now()
      });
    }
  }

  /**
   * 更新飞书配置
   * PUT /api/v1/config/feishu
   */
  async updateFeishuConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as UpdateConfigRequest;
      const { appToken, tableId, syncSettings } = body;

      const changes: any = {};

      // 注意：实际生产环境中，配置更新应该通过更安全的方式进行
      // 这里仅作为演示实现
      if (appToken && appToken !== process.env.FEISHU_APP_TOKEN) {
        changes.appToken = '已更新';
        // process.env.FEISHU_APP_TOKEN = appToken; // 实际应用中不建议这样做
      }

      if (tableId && tableId !== process.env.FEISHU_TABLE_ID) {
        changes.tableId = '已更新';
        // process.env.FEISHU_TABLE_ID = tableId;
      }

      if (syncSettings) {
        const settingsChanges: any = {};
        
        if (syncSettings.batchSize && syncSettings.batchSize !== parseInt(process.env.SYNC_BATCH_SIZE || '50')) {
          settingsChanges.batchSize = syncSettings.batchSize;
        }
        
        if (syncSettings.concurrentImages && syncSettings.concurrentImages !== parseInt(process.env.SYNC_CONCURRENT_IMAGES || '5')) {
          settingsChanges.concurrentImages = syncSettings.concurrentImages;
        }
        
        if (syncSettings.retryAttempts && syncSettings.retryAttempts !== parseInt(process.env.SYNC_RETRY_ATTEMPTS || '3')) {
          settingsChanges.retryAttempts = syncSettings.retryAttempts;
        }
        
        if (syncSettings.timeout && syncSettings.timeout !== parseInt(process.env.SYNC_TIMEOUT || '300000')) {
          settingsChanges.timeout = syncSettings.timeout;
        }
        
        if (Object.keys(settingsChanges).length > 0) {
          changes.syncSettings = settingsChanges;
        }
      }

      return reply.send({
        success: true,
        data: {
          updated: Object.keys(changes).length > 0,
          changes
        },
        message: Object.keys(changes).length > 0 ? '配置更新成功' : '没有配置需要更新',
        timestamp: Date.now()
      });

    } catch (error) {
      request.log.error('更新飞书配置失败:', error);
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '更新飞书配置失败'
        },
        timestamp: Date.now()
      });
    }
  }
}

export const configController = new ConfigController();