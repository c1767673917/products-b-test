require('dotenv').config();
const mongoose = require('mongoose');
const { getFeishuApiService } = require('./dist/services/feishuApiService');
const { dataTransformService } = require('./dist/services/dataTransformService');
const { Product } = require('./dist/models');

async function syncNewFields() {
  try {
    console.log('🚀 开始同步新字段数据...');
    
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    // 获取飞书数据
    const feishuService = getFeishuApiService();
    console.log('📡 获取飞书数据...');
    const allRecords = await feishuService.getAllRecords();
    console.log(`📊 获取到 ${allRecords.length} 条记录`);
    
    // 批量转换数据
    console.log('🔄 转换数据...');
    const transformResult = dataTransformService.batchTransformFeishuRecords(allRecords);
    console.log(`✅ 转换完成: ${transformResult.successful.length} 成功, ${transformResult.failed.length} 失败`);
    
    if (transformResult.failed.length > 0) {
      console.log('⚠️ 转换失败的记录:', transformResult.failed.slice(0, 5));
    }
    
    // 更新数据库
    console.log('💾 更新数据库...');
    let updatedCount = 0;
    let createdCount = 0;
    let errorCount = 0;
    const errorDetails = [];

    for (const productData of transformResult.successful) {
      try {
        const result = await Product.findOneAndUpdate(
          { productId: productData.productId },
          productData,
          {
            upsert: true,
            new: true,
            runValidators: true
          }
        );

        if (result.isNew) {
          createdCount++;
        } else {
          updatedCount++;
        }

        if ((updatedCount + createdCount) % 100 === 0) {
          console.log(`📈 进度: ${updatedCount + createdCount}/${transformResult.successful.length}`);
        }

      } catch (error) {
        errorCount++;
        errorDetails.push({
          productId: productData.productId,
          error: error.message
        });
        console.error(`❌ 更新产品 ${productData.productId} 失败:`, error.message);
      }
    }

    // 显示错误详情
    if (errorDetails.length > 0) {
      console.log('\n❌ 详细错误信息:');
      errorDetails.slice(0, 10).forEach((err, index) => {
        console.log(`${index + 1}. ${err.productId}: ${err.error}`);
      });
      if (errorDetails.length > 10) {
        console.log(`... 还有 ${errorDetails.length - 10} 个错误`);
      }
    }
    
    console.log('✅ 数据库更新完成!');
    console.log(`📊 统计: 创建 ${createdCount}, 更新 ${updatedCount}, 错误 ${errorCount}`);
    
    // 验证新字段
    console.log('🔍 验证新字段数据...');
    
    const sampleProducts = await Product.find({}).limit(5).lean();
    
    console.log('\n📋 新字段验证结果:');
    sampleProducts.forEach((product, index) => {
      console.log(`\n样本 ${index + 1} (${product.productId}):`);
      console.log(`  - 产品品名(computed): ${product.name?.computed || '无'}`);
      console.log(`  - 产品类型: ${product.productType || '无'}`);
      console.log(`  - 美元正常价: ${product.price?.usd?.normal || '无'}`);
      console.log(`  - 美元优惠价: ${product.price?.usd?.discount || '无'}`);
      console.log(`  - 序号结构: ${JSON.stringify(product.sequence) || '无'}`);
    });
    
    // 统计新字段覆盖率
    const totalProducts = await Product.countDocuments({});
    const withComputed = await Product.countDocuments({ 'name.computed': { $exists: true, $ne: null } });
    const withProductType = await Product.countDocuments({ 'productType': { $exists: true, $ne: null } });
    const withUsdPrice = await Product.countDocuments({ 'price.usd.normal': { $exists: true, $ne: null } });
    
    console.log('\n📈 新字段覆盖率统计:');
    console.log(`  - 总产品数: ${totalProducts}`);
    console.log(`  - 有产品品名(computed): ${withComputed} (${(withComputed/totalProducts*100).toFixed(1)}%)`);
    console.log(`  - 有产品类型: ${withProductType} (${(withProductType/totalProducts*100).toFixed(1)}%)`);
    console.log(`  - 有美元价格: ${withUsdPrice} (${(withUsdPrice/totalProducts*100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error('❌ 同步失败:', error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

syncNewFields();
