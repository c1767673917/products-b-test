#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const { Product } = require('./dist/models');
const { Image } = require('./dist/models');

async function checkTokenMatching() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    // 获取一个有文件令牌的产品
    const productWithToken = await Product.findOne({
      'images.front': { $regex: '^[A-Za-z0-9]{20,}$' }
    });
    
    if (productWithToken) {
      console.log(`\n🔍 检查产品: ${productWithToken.productId}`);
      console.log(`Product表中的front图片: ${productWithToken.images.front}`);
      
      // 查找对应的Image记录
      const imageRecord = await Image.findOne({
        productId: productWithToken.productId,
        type: 'front'
      });
      
      if (imageRecord) {
        console.log(`Image表中的记录:`);
        console.log(`  - feishuFileToken: ${imageRecord.metadata?.feishuFileToken}`);
        console.log(`  - publicUrl: ${imageRecord.publicUrl}`);
        
        // 检查是否匹配
        const matches = productWithToken.images.front === imageRecord.metadata?.feishuFileToken;
        console.log(`\n匹配结果: ${matches ? '✅ 匹配' : '❌ 不匹配'}`);
        
        if (!matches) {
          console.log('\n🔍 详细对比:');
          console.log(`Product表: '${productWithToken.images.front}'`);
          console.log(`Image表:   '${imageRecord.metadata?.feishuFileToken}'`);
          console.log(`长度对比: ${productWithToken.images.front.length} vs ${imageRecord.metadata?.feishuFileToken?.length}`);
        }
      } else {
        console.log('❌ 未找到对应的Image记录');
      }
    }
    
    // 检查几个已知的产品
    const knownProducts = ['recn7j9p5p', 'recyvMPGSQ', 'recicVN6DP'];
    
    for (const productId of knownProducts) {
      console.log(`\n🔍 检查已知产品: ${productId}`);
      
      const product = await Product.findOne({ productId });
      const images = await Image.find({ productId });
      
      if (product && product.images) {
        console.log('Product表图片字段:');
        Object.entries(product.images).forEach(([type, value]) => {
          if (value) {
            const isToken = !value.startsWith('http') && value.length > 20;
            console.log(`  - ${type}: ${isToken ? '🔑 令牌' : '🌐 URL'} ${value.substring(0, 30)}...`);
          }
        });
      }
      
      if (images.length > 0) {
        console.log('Image表记录:');
        images.forEach(img => {
          console.log(`  - ${img.type}: 🔑 ${img.metadata?.feishuFileToken?.substring(0, 30)}... -> 🌐 URL`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkTokenMatching();
