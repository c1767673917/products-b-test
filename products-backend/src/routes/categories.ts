import { FastifyInstance } from 'fastify';
import { Product, Category } from '../models';

// 分类路由
export async function categoryRoutes(fastify: FastifyInstance) {
  // 获取分类树结构
  fastify.get('/categories', async (request, reply) => {
    try {
      // 从产品数据中动态生成分类树
      const categoryStats = await Product.aggregate([
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
          .filter((sub: any) => sub.name && sub.name.trim())
          .sort((a: any, b: any) => b.count - a.count)
          .map((sub: any) => ({
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
    } catch (error) {
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
export async function statsRoutes(fastify: FastifyInstance) {
  // 获取数据概览统计
  fastify.get('/stats/overview', async (request, reply) => {
    try {
      // 并行执行多个统计查询
      const [
        totalProducts,
        categoryDistribution,
        platformDistribution,
        locationDistribution,
        priceStats,
        recentActivity
      ] = await Promise.all([
        // 总产品数
        Product.countDocuments({ status: 'active', isVisible: true }),
        
        // 分类分布
        Product.aggregate([
          { $match: { status: 'active', isVisible: true } },
          { $group: { _id: '$category.primary.display', count: { $sum: 1 } } },
          { $match: { _id: { $nin: [null, '', '未分类'] } } },
          { $sort: { count: -1 } }
        ]),

        // 平台分布
        Product.aggregate([
          { $match: { status: 'active', isVisible: true } },
          { $group: { _id: '$platform.display', count: { $sum: 1 } } },
          { $match: { _id: { $nin: [null, '', '未知平台'] } } },
          { $sort: { count: -1 } }
        ]),

        // 地区分布
        Product.aggregate([
          { $match: { status: 'active', isVisible: true, 'origin.province.display': { $exists: true, $ne: '' } } },
          { $group: { _id: '$origin.province.display', count: { $sum: 1 } } },
          { $match: { _id: { $nin: [null, ''] } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        
        // 价格统计 (CNY和USD)
        Product.aggregate([
          { $match: { status: 'active', isVisible: true, 'price.normal': { $gt: 0 } } },
          {
            $group: {
              _id: null,
              minPrice: { $min: '$price.normal' },
              maxPrice: { $max: '$price.normal' },
              avgPrice: { $avg: '$price.normal' },
              prices: { $push: '$price.normal' },
              // USD价格统计
              minPriceUSD: { $min: '$price.usd.normal' },
              maxPriceUSD: { $max: '$price.usd.normal' },
              avgPriceUSD: { $avg: '$price.usd.normal' },
              pricesUSD: { $push: '$price.usd.normal' }
            }
          }
        ]),
        
        // 最近活动
        Product.aggregate([
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
      let medianUSD = 0;
      if (priceData && priceData.prices && priceData.prices.length > 0) {
        const sortedPrices = priceData.prices.sort((a: number, b: number) => a - b);
        const mid = Math.floor(sortedPrices.length / 2);
        median = sortedPrices.length % 2 === 0 
          ? (sortedPrices[mid - 1] + sortedPrices[mid]) / 2 
          : sortedPrices[mid];
      }
      
      // 计算USD价格中位数
      if (priceData && priceData.pricesUSD && priceData.pricesUSD.length > 0) {
        const sortedPricesUSD = priceData.pricesUSD
          .filter((price: number | null) => price !== null && price > 0)
          .sort((a: number, b: number) => a - b);
        if (sortedPricesUSD.length > 0) {
          const midUSD = Math.floor(sortedPricesUSD.length / 2);
          medianUSD = sortedPricesUSD.length % 2 === 0 
            ? (sortedPricesUSD[midUSD - 1] + sortedPricesUSD[midUSD]) / 2 
            : sortedPricesUSD[midUSD];
        }
      }
      
      // 转换分布数据为对象格式
      const categoryDistObj = Object.fromEntries(
        categoryDistribution.map((item: any) => [item._id, item.count])
      );
      
      const platformDistObj = Object.fromEntries(
        platformDistribution.map((item: any) => [item._id, item.count])
      );
      
      const locationDistObj = Object.fromEntries(
        locationDistribution.map((item: any) => [item._id, item.count])
      );
      
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
            median: Math.round(median * 100) / 100,
            // USD价格统计
            minUSD: priceData?.minPriceUSD || 0,
            maxUSD: priceData?.maxPriceUSD || 0,
            averageUSD: Math.round((priceData?.avgPriceUSD || 0) * 100) / 100,
            medianUSD: Math.round(medianUSD * 100) / 100
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
    } catch (error) {
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