/**
 * 图片系统集成测试脚本
 * 验证图片存储和数据同步机制的完整性
 */

const mongoose = require('mongoose');
const axios = require('axios');
const { Product } = require('../dist/models/Product');
const { Image } = require('../dist/models/Image');
require('dotenv').config();

// 测试配置
const TEST_CONFIG = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api/v1',
  minioBaseUrl: process.env.MINIO_BASE_URL || 'http://152.89.168.61:9000',
  testProductId: 'rec12345abcd', // 用于测试的产品ID
  timeout: 30000
};

// 测试结果统计
const testStats = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

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

// 测试辅助函数
function createTest(name, testFn) {
  return async () => {
    testStats.total++;
    console.log(`🧪 测试: ${name}`);
    
    try {
      await testFn();
      testStats.passed++;
      console.log(`✅ 通过: ${name}`);
    } catch (error) {
      testStats.failed++;
      testStats.errors.push({ test: name, error: error.message });
      console.error(`❌ 失败: ${name} - ${error.message}`);
    }
  };
}

// HTTP请求辅助函数
async function apiRequest(method, path, data = null) {
  const url = `${TEST_CONFIG.apiBaseUrl}${path}`;
  const config = {
    method,
    url,
    timeout: TEST_CONFIG.timeout,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (data) {
    config.data = data;
  }

  const response = await axios(config);
  return response.data;
}

// 测试用例定义

// 1. 基础连接测试
const testDatabaseConnection = createTest('数据库连接', async () => {
  const productCount = await Product.countDocuments();
  const imageCount = await Image.countDocuments();
  
  console.log(`  产品数量: ${productCount}`);
  console.log(`  图片数量: ${imageCount}`);
  
  if (productCount === 0) {
    throw new Error('数据库中没有产品数据');
  }
});

const testApiConnection = createTest('API服务连接', async () => {
  const response = await apiRequest('GET', '/health');
  
  if (!response.success) {
    throw new Error('API健康检查失败');
  }
  
  console.log(`  API状态: ${response.data.status}`);
});

const testMinIOConnection = createTest('MinIO服务连接', async () => {
  try {
    const response = await axios.get(`${TEST_CONFIG.minioBaseUrl}/minio/health/live`, {
      timeout: 5000
    });
    
    if (response.status !== 200) {
      throw new Error('MinIO健康检查失败');
    }
    
    console.log('  MinIO服务正常');
  } catch (error) {
    throw new Error(`MinIO连接失败: ${error.message}`);
  }
});

// 2. 数据结构测试
const testProductImageStructure = createTest('产品图片数据结构', async () => {
  const products = await Product.find({}).limit(5).lean();
  
  let newStructureCount = 0;
  let oldStructureCount = 0;
  
  for (const product of products) {
    if (product.images) {
      const imageTypes = ['front', 'back', 'label', 'package', 'gift'];
      
      for (const imageType of imageTypes) {
        const imageData = product.images[imageType];
        
        if (imageData) {
          if (typeof imageData === 'object' && imageData.imageId) {
            newStructureCount++;
          } else if (typeof imageData === 'string') {
            oldStructureCount++;
          }
        }
      }
    }
  }
  
  console.log(`  新结构图片: ${newStructureCount}`);
  console.log(`  旧结构图片: ${oldStructureCount}`);
  
  if (newStructureCount === 0 && oldStructureCount === 0) {
    throw new Error('没有找到图片数据');
  }
});

const testImageRecordConsistency = createTest('图片记录一致性', async () => {
  const products = await Product.find({}).limit(10).lean();
  let consistentCount = 0;
  let inconsistentCount = 0;
  
  for (const product of products) {
    if (product.images) {
      const imageTypes = ['front', 'back', 'label', 'package', 'gift'];
      
      for (const imageType of imageTypes) {
        const imageData = product.images[imageType];
        
        if (imageData) {
          const imageRecord = await Image.findOne({
            productId: product.productId,
            type: imageType
          });
          
          if (imageRecord) {
            consistentCount++;
          } else {
            inconsistentCount++;
          }
        }
      }
    }
  }
  
  console.log(`  一致记录: ${consistentCount}`);
  console.log(`  不一致记录: ${inconsistentCount}`);
  
  if (consistentCount === 0) {
    throw new Error('没有找到一致的图片记录');
  }
});

// 3. API功能测试
const testProductImageAPI = createTest('产品图片API', async () => {
  // 获取一个有图片的产品
  const product = await Product.findOne({
    'images.front': { $exists: true }
  }).lean();
  
  if (!product) {
    throw new Error('没有找到有图片的产品');
  }
  
  // 测试获取产品图片
  const response = await apiRequest('GET', `/products/${product.productId}/images`);
  
  if (!response.success) {
    throw new Error('获取产品图片API失败');
  }
  
  console.log(`  产品ID: ${product.productId}`);
  console.log(`  图片数量: ${response.data.total}`);
});

const testImageConsistencyAPI = createTest('图片一致性检查API', async () => {
  // 获取一个产品进行测试
  const product = await Product.findOne({}).lean();
  
  if (!product) {
    throw new Error('没有找到产品');
  }
  
  const response = await apiRequest('GET', `/products/${product.productId}/images/validate`);
  
  if (!response.success) {
    throw new Error('图片一致性检查API失败');
  }
  
  console.log(`  检查项目: ${response.data.stats.total}`);
  console.log(`  有效项目: ${response.data.stats.valid}`);
  console.log(`  无效项目: ${response.data.stats.invalid}`);
});

// 4. 图片访问测试
const testImageAccess = createTest('图片文件访问', async () => {
  // 获取一个有图片的产品
  const product = await Product.findOne({
    'images.front': { $exists: true }
  }).lean();
  
  if (!product) {
    throw new Error('没有找到有图片的产品');
  }
  
  let imageUrl = '';
  const frontImage = product.images.front;
  
  if (typeof frontImage === 'object' && frontImage.url) {
    imageUrl = frontImage.url;
  } else if (typeof frontImage === 'string') {
    imageUrl = frontImage;
  }
  
  if (!imageUrl) {
    throw new Error('没有找到有效的图片URL');
  }
  
  // 测试图片是否可以访问
  try {
    const response = await axios.head(imageUrl, { timeout: 10000 });
    
    if (response.status !== 200) {
      throw new Error(`图片访问失败，状态码: ${response.status}`);
    }
    
    console.log(`  图片URL: ${imageUrl}`);
    console.log(`  文件大小: ${response.headers['content-length']} bytes`);
    console.log(`  内容类型: ${response.headers['content-type']}`);
    
  } catch (error) {
    throw new Error(`图片访问失败: ${error.message}`);
  }
});

// 5. 修复功能测试
const testImageRepair = createTest('图片修复功能', async () => {
  // 获取一个产品进行修复测试
  const product = await Product.findOne({}).lean();
  
  if (!product) {
    throw new Error('没有找到产品');
  }
  
  try {
    const response = await apiRequest('POST', `/products/${product.productId}/images/repair`);
    
    if (!response.success) {
      throw new Error('图片修复API失败');
    }
    
    console.log(`  修复的问题: ${response.data.repaired}`);
    console.log(`  失败的修复: ${response.data.failed}`);
    
  } catch (error) {
    // 修复功能可能因为没有问题而失败，这是正常的
    if (error.message.includes('404')) {
      console.log('  产品不存在或无需修复');
    } else {
      throw error;
    }
  }
});

// 运行所有测试
async function runAllTests() {
  console.log('🚀 开始图片系统集成测试...\n');
  
  const tests = [
    testDatabaseConnection,
    testApiConnection,
    testMinIOConnection,
    testProductImageStructure,
    testImageRecordConsistency,
    testProductImageAPI,
    testImageConsistencyAPI,
    testImageAccess,
    testImageRepair
  ];
  
  for (const test of tests) {
    await test();
    console.log(''); // 空行分隔
  }
  
  // 输出测试结果
  console.log('📊 测试结果统计:');
  console.log(`总测试数: ${testStats.total}`);
  console.log(`通过: ${testStats.passed}`);
  console.log(`失败: ${testStats.failed}`);
  console.log(`成功率: ${((testStats.passed / testStats.total) * 100).toFixed(1)}%`);
  
  if (testStats.errors.length > 0) {
    console.log('\n❌ 失败的测试:');
    testStats.errors.forEach(({ test, error }) => {
      console.log(`  - ${test}: ${error}`);
    });
  }
  
  // 生成测试报告
  const report = {
    timestamp: new Date().toISOString(),
    config: TEST_CONFIG,
    stats: testStats,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/products-db'
    }
  };
  
  const fs = require('fs');
  const reportPath = `./reports/test-report-${Date.now()}.json`;
  
  // 确保reports目录存在
  if (!fs.existsSync('./reports')) {
    fs.mkdirSync('./reports', { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📋 测试报告已保存: ${reportPath}`);
  
  return testStats.failed === 0;
}

// 主执行函数
async function main() {
  try {
    await connectDB();
    const success = await runAllTests();
    
    if (success) {
      console.log('\n✅ 所有测试通过!');
      process.exit(0);
    } else {
      console.log('\n❌ 部分测试失败!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 测试执行失败:', error);
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
  runAllTests,
  testStats
};
