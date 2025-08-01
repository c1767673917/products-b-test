import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Product } from '../models';
import { ProductImageController } from '../controllers/productImageController';

// 请求参数类型定义
interface ProductListQuery {
  page?: number;
  limit?: number;
  category?: string;
  platform?: string;
  search?: string;
  priceMin?: number;
  priceMax?: number;
  province?: string;
  sortBy?: 'price' | 'time' | 'name';
  sortOrder?: 'asc' | 'desc';
  status?: 'active' | 'inactive';
}

interface ProductParams {
  id: string;
}

interface BatchProductRequest {
  productIds: string[];
  fields?: string[];
}

// 产品路由
export async function productRoutes(fastify: FastifyInstance) {
  // 获取产品列表
  fastify.get<{ Querystring: ProductListQuery & { lang?: string } }>('/products', async (request, reply) => {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        platform,
        search,
        priceMin,
        priceMax,
        province,
        sortBy = 'time',
        sortOrder = 'desc',
        status = 'active',
        lang = 'zh'
      } = request.query;

      // 根据语言选择对应的字段路径
      const getFieldPath = (baseField: string) => {
        if (lang === 'en') {
          return `${baseField}.english`;
        }
        return `${baseField}.chinese`;
      };

      // 构建查询条件
      const query: any = { status, isVisible: true };

      if (category) {
        const categories = category.split(',').map((c: string) => c.trim()).filter(Boolean);
        // 根据语言构建多字段查询，优先匹配对应语言字段，回退到display字段
        const categoryQuery = {
          $or: [
            { [getFieldPath('category.primary')]: categories.length === 1 ? categories[0] : { $in: categories } },
            { 'category.primary.display': categories.length === 1 ? categories[0] : { $in: categories } }
          ]
        };
        query.$and = query.$and || [];
        query.$and.push(categoryQuery);
      }
      if (platform) {
        const platforms = platform.split(',').map((p: string) => p.trim()).filter(Boolean);
        // 根据语言构建多字段查询，优先匹配对应语言字段，回退到display字段
        const platformQuery = {
          $or: [
            { [getFieldPath('platform')]: platforms.length === 1 ? platforms[0] : { $in: platforms } },
            { 'platform.display': platforms.length === 1 ? platforms[0] : { $in: platforms } }
          ]
        };
        query.$and = query.$and || [];
        query.$and.push(platformQuery);
      }
      if (province) {
        const provinces = province.split(',').map((p: string) => p.trim()).filter(Boolean);
        // 根据语言构建多字段查询，优先匹配对应语言字段，回退到display字段
        const provinceQuery = {
          $or: [
            { [getFieldPath('origin.province')]: provinces.length === 1 ? provinces[0] : { $in: provinces } },
            { 'origin.province.display': provinces.length === 1 ? provinces[0] : { $in: provinces } }
          ]
        };
        query.$and = query.$and || [];
        query.$and.push(provinceQuery);
      }
      if (search) {
        query.$text = { $search: search };
      }
      if (priceMin !== undefined || priceMax !== undefined) {
        query['price.normal'] = {};
        if (priceMin !== undefined) query['price.normal'].$gte = priceMin;
        if (priceMax !== undefined) query['price.normal'].$lte = priceMax;
      }
      
      // 构建排序条件
      let sortCondition: any = {};
      switch (sortBy) {
        case 'price':
          sortCondition['price.normal'] = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'name':
          sortCondition.name = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'time':
        default:
          sortCondition.collectTime = sortOrder === 'asc' ? 1 : -1;
          break;
      }
      
      // 如果是文本搜索，添加相关性排序
      if (search) {
        sortCondition = { score: { $meta: 'textScore' }, ...sortCondition };
      }
      
      const skip = (page - 1) * limit;
      const maxLimit = 1000; // 最大限制
      const actualLimit = Math.min(limit, maxLimit);
      
      // 并行执行查询和计数
      const [products, total] = await Promise.all([
        Product.find(query)
          .sort(sortCondition)
          .skip(skip)
          .limit(actualLimit)
          .lean(),
        Product.countDocuments(query)
      ]);
      
      // 计算分页信息
      const totalPages = Math.ceil(total / actualLimit);
      const hasNext = skip + actualLimit < total;
      const hasPrev = page > 1;
      
      return {
        success: true,
        data: {
          products,
          pagination: {
            page: parseInt(page.toString()),
            limit: actualLimit,
            total,
            totalPages,
            hasNext,
            hasPrev
          }
        },
        message: '获取产品列表成功',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error('获取产品列表失败:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'PRODUCT_LIST_ERROR',
          message: '获取产品列表失败'
        },
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // 获取产品详情
  fastify.get<{ Params: ProductParams }>('/products/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      
      const product = await Product.findOne({
        productId: id,
        status: 'active',
        isVisible: true
      }).lean();
      
      if (!product) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: '产品不存在'
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // 查询相关产品（同分类的其他产品）
      const relatedProducts = await Product.find({
        'category.primary': product.category?.primary,
        productId: { $ne: product.productId },
        status: 'active',
        isVisible: true
      })
      .sort({ collectTime: -1 })
      .limit(5)
      .select('productId name category price images platform')
      .lean();
      
      return {
        success: true,
        data: {
          product,
          relatedProducts
        },
        message: '获取产品详情成功',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error('获取产品详情失败:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'PRODUCT_DETAIL_ERROR',
          message: '获取产品详情失败'
        },
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // 批量获取产品
  fastify.post<{ Body: BatchProductRequest }>('/products/batch', async (request, reply) => {
    try {
      const { productIds, fields } = request.body;
      
      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_PRODUCT_IDS',
            message: '产品ID列表不能为空'
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // 限制批量查询数量
      const maxBatchSize = 50;
      if (productIds.length > maxBatchSize) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'BATCH_SIZE_EXCEEDED',
            message: `批量查询数量不能超过${maxBatchSize}个`
          },
          timestamp: new Date().toISOString()
        });
      }
      
      const query = {
        productId: { $in: productIds },
        status: 'active',
        isVisible: true
      };
      
      let productQuery = Product.find(query);
      
      // 如果指定了字段，只选择这些字段
      if (fields && Array.isArray(fields) && fields.length > 0) {
        productQuery = productQuery.select(fields.join(' ')) as any;
      }
      
      const products = await productQuery.lean();
      
      return {
        success: true,
        data: {
          products,
          requested: productIds.length,
          found: products.length
        },
        message: '批量获取产品成功',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error('批量获取产品失败:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'BATCH_PRODUCTS_ERROR',
          message: '批量获取产品失败'
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  // 产品图片相关路由

  /**
   * 测试路由
   * GET /api/v1/products/:productId/test
   */
  fastify.get('/:productId/test', async (request, reply) => {
    return { success: true, message: 'Test route works', productId: (request.params as any).productId };
  });

  /**
   * 验证产品图片一致性
   * GET /api/v1/products/:productId/images/validate
   */
  fastify.get('/:productId/images/validate', ProductImageController.validateImageConsistency);

  /**
   * 获取产品的所有图片
   * GET /api/v1/products/:productId/images
   */
  fastify.get('/:productId/images', ProductImageController.getProductImages);

  /**
   * 获取产品的单个图片信息
   * GET /api/v1/products/:productId/images/:imageType
   */
  fastify.get('/:productId/images/:imageType', ProductImageController.getProductImage);

  /**
   * 修复产品图片引用
   * POST /api/v1/products/:productId/images/repair
   */
  fastify.post('/:productId/images/repair', ProductImageController.repairProductImages);

  /**
   * 重新同步产品图片
   * POST /api/v1/products/:productId/images/sync
   */
  fastify.post('/:productId/images/sync', ProductImageController.syncProductImages);
}