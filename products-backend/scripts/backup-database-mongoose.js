#!/usr/bin/env node

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 配置
const MONGODB_URI = process.env.MONGODB_URI;
const BACKUP_DIR = path.join(__dirname, '../backups');
const DATE_STAMP = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

async function connectToDatabase() {
  try {
    console.log('🔌 连接到数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    throw error;
  }
}

async function exportCollection(collectionName, outputPath) {
  try {
    console.log(`📦 导出集合: ${collectionName}`);
    
    const db = mongoose.connection.db;
    const collection = db.collection(collectionName);
    
    // 导出所有文档
    const documents = await collection.find({}).toArray();
    console.log(`📊 集合 ${collectionName}: ${documents.length} 条文档`);
    
    // 保存为 JSON 文件
    const filePath = path.join(outputPath, `${collectionName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));
    
    const fileStats = fs.statSync(filePath);
    console.log(`✅ 集合 ${collectionName} 导出完成: ${documents.length} 条文档, ${fileStats.size} 字节`);
    
    return {
      collection: collectionName,
      documentCount: documents.length,
      filePath: filePath,
      fileSize: fileStats.size
    };
    
  } catch (error) {
    console.error(`❌ 导出集合 ${collectionName} 失败:`, error);
    throw error;
  }
}

async function createBackup() {
  try {
    console.log('🚀 开始数据库备份...');
    
    // 确保备份目录存在
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log(`📁 创建备份目录: ${BACKUP_DIR}`);
    }
    
    const backupPath = path.join(BACKUP_DIR, `backup-${DATE_STAMP}`);
    fs.mkdirSync(backupPath, { recursive: true });
    
    console.log(`💾 备份位置: ${backupPath}`);
    
    // 连接到数据库
    await connectToDatabase();
    
    // 获取所有集合名称
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log(`📋 发现集合: ${collectionNames.join(', ')}`);
    
    // 导出每个集合
    const backupResults = [];
    for (const collectionName of collectionNames) {
      try {
        const result = await exportCollection(collectionName, backupPath);
        backupResults.push(result);
      } catch (error) {
        console.warn(`⚠️ 跳过集合 ${collectionName}:`, error.message);
        backupResults.push({
          collection: collectionName,
          error: error.message,
          status: 'failed'
        });
      }
    }
    
    // 导出数据库元数据 (简化版本，不使用db.stats())
    let totalDocuments = 0;
    const successfulBackups = backupResults.filter(r => !r.error);
    successfulBackups.forEach(backup => {
      totalDocuments += backup.documentCount || 0;
    });
    
    // 创建备份元数据
    const metadata = {
      timestamp: new Date().toISOString(),
      database: db.databaseName,
      backupPath: backupPath,
      collections: backupResults,
      databaseStats: {
        collectionCount: collectionNames.length,
        documentCount: totalDocuments,
        backupSize: successfulBackups.reduce((sum, r) => sum + (r.fileSize || 0), 0)
      },
      mongodbUri: MONGODB_URI.replace(/:[^:]*@/, ':****@'), // 隐藏密码
      version: '1.0',
      type: 'pre-schema-migration',
      method: 'mongoose-json-export'
    };
    
    const metadataPath = path.join(backupPath, 'backup-metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    console.log('✅ 数据库备份完成!');
    console.log(`📍 备份位置: ${backupPath}`);
    console.log(`📋 备份元数据: ${metadataPath}`);
    
    // 显示备份统计
    const successfulCollections = backupResults.filter(r => !r.error);
    const failedCollections = backupResults.filter(r => r.error);
    
    console.log(`📈 备份统计:`);
    console.log(`  - 成功: ${successfulCollections.length} 个集合`);
    console.log(`  - 失败: ${failedCollections.length} 个集合`);
    console.log(`  - 总文档数: ${successfulCollections.reduce((sum, r) => sum + (r.documentCount || 0), 0)}`);
    
    if (failedCollections.length > 0) {
      console.log('❌ 失败的集合:', failedCollections.map(r => r.collection).join(', '));
    }
    
    return {
      success: successfulCollections.length > 0,
      backupPath: backupPath,
      metadata: metadata,
      results: backupResults
    };
    
  } catch (error) {
    console.error('💥 备份过程出错:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    // 关闭数据库连接
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 备份验证函数
function verifyBackup(backupPath, metadata) {
  try {
    console.log('🔍 验证备份完整性...');
    
    // 检查备份目录是否存在
    if (!fs.existsSync(backupPath)) {
      throw new Error(`备份目录不存在: ${backupPath}`);
    }
    
    // 验证每个成功备份的集合文件
    const successfulBackups = metadata.collections.filter(c => !c.error);
    
    for (const backup of successfulBackups) {
      if (!fs.existsSync(backup.filePath)) {
        console.warn(`⚠️ 警告: 备份文件不存在 ${backup.filePath}`);
        continue;
      }
      
      const fileStats = fs.statSync(backup.filePath);
      console.log(`✓ 集合 ${backup.collection}: ${fileStats.size} bytes, ${backup.documentCount} 文档`);
      
      // 验证 JSON 格式
      try {
        const content = fs.readFileSync(backup.filePath, 'utf8');
        JSON.parse(content);
      } catch (jsonError) {
        console.error(`❌ JSON 格式错误 ${backup.collection}:`, jsonError.message);
        return false;
      }
    }
    
    // 检查元数据文件
    const metadataPath = path.join(backupPath, 'backup-metadata.json');
    if (!fs.existsSync(metadataPath)) {
      console.warn('⚠️ 警告: 元数据文件不存在');
    } else {
      console.log('✓ 元数据文件存在');
    }
    
    console.log('✅ 备份验证完成');
    return true;
    
  } catch (error) {
    console.error('❌ 备份验证失败:', error);
    return false;
  }
}

// 主函数
async function main() {
  console.log('========================================');
  console.log('  Mongoose 数据库备份工具');
  console.log('========================================');
  
  if (!MONGODB_URI) {
    console.error('❌ 错误: 未配置 MONGODB_URI 环境变量');
    process.exit(1);
  }
  
  const result = await createBackup();
  
  if (!result.success) {
    console.error('❌ 备份失败');
    process.exit(1);
  }
  
  // 验证备份
  const isValid = verifyBackup(result.backupPath, result.metadata);
  
  if (!isValid) {
    console.error('❌ 备份验证失败');
    process.exit(1);
  }
  
  console.log('========================================');
  console.log('✅ 备份和验证都已成功完成!');
  console.log(`📦 备份包含 ${result.metadata.collections.filter(c => !c.error).length} 个集合`);
  console.log(`📍 备份位置: ${result.backupPath}`);
  console.log('========================================');
  
  process.exit(0);
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createBackup,
  verifyBackup
};