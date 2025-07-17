const mongoose = require('mongoose');
require('dotenv').config();

// 产品模型
const ProductSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true, index: true },
  recordId: { type: String, required: true },
  name: { type: String, required: true, index: true },
  sequence: { type: String, required: true },
  
  category: {
    primary: { type: String, required: true, index: true },
    secondary: { type: String, required: true }
  },
  
  price: {
    normal: { type: Number, required: true, index: true },
    discount: { type: Number, default: 0 },
    discountRate: { type: Number, default: 0 },
    currency: { type: String, default: 'CNY' }
  },
  
  images: {
    front: String,
    back: String,
    label: String,
    package: String,
    gift: String
  },
  
  origin: {
    country: { type: String, default: '中国' },
    province: { type: String, index: true },
    city: String
  },
  
  platform: { type: String, required: true, index: true },
  specification: String,
  flavor: String,
  manufacturer: String,
  
  collectTime: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  searchText: { type: String, index: 'text' },
  status: { type: String, default: 'active', index: true },
  isVisible: { type: Boolean, default: true, index: true }
}, {
  timestamps: true
});

const Product = mongoose.model('Product', ProductSchema);

async function fixImageUrls() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB 连接成功');

    // 查找所有产品
    const products = await Product.find({});
    console.log(`📊 找到 ${products.length} 个产品`);

    let updatedCount = 0;

    for (const product of products) {
      let needsUpdate = false;
      const updatedImages = { ...product.images };

      // 修复每个图片URL
      for (const [imageType, imageUrl] of Object.entries(product.images)) {
        if (imageUrl && imageUrl.includes('originals/2025/07/')) {
          // 将 originals/2025/07/ 替换为 products/
          const newUrl = imageUrl.replace('originals/2025/07/', 'products/');
          updatedImages[imageType] = newUrl;
          needsUpdate = true;
          console.log(`🔄 修复 ${product.productId} 的 ${imageType} 图片URL`);
          console.log(`   原: ${imageUrl}`);
          console.log(`   新: ${newUrl}`);
        }
      }

      // 如果需要更新，保存到数据库
      if (needsUpdate) {
        await Product.updateOne(
          { _id: product._id },
          { $set: { images: updatedImages } }
        );
        updatedCount++;
      }
    }

    console.log(`\n✅ 修复完成！共更新了 ${updatedCount} 个产品的图片URL`);
    
    // 验证修复结果
    const sampleProduct = await Product.findOne({ productId: '20250715-862' });
    if (sampleProduct) {
      console.log('\n🔍 修复后的示例产品图片URL:');
      console.log(JSON.stringify(sampleProduct.images, null, 2));
    }

  } catch (error) {
    console.error('❌ 修复图片URL失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📝 数据库连接已关闭');
  }
}

// 运行修复脚本
fixImageUrls();