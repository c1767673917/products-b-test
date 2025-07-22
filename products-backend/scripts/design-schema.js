#!/usr/bin/env node

/**
 * 数据库Schema设计和迁移脚本
 * 
 * 本脚本根据文档设计，创建新的数据库Schema:
 * 1. 重新设计Product模型，使用飞书记录ID作为主键
 * 2. 创建SyncLog集合用于同步日志记录
 * 3. 添加必要的索引和约束
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

// 新的Product Schema设计
const ProductSchema = new mongoose.Schema({
  // 主键：使用飞书记录ID
  productId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true,
    match: /^rec[a-zA-Z0-9]+$/ // 飞书记录ID格式验证
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
    },
    usd: {
      type: Number,
      min: 0,
      max: 999999.99
    },
    specialUsd: {
      type: Number,
      min: 0,
      max: 999999.99
    }
  },
  
  // 图片信息 (存储MinIO对象名)
  images: {
    front: { 
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /\.(jpg|jpeg|png|webp|gif)$/i.test(v);
        },
        message: '图片文件格式无效'
      }
    },
    back: { 
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /\.(jpg|jpeg|png|webp|gif)$/i.test(v);
        },
        message: '图片文件格式无效'
      }
    },
    label: { 
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /\.(jpg|jpeg|png|webp|gif)$/i.test(v);
        },
        message: '图片文件格式无效'
      }
    },
    package: { 
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /\.(jpg|jpeg|png|webp|gif)$/i.test(v);
        },
        message: '图片文件格式无效'
      }
    },
    gift: { 
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /\.(jpg|jpeg|png|webp|gif)$/i.test(v);
        },
        message: '图片文件格式无效'
      }
    }
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
  
  specification: { 
    type: String,
    trim: true
  },
  
  flavor: { 
    type: String,
    trim: true
  },
  
  manufacturer: { 
    type: String,
    trim: true
  },
  
  // 其他信息
  boxSpec: {
    type: String,
    trim: true
  },
  
  notes: {
    type: String,
    trim: true
  },
  
  gift: {
    type: String,
    trim: true
  },
  
  giftMechanism: {
    type: String,
    trim: true
  },
  
  client: {
    type: String,
    trim: true
  },
  
  barcode: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[0-9]{8,13}$/.test(v);
      },
      message: '条码格式无效'
    }
  },
  
  link: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'URL格式无效'
    }
  },
  
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
  version: {
    type: Number,
    default: 1
  },
  
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
  timestamps: true, // 自动添加 createdAt 和 updatedAt
  versionKey: false // 禁用 __v 版本字段
});

// 复合索引 - 移除重复的单字段索引
ProductSchema.index({ 'category.primary': 1, 'category.secondary': 1 }); // 分类复合索引
ProductSchema.index({ platform: 1, status: 1 }); // 平台和状态复合索引
ProductSchema.index({ collectTime: -1, syncTime: -1 }); // 时间复合索引
ProductSchema.index({ isVisible: 1, status: 1 }); // 可见性复合索引

// 同步日志Schema
const SyncLogSchema = new mongoose.Schema({
  // 日志ID
  logId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // 同步类型
  syncType: {
    type: String,
    enum: ['full', 'incremental', 'selective'],
    required: true,
    index: true
  },
  
  // 时间信息
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  
  endTime: {
    type: Date,
    index: true
  },
  
  // 状态
  status: {
    type: String,
    enum: ['running', 'completed', 'failed', 'cancelled', 'paused'],
    required: true,
    index: true
  },
  
  // 统计信息
  stats: {
    totalRecords: { type: Number, default: 0 },
    createdRecords: { type: Number, default: 0 },
    updatedRecords: { type: Number, default: 0 },
    deletedRecords: { type: Number, default: 0 },
    processedImages: { type: Number, default: 0 },
    failedImages: { type: Number, default: 0 }
  },
  
  // 错误信息 - 使用不同的字段名避免保留字冲突
  errorLogs: [{
    type: { type: String, required: true },
    message: { type: String, required: true },
    productId: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  
  // 配置信息
  config: {
    feishuAppToken: { type: String, required: true },
    feishuTableId: { type: String, required: true },
    syncOptions: { type: mongoose.Schema.Types.Mixed }
  },
  
  // 进度信息
  progress: {
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    currentOperation: { type: String }
  }
}, {
  timestamps: true,
  versionKey: false
});

// 同步日志索引 - 移除重复的logId索引
SyncLogSchema.index({ syncType: 1, status: 1 });
SyncLogSchema.index({ startTime: -1 });
SyncLogSchema.index({ status: 1, startTime: -1 });

// 创建模型
const Product = mongoose.model('Product', ProductSchema);
const SyncLog = mongoose.model('SyncLog', SyncLogSchema);

// Schema验证函数
function validateSchemaDesign() {
  console.log('🔍 验证Schema设计...');
  
  // 验证Product Schema
  const productPaths = ProductSchema.paths;
  const requiredFields = [
    'productId', 'internalId', 'name', 'sequence', 
    'category.primary', 'category.secondary', 'price.normal',
    'origin.country', 'origin.province', 'platform', 'collectTime'
  ];
  
  const missingRequired = requiredFields.filter(field => {
    const path = productPaths[field];
    return !path || !path.isRequired;
  });
  
  if (missingRequired.length > 0) {
    console.warn('⚠️ 缺少必填字段:', missingRequired);
  } else {
    console.log('✅ Product Schema 必填字段验证通过');
  }
  
  // 验证索引设计
  const indexes = ProductSchema.indexes();
  console.log(`📊 Product Schema 索引数量: ${indexes.length}`);
  
  // 验证SyncLog Schema
  const syncLogPaths = SyncLogSchema.paths;
  const syncLogRequiredFields = ['logId', 'syncType', 'startTime', 'status'];
  
  const missingSyncLogRequired = syncLogRequiredFields.filter(field => {
    const path = syncLogPaths[field];
    return !path || !path.isRequired;
  });
  
  if (missingSyncLogRequired.length > 0) {
    console.warn('⚠️ SyncLog缺少必填字段:', missingSyncLogRequired);
  } else {
    console.log('✅ SyncLog Schema 必填字段验证通过');
  }
  
  console.log('✅ Schema设计验证完成');
}

// 创建集合和索引
async function createCollectionsAndIndexes() {
  try {
    console.log('🏗️ 创建集合和索引...');
    
    // 创建Product集合
    console.log('📦 创建Product集合...');
    await Product.createCollection();
    console.log('✅ Product集合创建成功');
    
    // 创建SyncLog集合
    console.log('📦 创建SyncLog集合...');
    await SyncLog.createCollection();
    console.log('✅ SyncLog集合创建成功');
    
    // 确保索引存在
    console.log('🔍 创建索引...');
    await Product.createIndexes();
    await SyncLog.createIndexes();
    console.log('✅ 索引创建成功');
    
    return true;
  } catch (error) {
    console.error('❌ 创建集合和索引失败:', error);
    return false;
  }
}

// 生成Schema文档
function generateSchemaDocumentation() {
  const doc = {
    createdAt: new Date().toISOString(),
    version: '1.0',
    description: '数据同步重构后的数据库Schema设计',
    schemas: {
      Product: {
        collectionName: 'products',
        description: '产品信息集合',
        fields: {},
        indexes: ProductSchema.indexes().map(idx => ({
          fields: idx[0],
          options: idx[1]
        }))
      },
      SyncLog: {
        collectionName: 'synclogs',
        description: '同步日志集合',
        fields: {},
        indexes: SyncLogSchema.indexes().map(idx => ({
          fields: idx[0],
          options: idx[1]
        }))
      }
    }
  };
  
  // 提取字段信息
  for (const [path, schemaType] of Object.entries(ProductSchema.paths)) {
    doc.schemas.Product.fields[path] = {
      type: schemaType.instance,
      required: schemaType.isRequired,
      index: schemaType._index || false,
      unique: schemaType.options.unique || false,
      enum: schemaType.options.enum || undefined,
      min: schemaType.options.min,
      max: schemaType.options.max,
      default: schemaType.options.default
    };
  }
  
  for (const [path, schemaType] of Object.entries(SyncLogSchema.paths)) {
    doc.schemas.SyncLog.fields[path] = {
      type: schemaType.instance,
      required: schemaType.isRequired,
      index: schemaType._index || false,
      unique: schemaType.options.unique || false,
      enum: schemaType.options.enum || undefined,
      default: schemaType.options.default
    };
  }
  
  return doc;
}

// 主函数
async function main() {
  console.log('========================================');
  console.log('  数据库Schema设计工具');
  console.log('========================================');
  
  // 连接数据库
  const connected = await connectDatabase();
  if (!connected) {
    process.exit(1);
  }
  
  try {
    // 验证Schema设计
    validateSchemaDesign();
    
    // 创建集合和索引
    const created = await createCollectionsAndIndexes();
    if (!created) {
      process.exit(1);
    }
    
    // 生成Schema文档
    const documentation = generateSchemaDocumentation();
    const fs = require('fs');
    const path = require('path');
    
    const docsDir = path.join(__dirname, '../docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    const docPath = path.join(docsDir, 'database-schema.json');
    fs.writeFileSync(docPath, JSON.stringify(documentation, null, 2));
    console.log(`📋 Schema文档已保存: ${docPath}`);
    
    console.log('========================================');
    console.log('✅ 数据库Schema设计完成!');
    console.log('========================================');
    
  } catch (error) {
    console.error('❌ Schema设计失败:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 数据库连接已关闭');
  }
  
  process.exit(0);
}

// 导出模块
module.exports = {
  ProductSchema,
  SyncLogSchema,
  Product,
  SyncLog,
  validateSchemaDesign,
  createCollectionsAndIndexes
};

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}