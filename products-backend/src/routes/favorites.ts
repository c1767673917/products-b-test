import { FastifyInstance } from 'fastify';
import { Favorite, Product } from '../models';

// 请求类型定义
interface FavoriteToggleRequest {
  Body: {
    productId: string;
    userId?: string;
    sessionId?: string;
    metadata?: any;
  };
}

interface FavoriteListQuery {
  userId?: string;
  sessionId?: string;
  page?: number;
  limit?: number;
  populate?: boolean;
}

interface FavoriteStatusQuery {
  productId: string;
  userId?: string;
  sessionId?: string;
}

interface FavoriteStatsQuery {
  productIds?: string;
}

// 收藏功能路由
export async function favoriteRoutes(fastify: FastifyInstance) {
  
  // 切换收藏状态
  fastify.post<FavoriteToggleRequest>('/favorites/toggle', async (request, reply) => {
    try {
      const { productId, userId, sessionId, metadata } = request.body;
      
      if (!productId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'MISSING_PRODUCT_ID',
            message: '产品ID不能为空'
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // 验证产品是否存在
      const productExists = await Product.exists({ 
        productId, 
        status: 'active', 
        isVisible: true 
      });
      
      if (!productExists) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: '产品不存在或已下架'
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // 添加请求元数据
      const requestMetadata = {
        ...metadata,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        timestamp: new Date().toISOString()
      };
      
      const result = await Favorite.toggleFavorite(productId, userId, sessionId, requestMetadata);
      
      // 获取更新后的收藏数量
      const favoriteCount = await Favorite.getProductFavoriteCount(productId);
      
      return {
        success: true,
        data: {
          action: result.action,
          productId,
          isFavorited: result.action === 'added',
          favoriteCount,
          favorite: result.favorite
        },
        message: result.action === 'added' ? '收藏成功' : '取消收藏成功',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      fastify.log.error('切换收藏状态失败:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'FAVORITE_TOGGLE_ERROR',
          message: '切换收藏状态失败'
        },
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // 获取收藏列表
  fastify.get<{ Querystring: FavoriteListQuery }>('/favorites', async (request, reply) => {
    try {
      const { 
        userId, 
        sessionId, 
        page = 1, 
        limit = 20, 
        populate = true 
      } = request.query;
      
      if (!userId && !sessionId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'MISSING_USER_IDENTIFIER',
            message: '需要提供用户ID或会话ID'
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // 特殊处理：如果limit为1000或更大，允许获取所有收藏（用于筛选功能）
      const requestedLimit = Number(limit);
      const actualLimit = requestedLimit >= 1000 ? requestedLimit : Math.min(requestedLimit, 100);

      const result = await Favorite.getFavoritesList({
        userId,
        sessionId,
        page: Number(page),
        limit: actualLimit,
        populate: typeof populate === 'string' ? populate === 'true' : Boolean(populate)
      });
      
      return {
        success: true,
        data: result,
        message: '获取收藏列表成功',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      fastify.log.error('获取收藏列表失败:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'FAVORITE_LIST_ERROR',
          message: '获取收藏列表失败'
        },
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // 检查收藏状态
  fastify.get<{ Querystring: FavoriteStatusQuery }>('/favorites/status', async (request, reply) => {
    try {
      const { productId, userId, sessionId } = request.query;
      
      if (!productId) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'MISSING_PRODUCT_ID',
            message: '产品ID不能为空'
          },
          timestamp: new Date().toISOString()
        });
      }
      
      const isFavorited = await Favorite.checkFavoriteStatus(productId, userId, sessionId);
      const favoriteCount = await Favorite.getProductFavoriteCount(productId);
      
      return {
        success: true,
        data: {
          productId,
          isFavorited,
          favoriteCount
        },
        message: '获取收藏状态成功',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      fastify.log.error('获取收藏状态失败:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'FAVORITE_STATUS_ERROR',
          message: '获取收藏状态失败'
        },
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // 批量获取收藏状态
  fastify.get<{ Querystring: FavoriteStatsQuery & { userId?: string; sessionId?: string } }>('/favorites/batch-status', async (request, reply) => {
    try {
      const { productIds, userId, sessionId } = request.query;
      
      if (!productIds) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'MISSING_PRODUCT_IDS',
            message: '产品ID列表不能为空'
          },
          timestamp: new Date().toISOString()
        });
      }
      
      const productIdArray = productIds.split(',').filter(id => id.trim());
      
      if (productIdArray.length === 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_PRODUCT_IDS',
            message: '产品ID列表格式无效'
          },
          timestamp: new Date().toISOString()
        });
      }
      
      const favoriteMap = await Favorite.batchCheckFavoriteStatus(productIdArray, userId, sessionId);
      
      return {
        success: true,
        data: {
          favoriteMap
        },
        message: '批量获取收藏状态成功',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      fastify.log.error('批量获取收藏状态失败:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'BATCH_FAVORITE_STATUS_ERROR',
          message: '批量获取收藏状态失败'
        },
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // 获取产品收藏统计
  fastify.get<{ Params: { productId: string } }>('/favorites/stats/:productId', async (request, reply) => {
    try {
      const { productId } = request.params;
      
      const favoriteCount = await Favorite.getProductFavoriteCount(productId);
      
      return {
        success: true,
        data: {
          productId,
          favoriteCount
        },
        message: '获取产品收藏统计成功',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      fastify.log.error('获取产品收藏统计失败:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'FAVORITE_STATS_ERROR',
          message: '获取产品收藏统计失败'
        },
        timestamp: new Date().toISOString()
      });
    }
  });
}
