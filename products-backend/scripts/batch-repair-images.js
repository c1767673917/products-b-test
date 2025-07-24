/**
 * 批量修复产品图片引用脚本
 * 用于修复数据不一致问题和孤立的图片文件
 */

const mongoose = require('mongoose');
const { Product } = require('../dist/models/Product');
const { Image } = require('../dist/models/Image');
const { enhancedImageService } = require('../dist/services/enhancedImageService');
require('dotenv').config();

// 连接数据库
async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/products-db';
    await mongoose.connect(mongoUri);
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

// 批量修复图片引用
async function batchRepairImages(options = {}) {
  const {
    limit = 100,
    productIds = [],
    dryRun = false,
    skipValidation = false
  } = options;

  console.log('🔧 开始批量修复图片引用...');
  console.log(`配置: limit=${limit}, dryRun=${dryRun}, skipValidation=${skipValidation}`);

  const stats = {
    totalProducts: 0,
    processedProducts: 0,
    repairedProducts: 0,
    failedProducts: 0,
    totalRepairs: 0,
    errors: []
  };

  try {
    // 构建查询条件
    let query = {};
    if (productIds.length > 0) {
      query.productId = { $in: productIds };
    }

    // 获取需要处理的产品
    const products = await Product.find(query).limit(limit).lean();
    stats.totalProducts = products.length;

    console.log(`📊 找到 ${stats.totalProducts} 个产品需要处理`);

    for (const product of products) {
      try {
        console.log(`🔄 处理产品: ${product.productId}`);
        stats.processedProducts++;

        // 如果不跳过验证，先检查一致性
        let needsRepair = true;
        if (!skipValidation) {
          const consistencyChecks = await enhancedImageService.validateImageConsistency(product.productId);
          needsRepair = consistencyChecks.some(check => 
            Object.values(check.issues).some(Boolean)
          );

          if (!needsRepair) {
            console.log(`✅ 产品 ${product.productId} 无需修复`);
            continue;
          }
        }

        // 执行修复
        if (!dryRun && needsRepair) {
          const repairResult = await enhancedImageService.repairImageReferences(product.productId);
          
          if (repairResult.repaired > 0) {
            stats.repairedProducts++;
            stats.totalRepairs += repairResult.repaired;
            console.log(`✅ 产品 ${product.productId} 修复完成: ${repairResult.repaired} 个问题`);
          }

          if (repairResult.failed > 0) {
            stats.failedProducts++;
            console.log(`⚠️  产品 ${product.productId} 部分修复失败: ${repairResult.failed} 个问题`);
          }
        } else if (dryRun) {
          console.log(`🔍 [DRY RUN] 产品 ${product.productId} 需要修复`);
          stats.repairedProducts++;
        }

        // 添加延时避免过载
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        stats.failedProducts++;
        const errorMsg = `产品 ${product.productId} 修复失败: ${error.message}`;
        stats.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    // 输出统计结果
    console.log('\n📊 批量修复统计:');
    console.log(`总产品数: ${stats.totalProducts}`);
    console.log(`已处理: ${stats.processedProducts}`);
    console.log(`已修复: ${stats.repairedProducts}`);
    console.log(`失败: ${stats.failedProducts}`);
    console.log(`总修复数: ${stats.totalRepairs}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ 错误列表:');
      stats.errors.forEach(error => console.log(`  - ${error}`));
    }

    return stats;

  } catch (error) {
    console.error('❌ 批量修复过程出错:', error);
    throw error;
  }
}

// 清理孤立图片
async function cleanupOrphanedImages(dryRun = false) {
  console.log('🧹 开始清理孤立图片...');

  try {
    if (!dryRun) {
      const cleanupResult = await enhancedImageService.cleanupOrphanedImages();
      
      console.log('\n📊 清理统计:');
      console.log(`孤立图片: ${cleanupResult.orphanedImages}`);
      console.log(`无效引用: ${cleanupResult.invalidReferences}`);
      console.log(`释放空间: ${(cleanupResult.freedSpace / 1024 / 1024).toFixed(2)} MB`);

      if (cleanupResult.errors.length > 0) {
        console.log('\n❌ 清理错误:');
        cleanupResult.errors.forEach(error => console.log(`  - ${error}`));
      }

      return cleanupResult;
    } else {
      console.log('🔍 [DRY RUN] 孤立图片清理模拟完成');
      return { orphanedImages: 0, invalidReferences: 0, freedSpace: 0, errors: [] };
    }

  } catch (error) {
    console.error('❌ 清理孤立图片失败:', error);
    throw error;
  }
}

// 生成修复报告
async function generateRepairReport() {
  console.log('📋 生成修复报告...');

  try {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalProducts: 0,
        productsWithIssues: 0,
        totalIssues: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0
      },
      details: []
    };

    // 获取所有产品
    const products = await Product.find({}).lean();
    report.summary.totalProducts = products.length;

    console.log(`📊 分析 ${products.length} 个产品...`);

    for (const product of products) {
      try {
        const consistencyChecks = await enhancedImageService.validateImageConsistency(product.productId);
        
        const productIssues = consistencyChecks.filter(check => 
          Object.values(check.issues).some(Boolean)
        );

        if (productIssues.length > 0) {
          report.summary.productsWithIssues++;
          report.summary.totalIssues += productIssues.length;

          // 统计严重程度
          productIssues.forEach(issue => {
            report.summary[`${issue.severity}Issues`]++;
          });

          report.details.push({
            productId: product.productId,
            productName: product.name?.display || 'Unknown',
            issues: productIssues
          });
        }

      } catch (error) {
        console.error(`分析产品 ${product.productId} 失败:`, error.message);
      }
    }

    // 保存报告
    const fs = require('fs');
    const reportPath = `./reports/repair-report-${Date.now()}.json`;
    
    // 确保reports目录存在
    if (!fs.existsSync('./reports')) {
      fs.mkdirSync('./reports', { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📋 修复报告生成完成:');
    console.log(`总产品数: ${report.summary.totalProducts}`);
    console.log(`有问题的产品: ${report.summary.productsWithIssues}`);
    console.log(`总问题数: ${report.summary.totalIssues}`);
    console.log(`严重问题: ${report.summary.criticalIssues}`);
    console.log(`高级问题: ${report.summary.highIssues}`);
    console.log(`中级问题: ${report.summary.mediumIssues}`);
    console.log(`低级问题: ${report.summary.lowIssues}`);
    console.log(`报告文件: ${reportPath}`);

    return report;

  } catch (error) {
    console.error('❌ 生成修复报告失败:', error);
    throw error;
  }
}

// 主执行函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'repair';

  console.log('🚀 批量图片修复工具启动...\n');

  try {
    await connectDB();

    switch (command) {
      case 'repair':
        const repairOptions = {
          limit: parseInt(args[1]) || 100,
          dryRun: args.includes('--dry-run'),
          skipValidation: args.includes('--skip-validation')
        };
        await batchRepairImages(repairOptions);
        break;

      case 'cleanup':
        const dryRun = args.includes('--dry-run');
        await cleanupOrphanedImages(dryRun);
        break;

      case 'report':
        await generateRepairReport();
        break;

      case 'all':
        console.log('执行完整修复流程...');
        await generateRepairReport();
        await batchRepairImages({ dryRun: false });
        await cleanupOrphanedImages(false);
        break;

      default:
        console.log('使用方法:');
        console.log('  node batch-repair-images.js repair [limit] [--dry-run] [--skip-validation]');
        console.log('  node batch-repair-images.js cleanup [--dry-run]');
        console.log('  node batch-repair-images.js report');
        console.log('  node batch-repair-images.js all');
        break;
    }

    console.log('\n✅ 操作完成!');

  } catch (error) {
    console.error('\n❌ 操作失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📴 数据库连接已关闭');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  batchRepairImages,
  cleanupOrphanedImages,
  generateRepairReport
};
