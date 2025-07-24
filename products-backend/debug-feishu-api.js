#!/usr/bin/env node

/**
 * 调试飞书API响应
 * 直接调用飞书API查看实际响应内容
 */

require('dotenv').config();
const axios = require('axios');

// 测试文件令牌
const testFileToken = 'Vnjsb2KTsouUWBx6oiVcthhinL0';

async function getFeishuAccessToken() {
  try {
    console.log('🔑 获取飞书访问令牌...');
    
    const response = await axios.post(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
        app_id: process.env.FEISHU_APP_ID,
        app_secret: process.env.FEISHU_APP_SECRET
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.code !== 0) {
      throw new Error(`获取令牌失败: ${response.data.msg}`);
    }
    
    console.log('✅ 访问令牌获取成功');
    return response.data.tenant_access_token;
    
  } catch (error) {
    console.error('❌ 获取访问令牌失败:', error.message);
    throw error;
  }
}

async function testDownloadAPI() {
  try {
    console.log('🚀 开始调试飞书下载API...');
    
    // 获取访问令牌
    const accessToken = await getFeishuAccessToken();
    
    // 测试下载API
    console.log(`\n📸 测试文件令牌: ${testFileToken}`);
    console.log('🔗 调用下载API...');
    
    const downloadResponse = await axios.get(
      `https://open.feishu.cn/open-apis/drive/v1/medias/${testFileToken}/download`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('\n📋 API响应详情:');
    console.log('状态码:', downloadResponse.status);
    console.log('响应头:', JSON.stringify(downloadResponse.headers, null, 2));
    console.log('响应体:', JSON.stringify(downloadResponse.data, null, 2));
    
    // 分析响应
    const { code, msg, data } = downloadResponse.data;
    
    console.log('\n🔍 响应分析:');
    console.log(`- code: ${code}`);
    console.log(`- msg: ${msg}`);
    console.log(`- data 存在: ${!!data}`);
    
    if (data) {
      console.log(`- download_url 存在: ${!!data.download_url}`);
      console.log(`- download_url 值: ${data.download_url || 'undefined'}`);
      
      // 列出data中的所有字段
      console.log('- data 中的所有字段:', Object.keys(data));
      
      if (data.download_url) {
        console.log('\n✅ 找到下载链接，尝试下载图片...');
        
        try {
          const imageResponse = await axios.get(data.download_url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          const imageBuffer = Buffer.from(imageResponse.data);
          console.log(`✅ 图片下载成功! 大小: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
          
        } catch (downloadError) {
          console.error('❌ 图片下载失败:', downloadError.message);
        }
      } else {
        console.log('❌ 响应中没有 download_url 字段');
      }
    } else {
      console.log('❌ 响应中没有 data 字段');
    }
    
    // 如果API调用失败，提供可能的解决方案
    if (code !== 0) {
      console.log('\n💡 可能的解决方案:');
      console.log('1. 检查文件令牌是否有效');
      console.log('2. 检查应用权限是否包含文件下载权限');
      console.log('3. 检查文件是否还存在于飞书中');
      console.log('4. 检查API版本是否正确');
    }
    
  } catch (error) {
    console.error('💥 调试失败:', error.message);
    
    if (error.response) {
      console.log('\n📋 错误响应详情:');
      console.log('状态码:', error.response.status);
      console.log('响应体:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 运行调试
testDownloadAPI();
