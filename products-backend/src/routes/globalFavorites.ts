import { FastifyInstance } from 'fastify';
import { GlobalFavorite, Product } from '../models';

// 请求类型定义
interface GlobalFavoriteToggleRequest {
  Body: {
    productId: string;
    metadata?: any;
  };
}

interface GlobalFavoriteListQuery {
  page?: number;
  limit?: number;
  populate?: boolean;
  sortBy?: 'recent' | 'popular';
}

interface GlobalFavoriteStatusQuery {
  productId: string;
}

interface GlobalFavoriteStatsQuery {
  productIds?: string;
}

// 全局收藏功能路由
export async function globalFavoriteRoutes(fastify: FastifyInstance) {
  
  // 切换收藏状态（全局）
  fastify.post<GlobalFavoriteToggleRequest>('/global-favorites/toggle', async (request, reply) => {
    try {
      const { productId, metadata } = request.body;
      
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
      
      const result = await GlobalFavorite.toggleFavorite(productId, requestMetadata);
      
      return {
        success: true,
        data: {
          action: result.action,
          productId,
          isFavorited: result.action === 'added',
          favoriteCount: result.count,
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
  
  // 获取全局收藏列表
  fastify.get<{ Querystring: GlobalFavoriteListQuery }>('/global-favorites', async (request, reply) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        populate = true,
        sortBy = 'recent'
      } = request.query;
      
      // 限制最大分页大小
      const requestedLimit = Number(limit);
      const actualLimit = requestedLimit >= 1000 ? requestedLimit : Math.min(requestedLimit, 100);

      const result = await GlobalFavorite.getFavoritesList({
        page: Number(page),
        limit: actualLimit,
        populate: typeof populate === 'string' ? populate === 'true' : Boolean(populate),
        sortBy: sortBy as 'recent' | 'popular'
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
  
  // 检查收藏状态（全局）
  fastify.get<{ Querystring: GlobalFavoriteStatusQuery }>('/global-favorites/status', async (request, reply) => {
    try {
      const { productId } = request.query;
      
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
      
      const isFavorited = await GlobalFavorite.checkFavoriteStatus(productId);
      const favoriteCount = await GlobalFavorite.getProductFavoriteCount(productId);
      
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
  
  // 批量获取收藏状态（全局）
  fastify.get<{ Querystring: GlobalFavoriteStatsQuery }>('/global-favorites/batch-status', async (request, reply) => {
    try {
      const { productIds } = request.query;
      
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
      
      const favoriteMap = await GlobalFavorite.batchCheckFavoriteStatus(productIdArray);
      
      // 获取每个产品的收藏数
      const countMap: { [key: string]: number } = {};
      for (const productId of productIdArray) {
        countMap[productId] = await GlobalFavorite.getProductFavoriteCount(productId);
      }
      
      return {
        success: true,
        data: {
          favoriteMap,
          countMap
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
  
  // 获取产品收藏统计（全局）
  fastify.get<{ Params: { productId: string } }>('/global-favorites/stats/:productId', async (request, reply) => {
    try {
      const { productId } = request.params;
      
      const favoriteCount = await GlobalFavorite.getProductFavoriteCount(productId);
      
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