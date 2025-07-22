#!/usr/bin/env node

/**
 * 安全的数据库Schema迁移脚本
 * 检查现有集合和索引，避免冲突
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    return false;
  }
}

// 检查集合是否存在
async function collectionExists(collectionName) {
  try {
    const collections = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();
    return collections.length > 0;
  } catch (error) {
    console.error(`检查集合 ${collectionName} 失败:`, error);
    return false;
  }
}

// 检查索引是否存在
async function indexExists(collectionName, indexName) {
  try {
    const collection = mongoose.connection.db.collection(collectionName);
    const indexes = await collection.indexes();
    return indexes.some(index => index.name === indexName);
  } catch (error) {
    console.error(`检查索引 ${indexName} 失败:`, error);
    return false;
  }
}

// 安全创建索引
async function safeCreateIndex(collection, indexSpec, options = {}) {
  try {
    const indexName = options.name || Object.keys(indexSpec).map(key => `${key}_1`).join('_');
    
    if (await indexExists(collection.collectionName, indexName)) {
      console.log(`⚠️ 索引 ${indexName} 已存在，跳过创建`);
      return true;
    }
    
    await collection.createIndex(indexSpec, options);
    console.log(`✅ 索引 ${indexName} 创建成功`);
    return true;
  } catch (error) {
    if (error.code === 86) { // IndexKeySpecsConflict
      console.log(`⚠️ 索引已存在但规格不同，跳过: ${error.message}`);
      return true;
    }
    console.error(`❌ 创建索引失败:`, error);
    return false;
  }
}

// 创建新的Schema文件
function generateSchemaFiles() {
  console.log('📝 生成Schema定义文件...');
  
  const fs = require('fs');
  const path = require('path');
  
  // 创建models目录
  const modelsDir = path.join(__dirname, '../src/models');
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }
  
  // Product模型
  const productModelCode = `
import mongoose from 'mongoose';

// Product Schema - 优化后的产品数据模型
const ProductSchema = new mongoose.Schema({
  // 主键：使用飞书记录ID
  productId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true,
    match: /^rec[a-zA-Z0-9]+$/,
    trim: true
  },
  
  // 辅助标识字段
  internalId: { 
    type: String, 
    required: true,
    index: true,
    trim: true
  },
  
  // 基本信息
  name: { 
    type: String, 
    required: true, 
    index: true,
    maxLength: 200,
    trim: true
  },
  
  sequence: { 
    type: String, 
    required: true,
    trim: true
  },
  
  // 分类信息
  category: {
    primary: { 
      type: String, 
      required: true,
      index: true,
      trim: true
    },
    secondary: { 
      type: String, 
      required: true,
      index: true,
      trim: true
    }
  },
  
  // 价格信息
  price: {
    normal: { 
      type: Number, 
      required: true,
      min: 0,
      max: 999999.99
    },
    discount: { 
      type: Number, 
      default: 0,
      min: 0,
      max: 999999.99
    },
    discountRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    currency: {
      type: String,
      default: 'CNY',
      enum: ['CNY', 'USD', 'EUR']
    }
  },
  
  // 图片信息
  images: {
    front: { type: String, trim: true },
    back: { type: String, trim: true },
    label: { type: String, trim: true },
    package: { type: String, trim: true },
    gift: { type: String, trim: true }
  },
  
  // 产地信息
  origin: {
    country: { 
      type: String, 
      required: true,
      default: '中国',
      trim: true
    },
    province: { 
      type: String, 
      required: true,
      index: true,
      trim: true
    },
    city: { 
      type: String,
      index: true,
      trim: true
    }
  },
  
  // 产品属性
  platform: { 
    type: String, 
    required: true,
    index: true,
    trim: true
  },
  
  specification: { type: String, trim: true },
  flavor: { type: String, trim: true },
  manufacturer: { type: String, trim: true },
  
  // 其他信息
  boxSpec: { type: String, trim: true },
  notes: { type: String, trim: true },
  gift: { type: String, trim: true },
  giftMechanism: { type: String, trim: true },
  client: { type: String, trim: true },
  barcode: { type: String, trim: true },
  link: { type: String, trim: true },
  
  // 时间信息
  collectTime: { 
    type: Date, 
    required: true,
    index: true
  },
  
  syncTime: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  
  // 元数据
  version: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['active', 'inactive', 'deleted'],
    default: 'active',
    index: true
  },
  isVisible: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// 复合索引
ProductSchema.index({ 'category.primary': 1, 'category.secondary': 1 });
ProductSchema.index({ platform: 1, status: 1 });
ProductSchema.index({ collectTime: -1, syncTime: -1 });
ProductSchema.index({ isVisible: 1, status: 1 });

export const Product = mongoose.model('Product', ProductSchema);
export default Product;
`;

  // SyncLog模型
  const syncLogModelCode = `
import mongoose from 'mongoose';

// SyncLog Schema - 同步日志模型
const SyncLogSchema = new mongoose.Schema({
  logId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  syncType: {
    type: String,
    enum: ['full', 'incremental', 'selective'],
    required: true,
    index: true
  },
  
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  
  endTime: {
    type: Date,
    index: true
  },
  
  status: {
    type: String,
    enum: ['running', 'completed', 'failed', 'cancelled', 'paused'],
    required: true,
    index: true
  },
  
  stats: {
    totalRecords: { type: Number, default: 0 },
    createdRecords: { type: Number, default: 0 },
    updatedRecords: { type: Number, default: 0 },
    deletedRecords: { type: Number, default: 0 },
    processedImages: { type: Number, default: 0 },
    failedImages: { type: Number, default: 0 }
  },
  
  errorLogs: [{
    type: { type: String, required: true },
    message: { type: String, required: true },
    productId: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  
  config: {
    feishuAppToken: { type: String, required: true },
    feishuTableId: { type: String, required: true },
    syncOptions: { type: mongoose.Schema.Types.Mixed }
  },
  
  progress: {
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    currentOperation: { type: String }
  }
}, {
  timestamps: true,
  versionKey: false
});

// 索引
SyncLogSchema.index({ syncType: 1, status: 1 });
SyncLogSchema.index({ startTime: -1 });
SyncLogSchema.index({ status: 1, startTime: -1 });

export const SyncLog = mongoose.model('SyncLog', SyncLogSchema);
export default SyncLog;
`;

  // 写入文件
  fs.writeFileSync(path.join(modelsDir, 'Product.ts'), productModelCode.trim());
  fs.writeFileSync(path.join(modelsDir, 'SyncLog.ts'), syncLogModelCode.trim());
  
  console.log('✅ Schema文件生成完成:');
  console.log(`  - ${path.join(modelsDir, 'Product.ts')}`);
  console.log(`  - ${path.join(modelsDir, 'SyncLog.ts')}`);
}

// 创建必要的索引
async function createRequiredIndexes() {
  console.log('🔍 创建必要索引...');
  
  try {
    const db = mongoose.connection.db;
    
    // 为products集合创建索引
    if (await collectionExists('products')) {
      const productsCollection = db.collection('products');
      
      // 检查并创建关键索引
      const requiredIndexes = [
        { 'category.primary': 1, 'category.secondary': 1 },
        { platform: 1, status: 1 },
        { collectTime: -1, syncTime: -1 },
        { isVisible: 1, status: 1 }
      ];
      
      for (const indexSpec of requiredIndexes) {
        await safeCreateIndex(productsCollection, indexSpec);
      }
    }
    
    // 为synclogs集合创建索引
    if (!await collectionExists('synclogs')) {
      // 创建集合
      await db.createCollection('synclogs');
      console.log('📦 SyncLogs集合创建成功');
    }
    
    const syncLogsCollection = db.collection('synclogs');
    const syncLogIndexes = [
      { syncType: 1, status: 1 },
      { startTime: -1 },
      { status: 1, startTime: -1 }
    ];
    
    for (const indexSpec of syncLogIndexes) {
      await safeCreateIndex(syncLogsCollection, indexSpec);
    }
    
    return true;
  } catch (error) {
    console.error('❌ 创建索引失败:', error);
    return false;
  }
}

// 生成迁移报告
function generateMigrationReport() {
  const report = {
    timestamp: new Date().toISOString(),
    migration: 'phase-1-infrastructure',
    version: '1.0',
    description: '第一阶段基础设施准备 - Schema设计',
    changes: [
      {
        type: 'schema_design',
        description: '设计新的Product Schema，使用飞书记录ID作为主键',
        collection: 'products',
        impact: 'low' // 不改变现有数据，只是设计新的结构
      },
      {
        type: 'schema_design', 
        description: '设计SyncLog Schema用于同步日志记录',
        collection: 'synclogs',
        impact: 'none' // 新集合，无影响
      },
      {
        type: 'index_creation',
        description: '创建复合索引以提高查询性能',
        collections: ['products', 'synclogs'],
        impact: 'positive' // 提高性能
      },
      {
        type: 'model_files',
        description: '生成TypeScript模型定义文件',
        files: ['src/models/Product.ts', 'src/models/SyncLog.ts'],
        impact: 'none'
      }
    ],
    status: 'pending'
  };
  
  return report;
}

// 主函数
async function main() {
  console.log('========================================');
  console.log('  数据库Schema安全迁移工具');
  console.log('========================================');
  
  const connected = await connectDatabase();
  if (!connected) {
    process.exit(1);
  }
  
  try {
    const report = generateMigrationReport();
    
    // 生成Schema文件
    generateSchemaFiles();
    
    // 创建必要的索引
    const indexesCreated = await createRequiredIndexes();
    if (!indexesCreated) {
      report.status = 'failed';
      console.error('❌ 索引创建失败');
    } else {
      report.status = 'completed';
    }
    
    // 保存迁移报告
    const fs = require('fs');
    const path = require('path');
    const reportsDir = path.join(__dirname, '../migration-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportPath = path.join(reportsDir, `migration-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📋 迁移报告已保存: ${reportPath}`);
    
    console.log('========================================');
    if (report.status === 'completed') {
      console.log('✅ 数据库Schema设计和迁移完成!');
      console.log('📂 生成的文件:');
      console.log('  - src/models/Product.ts (产品模型)');
      console.log('  - src/models/SyncLog.ts (同步日志模型)');
      console.log('📊 创建的索引:');
      console.log('  - products集合复合索引');
      console.log('  - synclogs集合查询索引');
    } else {
      console.log('❌ 迁移未完全成功，请检查错误信息');
    }
    console.log('========================================');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
  
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  connectDatabase,
  collectionExists,
  indexExists,
  safeCreateIndex,
  generateSchemaFiles,
  createRequiredIndexes
};