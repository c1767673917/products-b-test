#!/usr/bin/env node

/**
 * 孤立图片和无效引用清理脚本
 * 
 * 功能：
 * 1. 识别文件系统中的孤立图片文件
 * 2. 清理数据库中的无效图片引用
 * 3. 修复损坏的关联关系
 * 4. 生成清理报告
 */

const mongoose = require('mongoose');
const { Product } = require('../src/models/Product');
const { Image } = require('../src/models/Image');
const { MinioClient } = require('minio');
const { IMAGE_CONFIG } = require('../src/config/imageConfig');

// 配置选项
const options = {
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  force: process.argv.includes('--force'),
  skipFileCheck: process.argv.includes('--skip-file-check')
};

// MinIO客户端
let minioClient;

/**
 * 主执行函数
 */
async function main() {
  try {
    console.log('🧹 开始清理孤立图片和无效引用...');
    
    // 初始化连接
    await initializeConnections();
    
    // 执行清理步骤
    const results = {
      orphanedFiles: 0,
      orphanedRecords: 0,
      invalidReferences: 0,
      brokenAssociations: 0,
      freedSpace: 0,
      errors: []
    };
    
    // 1. 识别孤立的数据库记录
    console.log('\n🔍 识别孤立的数据库记录...');
    const orphanedRecords = await identifyOrphanedRecords();
    results.orphanedRecords = orphanedRecords.length;
    
    // 2. 识别孤立的文件
    if (!options.skipFileCheck) {
      console.log('\n🔍 识别孤立的文件...');
      const orphanedFiles = await identifyOrphanedFiles();
      results.orphanedFiles = orphanedFiles.length;
    }
    
    // 3. 识别无效的图片引用
    console.log('\n🔍 识别无效的图片引用...');
    const invalidReferences = await identifyInvalidReferences();
    results.invalidReferences = invalidReferences.length;
    
    // 4. 识别损坏的关联关系
    console.log('\n🔍 识别损坏的关联关系...');
    const brokenAssociations = await identifyBrokenAssociations();
    results.brokenAssociations = brokenAssociations.length;
    
    // 5. 执行清理操作
    if (!options.dryRun) {
      console.log('\n🧹 执行清理操作...');
      
      // 清理孤立记录
      if (orphanedRecords.length > 0) {
        const cleanedRecords = await cleanupOrphanedRecords(orphanedRecords);
        console.log(`  ✅ 清理了 ${cleanedRecords.cleaned} 个孤立记录`);
        results.freedSpace += cleanedRecords.freedSpace;
      }
      
      // 清理孤立文件
      if (!options.skipFileCheck && results.orphanedFiles > 0) {
        const cleanedFiles = await cleanupOrphanedFiles();
        console.log(`  ✅ 清理了 ${cleanedFiles.cleaned} 个孤立文件`);
        results.freedSpace += cleanedFiles.freedSpace;
      }
      
      // 修复无效引用
      if (invalidReferences.length > 0) {
        const fixedReferences = await fixInvalidReferences(invalidReferences);
        console.log(`  ✅ 修复了 ${fixedReferences.fixed} 个无效引用`);
      }
      
      // 修复损坏关联
      if (brokenAssociations.length > 0) {
        const fixedAssociations = await fixBrokenAssociations(brokenAssociations);
        console.log(`  ✅ 修复了 ${fixedAssociations.fixed} 个损坏关联`);
      }
    }
    
    // 6. 生成清理报告
    console.log('\n📊 生成清理报告...');
    await generateCleanupReport(results);
    
    // 输出结果
    console.log('\n📋 清理完成统计:');
    console.log(`  - 孤立文件: ${results.orphanedFiles}`);
    console.log(`  - 孤立记录: ${results.orphanedRecords}`);
    console.log(`  - 无效引用: ${results.invalidReferences}`);
    console.log(`  - 损坏关联: ${results.brokenAssociations}`);
    console.log(`  - 释放空间: ${(results.freedSpace / 1024 / 1024).toFixed(2)} MB`);
    
    if (results.errors.length > 0) {
      console.log(`  - 错误数量: ${results.errors.length}`);
    }
    
    console.log('\n✨ 孤立图片和无效引用清理完成！');
    
  } catch (error) {
    console.error('❌ 清理过程失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

/**
 * 初始化连接
 */
async function initializeConnections() {
  // 连接数据库
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/products-db';
  await mongoose.connect(mongoUri);
  console.log('✅ 数据库连接成功');
  
  // 初始化MinIO客户端
  minioClient = new MinioClient({
    endPoint: IMAGE_CONFIG.MINIO.ENDPOINT,
    port: IMAGE_CONFIG.MINIO.PORT,
    useSSL: IMAGE_CONFIG.MINIO.USE_SSL,
    accessKey: IMAGE_CONFIG.MINIO.ACCESS_KEY,
    secretKey: IMAGE_CONFIG.MINIO.SECRET_KEY
  });
  
  console.log('✅ MinIO连接成功');
}

/**
 * 识别孤立的数据库记录
 */
async function identifyOrphanedRecords() {
  try {
    // 查找没有对应产品的图片记录
    const orphanedImages = await Image.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: 'productId',
          as: 'product'
        }
      },
      {
        $match: {
          product: { $size: 0 }
        }
      },
      {
        $project: {
          imageId: 1,
          productId: 1,
          type: 1,
          objectName: 1,
          fileSize: 1,
          publicUrl: 1
        }
      }
    ]);
    
    console.log(`  📊 发现 ${orphanedImages.length} 个孤立的图片记录`);
    
    if (options.verbose && orphanedImages.length > 0) {
      console.log('  🔍 孤立记录详情:');
      orphanedImages.slice(0, 10).forEach(image => {
        console.log(`    - ${image.imageId} (产品: ${image.productId}, 类型: ${image.type})`);
      });
      if (orphanedImages.length > 10) {
        console.log(`    ... 还有 ${orphanedImages.length - 10} 个记录`);
      }
    }
    
    return orphanedImages;
    
  } catch (error) {
    console.error('识别孤立记录失败:', error);
    throw error;
  }
}

