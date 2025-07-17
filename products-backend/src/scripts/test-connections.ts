import mongoose from 'mongoose';
import { Client as MinioClient } from 'minio';
import { config } from 'dotenv';

// Load environment variables
config();

async function testMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ MongoDB 连接成功');
    
    // 测试基本操作
    const db = mongoose.connection.db;
    if (db) {
      const collections = await db.listCollections().toArray();
      console.log(`📊 现有集合数量: ${collections.length}`);
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error);
  }
}

async function testMinIO() {
  try {
    const minioClient = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT!,
      port: parseInt(process.env.MINIO_PORT!),
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY!,
      secretKey: process.env.MINIO_SECRET_KEY!
    });
    
    // 测试连接
    const buckets = await minioClient.listBuckets();
    console.log('✅ MinIO 连接成功');
    console.log(`🪣 现有存储桶: ${buckets.map(b => b.name).join(', ')}`);
    
    // 检查产品图片桶
    const bucketExists = await minioClient.bucketExists('product-images');
    if (!bucketExists) {
      await minioClient.makeBucket('product-images');
      console.log('📦 创建 product-images 存储桶');
    } else {
      console.log('📦 product-images 存储桶已存在');
    }
  } catch (error) {
    console.error('❌ MinIO 连接失败:', error);
  }
}

async function main() {
  console.log('🔍 开始连接测试...\n');
  await testMongoDB();
  console.log('');
  await testMinIO();
  console.log('\n✨ 连接测试完成');
}

main();