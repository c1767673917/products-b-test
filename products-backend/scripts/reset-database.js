const mongoose = require('mongoose');
require('dotenv').config();

async function resetDatabase() {
  try {
    console.log('🔄 开始重置数据库...');
    
    // 连接MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功');
    
    const db = mongoose.connection.db;
    
    // 获取所有集合
    const collections = await db.listCollections().toArray();
    console.log(`📊 发现 ${collections.length} 个集合`);
    
    // 清空产品相关集合
    const collectionsToReset = ['products', 'newproducts', 'images', 'sync_logs'];
    
    for (const collectionName of collectionsToReset) {
      const collectionExists = collections.some(col => col.name === collectionName);
      
      if (collectionExists) {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        
        if (count > 0) {
          await collection.deleteMany({});
          console.log(`🗑️  已清空集合 ${collectionName} (删除了 ${count} 个文档)`);
        } else {
          console.log(`ℹ️  集合 ${collectionName} 已经为空`);
        }
      } else {
        console.log(`ℹ️  集合 ${collectionName} 不存在`);
      }
    }
    
    // 保留最近的同步日志（可选）
    const syncLogsCollection = db.collection('sync_logs');
    const recentLogs = await syncLogsCollection.find({})
      .sort({ startTime: -1 })
      .limit(5)
      .toArray();
    
    if (recentLogs.length > 0) {
      await syncLogsCollection.insertMany(recentLogs);
      console.log(`📝 保留了最近 ${recentLogs.length} 条同步日志`);
    }
    
    console.log('✅ 数据库重置完成');
    
    // 验证清理结果
    console.log('\n📊 清理后的数据统计:');
    for (const collectionName of collectionsToReset) {
      const collectionExists = collections.some(col => col.name === collectionName);
      if (collectionExists) {
        const count = await db.collection(collectionName).countDocuments();
        console.log(`  - ${collectionName}: ${count} 个文档`);
      }
    }
    
  } catch (error) {
    console.error('❌ 数据库重置失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB连接已关闭');
  }
}

// 确认重置操作
const args = process.argv.slice(2);
if (args.includes('--confirm')) {
  resetDatabase();
} else {
  console.log('⚠️  这将删除所有产品数据！');
  console.log('如果确认要重置数据库，请运行: node reset-database.js --confirm');
}
