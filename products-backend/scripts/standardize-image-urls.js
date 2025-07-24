#!/usr/bin/env node

/**
 * 图片URL格式标准化脚本
 * 
 * 功能：
 * 1. 统一所有图片URL为标准格式
 * 2. 修复废弃路径引用
 * 3. 验证URL有效性
 * 4. 生成迁移报告
 */

const mongoose = require('mongoose');
const { Product } = require('../src/models/Product');
const { Image } = require('../src/models/Image');
const { IMAGE_CONFIG, ImagePathUtils } = require('../src/config/imageConfig');

// 配置选项
const options = {
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose'),
  force: process.argv.includes('--force'),
  batchSize: parseInt(process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1]) || 100
};

// URL格式标准
const URL_STANDARDS = {
  // 标准的MinIO URL格式
  STANDARD_FORMAT: `http://${IMAGE_CONFIG.MINIO.ENDPOINT}:${IMAGE_CONFIG.MINIO.PORT}/${IMAGE_CONFIG.MINIO.BUCKET_NAME}/products/`,
  
  // 废弃的格式模式
  DEPRECATED_PATTERNS: [
    /\/originals\//,
    /\/originals\/2025\/07\//,
    /\/images\//,
    /^\/product-images\//
  ],
  
  // 支持的图片扩展名
  VALID_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.gif']
};

/**
 * 主执行函数
 */
