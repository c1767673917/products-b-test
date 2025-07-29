#!/usr/bin/env node

/**
 * 增强的图片修复脚本：将飞书文件令牌转换为MinIO URL
 * 这个脚本能够处理两种情况：
 * 1. Image表中已有记录的情况（直接更新产品图片字段）
 * 2. Image表中没有记录的情况（从飞书下载图片并创建Image记录）
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Product } = require('./dist/models');
const { Image } = require('./dist/models');
const { getFeishuApiService } = require('./dist/services/feishuApiService');
const { imageService } = require('./dist/services/imageService');

/**
 * 从飞书下载图片并创建Image记录（使用正确的API方法）
 */
async function downloadImageFromFeishu(feishuService, productId, imageType, fileToken) {
  try {
    console.log(`    📥 开始从飞书下载图片: ${fileToken}`);

    // 检查是否已经有相同文件令牌的记录（避免重复下载）
    const existingImage = await Image.findOne({
      'metadata.feishuFileToken': fileToken,
      isActive: true
    });

    if (existingImage) {
      console.log(`    ♻️ 发现已存在的图片记录: ${existingImage.imageId}`);

      // 如果产品ID不匹配，可能需要更新关联
      if (existingImage.productId !== productId) {
        console.log(`    🔄 更新图片关联: ${existingImage.productId} -> ${productId}`);
        await Image.updateOne(
          { imageId: existingImage.imageId },
          {
            $set: {
              productId: productId,
              type: imageType,
              lastSyncTime: new Date()
            }
          }
        );
      }

      return {
        success: true,
        url: existingImage.publicUrl,
        imageId: existingImage.imageId,
        action: 'reused'
      };
    }

    // 使用正确的飞书API方法下载图片
    console.log(`    🌐 正在获取临时下载链接...`);
    const imageBuffer = await downloadImageWithCorrectAPI(feishuService, fileToken);
    console.log(`    ✅ 下载完成，大小: ${imageBuffer.length} bytes`);

    // 生成文件名
    const filename = generateFeishuImageName(productId, imageType, fileToken);

    // 上传到MinIO并创建Image记录
    console.log(`    📤 上传到MinIO: ${filename}`);
    const imageRecord = await imageService.uploadImage(imageBuffer, filename, productId, imageType);

    // 添加飞书相关的元数据
    await Image.updateOne(
      { imageId: imageRecord.imageId },
      {
        $set: {
          'metadata.feishuFileToken': fileToken,
          'metadata.source': 'feishu',
          'metadata.downloadTime': new Date(),
          syncStatus: 'synced',
          lastSyncTime: new Date(),
          syncAttempts: 1
        }
      }
    );

    console.log(`    ✅ 图片处理完成: ${imageRecord.publicUrl}`);

    return {
      success: true,
      url: imageRecord.publicUrl,
      imageId: imageRecord.imageId,
      action: 'downloaded'
    };

  } catch (error) {
    console.error(`    ❌ 下载失败: ${error.message}`);
    return {
      success: false,
      error: error.message,
      action: 'failed'
    };
  }
}

/**
 * 使用正确的飞书API方法下载图片
 */
