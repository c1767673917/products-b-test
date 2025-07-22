import { FastifyInstance } from 'fastify';
import { healthController } from '../controllers/healthController';

export async function healthRoutes(fastify: FastifyInstance) {
  // 5.1 服务健康检查
  fastify.get('/health', {
    schema: {
      description: '检查服务健康状态',
      tags: ['health'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                timestamp: { type: 'string' },
                services: {
                  type: 'object',
                  properties: {
                    database: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', enum: ['up', 'down'] },
                        responseTime: { type: 'number' }
                      }
                    },
                    minio: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', enum: ['up', 'down'] },
                        responseTime: { type: 'number' }
                      }
                    },
                    feishu: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', enum: ['up', 'down'] },
                        responseTime: { type: 'number' },
                        tokenValid: { type: 'boolean' }
                      }
                    }
                  }
                },
                metrics: {
                  type: 'object',
                  properties: {
                    uptime: { type: 'number' },
                    memoryUsage: { type: 'number' },
                    cpuUsage: { type: 'number' }
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
  }, healthController.getHealthStatus.bind(healthController));
}