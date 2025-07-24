#!/usr/bin/env node

/**
 * 测试图片下载脚本
 * 直接调用图片服务下载飞书图片
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { imageService } = require('./dist/services/imageService');

// 测试产品数据
const testProducts = [
  {
    productId: 'recn7j9p5p',
    internalId: '20250718-1346',
    images: {
      front: 'Vnjsb2KTsouUWBx6oiVcthhinL0',
      label: 'GzaqbgW2UoByx9x1f4WcGInTnxg'
    }
  },
  {
    productId: 'recyvMPGSQ', 
    internalId: '20250718-1343',
    images: {
      front: 'O00WbQy84o5rLsxQydecKDcfnDb',
      back: 'EynYbFeGioyGCDx51GHcs5Oon2e',
      label: 'Hh2IbgFfmoxKCFxNfFGcyz1Tnab'
    }
  },
  {
    productId: 'recicVN6DP',
    internalId: '20250718-1337', 
    images: {
      front: 'A9UYb8i4EoIRRhxAArRcj75XnVb',
      label: 'EAOGb8xVOokhFCxcJuWcOafRnNc',
      package: 'EQ6wb9GPJotns5x1Bcdcqq5knMe'
    }
  }
];

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

async function downloadTestImages() {
  try {
    console.log('🚀 开始测试图片下载...');

    // 连接数据库
    await connectDatabase();

    const results = [];
    
    for (const product of testProducts) {
      console.log(`\n📦 处理产品: ${product.productId} (${product.internalId})`);
      
      for (const [imageType, fileToken] of Object.entries(product.images)) {
        try {
          console.log(`  📸 下载 ${imageType} 图片: ${fileToken}`);
          console.log(`     正在测试飞书API访问...`);

          const imageRecord = await imageService.downloadFromFeishu(
            fileToken,
            product.productId,
            imageType
          );
          
          console.log(`  ✅ 下载成功: ${imageRecord.imageId}`);
          console.log(`     URL: ${imageRecord.publicUrl}`);
          console.log(`     大小: ${(imageRecord.fileSize / 1024).toFixed(2)} KB`);
          
          results.push({
            productId: product.productId,
            imageType,
            fileToken,
            success: true,
            imageId: imageRecord.imageId,
            publicUrl: imageRecord.publicUrl,
            fileSize: imageRecord.fileSize
          });
          
        } catch (error) {
          console.error(`  ❌ 下载失败: ${error.message}`);
          results.push({
            productId: product.productId,
            imageType,
            fileToken,
            success: false,
            error: error.message
          });
        }
      }
    }
    
    // 输出结果统计
    console.log('\n📊 下载结果统计:');
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ 成功: ${successful.length} 个图片`);
    console.log(`❌ 失败: ${failed.length} 个图片`);
    
    if (successful.length > 0) {
      console.log('\n🎉 成功下载的图片:');
      successful.forEach(result => {
        console.log(`  - ${result.productId}/${result.imageType}: ${result.publicUrl}`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n💥 下载失败的图片:');
      failed.forEach(result => {
        console.log(`  - ${result.productId}/${result.imageType}: ${result.error}`);
      });
    }
    
    console.log('\n🏁 测试完成!');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
downloadTestImages();
