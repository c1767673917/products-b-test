#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 配置
const MONGODB_URI = process.env.MONGODB_URI;
const BACKUP_DIR = path.join(__dirname, '../backups');
const DATE_STAMP = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

// 从 MongoDB URI 提取连接信息
function parseMongoURI(uri) {
  const regex = /mongodb:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/;
  const match = uri.match(regex);
  
  if (!match) {
    throw new Error('Invalid MongoDB URI format');
  }
  
  return {
    username: decodeURIComponent(match[1]),
    password: decodeURIComponent(match[2]),
    host: match[3],
    port: match[4],
    database: match[5]
  };
}

async function createBackup() {
  try {
    console.log('🚀 开始数据库备份...');
    
    // 确保备份目录存在
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log(`📁 创建备份目录: ${BACKUP_DIR}`);
    }
    
    const mongoConfig = parseMongoURI(MONGODB_URI);
    const backupPath = path.join(BACKUP_DIR, `backup-${DATE_STAMP}`);
    
    // 构建 mongodump 命令
    const mongodumpCmd = `mongodump ` +
      `--host ${mongoConfig.host}:${mongoConfig.port} ` +
      `--db ${mongoConfig.database} ` +
      `--username ${mongoConfig.username} ` +
      `--password "${mongoConfig.password}" ` +
      `--authenticationDatabase admin ` +
      `--out "${backupPath}"`;
    
    console.log(`💾 执行备份到: ${backupPath}`);
    
    // 执行备份命令
    await new Promise((resolve, reject) => {
      exec(mongodumpCmd, (error, stdout, stderr) => {
        if (error) {
          console.error('❌ 备份失败:', error);
          reject(error);
          return;
        }
        
        if (stderr) {
          console.log('⚠️ 备份警告:', stderr);
        }
        
        console.log('📄 备份输出:', stdout);
        resolve();
      });
    });
    
    // 创建备份元数据
    const metadata = {
      timestamp: new Date().toISOString(),
      database: mongoConfig.database,
      backupPath: backupPath,
      mongodbUri: MONGODB_URI.replace(/:[^:]*@/, ':****@'), // 隐藏密码
      version: '1.0',
      type: 'pre-schema-migration'
    };
    
    const metadataPath = path.join(backupPath, 'backup-metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    console.log('✅ 数据库备份完成!');
    console.log(`📍 备份位置: ${backupPath}`);
    console.log(`📋 备份元数据: ${metadataPath}`);
    
    // 列出备份内容
    const backupContents = fs.readdirSync(backupPath);
    console.log(`📦 备份内容: ${backupContents.join(', ')}`);
    
    return {
      success: true,
      backupPath: backupPath,
      metadata: metadata
    };
    
  } catch (error) {
    console.error('💥 备份过程出错:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 备份验证函数
async function verifyBackup(backupPath) {
  try {
    console.log('🔍 验证备份完整性...');
    
    // 检查备份目录是否存在
    if (!fs.existsSync(backupPath)) {
      throw new Error(`备份目录不存在: ${backupPath}`);
    }
    
    // 检查数据库目录
    const mongoConfig = parseMongoURI(MONGODB_URI);
    const dbBackupPath = path.join(backupPath, mongoConfig.database);
    
    if (!fs.existsSync(dbBackupPath)) {
      throw new Error(`数据库备份目录不存在: ${dbBackupPath}`);
    }
    
    // 检查重要集合备份
    const requiredCollections = ['products'];
    const backupFiles = fs.readdirSync(dbBackupPath);
    
    for (const collection of requiredCollections) {
      const bsonFile = `${collection}.bson`;
      const metadataFile = `${collection}.metadata.json`;
      
      if (!backupFiles.includes(bsonFile)) {
        console.warn(`⚠️ 警告: 缺少集合备份文件 ${bsonFile}`);
      } else {
        const filePath = path.join(dbBackupPath, bsonFile);
        const fileStats = fs.statSync(filePath);
        console.log(`✓ 集合 ${collection}: ${fileStats.size} bytes`);
      }
      
      if (!backupFiles.includes(metadataFile)) {
        console.warn(`⚠️ 警告: 缺少集合元数据文件 ${metadataFile}`);
      }
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
  console.log('  数据库备份工具');
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
  const isValid = await verifyBackup(result.backupPath);
  
  if (!isValid) {
    console.error('❌ 备份验证失败');
    process.exit(1);
  }
  
  console.log('========================================');
  console.log('✅ 备份和验证都已成功完成!');
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