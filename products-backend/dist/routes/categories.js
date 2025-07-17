"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryRoutes = categoryRoutes;
exports.statsRoutes = statsRoutes;
const models_1 = require("../models");
// 分类路由
async function categoryRoutes(fastify) {
    // 获取分类树结构
    fastify.get('/categories', async (request, reply) => {
        try {
            // 从产品数据中动态生成分类树
            const categoryStats = await models_1.Product.aggregate([
                {
                    $match: {
                        status: 'active',
                        isVisible: true
                    }
                },
                {
                    $group: {
                        _id: {
                            primary: '$category.primary',
                            secondary: '$category.secondary'
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $group: {
                        _id: '$_id.primary',
                        totalCount: { $sum: '$count' },
                        subcategories: {
                            $push: {
                                name: '$_id.secondary',
                                count: '$count'
                            }
                        }
                    }
                },
                {
                    $sort: { totalCount: -1 }
                }
            ]);
            // 构建分类树结构
            const categories = categoryStats.map(category => ({
                id: category._id,
                name: category._id,
                level: 1,
                productCount: category.totalCount,
                children: category.subcategories
                    .filter((sub) => sub.name && sub.name.trim())
                    .sort((a, b) => b.count - a.count)
                    .map((sub) => ({
                    id: `${category._id}-${sub.name}`,
                    name: sub.name,
                    level: 2,
                    productCount: sub.count,
                    parentId: category._id
                }))
            }));
            return {
                success: true,
                data: {
                    categories,
                    totalCategories: categories.length,
                    totalSubcategories: categories.reduce((sum, cat) => sum + cat.children.length, 0)
                },
                message: '获取分类树成功',
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            fastify.log.error('获取分类树失败:', error);
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'CATEGORIES_ERROR',
                    message: '获取分类树失败'
                },
                timestamp: new Date().toISOString()
            });
        }
    });
}
// 统计路由
async function statsRoutes(fastify) {
    // 获取数据概览统计
    fastify.get('/stats/overview', async (request, reply) => {
        try {
            // 并行执行多个统计查询
            const [totalProducts, categoryDistribution, platformDistribution, locationDistribution, priceStats, recentActivity] = await Promise.all([
                // 总产品数
                models_1.Product.countDocuments({ status: 'active', isVisible: true }),
                // 分类分布
                models_1.Product.aggregate([
                    { $match: { status: 'active', isVisible: true } },
                    { $group: { _id: '$category.primary', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]),
                // 平台分布
                models_1.Product.aggregate([
                    { $match: { status: 'active', isVisible: true } },
                    { $group: { _id: '$platform', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]),
                // 地区分布
                models_1.Product.aggregate([
                    { $match: { status: 'active', isVisible: true, 'origin.province': { $exists: true, $ne: '' } } },
                    { $group: { _id: '$origin.province', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                ]),
                // 价格统计
                models_1.Product.aggregate([
                    { $match: { status: 'active', isVisible: true, 'price.normal': { $gt: 0 } } },
                    {
                        $group: {
                            _id: null,
                            minPrice: { $min: '$price.normal' },
                            maxPrice: { $max: '$price.normal' },
                            avgPrice: { $avg: '$price.normal' },
                            prices: { $push: '$price.normal' }
                        }
                    }
                ]),
                // 最近活动
                models_1.Product.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalProducts: { $sum: 1 },
                            newProductsToday: {
                                $sum: {
                                    $cond: [
                                        { $gte: ['$createdAt', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                                        1,
                                        0
                                    ]
                                }
                            },
                            newProductsWeek: {
                                $sum: {
                                    $cond: [
                                        { $gte: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                                        1,
                                        0
                                    ]
                                }
                            },
                            lastUpdateTime: { $max: '$updatedAt' }
                        }
                    }
                ])
            ]);
            // 计算价格中位数
            const priceData = priceStats[0];
            let median = 0;
            if (priceData && priceData.prices && priceData.prices.length > 0) {
                const sortedPrices = priceData.prices.sort((a, b) => a - b);
                const mid = Math.floor(sortedPrices.length / 2);
                median = sortedPrices.length % 2 === 0
                    ? (sortedPrices[mid - 1] + sortedPrices[mid]) / 2
                    : sortedPrices[mid];
            }
            // 转换分布数据为对象格式
            const categoryDistObj = Object.fromEntries(categoryDistribution.map((item) => [item._id, item.count]));
            const platformDistObj = Object.fromEntries(platformDistribution.map((item) => [item._id, item.count]));
            const locationDistObj = Object.fromEntries(locationDistribution.map((item) => [item._id, item.count]));
            const activityData = recentActivity[0] || {
                newProductsToday: 0,
                newProductsWeek: 0,
                lastUpdateTime: new Date()
            };
            return {
                success: true,
                data: {
                    totalProducts,
                    totalImages: 0, // 将在图片服务实现后更新
                    categoryDistribution: categoryDistObj,
                    platformDistribution: platformDistObj,
                    locationDistribution: locationDistObj,
                    priceStats: {
                        min: priceData?.minPrice || 0,
                        max: priceData?.maxPrice || 0,
                        average: Math.round((priceData?.avgPrice || 0) * 100) / 100,
                        median: Math.round(median * 100) / 100
                    },
                    recentActivity: {
                        newProductsToday: activityData.newProductsToday,
                        newProductsWeek: activityData.newProductsWeek,
                        lastUpdateTime: activityData.lastUpdateTime
                    }
                },
                message: '获取统计数据成功',
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            fastify.log.error('获取统计数据失败:', error);
            return reply.status(500).send({
                success: false,
                error: {
                    code: 'STATS_ERROR',
                    message: '获取统计数据失败'
                },
                timestamp: new Date().toISOString()
            });
        }
    });
}
//# sourceMappingURL=categories.js.map