#!/usr/bin/env node

/**
 * 智能图片字段处理器
 * 根据产品ID和图片类型，智能匹配Image表中的正确URL
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Product } = require('./dist/models');
const { Image } = require('./dist/models');

async function smartImageFieldProcessor() {
  try {
    console.log('🚀 开始智能图片字段处理...');
    
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    // 查找所有有文件令牌的产品
    const productsWithTokens = await Product.find({
      $or: [
        { 'images.front': { $regex: '^[A-Za-z0-9]{20,}$' } },
        { 'images.back': { $regex: '^[A-Za-z0-9]{20,}$' } },
        { 'images.label': { $regex: '^[A-Za-z0-9]{20,}$' } },
        { 'images.package': { $regex: '^[A-Za-z0-9]{20,}$' } },
        { 'images.gift': { $regex: '^[A-Za-z0-9]{20,}$' } }
      ]
    });
    
    console.log(`📊 找到 ${productsWithTokens.length} 个产品需要处理图片字段`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const imageTypes = ['front', 'back', 'label', 'package', 'gift'];
    
    for (const product of productsWithTokens) {
      try {
        let hasChanges = false;
        const updates = {};
        
        console.log(`\n📦 处理产品: ${product.productId}`);
        
        // 获取该产品的所有Image记录
        const imageRecords = await Image.find({
          productId: product.productId,
          isActive: true
        });
        
        if (imageRecords.length === 0) {
          console.log(`  ⚠️ 产品 ${product.productId} 没有Image记录`);
          skippedCount++;
          continue;
        }
        
        console.log(`  📸 找到 ${imageRecords.length} 个图片记录`);
        
        for (const imageType of imageTypes) {
          const imageValue = product.images?.[imageType];
          
          // 检查是否是文件令牌
          if (imageValue && typeof imageValue === 'string' && 
              !imageValue.startsWith('http') && imageValue.length > 20) {
            
            console.log(`  🔍 处理 ${imageType}: ${imageValue.substring(0, 20)}...`);
            
            // 查找对应类型的Image记录
            const matchingImage = imageRecords.find(img => img.type === imageType);
            
            if (matchingImage && matchingImage.publicUrl) {
              updates[`images.${imageType}`] = matchingImage.publicUrl;
              hasChanges = true;
              console.log(`  ✅ 匹配成功: ${matchingImage.publicUrl.substring(0, 60)}...`);
            } else {
              console.log(`  ⚠️ 未找到 ${imageType} 类型的图片记录`);
            }
          }
        }
        
        // 如果有变更，更新数据库
        if (hasChanges) {
          await Product.updateOne(
            { productId: product.productId },
            { $set: updates }
          );
          
          fixedCount++;
          console.log(`  ✅ 产品 ${product.productId} 图片字段已修复`);
        } else {
          skippedCount++;
          console.log(`  ⚠️ 产品 ${product.productId} 无需修复或无对应URL`);
        }
        
        // 每50个产品显示进度
        if ((fixedCount + skippedCount + errorCount) % 50 === 0) {
          console.log(`📈 进度: ${fixedCount + skippedCount + errorCount}/${productsWithTokens.length}`);
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ 处理产品 ${product.productId} 失败:`, error.message);
      }
    }
    
    console.log('\n📊 处理结果统计:');
    console.log(`✅ 成功修复: ${fixedCount} 个产品`);
    console.log(`⚠️ 跳过: ${skippedCount} 个产品`);
    console.log(`❌ 错误: ${errorCount} 个产品`);
    console.log(`📝 总计: ${fixedCount + skippedCount + errorCount} 个产品`);
    
    // 验证修复结果
    console.log('\n🔍 验证修复结果...');
    
    const httpUrls = await Product.countDocuments({
      $or: [
        { 'images.front': { $regex: '^http' } },
        { 'images.back': { $regex: '^http' } },
        { 'images.label': { $regex: '^http' } }
      ]
    });
    
    const remainingTokens = await Product.countDocuments({
      $or: [
        { 'images.front': { $regex: '^[A-Za-z0-9]{20,}$' } },
        { 'images.back': { $regex: '^[A-Za-z0-9]{20,}$' } },
        { 'images.label': { $regex: '^[A-Za-z0-9]{20,}$' } }
      ]
    });
    
    console.log(`📈 修复后统计:`);
    console.log(`  - HTTP URL格式: ${httpUrls}`);
    console.log(`  - 剩余文件令牌: ${remainingTokens}`);
    
    // 显示几个修复成功的样本
    const sampleFixed = await Product.find({
      $or: [
        { 'images.front': { $regex: '^http://152.89.168.61:9000' } },
        { 'images.back': { $regex: '^http://152.89.168.61:9000' } },
        { 'images.label': { $regex: '^http://152.89.168.61:9000' } }
      ]
    }).limit(3);
    
    console.log('\n📋 修复成功样本:');
    sampleFixed.forEach((product, index) => {
      console.log(`\n样本 ${index + 1} (${product.productId}):`);
      if (product.images) {
        Object.entries(product.images).forEach(([type, imageData]) => {
          if (imageData && typeof imageData === 'string' && imageData.startsWith('http')) {
            console.log(`  - ${type}: ✅ ${imageData.substring(0, 80)}...`);
          }
        });
      }
    });
    
    console.log('\n🏁 智能图片字段处理完成!');
    
  } catch (error) {
    console.error('❌ 处理失败:', error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

smartImageFieldProcessor();
