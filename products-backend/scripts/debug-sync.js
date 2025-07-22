const mongoose = require('mongoose');
require('dotenv').config();

// 导入必要的服务
const { getFeishuApiService } = require('../dist/services/feishuApiService');
const { dataTransformService } = require('../dist/services/dataTransformService');

// 导入Product模型
const { Product } = require('../dist/models/Product');

async function debugSync() {
  try {
    console.log('🔍 开始调试同步过程...');
    
    // 连接MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功');
    
    // 测试飞书API连接
    console.log('\n📡 测试飞书API连接...');
    const feishuService = getFeishuApiService();
    
    try {
      const token = await feishuService.getAccessToken();
      console.log('✅ 飞书API连接成功，Token获取成功');
    } catch (error) {
      console.error('❌ 飞书API连接失败:', error.message);
      return;
    }
    
    // 获取少量飞书数据进行测试
    console.log('\n📊 获取飞书数据样本...');
    try {
      const records = await feishuService.getAllRecords();
      console.log(`✅ 成功获取 ${records.length} 条飞书记录`);
      
      if (records.length === 0) {
        console.log('⚠️  没有获取到任何记录');
        return;
      }
      
      // 显示第一条记录的结构
      console.log('\n📋 第一条记录结构:');
      const firstRecord = records[0];
      console.log('Record ID:', firstRecord.record_id);
      console.log('Fields keys:', Object.keys(firstRecord.fields || {}));
      
      // 测试数据转换
      console.log('\n🔄 测试数据转换...');
      const transformResult = dataTransformService.transformFeishuRecord(firstRecord);
      
      if (transformResult.success) {
        console.log('✅ 数据转换成功');
        console.log('转换后的产品数据:');
        console.log('- productId:', transformResult.data.productId);
        console.log('- name:', transformResult.data.name);
        console.log('- category:', transformResult.data.category);
        console.log('- price:', transformResult.data.price);
        console.log('- platform:', transformResult.data.platform);
        
        // 测试数据库保存
        console.log('\n💾 测试数据库保存...');
        try {
          // 检查是否已存在
          const existing = await Product.findOne({ productId: transformResult.data.productId });
          if (existing) {
            console.log('⚠️  产品已存在，尝试更新...');
            await Product.findOneAndUpdate(
              { productId: transformResult.data.productId },
              { ...transformResult.data, updatedAt: new Date() },
              { new: true }
            );
            console.log('✅ 产品更新成功');
          } else {
            console.log('📝 创建新产品...');
            const newProduct = await Product.create(transformResult.data);
            console.log('✅ 产品创建成功，ID:', newProduct.productId);
          }
          
          // 验证保存结果
          const savedProduct = await Product.findOne({ productId: transformResult.data.productId });
          if (savedProduct) {
            console.log('✅ 数据库验证成功，产品已保存');
          } else {
            console.log('❌ 数据库验证失败，产品未找到');
          }
          
        } catch (saveError) {
          console.error('❌ 数据库保存失败:', saveError.message);
          console.error('错误详情:', saveError);
        }
        
      } else {
        console.log('❌ 数据转换失败');
        console.log('错误信息:', transformResult.errors);
      }
      
    } catch (error) {
      console.error('❌ 获取飞书数据失败:', error.message);
    }
    
    // 检查最终数据库状态
    console.log('\n📊 检查数据库状态...');
    const totalProducts = await Product.countDocuments();
    console.log(`数据库中共有 ${totalProducts} 个产品`);
    
    if (totalProducts > 0) {
      const sampleProduct = await Product.findOne().lean();
      console.log('示例产品:', {
        productId: sampleProduct.productId,
        name: sampleProduct.name,
        category: sampleProduct.category
      });
    }
    
  } catch (error) {
    console.error('❌ 调试过程失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB连接已关闭');
  }
}

debugSync();
