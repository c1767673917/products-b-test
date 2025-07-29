#!/usr/bin/env node

/**
 * 使用正确的飞书API方法测试图片下载
 * 基于飞书官方文档: batch_get_tmp_download_url
 */

require('dotenv').config({ path: './products-backend/.env' });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 测试配置
const TEST_CONFIG = {
  appId: 'cli_a8fa1d87c3fad00d',
  appSecret: 'CDfRPlOw8VRQrPyLnpzNvd5wBmu6wROp',
  appToken: 'J4dFbm5S9azofMsW702cSOVwnsh',
  tableId: 'tblwdwrZMikMRyxq',
  baseUrl: 'https://open.feishu.cn'
};

// 测试用的文件令牌
const TEST_FILE_TOKENS = [
  'LFAbbt64Ooo0nExpkh2cYMbhn3e', // HM-0001A-1.jpg
  'BbDvbkx6AoPhxjxSm06c2epFnhb', // HM-0001B-1.jpg
  'AcwHbtB44ohvfPxhM4gcXJ7zn2I'  // 微信图片_2025-07-08_155708_267.png
];

let accessToken = null;

/**
 * 获取访问令牌
 */
async function getAccessToken() {
  if (accessToken) return accessToken;
  
  try {
    console.log('🔑 获取飞书访问令牌...');
    
    const response = await axios.post(
      `${TEST_CONFIG.baseUrl}/open-apis/auth/v3/tenant_access_token/internal`,
      {
        app_id: TEST_CONFIG.appId,
        app_secret: TEST_CONFIG.appSecret
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );
    
    if (response.data.code !== 0) {
      throw new Error(`获取令牌失败: ${response.data.msg}`);
    }
    
    accessToken = response.data.tenant_access_token;
    console.log('✅ 成功获取访问令牌');
    return accessToken;
    
  } catch (error) {
    console.error('❌ 获取访问令牌失败:', error.message);
    throw error;
  }
}

/**
 * 方法1: 使用 batch_get_tmp_download_url API (POST方式)
 */
async function testBatchGetTmpDownloadUrl(fileTokens) {
  try {
    console.log(`\n📥 方法1: 使用 batch_get_tmp_download_url API (POST)`);
    console.log(`   文件令牌数量: ${fileTokens.length}`);
    
    const token = await getAccessToken();
    
    const response = await axios.post(
      `${TEST_CONFIG.baseUrl}/open-apis/drive/v1/medias/batch_get_tmp_download_url`,
      {
        file_tokens: fileTokens,
        extra: {
          bitablePerm: {
            tableId: TEST_CONFIG.tableId,
            rev: 15613 // 可能需要获取实际的revision
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log(`   响应状态: ${response.status}`);
    console.log(`   响应代码: ${response.data.code}`);
    console.log(`   响应消息: ${response.data.msg}`);
    
    if (response.data.code === 0 && response.data.data) {
      const tmpUrls = response.data.data.tmp_download_urls;
      console.log(`   ✅ 获取临时下载链接成功，共 ${Object.keys(tmpUrls).length} 个`);
      
      // 尝试下载每个文件
      for (const [fileToken, urlInfo] of Object.entries(tmpUrls)) {
        console.log(`\n   📸 下载文件: ${fileToken}`);
        console.log(`      下载链接: ${urlInfo.tmp_download_url}`);
        
        try {
          const downloadResponse = await axios.get(urlInfo.tmp_download_url, {
            responseType: 'arraybuffer',
            timeout: 30000
          });
          
          if (downloadResponse.status === 200) {
            const buffer = Buffer.from(downloadResponse.data);
            console.log(`      ✅ 下载成功! 大小: ${(buffer.length / 1024).toFixed(2)} KB`);
            
            // 检查文件类型
            const isJPEG = buffer.slice(0, 2).toString('hex') === 'ffd8';
            const isPNG = buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a';
            const isWebP = buffer.slice(8, 12).toString('ascii') === 'WEBP';
            
            let format = '未知';
            let ext = '.bin';
            if (isJPEG) { format = 'JPEG'; ext = '.jpg'; }
            else if (isPNG) { format = 'PNG'; ext = '.png'; }
            else if (isWebP) { format = 'WebP'; ext = '.webp'; }
            
            console.log(`      格式: ${format}`);
            
            // 保存文件
            const testDir = path.join(__dirname, 'test-downloads');
            if (!fs.existsSync(testDir)) {
              fs.mkdirSync(testDir, { recursive: true });
            }
            
            const fileName = `correct-method-${fileToken}${ext}`;
            const filePath = path.join(testDir, fileName);
            fs.writeFileSync(filePath, buffer);
            console.log(`      已保存到: ${filePath}`);
            
          } else {
            console.log(`      ❌ 下载失败: HTTP ${downloadResponse.status}`);
          }
          
        } catch (downloadError) {
          console.error(`      ❌ 下载失败: ${downloadError.message}`);
        }
      }
      
      return { success: true, urls: tmpUrls };
      
    } else {
      console.log(`   ❌ 获取临时下载链接失败: ${response.data.msg}`);
      console.log(`   完整响应: ${JSON.stringify(response.data, null, 2)}`);
      return { success: false, error: response.data.msg };
    }
    
  } catch (error) {
    console.log(`   ❌ API调用失败: ${error.message}`);
    if (error.response) {
      console.log(`      HTTP状态: ${error.response.status}`);
      console.log(`      响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return { success: false, error: error.message };
  }
}

/**
 * 方法2: 使用 batch_get_tmp_download_url API (GET方式)
 */
async function testBatchGetTmpDownloadUrlGet(fileTokens) {
  try {
    console.log(`\n📥 方法2: 使用 batch_get_tmp_download_url API (GET)`);
    
    const token = await getAccessToken();
    
    // 构建查询参数
    const params = new URLSearchParams();
    fileTokens.forEach(token => params.append('file_tokens', token));
    
    // 添加extra参数
    const extra = {
      bitablePerm: {
        tableId: TEST_CONFIG.tableId,
        rev: 15613
      }
    };
    params.append('extra', JSON.stringify(extra));
    
    const url = `${TEST_CONFIG.baseUrl}/open-apis/drive/v1/medias/batch_get_tmp_download_url?${params.toString()}`;
    console.log(`   请求URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log(`   响应状态: ${response.status}`);
    console.log(`   响应代码: ${response.data.code}`);
    console.log(`   响应消息: ${response.data.msg}`);
    
    if (response.data.code === 0 && response.data.data) {
      console.log(`   ✅ GET方式获取临时下载链接成功`);
      console.log(`   响应数据: ${JSON.stringify(response.data.data, null, 2)}`);
      return { success: true, data: response.data.data };
    } else {
      console.log(`   ❌ GET方式失败: ${response.data.msg}`);
      return { success: false, error: response.data.msg };
    }
    
  } catch (error) {
    console.log(`   ❌ GET方式API调用失败: ${error.message}`);
    if (error.response) {
      console.log(`      HTTP状态: ${error.response.status}`);
      console.log(`      响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return { success: false, error: error.message };
  }
}

/**
 * 方法3: 获取表格的最新revision
 */
async function getTableRevision() {
  try {
    console.log(`\n📋 获取表格最新revision...`);
    
    const token = await getAccessToken();
    
    const response = await axios.get(
      `${TEST_CONFIG.baseUrl}/open-apis/bitable/v1/apps/${TEST_CONFIG.appToken}/tables/${TEST_CONFIG.tableId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    console.log(`   响应状态: ${response.status}`);
    console.log(`   响应数据: ${JSON.stringify(response.data, null, 2)}`);
    
    if (response.data.code === 0 && response.data.data) {
      const revision = response.data.data.revision;
      console.log(`   ✅ 获取revision成功: ${revision}`);
      return revision;
    } else {
      console.log(`   ❌ 获取revision失败: ${response.data.msg}`);
      return null;
    }
    
  } catch (error) {
    console.log(`   ❌ 获取revision失败: ${error.message}`);
    return null;
  }
}

/**
 * 主测试函数
 */
async function runCorrectDownloadTest() {
  console.log('🚀 使用正确的飞书API方法测试图片下载');
  console.log('=====================================');
  console.log('测试配置:');
  console.log(`  App ID: ${TEST_CONFIG.appId}`);
  console.log(`  App Token: ${TEST_CONFIG.appToken}`);
  console.log(`  Table ID: ${TEST_CONFIG.tableId}`);
  console.log(`  测试文件令牌数量: ${TEST_FILE_TOKENS.length}`);
  console.log('=====================================');
  
  try {
    // 获取表格最新revision
    const revision = await getTableRevision();
    if (revision) {
      // 更新extra参数中的revision
      console.log(`使用最新revision: ${revision}`);
    }
    
    // 方法1: POST方式
    const result1 = await testBatchGetTmpDownloadUrl(TEST_FILE_TOKENS);
    
    // 方法2: GET方式
    const result2 = await testBatchGetTmpDownloadUrlGet(TEST_FILE_TOKENS);
    
    console.log('\n🏁 正确方法测试完成!');
    console.log('=====================================');
    console.log('测试结果总结:');
    console.log(`✅ 认证: 成功`);
    console.log(`${result1.success ? '✅' : '❌'} POST方式获取下载链接: ${result1.success ? '成功' : '失败'}`);
    console.log(`${result2.success ? '✅' : '❌'} GET方式获取下载链接: ${result2.success ? '成功' : '失败'}`);
    
    if (result1.success || result2.success) {
      console.log('🎉 至少有一种方法成功获取了下载链接!');
    } else {
      console.log('⚠️  所有方法都失败了，可能需要检查应用权限配置');
    }
    
  } catch (error) {
    console.error('\n💥 正确方法测试失败:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  runCorrectDownloadTest();
}

module.exports = {
  runCorrectDownloadTest,
  testBatchGetTmpDownloadUrl,
  getTableRevision
};
