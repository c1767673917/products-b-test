#!/usr/bin/env node

/**
 * 快速图片更新脚本
 * 使用更高的并发数来加速从飞书更新所有图片
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function quickImageUpdate() {
  try {
    console.log('🚀 启动快速图片更新...');
    
    // 使用API端点触发全量同步，包含图片下载
    const response = await axios.post(`${API_BASE_URL}/api/v1/sync/feishu`, {
      mode: 'full',
      options: {
        downloadImages: true,
        validateData: false, // 跳过验证以加速
        dryRun: false,
        batchSize: 100,      // 增大批次大小
        concurrentImages: 10  // 增加并发数
      }
    });

    if (response.data.success) {
      console.log('✅ 同步任务已启动');
      console.log(`📊 同步ID: ${response.data.data.syncId}`);
      console.log(`⏱️  预估时间: ${response.data.data.estimatedDuration}ms`);
      console.log(`🔗 WebSocket监控: ${response.data.data.websocketUrl}`);
      
      // 监控同步进度
      await monitorSyncProgress(response.data.data.syncId);
    } else {
      throw new Error('同步启动失败');
    }

  } catch (error) {
    console.error('❌ 快速更新失败:', error.message);
    
    // 如果API方式失败，回退到脚本方式
    console.log('🔄 回退到脚本方式...');
    await fallbackToScript();
  }
}

async function monitorSyncProgress(syncId) {
  console.log('📊 开始监控同步进度...');
  
  const maxAttempts = 60; // 最多监控5分钟
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const statusResponse = await axios.get(`${API_BASE_URL}/api/v1/sync/status/${syncId}`);
      const status = statusResponse.data.data;
      
      console.log(`📈 进度: ${status.progress}% - ${status.currentStage}`);
      
      if (status.status === 'completed') {
        console.log('✅ 同步完成!');
        console.log(`📊 统计: 创建${status.stats?.createdRecords || 0}个，更新${status.stats?.updatedRecords || 0}个产品`);
        break;
      } else if (status.status === 'failed') {
        console.log('❌ 同步失败:', status.error);
        break;
      }
      
      // 等待5秒后再次检查
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
      
    } catch (error) {
      console.log('⚠️  无法获取同步状态，继续等待...');
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  if (attempts >= maxAttempts) {
    console.log('⏰ 监控超时，请手动检查同步状态');
  }
}

async function fallbackToScript() {
  const { spawn } = require('child_process');
  
  console.log('🔄 使用脚本方式更新图片...');
  
  const child = spawn('node', ['update-images-from-feishu.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  child.on('close', (code) => {
    if (code === 0) {
      console.log('✅ 脚本更新完成');
    } else {
      console.log(`❌ 脚本退出，代码: ${code}`);
    }
  });
  
  child.on('error', (error) => {
    console.error('❌ 脚本执行错误:', error);
  });
}

// 主函数
async function main() {
  try {
    await quickImageUpdate();
  } catch (error) {
    console.error('💥 执行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { quickImageUpdate };
