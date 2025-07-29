#!/usr/bin/env node

/**
 * 详细测试飞书图片下载权限
 * 尝试不同的下载方式和API端点
 */

require('dotenv').config({ path: './products-backend/.env' });
const axios = require('axios');

// 测试配置
const TEST_CONFIG = {
  appId: 'cli_a8fa1d87c3fad00d',
  appSecret: 'CDfRPlOw8VRQrPyLnpzNvd5wBmu6wROp',
  appToken: 'J4dFbm5S9azofMsW702cSOVwnsh',
  tableId: 'tblwdwrZMikMRyxq',
  baseUrl: 'https://open.feishu.cn'
};

// 测试用的文件令牌（从之前的测试中获取）
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
 * 测试方法1: 直接下载 (drive API)
 */
async function testDirectDownload(fileToken) {
  try {
    console.log(`\n📥 方法1: 直接下载 (drive API)`);
    console.log(`   文件令牌: ${fileToken}`);
    
    const token = await getAccessToken();
    
    const response = await axios.get(
      `${TEST_CONFIG.baseUrl}/open-apis/drive/v1/medias/${fileToken}/download`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 30000
      }
    );
    
    if (response.status === 200) {
      const buffer = Buffer.from(response.data);
      console.log(`   ✅ 下载成功! 大小: ${(buffer.length / 1024).toFixed(2)} KB`);
      return { success: true, data: buffer };
    } else {
      console.log(`   ❌ 下载失败: HTTP ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }
    
  } catch (error) {
    console.log(`   ❌ 下载失败: ${error.message}`);
    if (error.response) {
      console.log(`      HTTP状态: ${error.response.status}`);
      console.log(`      响应头: ${JSON.stringify(error.response.headers, null, 2)}`);
      console.log(`      响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return { success: false, error: error.message };
  }
}

/**
 * 测试方法2: 获取下载链接
 */
async function testGetDownloadUrl(fileToken) {
  try {
    console.log(`\n🔗 方法2: 获取下载链接`);
    console.log(`   文件令牌: ${fileToken}`);
    
    const token = await getAccessToken();
    
    // 尝试获取下载链接
    const response = await axios.get(
      `${TEST_CONFIG.baseUrl}/open-apis/drive/v1/medias/${fileToken}`,
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
      const downloadUrl = response.data.data.download_url;
      if (downloadUrl) {
        console.log(`   ✅ 获取下载链接成功: ${downloadUrl}`);
        
        // 尝试使用下载链接下载文件
        const downloadResponse = await axios.get(downloadUrl, {
          responseType: 'arraybuffer',
          timeout: 30000
        });
        
        if (downloadResponse.status === 200) {
          const buffer = Buffer.from(downloadResponse.data);
          console.log(`   ✅ 通过下载链接下载成功! 大小: ${(buffer.length / 1024).toFixed(2)} KB`);
          return { success: true, data: buffer };
        }
      }
    }
    
    return { success: false, error: '无法获取有效的下载链接' };
    
  } catch (error) {
    console.log(`   ❌ 获取下载链接失败: ${error.message}`);
    if (error.response) {
      console.log(`      HTTP状态: ${error.response.status}`);
      console.log(`      响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return { success: false, error: error.message };
  }
}

/**
 * 测试方法3: 使用bitable API获取附件信息
 */
async function testBitableAttachment(fileToken) {
  try {
    console.log(`\n📎 方法3: 使用bitable API获取附件信息`);
    console.log(`   文件令牌: ${fileToken}`);
    
    const token = await getAccessToken();
    
    // 尝试通过bitable API获取附件信息
    const response = await axios.get(
      `${TEST_CONFIG.baseUrl}/open-apis/bitable/v1/apps/${TEST_CONFIG.appToken}/tables/${TEST_CONFIG.tableId}/records`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          page_size: 10
        },
        timeout: 15000
      }
    );
    
    if (response.data.code === 0) {
      const records = response.data.data?.items || [];
      console.log(`   ✅ 获取记录成功，共 ${records.length} 条`);
      
      // 查找包含指定文件令牌的记录
      for (const record of records) {
        for (const [fieldId, fieldValue] of Object.entries(record.fields)) {
          if (Array.isArray(fieldValue)) {
            for (const attachment of fieldValue) {
              if (attachment && attachment.file_token === fileToken) {
                console.log(`   ✅ 找到匹配的附件:`);
                console.log(`      记录ID: ${record.record_id}`);
                console.log(`      字段ID: ${fieldId}`);
                console.log(`      文件名: ${attachment.name}`);
                console.log(`      文件大小: ${attachment.size}`);
                console.log(`      临时URL: ${attachment.tmp_url || '无'}`);
                
                // 如果有临时URL，尝试下载
                if (attachment.tmp_url) {
                  try {
                    const downloadResponse = await axios.get(attachment.tmp_url, {
                      responseType: 'arraybuffer',
                      timeout: 30000
                    });
                    
                    if (downloadResponse.status === 200) {
                      const buffer = Buffer.from(downloadResponse.data);
                      console.log(`   ✅ 通过临时URL下载成功! 大小: ${(buffer.length / 1024).toFixed(2)} KB`);
                      return { success: true, data: buffer };
                    }
                  } catch (tmpError) {
                    console.log(`   ❌ 临时URL下载失败: ${tmpError.message}`);
                  }
                }
                
                return { success: false, error: '找到附件但无法下载' };
              }
            }
          }
        }
      }
      
      console.log(`   ⚠️  未找到匹配的文件令牌`);
    }
    
    return { success: false, error: '无法通过bitable API获取附件' };
    
  } catch (error) {
    console.log(`   ❌ bitable API调用失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 测试方法4: 检查应用权限
 */
async function testAppPermissions() {
  try {
    console.log(`\n🔐 方法4: 检查应用权限`);
    
    const token = await getAccessToken();
    
    // 尝试获取应用信息
    const response = await axios.get(
      `${TEST_CONFIG.baseUrl}/open-apis/bitable/v1/apps/${TEST_CONFIG.appToken}`,
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
    
    if (response.data.code === 0) {
      console.log(`   ✅ 应用信息获取成功`);
      console.log(`      应用名称: ${response.data.data?.name || '未知'}`);
      console.log(`      应用版本: ${response.data.data?.version || '未知'}`);
    }
    
  } catch (error) {
    console.log(`   ❌ 获取应用信息失败: ${error.message}`);
    if (error.response) {
      console.log(`      HTTP状态: ${error.response.status}`);
      console.log(`      响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

/**
 * 主测试函数
 */
async function runDetailedDownloadTest() {
  console.log('🚀 开始详细测试飞书图片下载权限');
  console.log('=====================================');
  console.log('测试配置:');
  console.log(`  App ID: ${TEST_CONFIG.appId}`);
  console.log(`  App Token: ${TEST_CONFIG.appToken}`);
  console.log(`  测试文件令牌数量: ${TEST_FILE_TOKENS.length}`);
  console.log('=====================================');
  
  try {
    // 检查应用权限
    await testAppPermissions();
    
    // 测试每个文件令牌的不同下载方法
    for (let i = 0; i < TEST_FILE_TOKENS.length; i++) {
      const fileToken = TEST_FILE_TOKENS[i];
      console.log(`\n🎯 测试文件令牌 ${i + 1}/${TEST_FILE_TOKENS.length}: ${fileToken}`);
      console.log('='.repeat(60));
      
      // 方法1: 直接下载
      const result1 = await testDirectDownload(fileToken);
      
      // 方法2: 获取下载链接
      const result2 = await testGetDownloadUrl(fileToken);
      
      // 方法3: 使用bitable API
      const result3 = await testBitableAttachment(fileToken);
      
      // 总结这个文件令牌的测试结果
      console.log(`\n📊 文件令牌 ${fileToken} 测试总结:`);
      console.log(`   方法1 (直接下载): ${result1.success ? '✅ 成功' : '❌ 失败'}`);
      console.log(`   方法2 (下载链接): ${result2.success ? '✅ 成功' : '❌ 失败'}`);
      console.log(`   方法3 (bitable API): ${result3.success ? '✅ 成功' : '❌ 失败'}`);
      
      if (result1.success || result2.success || result3.success) {
        console.log(`   🎉 至少有一种方法成功!`);
        break; // 如果有成功的，就不需要继续测试其他文件了
      }
    }
    
    console.log('\n🏁 详细下载测试完成!');
    
  } catch (error) {
    console.error('\n💥 详细下载测试失败:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  runDetailedDownloadTest();
}

module.exports = {
  runDetailedDownloadTest,
  testDirectDownload,
  testGetDownloadUrl,
  testBitableAttachment
};
