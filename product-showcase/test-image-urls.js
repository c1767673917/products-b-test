// 测试图片URL转换的简单脚本
const { FrontendImageUtils } = require('./src/config/api.ts');

// 测试数据
const testPaths = [
  '/images/20250708-002_正面图片_0.jpg',
  '/images/20250708-002_背面图片_0.jpg', 
  '/images/20250708-002_标签照片_0.jpg',
  'products/20250708-002_正面图片_0.jpg'
];

console.log('=== 测试图片URL转换 ===');

testPaths.forEach((path, index) => {
  console.log(`\n测试 ${index + 1}:`);
  console.log(`原始路径: ${path}`);
  
  try {
    const fullUrl = FrontendImageUtils.buildImageUrl(path);
    console.log(`转换后URL: ${fullUrl}`);
    
    // 测试缩略图
    const thumbnailUrl = FrontendImageUtils.buildThumbnailUrl(path, 'medium');
    console.log(`缩略图URL: ${thumbnailUrl}`);
    
    // 测试优化参数
    const optimizedUrl = FrontendImageUtils.buildOptimizedImageUrl(path, { 
      width: 400, 
      height: 300, 
      quality: 85 
    });
    console.log(`优化后URL: ${optimizedUrl}`);
    
  } catch (error) {
    console.error(`转换失败: ${error.message}`);
  }
});

console.log('\n=== 测试完成 ===');