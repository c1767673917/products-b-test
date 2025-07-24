/**
 * 数据库迁移脚本：优化Product模型的图片字段结构
 * 将简单的URL字符串转换为包含imageId、url、objectName等信息的对象结构
 */

const mongoose = require('mongoose');
const { Product } = require('../dist/models/Product');
const { Image } = require('../dist/models/Image');
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

// 图片字段结构转换
async function migrateImageStructure() {
  console.log('🔄 开始迁移图片字段结构...');
  
  const stats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0
  };

  try {
    // 获取所有产品
    const products = await Product.find({}).lean();
    stats.total = products.length;
    
    console.log(`📊 找到 ${stats.total} 个产品需要检查`);

    for (const product of products) {
      try {
        const updates = {};
        let needsUpdate = false;

        // 检查每种图片类型
        const imageTypes = ['front', 'back', 'label', 'package', 'gift'];
        
        for (const imageType of imageTypes) {
          const currentImageData = product.images?.[imageType];
          
          // 如果是字符串URL，需要转换为对象结构
          if (typeof currentImageData === 'string' && currentImageData.trim()) {
            console.log(`🔄 转换产品 ${product.productId} 的 ${imageType} 图片`);
            
            // 查找对应的Image记录
            const imageRecord = await Image.findOne({
              productId: product.productId,
              type: imageType
            });

            if (imageRecord) {
              // 使用Image记录中的信息
              updates[`images.${imageType}`] = {
                imageId: imageRecord.imageId,
                url: imageRecord.publicUrl,
                objectName: imageRecord.objectName,
                lastUpdated: imageRecord.updatedAt || new Date(),
                fileSize: imageRecord.fileSize,
                mimeType: imageRecord.mimeType,
                width: imageRecord.width,
                height: imageRecord.height
              };
              needsUpdate = true;
            } else {
              // 没有对应的Image记录，尝试从URL推断信息
              const imageId = `img_${product.productId}_${imageType}_${Date.now()}`;
              const objectName = extractObjectNameFromUrl(currentImageData);
              
              updates[`images.${imageType}`] = {
                imageId: imageId,
                url: currentImageData,
                objectName: objectName || `products/${product.productId}_${imageType}_0.jpg`,
                lastUpdated: new Date(),
                needsSync: true // 标记需要同步到Image表
              };
              needsUpdate = true;
              
              console.log(`⚠️  产品 ${product.productId} 的 ${imageType} 图片缺少Image记录`);
            }
          }
        }

        // 执行更新
        if (needsUpdate) {
          await Product.updateOne(
            { productId: product.productId },
            { $set: updates }
          );
          stats.migrated++;
          console.log(`✅ 产品 ${product.productId} 图片结构迁移完成`);
        } else {
          stats.skipped++;
        }

      } catch (error) {
        stats.errors++;
        console.error(`❌ 产品 ${product.productId} 迁移失败:`, error.message);
      }
    }

    console.log('\n📊 迁移统计:');
    console.log(`总计: ${stats.total}`);
    console.log(`已迁移: ${stats.migrated}`);
    console.log(`跳过: ${stats.skipped}`);
    console.log(`错误: ${stats.errors}`);

  } catch (error) {
    console.error('❌ 迁移过程出错:', error);
    throw error;
  }
}

