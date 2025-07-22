#!/usr/bin/env node

/**
 * 清理所有产品数据脚本
 * 
 * 此脚本将删除数据库中的所有产品数据，为重新导入做准备
 * 使用前请确保已备份重要数据
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 导入模型
const { Product } = require('../dist/models/Product');
const { Image } = require('../dist/models/Image');
const { SyncLog } = require('../dist/models/SyncLog');

async function clearAllData() {
  try {
    console.log('🚀 开始清理数据库...');
    
    // 连接数据库
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/products-db';
    await mongoose.connect(mongoUri, {
      retryWrites: false,
      w: 1,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ 数据库连接成功');
    
    // 获取清理前的统计信息
    const beforeStats = {
      products: await Product.countDocuments(),
      images: await Image.countDocuments(),
      syncLogs: await SyncLog.countDocuments()
    };
    
    console.log('\n📊 清理前统计:');
    console.log(`- 产品数量: ${beforeStats.products}`);
    console.log(`- 图片数量: ${beforeStats.images}`);
    console.log(`- 同步日志数量: ${beforeStats.syncLogs}`);
    
    // 确认清理操作
    if (process.argv.includes('--confirm')) {
      console.log('\n🗑️  开始清理数据...');
      
      // 1. 清理产品数据
      console.log('正在清理产品数据...');
      const productResult = await Product.deleteMany({});
      console.log(`✅ 已删除 ${productResult.deletedCount} 个产品记录`);
      
      // 2. 清理图片数据
      console.log('正在清理图片数据...');
      const imageResult = await Image.deleteMany({});
      console.log(`✅ 已删除 ${imageResult.deletedCount} 个图片记录`);
      
      // 3. 清理同步日志（可选，保留最近的日志）
      console.log('正在清理旧的同步日志...');
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const syncLogResult = await SyncLog.deleteMany({
        startTime: { $lt: oneWeekAgo }
      });
      console.log(`✅ 已删除 ${syncLogResult.deletedCount} 个旧同步日志`);
      
      // 获取清理后的统计信息
      const afterStats = {
        products: await Product.countDocuments(),
        images: await Image.countDocuments(),
        syncLogs: await SyncLog.countDocuments()
      };
      
      console.log('\n📊 清理后统计:');
      console.log(`- 产品数量: ${afterStats.products}`);
      console.log(`- 图片数量: ${afterStats.images}`);
      console.log(`- 同步日志数量: ${afterStats.syncLogs}`);
      
      console.log('\n✅ 数据清理完成！');
      console.log('现在可以重新执行数据同步来导入完整的数据。');
      
    } else {
      console.log('\n⚠️  这是一个危险操作，将删除所有产品数据！');
      console.log('如果确认要执行清理，请使用以下命令:');
      console.log('node scripts/clear-all-data.js --confirm');
      console.log('\n建议在执行前备份数据库！');
    }
    
  } catch (error) {
    console.error('❌ 清理数据失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
}

// 执行清理
clearAllData();