/**
 * 识别孤立的文件
 */
async function identifyOrphanedFiles() {
  try {
    console.log('  📊 扫描MinIO存储中的文件...');
    
    const orphanedFiles = [];
    const objectStream = minioClient.listObjects(IMAGE_CONFIG.MINIO.BUCKET_NAME, 'products/', true);
    
    for await (const obj of objectStream) {
      // 检查数据库中是否有对应的记录
      const imageRecord = await Image.findOne({ objectName: obj.name });
      
      if (!imageRecord) {
        orphanedFiles.push({
          objectName: obj.name,
          size: obj.size,
          lastModified: obj.lastModified
        });
        
        if (options.verbose) {
          console.log(`    🔍 发现孤立文件: ${obj.name} (${(obj.size / 1024).toFixed(2)} KB)`);
        }
      }
    }
    
    console.log(`  📊 发现 ${orphanedFiles.length} 个孤立的文件`);
    return orphanedFiles;
    
  } catch (error) {
    console.error('识别孤立文件失败:', error);
    throw error;
  }
}

/**
 * 识别无效的图片引用
 */
async function identifyInvalidReferences() {
  try {
    const invalidReferences = [];
    
    // 查找Product表中引用不存在图片的记录
    const products = await Product.find({}).lean();
    
    for (const product of products) {
      const imageTypes = ['front', 'back', 'label', 'package', 'gift'];
      
      for (const imageType of imageTypes) {
        const imageData = product.images?.[imageType];
        
        if (imageData) {
          let imageId = null;
          
          if (typeof imageData === 'object' && imageData.imageId) {
            imageId = imageData.imageId;
          }
          
          if (imageId) {
            // 检查Image记录是否存在
            const imageRecord = await Image.findOne({ imageId });
            
            if (!imageRecord) {
              invalidReferences.push({
                productId: product.productId,
                imageType,
                imageId,
                url: typeof imageData === 'string' ? imageData : imageData.url
              });
              
              if (options.verbose) {
                console.log(`    🔍 发现无效引用: ${product.productId}.${imageType} -> ${imageId}`);
              }
            }
          }
        }
      }
    }
    
    console.log(`  📊 发现 ${invalidReferences.length} 个无效的图片引用`);
    return invalidReferences;
    
  } catch (error) {
    console.error('识别无效引用失败:', error);
    throw error;
  }
}

/**
 * 识别损坏的关联关系
 */
async function identifyBrokenAssociations() {
  try {
    const brokenAssociations = [];
    
    // 查找Image记录中productExists为false但产品实际存在的情况
    const imagesWithFalseProductExists = await Image.find({ productExists: false });
    
    for (const image of imagesWithFalseProductExists) {
      const product = await Product.findOne({ productId: image.productId });
      
      if (product) {
        brokenAssociations.push({
          imageId: image.imageId,
          productId: image.productId,
          type: 'false_product_exists'
        });
        
        if (options.verbose) {
          console.log(`    🔍 发现损坏关联: ${image.imageId} (productExists=false但产品存在)`);
        }
      }
    }
    
    // 查找Image记录中fileExists为false但文件实际存在的情况
    if (!options.skipFileCheck) {
      const imagesWithFalseFileExists = await Image.find({ fileExists: false });
      
      for (const image of imagesWithFalseFileExists) {
        try {
          await minioClient.statObject(IMAGE_CONFIG.MINIO.BUCKET_NAME, image.objectName);
          
          brokenAssociations.push({
            imageId: image.imageId,
            objectName: image.objectName,
            type: 'false_file_exists'
          });
          
          if (options.verbose) {
            console.log(`    🔍 发现损坏关联: ${image.imageId} (fileExists=false但文件存在)`);
          }
        } catch (error) {
          // 文件确实不存在，不是损坏的关联
        }
      }
    }
    
    console.log(`  📊 发现 ${brokenAssociations.length} 个损坏的关联关系`);
    return brokenAssociations;
    
  } catch (error) {
    console.error('识别损坏关联失败:', error);
    throw error;
  }
}

