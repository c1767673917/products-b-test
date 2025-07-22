import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { feishuApiService } from '../services/feishuApiService';
import { imageService } from '../services/imageService';

export class HealthController {
  /**
   * 获取健康检查状态
   * GET /api/v1/health
   */
  async getHealthStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const startTime = Date.now();
      
      // 检查数据库连接
      const dbStatus = await this.checkDatabase();
      
      // 检查MinIO连接
      const minioStatus = await this.checkMinio();
      
      // 检查飞书API
      const feishuStatus = await this.checkFeishu();
      
      // 获取系统指标
      const metrics = this.getSystemMetrics();
      
      // 确定整体状态
      const overallStatus = this.determineOverallStatus([dbStatus, minioStatus, feishuStatus]);
      
      return reply.send({
        success: true,
        data: {
          status: overallStatus,
          timestamp: new Date().toISOString(),
          services: {
            database: dbStatus,
            minio: minioStatus,
            feishu: feishuStatus
          },
          metrics
        },
        message: `服务状态: ${overallStatus}`,
        timestamp: Date.now()
      });

    } catch (error) {
      request.log.error('健康检查失败:', error);
      
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : '健康检查失败'
        },
        timestamp: Date.now()
      });
    }
  }

  private async checkDatabase() {
    const startTime = Date.now();
    
    try {
      // 检查MongoDB连接状态
      const state = mongoose.connection.readyState;
      const responseTime = Date.now() - startTime;
      
      return {
        status: state === 1 ? 'up' : 'down',
        responseTime
      };
    } catch (error) {
      return {
        status: 'down' as const,
        responseTime: Date.now() - startTime
      };
    }
  }

  private async checkMinio() {
    const startTime = Date.now();
    
    try {
      // 尝试检查MinIO连接
      const isConnected = await imageService.checkConnection();
      const responseTime = Date.now() - startTime;
      
      return {
        status: isConnected ? 'up' : 'down',
        responseTime
      };
    } catch (error) {
      return {
        status: 'down' as const,
        responseTime: Date.now() - startTime
      };
    }
  }

  private async checkFeishu() {
    const startTime = Date.now();
    
    try {
      // 尝试获取飞书访问令牌
      const token = await feishuApiService.getAccessToken();
      const responseTime = Date.now() - startTime;
      
      return {
        status: token ? 'up' : 'down',
        responseTime,
        tokenValid: !!token
      };
    } catch (error) {
      return {
        status: 'down' as const,
        responseTime: Date.now() - startTime,
        tokenValid: false
      };
    }
  }

  private getSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      uptime: process.uptime(),
      memoryUsage: memoryUsage.heapUsed / 1024 / 1024, // MB
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000 // 转换为毫秒
    };
  }

  private determineOverallStatus(serviceStatuses: Array<{ status: 'up' | 'down' }>) {
    const downServices = serviceStatuses.filter(service => service.status === 'down');
    
    if (downServices.length === 0) {
      return 'healthy';
    } else if (downServices.length === serviceStatuses.length) {
      return 'unhealthy';
    } else {
      return 'degraded';
    }
  }
}

export const healthController = new HealthController();