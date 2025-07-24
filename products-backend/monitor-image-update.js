#!/usr/bin/env node

/**
 * 图片更新进度监控脚本
 * 实时显示从飞书下载图片的进度统计
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'image-update.log');
const REFRESH_INTERVAL = 3000; // 3秒刷新一次

class ImageUpdateMonitor {
  constructor() {
    this.lastSize = 0;
    this.startTime = Date.now();
  }

  // 读取日志文件并分析统计信息
  analyzeLog() {
    try {
      if (!fs.existsSync(LOG_FILE)) {
        return {
          error: '日志文件不存在',
          exists: false
        };
      }

      const logContent = fs.readFileSync(LOG_FILE, 'utf8');
      const lines = logContent.split('\n');

      // 统计各种状态
      const stats = {
        totalProducts: 0,
        processedProducts: 0,
        successfulImages: 0,
        skippedImages: 0,
        failedImages: 0,
        updatedProducts: 0,
        skippedProducts: 0,
        errors: 0,
        lastActivity: null,
        isCompleted: false
      };

      // 分析日志内容
      lines.forEach(line => {
        if (line.includes('📦 处理产品:')) {
          stats.processedProducts++;
        }
        if (line.includes('✅ 图片更新成功:')) {
          stats.successfulImages++;
        }
        if (line.includes('✅ 图片已是最新版本')) {
          stats.skippedImages++;
        }
        if (line.includes('❌ 图片更新失败:')) {
          stats.failedImages++;
        }
        if (line.includes('✅ 产品图片更新完成')) {
          stats.updatedProducts++;
        }
        if (line.includes('⚠️  无需更新')) {
          stats.skippedProducts++;
        }
        if (line.includes('❌') && !line.includes('图片更新失败')) {
          stats.errors++;
        }
        if (line.includes('📊 更新结果统计:')) {
          stats.isCompleted = true;
        }
        
        // 获取最后活动时间
        const timestampMatch = line.match(/"timestamp":"([^"]+)"/);
        if (timestampMatch) {
          stats.lastActivity = new Date(timestampMatch[1]);
        }
      });

      // 从日志中提取总产品数
      const totalMatch = logContent.match(/📊 获取到 (\d+) 条飞书记录/);
      if (totalMatch) {
        stats.totalProducts = parseInt(totalMatch[1]);
      }

      return stats;
    } catch (error) {
      return {
        error: `读取日志失败: ${error.message}`,
        exists: true
      };
    }
  }

  // 检查进程是否还在运行
  checkProcess() {
    const { execSync } = require('child_process');
    try {
      const result = execSync('ps aux | grep "node update-images-from-feishu.js" | grep -v grep', { encoding: 'utf8' });
      return result.trim().length > 0;
    } catch (error) {
      return false;
    }
  }

  // 格式化时间
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  // 显示进度信息
  displayProgress() {
    console.clear();
    console.log('🖼️  飞书图片更新进度监控');
    console.log('=' .repeat(50));
    
    const stats = this.analyzeLog();
    const isProcessRunning = this.checkProcess();
    const runningTime = Date.now() - this.startTime;

    if (stats.error) {
      console.log(`❌ ${stats.error}`);
      return;
    }

    // 进程状态
    console.log(`📊 进程状态: ${isProcessRunning ? '🟢 运行中' : '🔴 已停止'}`);
    console.log(`⏱️  运行时间: ${this.formatDuration(runningTime)}`);
    
    if (stats.lastActivity) {
      const timeSinceLastActivity = Date.now() - stats.lastActivity.getTime();
      console.log(`🕐 最后活动: ${this.formatDuration(timeSinceLastActivity)}前`);
    }

    console.log('');

    // 产品处理进度
    if (stats.totalProducts > 0) {
      const productProgress = ((stats.processedProducts / stats.totalProducts) * 100).toFixed(1);
      console.log(`📦 产品处理进度: ${stats.processedProducts}/${stats.totalProducts} (${productProgress}%)`);
      
      // 进度条
      const barLength = 30;
      const filledLength = Math.round((stats.processedProducts / stats.totalProducts) * barLength);
      const progressBar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
      console.log(`   [${progressBar}]`);
    } else {
      console.log(`📦 已处理产品: ${stats.processedProducts}`);
    }

    console.log('');

    // 图片统计
    console.log('🖼️  图片处理统计:');
    console.log(`   ✅ 成功下载: ${stats.successfulImages} 个`);
    console.log(`   ⚠️  已是最新: ${stats.skippedImages} 个`);
    console.log(`   ❌ 下载失败: ${stats.failedImages} 个`);
    
    const totalImages = stats.successfulImages + stats.skippedImages + stats.failedImages;
    console.log(`   📊 图片总计: ${totalImages} 个`);

    console.log('');

    // 产品统计
    console.log('📈 产品更新统计:');
    console.log(`   🆕 有更新: ${stats.updatedProducts} 个`);
    console.log(`   ⏭️  无需更新: ${stats.skippedProducts} 个`);
    console.log(`   ❌ 处理错误: ${stats.errors} 个`);

    // 完成状态
    if (stats.isCompleted) {
      console.log('');
      console.log('🎉 图片更新已完成！');
    } else if (!isProcessRunning && stats.processedProducts > 0) {
      console.log('');
      console.log('⚠️  进程已停止，可能需要重新启动');
    }

    console.log('');
    console.log('💡 提示: 按 Ctrl+C 退出监控');
    console.log(`🔄 下次刷新: ${REFRESH_INTERVAL/1000}秒后`);
  }

  // 开始监控
  start() {
    console.log('🚀 开始监控图片更新进度...');
    
    // 立即显示一次
    this.displayProgress();
    
    // 定时刷新
    this.interval = setInterval(() => {
      this.displayProgress();
    }, REFRESH_INTERVAL);

    // 处理退出信号
    process.on('SIGINT', () => {
      console.log('\n\n👋 监控已停止');
      if (this.interval) {
        clearInterval(this.interval);
      }
      process.exit(0);
    });
  }
}

// 主函数
function main() {
  const monitor = new ImageUpdateMonitor();
  monitor.start();
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = ImageUpdateMonitor;
