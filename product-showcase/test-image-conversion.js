console.log('=== 开始测试图片URL转换 ===');

// 模拟测试数据
const testProduct = {
  id: "20250708-002",
  name: "卡士007益生菌酸奶",
  sequence: "HM-0001A",
  images: {
    front: "/images/20250708-002_正面图片_0.jpg",
    back: "/images/20250708-002_背面图片_0.jpg",
    label: "/images/20250708-002_标签照片_0.jpg"
  }
};

// 测试FrontendImageUtils
const testImageUrls = [
  "/images/20250708-002_正面图片_0.jpg",
  "/images/20250708-002_背面图片_0.jpg",
  "/images/20250708-002_标签照片_0.jpg"
];

console.log('\n1. 测试FrontendImageUtils.buildImageUrl:');
testImageUrls.forEach((path, index) => {
  // 手动构建URL（模拟FrontendImageUtils.buildImageUrl的逻辑）
  const baseUrl = 'http://152.89.168.61:9000';
  const bucketName = 'product-images';
  let fullUrl;
  
  if (path.startsWith('/')) {
    // 移除开头的斜杠并构建完整URL
    const cleanPath = path.substring(1); // 移除开头的 '/'
    const filename = cleanPath.split('/').pop(); // 获取文件名
    fullUrl = `${baseUrl}/${bucketName}/products/${filename}`;
  } else {
    fullUrl = `${baseUrl}/${bucketName}/${path}`;
  }
  
  console.log(`  输入: ${path}`);
  console.log(`  输出: ${fullUrl}`);
  console.log(`  预期: http://152.89.168.61:9000/product-images/products/20250708-002_正面图片_0.jpg`);
  console.log('');
});

console.log('\n2. 测试实际的MinIO URL:');
const actualMinioUrls = [
  "http://152.89.168.61:9000/product-images/products/20250708-002_正面图片_0.jpg",
  "http://152.89.168.61:9000/product-images/products/20250708-002_背面图片_0.jpg",
  "http://152.89.168.61:9000/product-images/products/20250708-002_标签照片_0.jpg"
];

actualMinioUrls.forEach((url, index) => {
  console.log(`  URL ${index + 1}: ${url}`);
});

console.log('\n=== 测试完成 ===');
console.log('请手动验证以上URL是否可以在浏览器中访问');