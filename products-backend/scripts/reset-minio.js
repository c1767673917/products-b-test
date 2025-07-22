const Minio = require('minio');
require('dotenv').config();

async function resetMinIO() {
  try {
    console.log('🔄 开始清理MinIO存储...');
    
    // 创建MinIO客户端
    const minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT) || 9000,
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    });
    
    const bucketName = process.env.MINIO_BUCKET || 'product-images';
    
    // 检查bucket是否存在
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      console.log(`ℹ️  Bucket ${bucketName} 不存在，无需清理`);
      return;
    }
    
    console.log(`✅ 连接到MinIO，准备清理bucket: ${bucketName}`);
    
    // 列出所有对象
    const objectsList = [];
    const objectsStream = minioClient.listObjects(bucketName, '', true);
    
    for await (const obj of objectsStream) {
      objectsList.push(obj.name);
    }
    
    console.log(`📊 发现 ${objectsList.length} 个对象需要删除`);
    
    if (objectsList.length === 0) {
      console.log('ℹ️  Bucket已经为空，无需清理');
      return;
    }
    
    // 批量删除对象
    const batchSize = 100;
    let deletedCount = 0;
    
    for (let i = 0; i < objectsList.length; i += batchSize) {
      const batch = objectsList.slice(i, i + batchSize);
      
      try {
        await minioClient.removeObjects(bucketName, batch);
        deletedCount += batch.length;
        console.log(`🗑️  已删除 ${deletedCount}/${objectsList.length} 个对象`);
      } catch (error) {
        console.error(`❌ 删除批次失败:`, error.message);
        // 尝试单个删除
        for (const objectName of batch) {
          try {
            await minioClient.removeObject(bucketName, objectName);
            deletedCount++;
          } catch (singleError) {
            console.error(`❌ 删除对象 ${objectName} 失败:`, singleError.message);
          }
        }
      }
    }
    
    console.log(`✅ MinIO清理完成，共删除 ${deletedCount} 个对象`);
    
    // 验证清理结果
    const remainingObjects = [];
    const verifyStream = minioClient.listObjects(bucketName, '', true);
    
    for await (const obj of verifyStream) {
      remainingObjects.push(obj.name);
    }
    
    console.log(`📊 清理后剩余对象数量: ${remainingObjects.length}`);
    
    if (remainingObjects.length > 0) {
      console.log('⚠️  以下对象未能删除:');
      remainingObjects.forEach(name => console.log(`  - ${name}`));
    }
    
  } catch (error) {
    console.error('❌ MinIO清理失败:', error);
    process.exit(1);
  }
}

// 确认重置操作
const args = process.argv.slice(2);
if (args.includes('--confirm')) {
  resetMinIO();
} else {
  console.log('⚠️  这将删除所有图片文件！');
  console.log('如果确认要清理MinIO，请运行: node reset-minio.js --confirm');
}
