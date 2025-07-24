#!/usr/bin/env node

/**
 * 测试飞书API图片下载
 * 直接调用飞书API服务测试单个文件令牌
 */

require('dotenv').config();
const { getFeishuApiService } = require('./dist/services/feishuApiService');

// 测试文件令牌
const testFileTokens = [
  'Vnjsb2KTsouUWBx6oiVcthhinL0', // recn7j9p5p front
  'GzaqbgW2UoByx9x1f4WcGInTnxg', // recn7j9p5p label
  'O00WbQy84o5rLsxQydecKDcfnDb', // recyvMPGSQ front
];

async function testFeishuDownload() {
  try {
    console.log('🚀 开始测试飞书API图片下载...');
    
    const feishuService = getFeishuApiService();
    
    // 测试连接
    console.log('🔗 测试飞书API连接...');
    const connectionTest = await feishuService.testConnection();
    console.log('连接测试结果:', connectionTest);
    
    if (!connectionTest.success) {
      console.error('❌ 飞书API连接失败，停止测试');
      return;
    }
    
    console.log('✅ 飞书API连接成功');
    
    // 测试每个文件令牌
    for (let i = 0; i < testFileTokens.length; i++) {
      const fileToken = testFileTokens[i];
      console.log(`\n📸 测试文件令牌 ${i + 1}/${testFileTokens.length}: ${fileToken}`);
      
      try {
        // 尝试下载
        const imageBuffer = await feishuService.downloadImage(fileToken);
        
        console.log(`  ✅ 下载成功!`);
        console.log(`     文件大小: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
        console.log(`     文件类型: ${imageBuffer.slice(0, 4).toString('hex')}`);
        
        // 检查是否是有效的图片文件
        const isJPEG = imageBuffer.slice(0, 2).toString('hex') === 'ffd8';
        const isPNG = imageBuffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a';
        const isWebP = imageBuffer.slice(8, 12).toString('ascii') === 'WEBP';
        
        if (isJPEG) {
          console.log(`     格式: JPEG`);
        } else if (isPNG) {
          console.log(`     格式: PNG`);
        } else if (isWebP) {
          console.log(`     格式: WebP`);
        } else {
          console.log(`     格式: 未知 (可能不是图片文件)`);
        }
        
      } catch (error) {
        console.error(`  ❌ 下载失败: ${error.message}`);
        
        // 如果是第一个就失败了，可能是权限问题
        if (i === 0) {
          console.log('  🔍 可能的原因:');
          console.log('     - 文件令牌已过期');
          console.log('     - 飞书应用权限不足');
          console.log('     - 文件已被删除或移动');
          console.log('     - API接口发生变化');
        }
      }
    }
    
    console.log('\n🏁 测试完成!');
    
  } catch (error) {
    console.error('💥 测试失败:', error);
  }
}

// 运行测试
testFeishuDownload();
