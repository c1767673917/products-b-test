import { FastifyInstance } from 'fastify';
import { Product } from '../models';

// 请求参数类型定义
interface SearchQuery {
  q: string;
  page?: number;
  limit?: number;
  category?: string;
  platform?: string;
  highlight?: boolean;
}

interface SuggestionQuery {
  q: string;
  limit?: number;
}

// 搜索路由
export async function searchRoutes(fastify: FastifyInstance) {
  // 全文搜索产品
  fastify.get<{ Querystring: SearchQuery & { lang?: string } }>('/search', async (request, reply) => {
    try {
      const {
        q,
        page = 1,
        limit = 20,
        category,
        platform,
        highlight = false,
        lang = 'zh'
      } = request.query;
      
      if (!q || q.trim().length === 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'EMPTY_SEARCH_QUERY',
            message: '搜索关键词不能为空'
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // 根据语言选择对应的字段路径
      const getFieldPath = (baseField: string) => {
        if (lang === 'en') {
          return `${baseField}.english`;
        }
        return `${baseField}.chinese`;
      };

      // 构建查询条件
      const query: any = {
        $text: { $search: q },
        status: 'active',
        isVisible: true
      };

      if (category) {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { [getFieldPath('category.primary')]: category },
            { 'category.primary.display': category }
          ]
        });
      }
      if (platform) {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { [getFieldPath('platform')]: platform },
            { 'platform.display': platform }
          ]
        });
      }
      
      const skip = (page - 1) * limit;
      const maxLimit = 100;
      const actualLimit = Math.min(limit, maxLimit);
      
      // 搜索结果按相关性排序
      const sortCondition: any = { 
        score: { $meta: 'textScore' }, 
        collectTime: -1 
      };
      
      // 并行执行搜索和计数
      const [products, total] = await Promise.all([
        Product.find(query, { score: { $meta: 'textScore' } })
          .sort(sortCondition)
          .skip(skip)
          .limit(actualLimit)
          .lean(),
        Product.countDocuments(query)
      ]);
      
      // 如果需要高亮，处理搜索结果
      let processedProducts = products;
      if (highlight) {
        processedProducts = products.map(product => ({
          ...product,
          highlightedName: highlightText(product.name?.display || '', q),
          highlightedManufacturer: product.manufacturer ? highlightText(product.manufacturer.display || '', q) : undefined
        }));
      }
      
      const totalPages = Math.ceil(total / actualLimit);
      
      return {
        success: true,
        data: {
          products: processedProducts,
          searchQuery: q,
          pagination: {
            page: parseInt(page.toString()),
            limit: actualLimit,
            total,
            totalPages,
            hasNext: skip + actualLimit < total,
            hasPrev: page > 1
          }
        },
        message: `找到 ${total} 个相关产品`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error('搜索产品失败:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: '搜索产品失败'
        },
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // 搜索建议/自动补全
  fastify.get<{ Querystring: SuggestionQuery }>('/search/suggestions', async (request, reply) => {
    try {
      const { q, limit = 10 } = request.query;
      
      if (!q || q.trim().length < 2) {
        return {
          success: true,
          data: {
            suggestions: []
          },
          message: '搜索关键词太短',
          timestamp: new Date().toISOString()
        };
      }
      
      const maxLimit = 20;
      const actualLimit = Math.min(limit, maxLimit);
      
      // 使用正则表达式进行模糊匹配
      const regex = new RegExp(q.trim(), 'i');
      
      // 搜索产品名称和制造商
      const suggestions = await Product.aggregate([
        {
          $match: {
            $or: [
              { name: { $regex: regex } },
              { manufacturer: { $regex: regex } }
            ],
            status: 'active',
            isVisible: true
          }
        },
        {
          $group: {
            _id: null,
            names: { $addToSet: '$name' },
            manufacturers: { $addToSet: '$manufacturer' }
          }
        },
        {
          $project: {
            suggestions: {
              $slice: [
                {
                  $filter: {
                    input: { $concatArrays: ['$names', '$manufacturers'] },
                    cond: { 
                      $regexMatch: { 
                        input: '$$this', 
                        regex: q.trim(), 
                        options: 'i' 
                      } 
                    }
                  }
                },
                actualLimit
              ]
            }
          }
        }
      ]);
      
      const result = suggestions.length > 0 ? suggestions[0].suggestions : [];
      
      return {
        success: true,
        data: {
          suggestions: result,
          query: q
        },
        message: `找到 ${result.length} 个建议`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error('获取搜索建议失败:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SUGGESTION_ERROR',
          message: '获取搜索建议失败'
        },
        timestamp: new Date().toISOString()
      });
    }
  });
}

// 高亮文本函数
function highlightText(text: string, query: string): string {
  if (!text || !query) return text;
  
  const words = query.trim().split(/\s+/);
  let highlightedText = text;
  
  words.forEach(word => {
    const regex = new RegExp(`(${word})`, 'gi');
    highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
  });
  
  return highlightedText;
}