// 创建缺失的Image记录
async function createMissingImageRecords() {
  console.log('\n🔄 创建缺失的Image记录...');
  
  const stats = {
    created: 0,
    errors: 0
  };

  try {
    // 查找标记为需要同步的产品图片
    const products = await Product.find({
      $or: [
        { 'images.front.needsSync': true },
        { 'images.back.needsSync': true },
        { 'images.label.needsSync': true },
        { 'images.package.needsSync': true },
        { 'images.gift.needsSync': true }
      ]
    });

    console.log(`📊 找到 ${products.length} 个产品需要创建Image记录`);

    for (const product of products) {
      const imageTypes = ['front', 'back', 'label', 'package', 'gift'];
      
      for (const imageType of imageTypes) {
        const imageData = product.images?.[imageType];
        
        if (imageData && imageData.needsSync) {
          try {
            // 创建Image记录
            const imageRecord = new Image({
              imageId: imageData.imageId,
              productId: product.productId,
              type: imageType,
              bucketName: 'product-images',
              objectName: imageData.objectName,
              originalName: extractFilenameFromObjectName(imageData.objectName),
              publicUrl: imageData.url,
              processStatus: 'completed',
              fileSize: imageData.fileSize || 0,
              mimeType: imageData.mimeType || 'image/jpeg',
              width: imageData.width,
              height: imageData.height,
              md5Hash: 'migration_placeholder',
              isActive: true,
              isPublic: true,
              metadata: {
                source: 'migration',
                migrationTime: new Date()
              }
            });

            await imageRecord.save();
            
            // 移除needsSync标记
            await Product.updateOne(
              { productId: product.productId },
              { $unset: { [`images.${imageType}.needsSync`]: 1 } }
            );

            stats.created++;
            console.log(`✅ 为产品 ${product.productId} 创建 ${imageType} Image记录`);

          } catch (error) {
            stats.errors++;
            console.error(`❌ 创建Image记录失败 ${product.productId}:${imageType}:`, error.message);
          }
        }
      }
    }

    console.log('\n📊 Image记录创建统计:');
    console.log(`已创建: ${stats.created}`);
    console.log(`错误: ${stats.errors}`);

  } catch (error) {
    console.error('❌ 创建Image记录过程出错:', error);
    throw error;
  }
}

// 验证迁移结果
async function validateMigration() {
  console.log('\n🔍 验证迁移结果...');
  
  const validation = {
    totalProducts: 0,
    productsWithNewStructure: 0,
    productsWithOldStructure: 0,
    imageRecordMatches: 0,
    imageRecordMismatches: 0
  };

  try {
    const products = await Product.find({}).lean();
    validation.totalProducts = products.length;

    for (const product of products) {
      let hasNewStructure = false;
      let hasOldStructure = false;

      const imageTypes = ['front', 'back', 'label', 'package', 'gift'];
      
      for (const imageType of imageTypes) {
        const imageData = product.images?.[imageType];
        
        if (imageData) {
          if (typeof imageData === 'object' && imageData.imageId) {
            hasNewStructure = true;
            
            // 验证Image记录是否存在
            const imageRecord = await Image.findOne({
              productId: product.productId,
              type: imageType
            });
            
            if (imageRecord) {
              validation.imageRecordMatches++;
            } else {
              validation.imageRecordMismatches++;
              console.log(`⚠️  产品 ${product.productId} 的 ${imageType} 缺少Image记录`);
            }
          } else if (typeof imageData === 'string') {
            hasOldStructure = true;
          }
        }
      }

      if (hasNewStructure) validation.productsWithNewStructure++;
      if (hasOldStructure) validation.productsWithOldStructure++;
    }

    console.log('\n📊 验证结果:');
    console.log(`总产品数: ${validation.totalProducts}`);
    console.log(`新结构产品: ${validation.productsWithNewStructure}`);
    console.log(`旧结构产品: ${validation.productsWithOldStructure}`);
    console.log(`Image记录匹配: ${validation.imageRecordMatches}`);
    console.log(`Image记录不匹配: ${validation.imageRecordMismatches}`);

    return validation;

  } catch (error) {
    console.error('❌ 验证过程出错:', error);
    throw error;
  }
}

// 辅助函数：从URL中提取对象名
function extractObjectNameFromUrl(url) {
  if (!url) return null;
  
  try {
    // 匹配MinIO URL格式
    const match = url.match(/\/product-images\/(.+)$/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

// 辅助函数：从对象名中提取文件名
function extractFilenameFromObjectName(objectName) {
  if (!objectName) return 'unknown.jpg';
  
  const parts = objectName.split('/');
  return parts[parts.length - 1] || 'unknown.jpg';
}

// 主执行函数
async function main() {
  console.log('🚀 开始图片字段结构迁移...\n');
  
  try {
    await connectDB();
    
    // 执行迁移步骤
    await migrateImageStructure();
    await createMissingImageRecords();
    const validation = await validateMigration();
    
    console.log('\n✅ 迁移完成!');
    
    // 如果有问题，提供建议
    if (validation.productsWithOldStructure > 0) {
      console.log('\n⚠️  仍有产品使用旧结构，建议重新运行迁移脚本');
    }
    
    if (validation.imageRecordMismatches > 0) {
      console.log('\n⚠️  存在Image记录不匹配，建议检查数据一致性');
    }

  } catch (error) {
    console.error('\n❌ 迁移失败:', error);
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
  migrateImageStructure,
  createMissingImageRecords,
  validateMigration
};
