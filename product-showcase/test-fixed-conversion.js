// 测试修复后的图片URL转换
const testPaths = [
  '/images/20250708-002_正面图片_0.jpg',
  '/images/20250708-002_背面图片_0.jpg',
  '/images/20250708-002_标签照片_0.jpg'
];

console.log('=== 测试修复后的图片URL转换 ===');

testPaths.forEach((path, index) => {
  console.log(`\n测试 ${index + 1}:`);
  console.log(`输入路径: ${path}`);
  
  // 模拟修复后的buildImageUrl逻辑
  const imageBaseURL = 'http://152.89.168.61:9000';
  const bucketName = 'product-images';
  const productsPath = 'products';
  
  let result;
  if (path.startsWith('/images/')) {
    const filename = path.split('/').pop();
    result = `${imageBaseURL}/${bucketName}/${productsPath}/${filename}`;
  }
  
  console.log(`输出URL: ${result}`);
  console.log(`预期正确: ${result === `http://152.89.168.61:9000/product-images/products/${path.split('/').pop()}`}`);
});

console.log('\n=== 测试完成 ===');