/**
 * 清理孤立记录
 */
async function cleanupOrphanedRecords(orphanedRecords) {
  const result = { cleaned: 0, freedSpace: 0, errors: [] };
  
  try {
    for (const record of orphanedRecords) {
      try {
        // 删除MinIO中的文件
        try {
          await minioClient.removeObject(IMAGE_CONFIG.MINIO.BUCKET_NAME, record.objectName);
          result.freedSpace += record.fileSize || 0;
        } catch (error) {
          // 文件可能已经不存在
        }
        
        // 删除数据库记录
        await Image.deleteOne({ imageId: record.imageId });
        result.cleaned++;
        
        if (options.verbose) {
          console.log(`    ✅ 清理孤立记录: ${record.imageId}`);
        }
        
      } catch (error) {
        result.errors.push(`清理记录 ${record.imageId} 失败: ${error.message}`);
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('清理孤立记录失败:', error);
    throw error;
  }
}

/**
 * 清理孤立文件
 */
async function cleanupOrphanedFiles() {
  const result = { cleaned: 0, freedSpace: 0, errors: [] };
  
  try {
    const objectStream = minioClient.listObjects(IMAGE_CONFIG.MINIO.BUCKET_NAME, 'products/', true);
    
    for await (const obj of objectStream) {
      // 检查数据库中是否有对应的记录
      const imageRecord = await Image.findOne({ objectName: obj.name });
      
      if (!imageRecord) {
        try {
          await minioClient.removeObject(IMAGE_CONFIG.MINIO.BUCKET_NAME, obj.name);
          result.cleaned++;
          result.freedSpace += obj.size;
          
          if (options.verbose) {
            console.log(`    ✅ 清理孤立文件: ${obj.name}`);
          }
          
        } catch (error) {
          result.errors.push(`清理文件 ${obj.name} 失败: ${error.message}`);
        }
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('清理孤立文件失败:', error);
    throw error;
  }
}

/**
 * 修复无效引用
 */
async function fixInvalidReferences(invalidReferences) {
  const result = { fixed: 0, errors: [] };
  
  try {
    for (const ref of invalidReferences) {
      try {
        // 清理Product表中的无效引用
        await Product.updateOne(
          { productId: ref.productId },
          { $unset: { [`images.${ref.imageType}`]: "" } }
        );
        
        result.fixed++;
        
        if (options.verbose) {
          console.log(`    ✅ 修复无效引用: ${ref.productId}.${ref.imageType}`);
        }
        
      } catch (error) {
        result.errors.push(`修复引用 ${ref.productId}.${ref.imageType} 失败: ${error.message}`);
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('修复无效引用失败:', error);
    throw error;
  }
}

/**
 * 修复损坏关联
 */
async function fixBrokenAssociations(brokenAssociations) {
  const result = { fixed: 0, errors: [] };
  
  try {
    for (const assoc of brokenAssociations) {
      try {
        if (assoc.type === 'false_product_exists') {
          await Image.updateOne(
            { imageId: assoc.imageId },
            { $set: { productExists: true } }
          );
        } else if (assoc.type === 'false_file_exists') {
          await Image.updateOne(
            { imageId: assoc.imageId },
            { $set: { fileExists: true } }
          );
        }
        
        result.fixed++;
        
        if (options.verbose) {
          console.log(`    ✅ 修复损坏关联: ${assoc.imageId} (${assoc.type})`);
        }
        
      } catch (error) {
        result.errors.push(`修复关联 ${assoc.imageId} 失败: ${error.message}`);
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('修复损坏关联失败:', error);
    throw error;
  }
}

/**
 * 生成清理报告
 */
async function generateCleanupReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: results,
    recommendations: []
  };
  
  // 生成建议
  if (results.orphanedFiles > 0) {
    report.recommendations.push('定期运行孤立文件清理，避免存储空间浪费');
  }
  
  if (results.orphanedRecords > 0) {
    report.recommendations.push('检查产品删除流程，确保同时清理关联的图片记录');
  }
  
  if (results.invalidReferences > 0) {
    report.recommendations.push('加强图片引用的完整性验证');
  }
  
  if (results.brokenAssociations > 0) {
    report.recommendations.push('定期运行关联关系检查，及时修复损坏的关联');
  }
  
  // 保存报告
  const fs = require('fs');
  const reportPath = `cleanup-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`  📄 清理报告已保存: ${reportPath}`);
}

// 执行脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  identifyOrphanedRecords,
  identifyOrphanedFiles,
  identifyInvalidReferences,
  identifyBrokenAssociations,
  cleanupOrphanedRecords,
  fixInvalidReferences,
  fixBrokenAssociations
};