async function downloadImageWithCorrectAPI(feishuService, fileToken) {
  const axios = require('axios');

  // 获取访问令牌
  const accessToken = await feishuService.getAccessToken();

  // 步骤1: 获取临时下载链接
  const params = new URLSearchParams();
  params.append('file_tokens', fileToken);

  // 添加必需的权限参数
  const extra = {
    bitablePerm: {
      tableId: process.env.FEISHU_TABLE_ID || 'tblwdwrZMikMRyxq',
      rev: 15613
    }
  };
  params.append('extra', JSON.stringify(extra));

  console.log(`    🔗 获取临时下载链接: ${fileToken}`);
  const tmpUrlResponse = await axios.get(
    `https://open.feishu.cn/open-apis/drive/v1/medias/batch_get_tmp_download_url?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  if (tmpUrlResponse.data.code !== 0) {
    throw new Error(`获取临时下载链接失败: ${tmpUrlResponse.data.msg}`);
  }

  const tmpUrls = tmpUrlResponse.data.data?.tmp_download_urls;
  if (!tmpUrls || tmpUrls.length === 0) {
    throw new Error('未获取到临时下载链接');
  }

  const tmpDownloadUrl = tmpUrls[0].tmp_download_url;
  console.log(`    📥 使用临时链接下载图片...`);

  // 步骤2: 使用临时链接下载图片
  const imageResponse = await axios.get(tmpDownloadUrl, {
    responseType: 'arraybuffer',
    timeout: 60000
  });

  return Buffer.from(imageResponse.data);
}

/**
 * 生成飞书图片文件名
 */
function generateFeishuImageName(productId, imageType, fileToken) {
  const tokenPrefix = fileToken.substring(0, 8);
  const timestamp = Date.now();
  return `${productId}_${imageType}_${tokenPrefix}_${timestamp}.jpg`;
}

async function fixImageTokensToUrls() {
  try {
    console.log('🚀 开始增强的图片字段修复（文件令牌 -> MinIO URL）...');

    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');

    // 初始化飞书服务
    const feishuService = getFeishuApiService();
    console.log('✅ 飞书服务初始化成功');

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

    console.log(`📊 找到 ${productsWithTokens.length} 个产品需要修复图片字段`);

    let fixedCount = 0;
    let downloadedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const imageTypes = ['front', 'back', 'label', 'package', 'gift'];
    
    for (const product of productsWithTokens) {
      try {
        let hasChanges = false;
        const updates = {};

        console.log(`\n📦 处理产品: ${product.productId} (${product.name?.display || '未知产品'})`);

        for (const imageType of imageTypes) {
          const imageValue = product.images?.[imageType];

          // 检查是否是文件令牌（不是HTTP URL且长度大于20）
          if (imageValue && typeof imageValue === 'string' &&
              !imageValue.startsWith('http') && imageValue.length > 20) {

            console.log(`  🔍 检查 ${imageType}: ${imageValue}`);

            // 首先从Image表查找对应的MinIO URL
            const imageRecord = await Image.findOne({
              productId: product.productId,
              type: imageType,
              'metadata.feishuFileToken': imageValue,
              isActive: true
            });

            if (imageRecord && imageRecord.publicUrl) {
              // 情况1：Image记录已存在，直接使用URL
              updates[`images.${imageType}`] = imageRecord.publicUrl;
              hasChanges = true;
              console.log(`  ✅ 找到现有URL: ${imageRecord.publicUrl}`);
            } else {
              // 情况2：Image记录不存在，需要从飞书下载
              console.log(`  📥 未找到Image记录，尝试从飞书下载...`);

              try {
                // 从飞书下载图片
                const downloadResult = await downloadImageFromFeishu(
                  feishuService,
                  product.productId,
                  imageType,
                  imageValue
                );

                if (downloadResult.success) {
                  updates[`images.${imageType}`] = downloadResult.url;
                  hasChanges = true;
                  downloadedCount++;
                  console.log(`  ✅ 从飞书下载成功: ${downloadResult.url}`);
                } else {
                  console.log(`  ❌ 从飞书下载失败: ${downloadResult.error}`);
                }
              } catch (downloadError) {
                console.log(`  ❌ 下载过程出错: ${downloadError.message}`);
              }
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
          console.log(`📈 进度: ${fixedCount + skippedCount + errorCount}/${productsWithTokens.length} (修复:${fixedCount}, 下载:${downloadedCount}, 跳过:${skippedCount}, 错误:${errorCount})`);
        }

        // 添加延时避免过于频繁的API调用
        if (downloadedCount > 0 && downloadedCount % 10 === 0) {
          console.log(`  ⏳ 已下载${downloadedCount}个图片，暂停2秒...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        errorCount++;
        console.error(`❌ 处理产品 ${product.productId} 失败:`, error.message);
      }
    }
    
    console.log('\n📊 修复结果统计:');
    console.log(`✅ 成功修复: ${fixedCount} 个产品`);
    console.log(`📥 新下载图片: ${downloadedCount} 个`);
    console.log(`⚠️ 跳过: ${skippedCount} 个产品`);
    console.log(`❌ 错误: ${errorCount} 个产品`);
    console.log(`📝 总计: ${fixedCount + skippedCount + errorCount} 个产品`);
    
    // 验证修复结果
    console.log('\n🔍 验证修复结果...');

    const httpUrls = await Product.countDocuments({
      $or: [
        { 'images.front': { $regex: '^http' } },
        { 'images.back': { $regex: '^http' } },
        { 'images.label': { $regex: '^http' } },
        { 'images.package': { $regex: '^http' } },
        { 'images.gift': { $regex: '^http' } }
      ]
    });

    const remainingTokens = await Product.countDocuments({
      $or: [
        { 'images.front': { $regex: '^[A-Za-z0-9]{20,}$' } },
        { 'images.back': { $regex: '^[A-Za-z0-9]{20,}$' } },
        { 'images.label': { $regex: '^[A-Za-z0-9]{20,}$' } },
        { 'images.package': { $regex: '^[A-Za-z0-9]{20,}$' } },
        { 'images.gift': { $regex: '^[A-Za-z0-9]{20,}$' } }
      ]
    });

    // 统计各类型图片的修复情况
    const imageTypeStats = {};
    for (const imageType of imageTypes) {
      const httpCount = await Product.countDocuments({
        [`images.${imageType}`]: { $regex: '^http' }
      });
      const tokenCount = await Product.countDocuments({
        [`images.${imageType}`]: { $regex: '^[A-Za-z0-9]{20,}$' }
      });
      imageTypeStats[imageType] = { http: httpCount, tokens: tokenCount };
    }

    console.log(`📈 修复后统计:`);
    console.log(`  - 总HTTP URL格式: ${httpUrls}`);
    console.log(`  - 总剩余文件令牌: ${remainingTokens}`);
    console.log(`\n📊 各类型图片统计:`);
    for (const [type, stats] of Object.entries(imageTypeStats)) {
      console.log(`  - ${type}: HTTP=${stats.http}, 令牌=${stats.tokens}`);
    }
    
    // 显示几个修复成功的样本
    const sampleFixed = await Product.find({
      $or: [
        { 'images.front': { $regex: '^http://152.89.168.61:9000' } },
        { 'images.back': { $regex: '^http://152.89.168.61:9000' } },
        { 'images.label': { $regex: '^http://152.89.168.61:9000' } },
        { 'images.package': { $regex: '^http://152.89.168.61:9000' } },
        { 'images.gift': { $regex: '^http://152.89.168.61:9000' } }
      ]
    }).limit(3);

    console.log('\n📋 修复成功样本:');
    sampleFixed.forEach((product, index) => {
      console.log(`\n样本 ${index + 1} (${product.productId} - ${product.name?.display || '未知产品'}):`);
      if (product.images) {
        Object.entries(product.images).forEach(([type, imageData]) => {
          if (imageData && typeof imageData === 'string' && imageData.startsWith('http')) {
            console.log(`  - ${type}: ✅ ${imageData.substring(0, 80)}...`);
          }
        });
      }
    });

    // 显示仍有问题的样本
    if (remainingTokens > 0) {
      const sampleProblems = await Product.find({
        $or: [
          { 'images.front': { $regex: '^[A-Za-z0-9]{20,}$' } },
          { 'images.back': { $regex: '^[A-Za-z0-9]{20,}$' } },
          { 'images.label': { $regex: '^[A-Za-z0-9]{20,}$' } },
          { 'images.package': { $regex: '^[A-Za-z0-9]{20,}$' } },
          { 'images.gift': { $regex: '^[A-Za-z0-9]{20,}$' } }
        ]
      }).limit(3);

      console.log('\n⚠️ 仍有问题的样本:');
      sampleProblems.forEach((product, index) => {
        console.log(`\n问题样本 ${index + 1} (${product.productId} - ${product.name?.display || '未知产品'}):`);
        if (product.images) {
          Object.entries(product.images).forEach(([type, imageData]) => {
            if (imageData && typeof imageData === 'string' && !imageData.startsWith('http') && imageData.length > 20) {
              console.log(`  - ${type}: ❌ ${imageData}`);
            }
          });
        }
      });
    }

    console.log('\n🏁 增强的图片字段修复完成!');
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

fixImageTokensToUrls();
