#!/usr/bin/env node

/**
 * 从飞书更新产品图片
 * 这个脚本演示如何从飞书多维表格同步最新的产品图片
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Product } = require('./dist/models/Product');
const { Image } = require('./dist/models/Image');
const { getFeishuApiService } = require('./dist/services/feishuApiService');
const { ImageService } = require('./dist/services/imageService');

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

async function updateImagesFromFeishu(productIds = []) {
  try {
    console.log('🚀 开始从飞书更新产品图片...');
    
    // 初始化服务
    const feishuService = getFeishuApiService();
    const imageService = new ImageService();
    
    // 测试飞书连接
    console.log('🔗 测试飞书API连接...');
    const connectionTest = await feishuService.testConnection();
    if (!connectionTest.success) {
      throw new Error('飞书API连接失败');
    }
    console.log('✅ 飞书API连接成功');
    
    // 获取飞书数据
    console.log('📥 从飞书获取产品数据...');
    const feishuRecords = await feishuService.getAllRecords();
    console.log(`📊 获取到 ${feishuRecords.length} 条飞书记录`);
    
    // 筛选需要更新的产品
    let recordsToProcess = feishuRecords;
    if (productIds.length > 0) {
      recordsToProcess = feishuRecords.filter(record => 
        productIds.includes(record.record_id)
      );
      console.log(`🎯 筛选出 ${recordsToProcess.length} 个指定产品`);
    }
    
    const stats = {
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };
    
    // 处理每个产品的图片
    for (const record of recordsToProcess) {
      try {
        console.log(`\n📦 处理产品: ${record.record_id}`);
        stats.processed++;
        
        // 提取图片字段
        const imageFields = {
          front: record.fields['Front image(正)'],
          back: record.fields['Back image(背)'],
          label: record.fields['Tag photo(标签)'],
          package: record.fields['Outer packaging image(外包装)'],
          gift: record.fields['Gift pictures(赠品图片)']
        };
        
        let hasUpdates = false;
        
        // 处理每种类型的图片
        for (const [imageType, fieldValue] of Object.entries(imageFields)) {
          if (fieldValue && Array.isArray(fieldValue) && fieldValue.length > 0) {
            // 提取文件令牌 - 飞书返回的是对象格式
            const firstFile = fieldValue[0];
            const fileToken = typeof firstFile === 'string' ? firstFile : firstFile?.file_token;

            if (!fileToken) {
              console.log(`  ⚠️  ${imageType} 图片无有效文件令牌`);
              continue;
            }

            try {
              console.log(`  📸 更新 ${imageType} 图片: ${fileToken}`);
              
              // 检查是否已存在
              const existingImage = await Image.findOne({
                productId: record.record_id,
                type: imageType,
                'metadata.feishuFileToken': fileToken,
                isActive: true
              });
              
              if (existingImage) {
                console.log(`     ✅ 图片已是最新版本`);
                continue;
              }
              
              // 下载并存储新图片
              const imageRecord = await imageService.downloadFromFeishu(
                fileToken,
                record.record_id,
                imageType
              );
              
              // 更新产品记录中的图片引用
              await Product.updateOne(
                { productId: record.record_id },
                {
                  $set: {
                    [`images.${imageType}`]: imageRecord.publicUrl,
                    updatedAt: new Date()
                  }
                }
              );
              
              console.log(`     ✅ 图片更新成功: ${imageRecord.publicUrl}`);
              hasUpdates = true;
              
            } catch (error) {
              console.error(`     ❌ 图片更新失败: ${error.message}`);
              stats.errors++;
            }
          }
        }
        
        if (hasUpdates) {
          stats.updated++;
          console.log(`  ✅ 产品图片更新完成`);
        } else {
          stats.skipped++;
          console.log(`  ⚠️  无需更新`);
        }
        
      } catch (error) {
        console.error(`❌ 处理产品 ${record.record_id} 失败:`, error.message);
        stats.errors++;
      }
    }
    
    // 输出统计结果
    console.log('\n📊 更新结果统计:');
    console.log(`📝 处理产品: ${stats.processed} 个`);
    console.log(`✅ 成功更新: ${stats.updated} 个`);
    console.log(`⚠️  跳过: ${stats.skipped} 个`);
    console.log(`❌ 错误: ${stats.errors} 个`);
    
    console.log('\n🏁 图片更新完成!');
    
  } catch (error) {
    console.error('💥 更新失败:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectDatabase();
    
    // 从命令行参数获取要更新的产品ID
    const productIds = process.argv.slice(2);
    
    if (productIds.length > 0) {
      console.log(`🎯 指定更新产品: ${productIds.join(', ')}`);
    } else {
      console.log('🌐 更新所有产品图片');
    }
    
    await updateImagesFromFeishu(productIds);
    process.exit(0);
  } catch (error) {
    console.error('💥 脚本执行失败:', error);
    process.exit(1);
  }
}

// 运行脚本
main();
