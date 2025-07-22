const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabase() {
  try {
    console.log('🔍 检查数据库状态...');
    
    // 连接MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功');
    
    const db = mongoose.connection.db;
    
    // 检查各个集合的数据量
    const collections = ['products', 'newproducts', 'images', 'sync_logs'];
    
    console.log('\n📊 数据库统计:');
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        console.log(`  - ${collectionName}: ${count} 个文档`);
        
        if (count > 0 && collectionName === 'products') {
          // 显示前几个产品示例
          const samples = await collection.find({}).limit(3).toArray();
          console.log('    示例产品:');
          samples.forEach((product, index) => {
            console.log(`      ${index + 1}. ${product.name || product.productId} (ID: ${product.productId || product._id})`);
          });
        }
        
        if (count > 0 && collectionName === 'sync_logs') {
          // 显示最近的同步日志
          const recentLog = await collection.findOne({}, { sort: { startTime: -1 } });
          if (recentLog) {
            console.log(`    最近同步: ${recentLog.status} (${recentLog.startTime})`);
            console.log(`    统计: 总记录${recentLog.stats?.totalRecords || 0}, 创建${recentLog.stats?.createdRecords || 0}, 更新${recentLog.stats?.updatedRecords || 0}`);
          }
        }
      } catch (error) {
        console.log(`  - ${collectionName}: 集合不存在或查询失败`);
      }
    }
    
    // 检查产品数据的完整性
    console.log('\n🔍 数据完整性检查:');
    try {
      const productsCollection = db.collection('products');
      const totalProducts = await productsCollection.countDocuments();
      
      if (totalProducts > 0) {
        const withImages = await productsCollection.countDocuments({
          $or: [
            { 'images.front': { $exists: true, $ne: null } },
            { 'images.back': { $exists: true, $ne: null } },
            { 'images.label': { $exists: true, $ne: null } },
            { 'images.package': { $exists: true, $ne: null } },
            { 'images.gift': { $exists: true, $ne: null } }
          ]
        });
        
        const withName = await productsCollection.countDocuments({
          name: { $exists: true, $ne: null, $ne: '' }
        });
        
        const withCategory = await productsCollection.countDocuments({
          'category.primary': { $exists: true, $ne: null, $ne: '' }
        });
        
        console.log(`  - 总产品数: ${totalProducts}`);
        console.log(`  - 有图片的产品: ${withImages} (${(withImages/totalProducts*100).toFixed(1)}%)`);
        console.log(`  - 有名称的产品: ${withName} (${(withName/totalProducts*100).toFixed(1)}%)`);
        console.log(`  - 有分类的产品: ${withCategory} (${(withCategory/totalProducts*100).toFixed(1)}%)`);
      } else {
        console.log('  ⚠️  没有找到产品数据');
      }
    } catch (error) {
      console.log('  ❌ 数据完整性检查失败:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 数据库检查失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB连接已关闭');
  }
}

checkDatabase();
