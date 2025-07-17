"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRoutes = searchRoutes;
const models_1 = require("../models");
// 搜索路由
async function searchRoutes(fastify) {
    // 全文搜索产品
    fastify.get('/search', async (request, reply) => {
        try {
            const { q, page = 1, limit = 20, category, platform, highlight = false } = request.query;
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
            // 构建查询条件
            const query = {
                $text: { $search: q },
                status: 'active',
                isVisible: true
            };
            if (category)
                query['category.primary'] = category;
            if (platform)
                query.platform = platform;
            const skip = (page - 1) * limit;
            const maxLimit = 100;
            const actualLimit = Math.min(limit, maxLimit);
            // 搜索结果按相关性排序
            const sortCondition = {
                score: { $meta: 'textScore' },
                collectTime: -1
            };
            // 并行执行搜索和计数
            const [products, total] = await Promise.all([
                models_1.Product.find(query, { score: { $meta: 'textScore' } })
                    .sort(sortCondition)
                    .skip(skip)
                    .limit(actualLimit)
                    .lean(),
                models_1.Product.countDocuments(query)
            ]);
            // 如果需要高亮，处理搜索结果
            let processedProducts = products;
            if (highlight) {
                processedProducts = products.map(product => ({
                    ...product,
                    highlightedName: highlightText(product.name, q),
                    highlightedManufacturer: product.manufacturer ? highlightText(product.manufacturer, q) : undefined
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
        }
        catch (error) {
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
    fastify.get('/search/suggestions', async (request, reply) => {
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
            const suggestions = await models_1.Product.aggregate([
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
        }
        catch (error) {
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
function highlightText(text, query) {
    if (!text || !query)
        return text;
    const words = query.trim().split(/\s+/);
    let highlightedText = text;
    words.forEach(word => {
        const regex = new RegExp(`(${word})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });
    return highlightedText;
}
//# sourceMappingURL=search.js.map