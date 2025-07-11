import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取products.json文件
const productsPath = path.join(__dirname, '../src/data/products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

// 修复图片路径
const fixedProducts = products.map((product, index) => {
  const fixedImages = {};

  // 遍历所有图片类型
  Object.keys(product.images).forEach(imageType => {
    const imagePath = product.images[imageType];
    if (imagePath) {
      // 将 /src/assets/images/products/ 替换为 /images/
      const fixedPath = imagePath.replace('/src/assets/images/products/', '/images/');
      fixedImages[imageType] = fixedPath;

      // 调试信息
      if (index === 0) {
        console.log(`原路径: ${imagePath}`);
        console.log(`新路径: ${fixedPath}`);
      }
    }
  });

  return {
    ...product,
    images: fixedImages
  };
});

// 写回文件
fs.writeFileSync(productsPath, JSON.stringify(fixedProducts, null, 2));

console.log('图片路径修复完成！');
console.log(`处理了 ${fixedProducts.length} 个产品`);

// 统计图片数量
let totalImages = 0;
fixedProducts.forEach(product => {
  totalImages += Object.keys(product.images).length;
});

console.log(`总共修复了 ${totalImages} 个图片路径`);
