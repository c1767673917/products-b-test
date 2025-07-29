#!/usr/bin/env node

/**
 * 测试飞书多维表格数据和附件图片下载权限
 * 
 * 测试配置:
 * - app_token: J4dFbm5S9azofMsW702cSOVwnsh
 * - table_id: tblwdwrZMikMRyxq
 * - app_id: cli_a8fa1d87c3fad00d
 * - app_secret: CDfRPlOw8VRQrPyLnpzNvd5wBmu6wROp
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

let accessToken = null;
let tokenExpireTime = 0;

/**
 * 获取飞书访问令牌
 */
async function getAccessToken() {
  try {
    // 检查现有令牌是否有效
    if (accessToken && Date.now() < tokenExpireTime - 60000) {
      console.log('✅ 使用缓存的访问令牌');
      return accessToken;
    }

    console.log('🔑 获取飞书访问令牌...');
    
    const response = await axios.post(
      `${TEST_CONFIG.baseUrl}/open-apis/auth/v3/tenant_access_token/internal`,
      {
        app_id: TEST_CONFIG.appId,
        app_secret: TEST_CONFIG.appSecret
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    console.log('认证响应状态:', response.status);
    console.log('认证响应数据:', JSON.stringify(response.data, null, 2));
    
    if (response.data.code !== 0) {
      throw new Error(`获取令牌失败: ${response.data.msg}`);
    }
    
    if (!response.data.tenant_access_token) {
      throw new Error('响应中缺少访问令牌');
    }
    
    accessToken = response.data.tenant_access_token;
    tokenExpireTime = Date.now() + (response.data.expire * 1000);
    
    console.log('✅ 成功获取访问令牌');
    console.log(`   令牌长度: ${accessToken.length}`);
    console.log(`   过期时间: ${new Date(tokenExpireTime).toLocaleString()}`);
    
    return accessToken;
    
  } catch (error) {
    console.error('❌ 获取访问令牌失败:', error.message);
    if (error.response) {
      console.error('   HTTP状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
    throw error;
  }
}

/**
 * 测试获取表格字段信息
 */
async function testGetTableFields() {
  try {
    console.log('\n📋 测试获取表格字段信息...');
    
    const token = await getAccessToken();
    
    const response = await axios.get(
      `${TEST_CONFIG.baseUrl}/open-apis/bitable/v1/apps/${TEST_CONFIG.appToken}/tables/${TEST_CONFIG.tableId}/fields`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    console.log('字段响应状态:', response.status);
    console.log('字段响应代码:', response.data.code);
    
    if (response.data.code !== 0) {
      throw new Error(`获取字段失败: ${response.data.msg}`);
    }
    
    const fields = response.data.data?.items || [];
    console.log(`✅ 成功获取 ${fields.length} 个字段:`);
    
    fields.forEach((field, index) => {
      console.log(`   ${index + 1}. ${field.field_name} (${field.field_id}) - 类型: ${field.type}`);
    });
    
    return fields;
    
  } catch (error) {
    console.error('❌ 获取表格字段失败:', error.message);
    if (error.response) {
      console.error('   HTTP状态:', error.response.status);
      console.error('   响应数据:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * 测试获取表格记录数据
 */
async function testGetTableRecords() {
  try {
    console.log('\n📊 测试获取表格记录数据...');
    
    const token = await getAccessToken();
    
    const response = await axios.get(
      `${TEST_CONFIG.baseUrl}/open-apis/bitable/v1/apps/${TEST_CONFIG.appToken}/tables/${TEST_CONFIG.tableId}/records`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          page_size: 5  // 只获取前5条记录用于测试
        },
        timeout: 15000
      }
    );
    
    console.log('记录响应状态:', response.status);
    console.log('记录响应代码:', response.data.code);
    
    if (response.data.code !== 0) {
      throw new Error(`获取记录失败: ${response.data.msg}`);
    }
    
    const records = response.data.data?.items || [];
    const total = response.data.data?.total || 0;
    const hasMore = response.data.data?.has_more || false;
    
    console.log(`✅ 成功获取记录数据:`);
    console.log(`   当前批次: ${records.length} 条记录`);
    console.log(`   总记录数: ${total}`);
    console.log(`   是否有更多: ${hasMore}`);
    
    // 显示前几条记录的基本信息
    records.slice(0, 3).forEach((record, index) => {
      console.log(`\n   记录 ${index + 1} (${record.record_id}):`);
      const fieldKeys = Object.keys(record.fields);
      console.log(`     字段数量: ${fieldKeys.length}`);
      
      // 显示前几个字段
      fieldKeys.slice(0, 5).forEach(key => {
        const value = record.fields[key];
        const valueStr = typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : String(value).substring(0, 100);
        console.log(`     ${key}: ${valueStr}`);
      });
    });
    
    return records;
    
  } catch (error) {
    console.error('❌ 获取表格记录失败:', error.message);
    if (error.response) {
      console.error('   HTTP状态:', error.response.status);
      console.error('   响应数据:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * 查找图片字段和文件令牌
 */
async function findImageTokens(records, fields) {
  try {
    console.log('\n🔍 查找图片字段和文件令牌...');
    
    // 查找图片类型的字段
    const imageFields = fields.filter(field => field.type === 17); // 17 是附件类型
    console.log(`找到 ${imageFields.length} 个附件字段:`);
    
    imageFields.forEach(field => {
      console.log(`   - ${field.field_name} (${field.field_id})`);
    });
    
    const imageTokens = [];
    
    // 从记录中提取图片令牌
    records.forEach((record, recordIndex) => {
      console.log(`   检查记录 ${recordIndex + 1} (${record.record_id}):`);
      console.log(`     记录字段键: ${Object.keys(record.fields).join(', ')}`);

      // 检查所有字段，不仅仅是图片字段
      Object.keys(record.fields).forEach(fieldKey => {
        const fieldValue = record.fields[fieldKey];
        const matchingField = fields.find(f => f.field_id === fieldKey);
        const fieldName = matchingField ? matchingField.field_name : fieldKey;

        // 检查是否是附件类型的字段
        if (fieldValue && Array.isArray(fieldValue) && fieldValue.length > 0) {
          const firstItem = fieldValue[0];
          if (firstItem && firstItem.file_token) {
            console.log(`     字段 ${fieldName} (${fieldKey}): 找到附件数据`);
            console.log(`       数据: ${JSON.stringify(fieldValue).substring(0, 300)}`);

            fieldValue.forEach((attachment, attachIndex) => {
              if (attachment && attachment.file_token) {
                imageTokens.push({
                  recordId: record.record_id,
                  recordIndex: recordIndex + 1,
                  fieldName: fieldName,
                  fieldId: fieldKey,
                  attachmentIndex: attachIndex + 1,
                  fileToken: attachment.file_token,
                  fileName: attachment.name || '未知文件名',
                  fileSize: attachment.size || 0
                });
                console.log(`         ✅ 找到文件令牌: ${attachment.file_token}`);
              }
            });
          }
        }
      });

      // 也检查预定义的图片字段
      imageFields.forEach(field => {
        const fieldValue = record.fields[field.field_id];
        if (fieldValue) {
          console.log(`     预定义字段 ${field.field_name} (${field.field_id}): ${JSON.stringify(fieldValue).substring(0, 200)}`);
        }
      });
    });
    
    console.log(`✅ 找到 ${imageTokens.length} 个图片文件令牌:`);
    imageTokens.forEach((token, index) => {
      console.log(`   ${index + 1}. 记录${token.recordIndex} - ${token.fieldName} - ${token.fileName}`);
      console.log(`      令牌: ${token.fileToken}`);
      console.log(`      大小: ${(token.fileSize / 1024).toFixed(2)} KB`);
    });
    
    return imageTokens;
    
  } catch (error) {
    console.error('❌ 查找图片令牌失败:', error.message);
    throw error;
  }
}

/**
 * 测试下载图片文件
 */
async function testDownloadImages(imageTokens) {
  try {
    console.log('\n📸 测试下载图片文件...');
    
    if (imageTokens.length === 0) {
      console.log('⚠️  没有找到可下载的图片文件');
      return;
    }
    
    const token = await getAccessToken();
    
    // 测试前3个图片文件
    const testTokens = imageTokens.slice(0, 3);
    
    for (let i = 0; i < testTokens.length; i++) {
      const imageInfo = testTokens[i];
      console.log(`\n   测试下载 ${i + 1}/${testTokens.length}: ${imageInfo.fileName}`);
      console.log(`   文件令牌: ${imageInfo.fileToken}`);
      
      try {
        const downloadResponse = await axios.get(
          `${TEST_CONFIG.baseUrl}/open-apis/drive/v1/medias/${imageInfo.fileToken}/download`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            responseType: 'arraybuffer',
            timeout: 30000
          }
        );
        
        if (downloadResponse.status === 200) {
          const imageBuffer = Buffer.from(downloadResponse.data);
          console.log(`   ✅ 下载成功!`);
          console.log(`      实际大小: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
          
          // 检查文件类型
          const isJPEG = imageBuffer.slice(0, 2).toString('hex') === 'ffd8';
          const isPNG = imageBuffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a';
          const isWebP = imageBuffer.slice(8, 12).toString('ascii') === 'WEBP';
          
          if (isJPEG) {
            console.log(`      格式: JPEG`);
          } else if (isPNG) {
            console.log(`      格式: PNG`);
          } else if (isWebP) {
            console.log(`      格式: WebP`);
          } else {
            console.log(`      格式: 未知 (前4字节: ${imageBuffer.slice(0, 4).toString('hex')})`);
          }
          
          // 保存测试文件
          const testDir = path.join(__dirname, 'test-downloads');
          if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
          }
          
          const ext = isJPEG ? '.jpg' : isPNG ? '.png' : isWebP ? '.webp' : '.bin';
          const testFilePath = path.join(testDir, `test-${i + 1}-${imageInfo.fileToken}${ext}`);
          fs.writeFileSync(testFilePath, imageBuffer);
          console.log(`      已保存到: ${testFilePath}`);
          
        } else {
          console.log(`   ❌ 下载失败: HTTP ${downloadResponse.status}`);
        }
        
      } catch (downloadError) {
        console.error(`   ❌ 下载失败: ${downloadError.message}`);
        if (downloadError.response) {
          console.error(`      HTTP状态: ${downloadError.response.status}`);
          console.error(`      响应数据: ${JSON.stringify(downloadError.response.data, null, 2)}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 测试图片下载失败:', error.message);
    throw error;
  }
}

/**
 * 主测试函数
 */
async function runPermissionTest() {
  console.log('🚀 开始测试飞书多维表格数据和附件图片下载权限');
  console.log('=====================================');
  console.log('测试配置:');
  console.log(`  App ID: ${TEST_CONFIG.appId}`);
  console.log(`  App Token: ${TEST_CONFIG.appToken}`);
  console.log(`  Table ID: ${TEST_CONFIG.tableId}`);
  console.log(`  Base URL: ${TEST_CONFIG.baseUrl}`);
  console.log('=====================================');
  
  try {
    // 1. 测试认证
    await getAccessToken();
    
    // 2. 测试获取字段信息
    const fields = await testGetTableFields();
    
    // 3. 测试获取记录数据
    const records = await testGetTableRecords();
    
    // 4. 查找图片令牌
    const imageTokens = await findImageTokens(records, fields);
    
    // 5. 测试下载图片
    await testDownloadImages(imageTokens);
    
    console.log('\n🎉 权限测试完成!');
    console.log('=====================================');
    console.log('测试结果总结:');
    console.log(`✅ 认证: 成功`);
    console.log(`✅ 获取字段: 成功 (${fields.length} 个字段)`);
    console.log(`✅ 获取记录: 成功 (${records.length} 条记录)`);
    console.log(`✅ 图片令牌: 找到 ${imageTokens.length} 个`);
    console.log(`✅ 图片下载: 已测试前 ${Math.min(3, imageTokens.length)} 个文件`);
    
  } catch (error) {
    console.error('\n💥 权限测试失败:', error.message);
    console.error('=====================================');
    console.error('可能的原因:');
    console.error('1. 应用ID或密钥不正确');
    console.error('2. 应用权限配置不足');
    console.error('3. 表格ID或应用令牌不正确');
    console.error('4. 网络连接问题');
    console.error('5. 飞书API接口变更');
    
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runPermissionTest();
}

module.exports = {
  runPermissionTest,
  getAccessToken,
  testGetTableFields,
  testGetTableRecords,
  testDownloadImages
};
