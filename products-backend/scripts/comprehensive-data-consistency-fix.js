#!/usr/bin/env node

/**
 * 综合数据一致性检查和修复脚本
 * 
 * 整合所有数据一致性问题的解决方案：
 * 1. Product表和Image表关联强化
 * 2. 图片URL格式标准化
 * 3. 孤立图片和无效引用清理
 */

const mongoose = require('mongoose');
const { 
  createAssociationIndexes,
  addDataConstraints,
  fixExistingAssociations,
  addValidationRules,
  validateStrengthening
} = require('./strengthen-table-associations');

const {
  analyzeUrlFormats,
  standardizeProductImageUrls,
  standardizeImageTableUrls,
  validateStandardization
} = require('./standardize-image-urls');

const {
  identifyOrphanedRecords,
  identifyOrphanedFiles,
  identifyInvalidReferences,
  identifyBrokenAssociations,
  cleanupOrphanedRecords,
  fixInvalidReferences,
  fixBrokenAssociations
} = require('./cleanup-orphaned-images');

// 配置选项
const options = {
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  force: process.argv.includes('--force'),
  skipAssociation: process.argv.includes('--skip-association'),
  skipUrlStandardization: process.argv.includes('--skip-url'),
  skipCleanup: process.argv.includes('--skip-cleanup')
};

/**
 * 主执行函数
 */