async function main() {
  try {
    console.log('🚀 开始图片URL格式标准化...');
    
    // 连接数据库
    await connectDatabase();
    
    // 执行标准化步骤
    const results = {
      productsProcessed: 0,
      imagesProcessed: 0,
      urlsFixed: 0,
      invalidUrls: 0,
      errors: []
    };
    
    // 1. 分析当前URL格式分布
    console.log('\n📊 分析当前URL格式分布...');
    const analysis = await analyzeUrlFormats();
    displayAnalysis(analysis);
    
    // 2. 标准化Product表中的图片URL
    console.log('\n🔧 标准化Product表中的图片URL...');
    const productResults = await standardizeProductImageUrls();
    results.productsProcessed = productResults.processed;
    results.urlsFixed += productResults.fixed;
    results.errors.push(...productResults.errors);
    
    // 3. 标准化Image表中的URL
    console.log('\n🔧 标准化Image表中的URL...');
    const imageResults = await standardizeImageTableUrls();
    results.imagesProcessed = imageResults.processed;
    results.urlsFixed += imageResults.fixed;
    results.errors.push(...imageResults.errors);
    
    // 4. 验证标准化结果
    console.log('\n✅ 验证标准化结果...');
    await validateStandardization();
    
    // 输出结果
    console.log('\n📋 标准化完成统计:');
    console.log(`  - 处理产品: ${results.productsProcessed}`);
    console.log(`  - 处理图片: ${results.imagesProcessed}`);
    console.log(`  - 修复URL: ${results.urlsFixed}`);
    console.log(`  - 错误数量: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ 错误详情:');
      results.errors.slice(0, 10).forEach(error => {
        console.log(`  - ${error}`);
      });
      if (results.errors.length > 10) {
        console.log(`  ... 还有 ${results.errors.length - 10} 个错误`);
      }
    }
    
    console.log('\n✨ 图片URL格式标准化完成！');
    
  } catch (error) {
    console.error('❌ 标准化过程失败:', error);
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
 * 分析当前URL格式分布
 */
async function analyzeUrlFormats() {
  const analysis = {
    totalProducts: 0,
    totalImages: 0,
    urlFormats: {
      standard: 0,
      deprecated: 0,
      relative: 0,
      invalid: 0
    },
    deprecatedPatterns: {}
  };
  
  try {
    // 分析Product表
    const products = await Product.find({}).lean();
    analysis.totalProducts = products.length;
    
    for (const product of products) {
      const imageTypes = ['front', 'back', 'label', 'package', 'gift'];
      
      for (const imageType of imageTypes) {
        const imageData = product.images?.[imageType];
        if (imageData) {
          const url = typeof imageData === 'string' ? imageData : imageData.url;
          if (url) {
            const format = categorizeUrl(url);
            analysis.urlFormats[format]++;
            
            if (format === 'deprecated') {
              const pattern = identifyDeprecatedPattern(url);
              analysis.deprecatedPatterns[pattern] = (analysis.deprecatedPatterns[pattern] || 0) + 1;
            }
          }
        }
      }
    }
    
    // 分析Image表
    const images = await Image.find({}).lean();
    analysis.totalImages = images.length;
    
    for (const image of images) {
      if (image.publicUrl) {
        const format = categorizeUrl(image.publicUrl);
        analysis.urlFormats[format]++;
        
        if (format === 'deprecated') {
          const pattern = identifyDeprecatedPattern(image.publicUrl);
          analysis.deprecatedPatterns[pattern] = (analysis.deprecatedPatterns[pattern] || 0) + 1;
        }
      }
    }
    
    return analysis;
    
  } catch (error) {
    console.error('分析URL格式失败:', error);
    throw error;
  }
}

/**
 * 显示分析结果
 */
function displayAnalysis(analysis) {
  console.log('  📊 URL格式分布:');
  console.log(`    - 标准格式: ${analysis.urlFormats.standard}`);
  console.log(`    - 废弃格式: ${analysis.urlFormats.deprecated}`);
  console.log(`    - 相对路径: ${analysis.urlFormats.relative}`);
  console.log(`    - 无效格式: ${analysis.urlFormats.invalid}`);
  
  if (Object.keys(analysis.deprecatedPatterns).length > 0) {
    console.log('  🔍 废弃格式详情:');
    Object.entries(analysis.deprecatedPatterns).forEach(([pattern, count]) => {
      console.log(`    - ${pattern}: ${count} 个`);
    });
  }
}

/**
 * 分类URL格式
 */
function categorizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return 'invalid';
  }
  
  // 检查是否为标准格式
  if (url.startsWith(URL_STANDARDS.STANDARD_FORMAT)) {
    return 'standard';
  }
  
  // 检查是否为废弃格式
  for (const pattern of URL_STANDARDS.DEPRECATED_PATTERNS) {
    if (pattern.test(url)) {
      return 'deprecated';
    }
  }
  
  // 检查是否为相对路径
  if (!url.startsWith('http')) {
    return 'relative';
  }
  
  return 'invalid';
}

/**
 * 识别废弃格式模式
 */
function identifyDeprecatedPattern(url) {
  for (const pattern of URL_STANDARDS.DEPRECATED_PATTERNS) {
    if (pattern.test(url)) {
      return pattern.toString();
    }
  }
  return 'unknown';
}

/**
 * 标准化Product表中的图片URL
 */
async function standardizeProductImageUrls() {
  const results = {
    processed: 0,
    fixed: 0,
    errors: []
  };
  
  try {
    const totalProducts = await Product.countDocuments({});
    console.log(`  📊 需要处理 ${totalProducts} 个产品`);
    
    let skip = 0;
    
    while (skip < totalProducts) {
      const products = await Product.find({})
        .skip(skip)
        .limit(options.batchSize)
        .lean();
      
      for (const product of products) {
        try {
          let needsUpdate = false;
          const updates = {};
          
          const imageTypes = ['front', 'back', 'label', 'package', 'gift'];
          
          for (const imageType of imageTypes) {
            const imageData = product.images?.[imageType];
            
            if (imageData) {
              let currentUrl = typeof imageData === 'string' ? imageData : imageData.url;
              
              if (currentUrl) {
                const standardizedUrl = standardizeUrl(currentUrl, product.productId, imageType);
                
                if (standardizedUrl !== currentUrl) {
                  needsUpdate = true;
                  results.fixed++;
                  
                  if (typeof imageData === 'string') {
                    updates[`images.${imageType}`] = standardizedUrl;
                  } else {
                    updates[`images.${imageType}.url`] = standardizedUrl;
                  }
                  
                  if (options.verbose) {
                    console.log(`    🔄 ${product.productId}.${imageType}: ${currentUrl} -> ${standardizedUrl}`);
                  }
                }
              }
            }
          }
          
          // 应用更新
          if (needsUpdate && !options.dryRun && Object.keys(updates).length > 0) {
            await Product.updateOne(
              { productId: product.productId },
              { $set: updates }
            );
          }
          
          results.processed++;
          
        } catch (error) {
          results.errors.push(`产品 ${product.productId}: ${error.message}`);
        }
      }
      
      skip += options.batchSize;
      
      if (skip % (options.batchSize * 10) === 0) {
        console.log(`  📈 已处理 ${skip}/${totalProducts} 个产品`);
      }
    }
    
    console.log(`  ✅ Product表处理完成: ${results.processed} 个产品, ${results.fixed} 个URL修复`);
    return results;
    
  } catch (error) {
    console.error('标准化Product表URL失败:', error);
    throw error;
  }
}

/**
 * 标准化Image表中的URL
 */
async function standardizeImageTableUrls() {
  const results = {
    processed: 0,
    fixed: 0,
    errors: []
  };
  
  try {
    const totalImages = await Image.countDocuments({});
    console.log(`  📊 需要处理 ${totalImages} 个图片记录`);
    
    let skip = 0;
    
    while (skip < totalImages) {
      const images = await Image.find({})
        .skip(skip)
        .limit(options.batchSize);
      
      for (const image of images) {
        try {
          const originalUrl = image.publicUrl;
          const standardizedUrl = standardizeUrl(originalUrl, image.productId, image.type);
          
          if (standardizedUrl !== originalUrl) {
            results.fixed++;
            
            if (!options.dryRun) {
              image.publicUrl = standardizedUrl;
              await image.save();
            }
            
            if (options.verbose) {
              console.log(`    🔄 ${image.imageId}: ${originalUrl} -> ${standardizedUrl}`);
            }
          }
          
          results.processed++;
          
        } catch (error) {
          results.errors.push(`图片 ${image.imageId}: ${error.message}`);
        }
      }
      
      skip += options.batchSize;
      
      if (skip % (options.batchSize * 10) === 0) {
        console.log(`  📈 已处理 ${skip}/${totalImages} 个图片记录`);
      }
    }
    
    console.log(`  ✅ Image表处理完成: ${results.processed} 个图片, ${results.fixed} 个URL修复`);
    return results;
    
  } catch (error) {
    console.error('标准化Image表URL失败:', error);
    throw error;
  }
}

/**
 * 标准化单个URL
 */
function standardizeUrl(url, productId, imageType) {
  if (!url || typeof url !== 'string') {
    return url;
  }
  
  // 如果已经是标准格式，直接返回
  if (url.startsWith(URL_STANDARDS.STANDARD_FORMAT)) {
    return url;
  }
  
  try {
    // 提取文件名
    let filename = '';
    
    if (url.startsWith('http')) {
      // 从完整URL中提取文件名
      const urlParts = url.split('/');
      filename = urlParts[urlParts.length - 1];
    } else {
      // 从相对路径中提取文件名
      filename = url.split('/').pop() || url.split('\\').pop() || '';
    }
    
    // 验证文件名
    if (!filename || !URL_STANDARDS.VALID_EXTENSIONS.some(ext => filename.toLowerCase().endsWith(ext))) {
      // 如果没有有效文件名，生成一个
      const timestamp = Date.now();
      filename = `${productId}_${imageType}_${timestamp}.jpg`;
    }
    
    // 构建标准URL
    return `${URL_STANDARDS.STANDARD_FORMAT}${filename}`;
    
  } catch (error) {
    console.warn(`标准化URL失败: ${url}`, error);
    return url;
  }
}

/**
 * 验证标准化结果
 */
async function validateStandardization() {
  try {
    const analysis = await analyzeUrlFormats();
    
    console.log('  📊 标准化后的URL格式分布:');
    console.log(`    - 标准格式: ${analysis.urlFormats.standard}`);
    console.log(`    - 废弃格式: ${analysis.urlFormats.deprecated}`);
    console.log(`    - 相对路径: ${analysis.urlFormats.relative}`);
    console.log(`    - 无效格式: ${analysis.urlFormats.invalid}`);
    
    const totalUrls = Object.values(analysis.urlFormats).reduce((sum, count) => sum + count, 0);
    const standardRate = totalUrls > 0 ? (analysis.urlFormats.standard / totalUrls * 100).toFixed(2) : '0';
    
    console.log(`  📈 标准化率: ${standardRate}%`);
    
    if (analysis.urlFormats.deprecated > 0) {
      console.log('  ⚠️  仍有废弃格式URL需要处理');
    } else {
      console.log('  ✅ 所有废弃格式URL已处理完成');
    }
    
  } catch (error) {
    console.error('验证标准化结果失败:', error);
    throw error;
  }
}

// 执行脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  analyzeUrlFormats,
  standardizeProductImageUrls,
  standardizeImageTableUrls,
  standardizeUrl,
  validateStandardization
};
