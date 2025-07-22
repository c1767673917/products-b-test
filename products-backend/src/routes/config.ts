import { FastifyInstance } from 'fastify';
import { configController } from '../controllers/configController';

export async function configRoutes(fastify: FastifyInstance) {
  // 4.1 获取飞书配置
  fastify.get('/config/feishu', {
    schema: {
      description: '获取飞书API配置信息',
      tags: ['config'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                appId: { type: 'string' },
                appToken: { type: 'string' },
                tableId: { type: 'string' },
                fieldMapping: { type: 'object' },
                syncSettings: {
                  type: 'object',
                  properties: {
                    batchSize: { type: 'number' },
                    concurrentImages: { type: 'number' },
                    retryAttempts: { type: 'number' },
                    timeout: { type: 'number' }
                  }
                }
              }
            },
            message: { type: 'string' },
            timestamp: { type: 'number' }
          }
        }
      }
    }
  }, configController.getFeishuConfig.bind(configController));

  // 4.2 更新飞书配置
  fastify.put('/config/feishu', {
    schema: {
      description: '更新飞书API配置',
      tags: ['config'],
      body: {
        type: 'object',
        properties: {
          appToken: { type: 'string' },
          tableId: { type: 'string' },
          syncSettings: {
            type: 'object',
            properties: {
              batchSize: { type: 'number' },
              concurrentImages: { type: 'number' },
              retryAttempts: { type: 'number' },
              timeout: { type: 'number' }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                updated: { type: 'boolean' },
                changes: { type: 'object' }
              }
            },
            message: { type: 'string' },
            timestamp: { type: 'number' }
          }
        }
      }
    }
  }, configController.updateFeishuConfig.bind(configController));
}