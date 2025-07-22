/**
 * 数据完整性验证脚本
 */

const mongoose = require('mongoose');
const { Product } = require('./dist/models/index.js');

async function validateDataIntegrity() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/products-db');
    
    console.log('=== 数据完整性验证 ===');
    
    // 1. 基本统计
    const totalProducts = await Product.countDocuments();
    console.log('总产品数量:', totalProducts);
    
    // 2. 验证中文名称字段填充情况
    const productsWithChineseName = await Product.countDocuments({ 
      name: { $exists: true, $ne: '', $ne: null } 
    });
    console.log('有产品名称的记录数:', productsWithChineseName);
    
    // 3. 验证分类字段
    const productsWithPrimaryCategory = await Product.countDocuments({ 
      'category.primary': { $exists: true, $ne: '', $ne: null } 
    });
    console.log('有一级分类的记录数:', productsWithPrimaryCategory);
    
    const productsWithSecondaryCategory = await Product.countDocuments({ 
      'category.secondary': { $exists: true, $ne: '', $ne: null } 
    });
    console.log('有二级分类的记录数:', productsWithSecondaryCategory);
    
    // 4. 验证平台字段
    const productsWithPlatform = await Product.countDocuments({ 
      platform: { $exists: true, $ne: '', $ne: null } 
    });
    console.log('有平台信息的记录数:', productsWithPlatform);
    
    // 5. 验证口味字段
    const productsWithFlavor = await Product.countDocuments({ 
      flavor: { $exists: true, $ne: '', $ne: null } 
    });
    console.log('有口味信息的记录数:', productsWithFlavor);
    
    // 6. 抽样检查中文字段内容
    console.log('\n=== 抽样检查中文字段内容 ===');
    const sampleProducts = await Product.find({}).limit(5).select('name category platform flavor');
    
    sampleProducts.forEach((product, index) => {
      console.log(`样本 ${index + 1}:`);
      console.log(`  产品名称: ${product.name || '无'}`);
      console.log(`  一级分类: ${product.category?.primary || '无'}`);
      console.log(`  二级分类: ${product.category?.secondary || '无'}`);
      console.log(`  平台: ${product.platform || '无'}`);
      console.log(`  口味: ${product.flavor || '无'}`);
      console.log('');
    });
    
    // 7. 验证价格字段
    const productsWithPrice = await Product.countDocuments({ 
      'price.normal': { $exists: true, $ne: null, $gt: 0 } 
    });
    console.log('有正常售价的记录数:', productsWithPrice);
    
    // 8. 验证产品ID生成
    const productsWithId = await Product.countDocuments({ 
      productId: { $exists: true, $ne: '', $ne: null } 
    });
    console.log('有产品ID的记录数:', productsWithId);
    
    // 9. 检查中文字段的具体内容（验证fallback机制）
    console.log('\n=== 中文字段内容验证 ===');
    const chineseNameSamples = await Product.find({ 
      name: { $regex: /[\u4e00-\u9fa5]/ } // 包含中文字符
    }).limit(3).select('name');
    
    console.log('包含中文的产品名称样本:');
    chineseNameSamples.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name}`);
    });
    
    const chineseCategorySamples = await Product.find({ 
      'category.primary': { $regex: /[\u4e00-\u9fa5]/ }
    }).limit(3).select('category');
    
    console.log('\n包含中文的一级分类样本:');
    chineseCategorySamples.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.category?.primary}`);
    });
    
    console.log('\n=== 验证结果总结 ===');
    console.log(`数据完整性: ${totalProducts === 1209 ? '✅ 通过' : '❌ 失败'} (期望1209条，实际${totalProducts}条)`);
    console.log(`中文名称填充率: ${(productsWithChineseName/totalProducts*100).toFixed(1)}%`);
    console.log(`一级分类填充率: ${(productsWithPrimaryCategory/totalProducts*100).toFixed(1)}%`);
    console.log(`二级分类填充率: ${(productsWithSecondaryCategory/totalProducts*100).toFixed(1)}%`);
    console.log(`平台信息填充率: ${(productsWithPlatform/totalProducts*100).toFixed(1)}%`);
    console.log(`口味信息填充率: ${(productsWithFlavor/totalProducts*100).toFixed(1)}%`);
    console.log(`价格信息填充率: ${(productsWithPrice/totalProducts*100).toFixed(1)}%`);
    console.log(`产品ID填充率: ${(productsWithId/totalProducts*100).toFixed(1)}%`);
    
    // 10. 最终评估
    const overallScore = (
      (totalProducts === 1209 ? 100 : 0) * 0.3 +
      (productsWithChineseName/totalProducts*100) * 0.2 +
      (productsWithPrimaryCategory/totalProducts*100) * 0.2 +
      (productsWithPrice/totalProducts*100) * 0.15 +
      (productsWithId/totalProducts*100) * 0.15
    );
    
    console.log(`\n总体评分: ${overallScore.toFixed(1)}/100`);
    console.log(`修复效果: ${overallScore >= 90 ? '✅ 优秀' : overallScore >= 80 ? '✅ 良好' : overallScore >= 70 ? '⚠️ 一般' : '❌ 需要改进'}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('验证失败:', error.message);
    process.exit(1);
  }
}

validateDataIntegrity();