async function main() {
  try {
    console.log('🚀 开始综合数据一致性检查和修复...');
    console.log(`模式: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`);
    
    // 连接数据库
    await connectDatabase();
    
    // 执行修复步骤
    const results = {
      phase1: null, // 关联强化
      phase2: null, // URL标准化
      phase3: null, // 清理孤立数据
      totalTime: 0,
      errors: []
    };
    
    const startTime = Date.now();
    
    // 阶段1: 强化表关联
    if (!options.skipAssociation) {
      console.log('\n🔗 阶段1: 强化Product表和Image表关联...');
      results.phase1 = await executePhase1();
    }
    
    // 阶段2: 标准化URL格式
    if (!options.skipUrlStandardization) {
      console.log('\n🔧 阶段2: 标准化图片URL格式...');
      results.phase2 = await executePhase2();
    }
    
    // 阶段3: 清理孤立数据
    if (!options.skipCleanup) {
      console.log('\n🧹 阶段3: 清理孤立图片和无效引用...');
      results.phase3 = await executePhase3();
    }
    
    results.totalTime = Date.now() - startTime;
    
    // 最终验证
    console.log('\n✅ 最终验证...');
    await performFinalValidation();
    
    // 生成综合报告
    console.log('\n📊 生成综合报告...');
    await generateComprehensiveReport(results);
    
    console.log('\n✨ 综合数据一致性修复完成！');
    console.log(`总耗时: ${(results.totalTime / 1000).toFixed(2)} 秒`);
    
  } catch (error) {
    console.error('❌ 综合修复过程失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

/**
 * 连接数据库
 */
async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/products-db';
  await mongoose.connect(mongoUri);
  console.log('✅ 数据库连接成功');
}

/**
 * 执行阶段1: 强化表关联
 */
async function executePhase1() {
  const phase1Results = {
    indexesCreated: 0,
    constraintsAdded: 0,
    dataFixed: 0,
    validationRulesAdded: 0,
    errors: []
  };
  
  try {
    console.log('  📊 创建关联索引...');
    phase1Results.indexesCreated = await createAssociationIndexes();
    
    console.log('  🔒 添加数据约束...');
    phase1Results.constraintsAdded = await addDataConstraints();
    
    console.log('  🔧 修复现有数据关联...');
    phase1Results.dataFixed = await fixExistingAssociations();
    
    console.log('  ✅ 添加验证规则...');
    phase1Results.validationRulesAdded = await addValidationRules();
    
    console.log('  🔍 验证强化结果...');
    await validateStrengthening();
    
    console.log(`  ✅ 阶段1完成: 索引${phase1Results.indexesCreated}, 约束${phase1Results.constraintsAdded}, 修复${phase1Results.dataFixed}`);
    
  } catch (error) {
    phase1Results.errors.push(error.message);
    console.error('  ❌ 阶段1失败:', error);
  }
  
  return phase1Results;
}

/**
 * 执行阶段2: URL标准化
 */
async function executePhase2() {
  const phase2Results = {
    urlAnalysis: null,
    productResults: null,
    imageResults: null,
    errors: []
  };
  
  try {
    console.log('  📊 分析URL格式分布...');
    phase2Results.urlAnalysis = await analyzeUrlFormats();
    
    console.log('  🔧 标准化Product表URL...');
    phase2Results.productResults = await standardizeProductImageUrls();
    
    console.log('  🔧 标准化Image表URL...');
    phase2Results.imageResults = await standardizeImageTableUrls();
    
    console.log('  ✅ 验证标准化结果...');
    await validateStandardization();
    
    const totalFixed = (phase2Results.productResults?.fixed || 0) + (phase2Results.imageResults?.fixed || 0);
    console.log(`  ✅ 阶段2完成: 修复${totalFixed}个URL`);
    
  } catch (error) {
    phase2Results.errors.push(error.message);
    console.error('  ❌ 阶段2失败:', error);
  }
  
  return phase2Results;
}

/**
 * 执行阶段3: 清理孤立数据
 */
async function executePhase3() {
  const phase3Results = {
    orphanedRecords: 0,
    orphanedFiles: 0,
    invalidReferences: 0,
    brokenAssociations: 0,
    cleanupResults: null,
    errors: []
  };
  
  try {
    console.log('  🔍 识别孤立记录...');
    const orphanedRecords = await identifyOrphanedRecords();
    phase3Results.orphanedRecords = orphanedRecords.length;
    
    console.log('  🔍 识别孤立文件...');
    const orphanedFiles = await identifyOrphanedFiles();
    phase3Results.orphanedFiles = orphanedFiles.length;
    
    console.log('  🔍 识别无效引用...');
    const invalidReferences = await identifyInvalidReferences();
    phase3Results.invalidReferences = invalidReferences.length;
    
    console.log('  🔍 识别损坏关联...');
    const brokenAssociations = await identifyBrokenAssociations();
    phase3Results.brokenAssociations = brokenAssociations.length;
    
    if (!options.dryRun) {
      console.log('  🧹 执行清理操作...');
      
      if (orphanedRecords.length > 0) {
        await cleanupOrphanedRecords(orphanedRecords);
      }
      
      if (invalidReferences.length > 0) {
        await fixInvalidReferences(invalidReferences);
      }
      
      if (brokenAssociations.length > 0) {
        await fixBrokenAssociations(brokenAssociations);
      }
    }
    
    const totalIssues = phase3Results.orphanedRecords + phase3Results.orphanedFiles + 
                       phase3Results.invalidReferences + phase3Results.brokenAssociations;
    console.log(`  ✅ 阶段3完成: 发现${totalIssues}个问题`);
    
  } catch (error) {
    phase3Results.errors.push(error.message);
    console.error('  ❌ 阶段3失败:', error);
  }
  
  return phase3Results;
}

/**
 * 执行最终验证
 */
async function performFinalValidation() {
  try {
    const { Product } = require('../src/models/Product');
    const { Image } = require('../src/models/Image');
    
    // 统计最终数据
    const totalProducts = await Product.countDocuments({ status: 'active' });
    const totalImages = await Image.countDocuments({ isActive: true });
    const productsWithImages = await Product.countDocuments({
      status: 'active',
      $or: [
        { 'images.front': { $exists: true, $ne: null } },
        { 'images.back': { $exists: true, $ne: null } },
        { 'images.label': { $exists: true, $ne: null } },
        { 'images.package': { $exists: true, $ne: null } },
        { 'images.gift': { $exists: true, $ne: null } }
      ]
    });
    
    const imageRate = totalProducts > 0 ? (productsWithImages / totalProducts * 100).toFixed(2) : '0';
    
    console.log('  📊 最终数据统计:');
    console.log(`    - 活跃产品: ${totalProducts}`);
    console.log(`    - 活跃图片: ${totalImages}`);
    console.log(`    - 有图片的产品: ${productsWithImages}`);
    console.log(`    - 图片覆盖率: ${imageRate}%`);
    
    // 检查剩余问题
    const remainingOrphaned = await Image.countDocuments({ productExists: false });
    const remainingInvalid = await Image.countDocuments({ fileExists: false });
    
    console.log('  🔍 剩余问题:');
    console.log(`    - 孤立图片记录: ${remainingOrphaned}`);
    console.log(`    - 无效文件引用: ${remainingInvalid}`);
    
    if (remainingOrphaned === 0 && remainingInvalid === 0) {
      console.log('  ✅ 数据一致性验证通过');
    } else {
      console.log('  ⚠️  仍有数据一致性问题需要处理');
    }
    
  } catch (error) {
    console.error('最终验证失败:', error);
  }
}

/**
 * 生成综合报告
 */
async function generateComprehensiveReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    mode: options.dryRun ? 'DRY_RUN' : 'LIVE',
    totalTime: results.totalTime,
    phases: {
      association: results.phase1,
      urlStandardization: results.phase2,
      cleanup: results.phase3
    },
    summary: {
      totalErrors: 0,
      totalFixed: 0,
      recommendations: []
    }
  };
  
  // 计算总错误数和修复数
  [results.phase1, results.phase2, results.phase3].forEach(phase => {
    if (phase) {
      report.summary.totalErrors += phase.errors?.length || 0;
      if (phase.dataFixed) report.summary.totalFixed += phase.dataFixed;
      if (phase.productResults?.fixed) report.summary.totalFixed += phase.productResults.fixed;
      if (phase.imageResults?.fixed) report.summary.totalFixed += phase.imageResults.fixed;
    }
  });
  
  // 生成建议
  if (report.summary.totalErrors > 0) {
    report.summary.recommendations.push('检查错误日志，手动处理失败的修复项');
  }
  
  if (results.phase2?.urlAnalysis?.standardizationRate < 95) {
    report.summary.recommendations.push('URL标准化率仍需提升，建议重新运行URL标准化');
  }
  
  if (results.phase3?.orphanedFiles > 0) {
    report.summary.recommendations.push('定期运行清理脚本，避免存储空间浪费');
  }
  
  report.summary.recommendations.push('建立定期数据一致性检查机制');
  report.summary.recommendations.push('完善图片上传和删除的关联处理逻辑');
  
  // 保存报告
  const fs = require('fs');
  const reportPath = `comprehensive-fix-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`  📄 综合报告已保存: ${reportPath}`);
  console.log(`  📊 修复统计: 总修复${report.summary.totalFixed}项, 错误${report.summary.totalErrors}项`);
}

// 执行脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  executePhase1,
  executePhase2,
  executePhase3,
  performFinalValidation,
  generateComprehensiveReport
};
