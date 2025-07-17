"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const minio_1 = require("minio");
const dotenv_1 = require("dotenv");
// Load environment variables
(0, dotenv_1.config)();
async function testMongoDB() {
    try {
        await mongoose_1.default.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB 连接成功');
        // 测试基本操作
        const db = mongoose_1.default.connection.db;
        if (db) {
            const collections = await db.listCollections().toArray();
            console.log(`📊 现有集合数量: ${collections.length}`);
        }
        await mongoose_1.default.disconnect();
    }
    catch (error) {
        console.error('❌ MongoDB 连接失败:', error);
    }
}
async function testMinIO() {
    try {
        const minioClient = new minio_1.Client({
            endPoint: process.env.MINIO_ENDPOINT,
            port: parseInt(process.env.MINIO_PORT),
            useSSL: false,
            accessKey: process.env.MINIO_ACCESS_KEY,
            secretKey: process.env.MINIO_SECRET_KEY
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
        }
        else {
            console.log('📦 product-images 存储桶已存在');
        }
    }
    catch (error) {
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
//# sourceMappingURL=test-connections.js.map