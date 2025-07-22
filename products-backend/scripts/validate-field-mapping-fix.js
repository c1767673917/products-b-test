#!/usr/bin/env node

/**
 * 验证字段映射修复效果脚本
 * 
 * 此脚本验证修复后的字段映射是否正确保存了所有英文和中文字段数据
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 导入模型
const { Product } = require('../dist/models/Product');

async function validateFieldMappingFix() {
  try {
    console.log('🔍 开始验证字段映射修复效果...');
    
    // 连接数据库
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/products-db';
    await mongoose.connect(mongoUri, {
      retryWrites: false,
      w: 1,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ 数据库连接成功');
    
    // 1. 基本统计
    const totalProducts = await Product.countDocuments();
    console.log(`\n📊 基本统计:`);
    console.log(`- 总产品数量: ${totalProducts}`);
    
    // 2. 验证新的字段结构
    console.log(`\n🔍 验证新字段结构:`);
    
    // 检查name字段结构
    const productsWithNameStructure = await Product.countDocuments({
      'name.display': { $exists: true }
    });
    console.log(`- 有name.display字段的产品: ${productsWithNameStructure}`);
    
    const productsWithEnglishName = await Product.countDocuments({
      'name.english': { $exists: true, $ne: null, $ne: '' }
    });
    console.log(`- 有name.english字段的产品: ${productsWithEnglishName}`);
    
    const productsWithChineseName = await Product.countDocuments({
      'name.chinese': { $exists: true, $ne: null, $ne: '' }
    });
    console.log(`- 有name.chinese字段的产品: ${productsWithChineseName}`);
    
    // 检查category字段结构
    const productsWithCategoryStructure = await Product.countDocuments({
      'category.primary.display': { $exists: true }
    });
    console.log(`- 有category.primary.display字段的产品: ${productsWithCategoryStructure}`);
    
    const productsWithEnglishCategory = await Product.countDocuments({
      'category.primary.english': { $exists: true, $ne: null, $ne: '' }
    });
    console.log(`- 有category.primary.english字段的产品: ${productsWithEnglishCategory}`);
    
    const productsWithChineseCategory = await Product.countDocuments({
      'category.primary.chinese': { $exists: true, $ne: null, $ne: '' }
    });
    console.log(`- 有category.primary.chinese字段的产品: ${productsWithChineseCategory}`);
    
    // 检查platform字段结构
    const productsWithPlatformStructure = await Product.countDocuments({
      'platform.display': { $exists: true }
    });
    console.log(`- 有platform.display字段的产品: ${productsWithPlatformStructure}`);
    
    const productsWithEnglishPlatform = await Product.countDocuments({
      'platform.english': { $exists: true, $ne: null, $ne: '' }
    });
    console.log(`- 有platform.english字段的产品: ${productsWithEnglishPlatform}`);
    
    const productsWithChinesePlatform = await Product.countDocuments({
      'platform.chinese': { $exists: true, $ne: null, $ne: '' }
    });
    console.log(`- 有platform.chinese字段的产品: ${productsWithChinesePlatform}`);
    
    // 检查flavor字段结构
    const productsWithFlavorStructure = await Product.countDocuments({
      'flavor.display': { $exists: true }
    });
    console.log(`- 有flavor.display字段的产品: ${productsWithFlavorStructure}`);
    
    const productsWithEnglishFlavor = await Product.countDocuments({
      'flavor.english': { $exists: true, $ne: null, $ne: '' }
    });
    console.log(`- 有flavor.english字段的产品: ${productsWithEnglishFlavor}`);
    
    const productsWithChineseFlavor = await Product.countDocuments({
      'flavor.chinese': { $exists: true, $ne: null, $ne: '' }
    });
    console.log(`- 有flavor.chinese字段的产品: ${productsWithChineseFlavor}`);
    
    // 3. 抽样检查数据内容
    console.log(`\n📋 抽样检查数据内容:`);
    const sampleProducts = await Product.find({}).limit(5).select('name category platform flavor');
    
    sampleProducts.forEach((product, index) => {
      console.log(`\n样本 ${index + 1}:`);
      console.log(`  产品名称:`);
      console.log(`    - 显示: ${product.name?.display || '无'}`);
      console.log(`    - 英文: ${product.name?.english || '无'}`);
      console.log(`    - 中文: ${product.name?.chinese || '无'}`);
      
      console.log(`  一级分类:`);
      console.log(`    - 显示: ${product.category?.primary?.display || '无'}`);
      console.log(`    - 英文: ${product.category?.primary?.english || '无'}`);
      console.log(`    - 中文: ${product.category?.primary?.chinese || '无'}`);
      
      console.log(`  平台:`);
      console.log(`    - 显示: ${product.platform?.display || '无'}`);
      console.log(`    - 英文: ${product.platform?.english || '无'}`);
      console.log(`    - 中文: ${product.platform?.chinese || '无'}`);
      
      console.log(`  口味:`);
      console.log(`    - 显示: ${product.flavor?.display || '无'}`);
      console.log(`    - 英文: ${product.flavor?.english || '无'}`);
      console.log(`    - 中文: ${product.flavor?.chinese || '无'}`);
    });
    
    // 4. 验证数据完整性
    console.log(`\n✅ 验证结果总结:`);
    
    const structureScore = (
      (productsWithNameStructure === totalProducts ? 100 : 0) * 0.25 +
      (productsWithCategoryStructure === totalProducts ? 100 : 0) * 0.25 +
      (productsWithPlatformStructure === totalProducts ? 100 : 0) * 0.25 +
      (productsWithFlavorStructure === totalProducts ? 100 : 0) * 0.25
    );
    
    const dataRichness = (
      (productsWithEnglishName + productsWithChineseName) / (totalProducts * 2) * 100 * 0.3 +
      (productsWithEnglishCategory + productsWithChineseCategory) / (totalProducts * 2) * 100 * 0.3 +
      (productsWithEnglishPlatform + productsWithChinesePlatform) / (totalProducts * 2) * 100 * 0.2 +
      (productsWithEnglishFlavor + productsWithChineseFlavor) / (totalProducts * 2) * 100 * 0.2
    );
    
    console.log(`- 字段结构完整性: ${structureScore.toFixed(1)}%`);
    console.log(`- 数据丰富度: ${dataRichness.toFixed(1)}%`);
    
    const overallScore = (structureScore + dataRichness) / 2;
    console.log(`- 总体评分: ${overallScore.toFixed(1)}/100`);
    
    if (overallScore >= 90) {
      console.log(`🎉 修复效果: 优秀！字段映射修复成功`);
    } else if (overallScore >= 80) {
      console.log(`✅ 修复效果: 良好，大部分数据已正确保存`);
    } else if (overallScore >= 70) {
      console.log(`⚠️ 修复效果: 一般，仍有改进空间`);
    } else {
      console.log(`❌ 修复效果: 需要进一步改进`);
    }
    
    // 5. 检查是否有数据丢失
    console.log(`\n🔍 数据丢失检查:`);
    const productsWithBothEnglishAndChinese = await Product.countDocuments({
      $and: [
        { 'name.english': { $exists: true, $ne: null, $ne: '' } },
        { 'name.chinese': { $exists: true, $ne: null, $ne: '' } }
      ]
    });
    
    console.log(`- 同时有英文和中文名称的产品: ${productsWithBothEnglishAndChinese}`);
    console.log(`- 数据保存完整性: ${(productsWithBothEnglishAndChinese / totalProducts * 100).toFixed(1)}%`);
    
    if (productsWithBothEnglishAndChinese > 0) {
      console.log(`✅ 成功！已有产品同时保存了英文和中文数据`);
    } else {
      console.log(`⚠️ 注意：没有产品同时保存英文和中文数据，可能需要进一步检查`);
    }
    
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 执行验证
validateFieldMappingFix();
