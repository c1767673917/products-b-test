// 测试数据服务脚本
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取生成的数据文件
function testDataFiles() {
  console.log('🧪 测试数据文件...');
  
  const dataDir = path.join(__dirname, '../src/data');
  
  // 测试products.json
  const productsPath = path.join(dataDir, 'products.json');
  if (fs.existsSync(productsPath)) {
    const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
    console.log(`✅ products.json: ${products.length} 个产品`);
    
    // 检查第一个产品的结构
    if (products.length > 0) {
      const firstProduct = products[0];
      console.log('📋 第一个产品示例:');
      console.log(`  - ID: ${firstProduct.id}`);
      console.log(`  - 名称: ${firstProduct.name}`);
      console.log(`  - 品类: ${firstProduct.category.primary} > ${firstProduct.category.secondary}`);
      console.log(`  - 价格: ¥${firstProduct.price.normal}${firstProduct.price.discount ? ` (优惠价: ¥${firstProduct.price.discount})` : ''}`);
      console.log(`  - 平台: ${firstProduct.platform}`);
      console.log(`  - 产地: ${firstProduct.origin.province} ${firstProduct.origin.city}`);
      console.log(`  - 图片: ${Object.keys(firstProduct.images).filter(key => firstProduct.images[key]).join(', ')}`);
    }
  } else {
    console.log('❌ products.json 文件不存在');
  }
  
  // 测试stats.json
  const statsPath = path.join(dataDir, 'stats.json');
  if (fs.existsSync(statsPath)) {
    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
    console.log(`✅ stats.json: 统计数据完整`);
    console.log('📊 统计摘要:');
    console.log(`  - 总产品数: ${stats.totalProducts}`);
    console.log(`  - 品类数量: ${Object.keys(stats.categoryDistribution).length}`);
    console.log(`  - 平台数量: ${Object.keys(stats.platformDistribution).length}`);
    console.log(`  - 价格范围: ¥${stats.priceStats.min} - ¥${stats.priceStats.max}`);
    console.log(`  - 平均价格: ¥${stats.priceStats.average}`);
    
    // 显示品类分布
    console.log('🏷️ 品类分布:');
    Object.entries(stats.categoryDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([category, count]) => {
        console.log(`  - ${category}: ${count}个`);
      });
      
    // 显示平台分布
    console.log('🏪 平台分布:');
    Object.entries(stats.platformDistribution)
      .sort(([,a], [,b]) => b - a)
      .forEach(([platform, count]) => {
        console.log(`  - ${platform}: ${count}个`);
      });
  } else {
    console.log('❌ stats.json 文件不存在');
  }
}

// 测试数据质量
function testDataQuality() {
  console.log('\n🔍 测试数据质量...');
  
  const productsPath = path.join(__dirname, '../src/data/products.json');
  if (!fs.existsSync(productsPath)) {
    console.log('❌ 无法找到产品数据文件');
    return;
  }
  
  const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
  
  let validProducts = 0;
  let invalidProducts = 0;
  let missingImages = 0;
  let withDiscount = 0;
  
  const issues = [];
  
  products.forEach((product, index) => {
    let isValid = true;
    
    // 检查必需字段
    if (!product.id || !product.name || !product.sequence) {
      issues.push(`产品 ${index}: 缺少必需字段`);
      isValid = false;
    }
    
    // 检查价格
    if (!product.price || product.price.normal <= 0) {
      issues.push(`产品 ${index}: 价格无效`);
      isValid = false;
    }
    
    // 检查品类
    if (!product.category || !product.category.primary) {
      issues.push(`产品 ${index}: 缺少品类信息`);
      isValid = false;
    }
    
    // 检查图片
    if (!product.images || !product.images.front) {
      missingImages++;
    }
    
    // 统计优惠产品
    if (product.price.discount) {
      withDiscount++;
    }
    
    if (isValid) {
      validProducts++;
    } else {
      invalidProducts++;
    }
  });
  
  console.log(`✅ 有效产品: ${validProducts}个`);
  console.log(`❌ 无效产品: ${invalidProducts}个`);
  console.log(`🖼️ 缺少正面图片: ${missingImages}个`);
  console.log(`💰 有优惠价格: ${withDiscount}个`);
  
  if (issues.length > 0) {
    console.log('\n⚠️ 发现的问题:');
    issues.slice(0, 10).forEach(issue => console.log(`  - ${issue}`));
    if (issues.length > 10) {
      console.log(`  ... 还有 ${issues.length - 10} 个问题`);
    }
  } else {
    console.log('🎉 数据质量检查通过！');
  }
}

// 测试图片路径
function testImagePaths() {
  console.log('\n🖼️ 测试图片路径...');
  
  const productsPath = path.join(__dirname, '../src/data/products.json');
  if (!fs.existsSync(productsPath)) {
    console.log('❌ 无法找到产品数据文件');
    return;
  }
  
  const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
  
  const imageTypes = ['front', 'back', 'label', 'package', 'gift'];
  const imageStats = {};
  
  imageTypes.forEach(type => {
    imageStats[type] = 0;
  });
  
  products.forEach(product => {
    imageTypes.forEach(type => {
      if (product.images[type]) {
        imageStats[type]++;
      }
    });
  });
  
  console.log('📊 图片统计:');
  imageTypes.forEach(type => {
    const count = imageStats[type];
    const percentage = ((count / products.length) * 100).toFixed(1);
    console.log(`  - ${type}: ${count}个 (${percentage}%)`);
  });
  
  // 检查图片路径格式
  const sampleProduct = products.find(p => p.images.front);
  if (sampleProduct) {
    console.log('\n🔗 图片路径示例:');
    Object.entries(sampleProduct.images).forEach(([type, path]) => {
      if (path) {
        console.log(`  - ${type}: ${path}`);
      }
    });
  }
}

// 主测试函数
function runTests() {
  console.log('🚀 开始测试数据服务...\n');
  
  testDataFiles();
  testDataQuality();
  testImagePaths();
  
  console.log('\n✅ 数据服务测试完成！');
}

// 执行测试
runTests();
