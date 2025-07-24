#!/usr/bin/env node

/**
 * 更新产品记录中的图片引用
 * 将飞书文件令牌替换为MinIO URL
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Product } = require('./dist/models/Product');
const { Image } = require('./dist/models/Image');

async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      retryWrites: false,
      w: 1,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    throw error;
  }
}

async function updateProductImageReferences() {
  try {
    console.log('🚀 开始更新产品图片引用...');
    
    // 获取所有有图片记录的产品ID
    const imageRecords = await Image.find({}, { productId: 1, type: 1, publicUrl: 1 });
    
    // 按产品ID分组
    const imagesByProduct = {};
    imageRecords.forEach(image => {
      if (!imagesByProduct[image.productId]) {
        imagesByProduct[image.productId] = {};
      }
      imagesByProduct[image.productId][image.type] = image.publicUrl;
    });
    
    console.log(`📊 找到 ${Object.keys(imagesByProduct).length} 个产品有图片记录`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // 更新每个产品的图片引用
    for (const [productId, images] of Object.entries(imagesByProduct)) {
      try {
        console.log(`\n📦 处理产品: ${productId}`);
        console.log(`   图片类型: ${Object.keys(images).join(', ')}`);
        
        // 获取当前产品记录
        const product = await Product.findOne({ productId });
        if (!product) {
          console.log(`   ⚠️  产品不存在，跳过`);
          skippedCount++;
          continue;
        }
        
        // 检查是否需要更新
        let needsUpdate = false;
        const currentImages = product.images || {};
        
        for (const [imageType, newUrl] of Object.entries(images)) {
          const currentValue = currentImages[imageType];
          
          // 如果当前值是飞书令牌（不是HTTP URL），则需要更新
          if (currentValue && typeof currentValue === 'string' && !currentValue.startsWith('http')) {
            needsUpdate = true;
            console.log(`   🔄 ${imageType}: ${currentValue} -> ${newUrl}`);
          } else if (currentValue !== newUrl) {
            needsUpdate = true;
            console.log(`   🔄 ${imageType}: 更新URL`);
          }
        }
        
        if (!needsUpdate) {
          console.log(`   ✅ 无需更新`);
          skippedCount++;
          continue;
        }
        
        // 更新产品记录
        const updateResult = await Product.updateOne(
          { productId },
          { 
            $set: { 
              images: {
                ...currentImages,
                ...images
              },
              updatedAt: new Date()
            }
          }
        );
        
        if (updateResult.modifiedCount > 0) {
          console.log(`   ✅ 更新成功`);
          updatedCount++;
        } else {
          console.log(`   ⚠️  更新失败`);
          skippedCount++;
        }
        
      } catch (error) {
        console.error(`   ❌ 处理产品 ${productId} 时出错:`, error.message);
        skippedCount++;
      }
    }
    
    console.log('\n📊 更新结果统计:');
    console.log(`✅ 成功更新: ${updatedCount} 个产品`);
    console.log(`⚠️  跳过: ${skippedCount} 个产品`);
    console.log(`📝 总计: ${updatedCount + skippedCount} 个产品`);
    
    // 验证更新结果
    console.log('\n🔍 验证更新结果...');
    const testProductIds = ['recyvMPGSQ', 'recn7j9p5p', 'recicVN6DP'];
    
    for (const productId of testProductIds) {
      const product = await Product.findOne({ productId }, { productId: 1, images: 1 });
      if (product && product.images) {
        console.log(`\n📦 ${productId}:`);
        for (const [type, url] of Object.entries(product.images)) {
          const isMinIOUrl = url && typeof url === 'string' && url.startsWith('http://152.89.168.61:9000');
          console.log(`   ${type}: ${isMinIOUrl ? '✅' : '❌'} ${url}`);
        }
      }
    }
    
    console.log('\n🏁 产品图片引用更新完成!');
    
  } catch (error) {
    console.error('💥 更新失败:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectDatabase();
    await updateProductImageReferences();
    process.exit(0);
  } catch (error) {
    console.error('💥 脚本执行失败:', error);
    process.exit(1);
  }
}

// 运行脚本
main();
