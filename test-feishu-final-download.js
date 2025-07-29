#!/usr/bin/env node

/**
 * 最终的飞书图片下载测试
 * 使用正确的API方法获取临时下载链接并下载图片
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
 * 获取所有图片文件令牌
 */
async function getAllImageTokens() {
  try {
    console.log('\n📊 获取所有图片文件令牌...');
    
    const token = await getAccessToken();
    
    // 获取表格记录
    const response = await axios.get(
      `${TEST_CONFIG.baseUrl}/open-apis/bitable/v1/apps/${TEST_CONFIG.appToken}/tables/${TEST_CONFIG.tableId}/records`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          page_size: 20  // 获取更多记录
        },
        timeout: 15000
      }
    );
    
    if (response.data.code !== 0) {
      throw new Error(`获取记录失败: ${response.data.msg}`);
    }
    
    const records = response.data.data?.items || [];
    console.log(`✅ 获取到 ${records.length} 条记录`);
    
    // 提取所有图片令牌
    const imageTokens = [];
    
    records.forEach((record, recordIndex) => {
      Object.keys(record.fields).forEach(fieldKey => {
        const fieldValue = record.fields[fieldKey];
        
        if (Array.isArray(fieldValue) && fieldValue.length > 0) {
          fieldValue.forEach((attachment, attachIndex) => {
            if (attachment && attachment.file_token) {
              imageTokens.push({
                recordId: record.record_id,
                recordIndex: recordIndex + 1,
                fieldId: fieldKey,
                attachmentIndex: attachIndex + 1,
                fileToken: attachment.file_token,
                fileName: attachment.name || '未知文件名',
                fileSize: attachment.size || 0
              });
            }
          });
        }
      });
    });
    
    console.log(`✅ 找到 ${imageTokens.length} 个图片文件令牌`);
    return imageTokens;
    
  } catch (error) {
    console.error('❌ 获取图片令牌失败:', error.message);
    throw error;
  }
}

/**
 * 获取临时下载链接
 */
async function getTmpDownloadUrls(fileTokens) {
  try {
    console.log(`\n🔗 获取 ${fileTokens.length} 个文件的临时下载链接...`);
    
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
    
    const response = await axios.get(
      `${TEST_CONFIG.baseUrl}/open-apis/drive/v1/medias/batch_get_tmp_download_url?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    if (response.data.code !== 0) {
      throw new Error(`获取下载链接失败: ${response.data.msg}`);
    }
    
    const tmpUrls = response.data.data.tmp_download_urls || [];
    console.log(`✅ 成功获取 ${tmpUrls.length} 个临时下载链接`);
    
    return tmpUrls;
    
  } catch (error) {
    console.error('❌ 获取临时下载链接失败:', error.message);
    if (error.response) {
      console.error('   HTTP状态:', error.response.status);
      console.error('   响应数据:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * 下载图片文件
 */
async function downloadImages(tmpUrls, imageTokensInfo) {
  try {
    console.log(`\n📸 开始下载 ${tmpUrls.length} 个图片文件...`);
    
    // 创建下载目录
    const downloadDir = path.join(__dirname, 'feishu-downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    
    const results = [];
    
    for (let i = 0; i < tmpUrls.length; i++) {
      const urlInfo = tmpUrls[i];
      const tokenInfo = imageTokensInfo.find(info => info.fileToken === urlInfo.file_token);
      
      console.log(`\n   下载 ${i + 1}/${tmpUrls.length}: ${tokenInfo?.fileName || urlInfo.file_token}`);
      console.log(`   文件令牌: ${urlInfo.file_token}`);
      console.log(`   下载链接: ${urlInfo.tmp_download_url.substring(0, 100)}...`);
      
      try {
        const downloadResponse = await axios.get(urlInfo.tmp_download_url, {
          responseType: 'arraybuffer',
          timeout: 60000,
          maxRedirects: 5
        });
        
        if (downloadResponse.status === 200) {
          const buffer = Buffer.from(downloadResponse.data);
          console.log(`   ✅ 下载成功! 大小: ${(buffer.length / 1024).toFixed(2)} KB`);
          
          // 检查文件类型
          const isJPEG = buffer.slice(0, 2).toString('hex') === 'ffd8';
          const isPNG = buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a';
          const isWebP = buffer.slice(8, 12).toString('ascii') === 'WEBP';
          const isGIF = buffer.slice(0, 6).toString('ascii') === 'GIF87a' || buffer.slice(0, 6).toString('ascii') === 'GIF89a';
          
          let format = '未知';
          let ext = '.bin';
          if (isJPEG) { format = 'JPEG'; ext = '.jpg'; }
          else if (isPNG) { format = 'PNG'; ext = '.png'; }
          else if (isWebP) { format = 'WebP'; ext = '.webp'; }
          else if (isGIF) { format = 'GIF'; ext = '.gif'; }
          
          console.log(`   格式: ${format}`);
          
          // 生成文件名
          const originalName = tokenInfo?.fileName || `file-${urlInfo.file_token}`;
          const baseName = path.parse(originalName).name;
          const fileName = `${baseName}-${urlInfo.file_token}${ext}`;
          const filePath = path.join(downloadDir, fileName);
          
          // 保存文件
          fs.writeFileSync(filePath, buffer);
          console.log(`   已保存到: ${filePath}`);
          
          results.push({
            success: true,
            fileToken: urlInfo.file_token,
            fileName: fileName,
            filePath: filePath,
            size: buffer.length,
            format: format,
            originalName: originalName
          });
          
        } else {
          console.log(`   ❌ 下载失败: HTTP ${downloadResponse.status}`);
          results.push({
            success: false,
            fileToken: urlInfo.file_token,
            error: `HTTP ${downloadResponse.status}`
          });
        }
        
      } catch (downloadError) {
        console.error(`   ❌ 下载失败: ${downloadError.message}`);
        results.push({
          success: false,
          fileToken: urlInfo.file_token,
          error: downloadError.message
        });
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ 下载图片失败:', error.message);
    throw error;
  }
}

/**
 * 主测试函数
 */
async function runFinalDownloadTest() {
  console.log('🚀 最终的飞书多维表格图片下载测试');
  console.log('=====================================');
  console.log('测试配置:');
  console.log(`  App ID: ${TEST_CONFIG.appId}`);
  console.log(`  App Token: ${TEST_CONFIG.appToken}`);
  console.log(`  Table ID: ${TEST_CONFIG.tableId}`);
  console.log('=====================================');
  
  try {
    // 1. 获取所有图片文件令牌
    const imageTokensInfo = await getAllImageTokens();
    
    if (imageTokensInfo.length === 0) {
      console.log('⚠️  没有找到图片文件，测试结束');
      return;
    }
    
    // 2. 提取文件令牌列表（限制数量，避免请求过大）
    const allFileTokens = imageTokensInfo.map(info => info.fileToken);
    const maxTokensPerBatch = 3; // 每批最多处理3个文件
    const fileTokens = allFileTokens.slice(0, maxTokensPerBatch);

    console.log(`📝 总共找到 ${allFileTokens.length} 个文件令牌，本次测试前 ${fileTokens.length} 个`);

    // 3. 获取临时下载链接
    const tmpUrls = await getTmpDownloadUrls(fileTokens);
    
    if (tmpUrls.length === 0) {
      console.log('⚠️  没有获取到下载链接，测试结束');
      return;
    }
    
    // 4. 下载图片文件
    const downloadResults = await downloadImages(tmpUrls, imageTokensInfo);
    
    // 5. 统计结果
    const successCount = downloadResults.filter(r => r.success).length;
    const failCount = downloadResults.filter(r => !r.success).length;
    
    console.log('\n🎉 最终下载测试完成!');
    console.log('=====================================');
    console.log('测试结果总结:');
    console.log(`✅ 认证: 成功`);
    console.log(`✅ 获取图片令牌: 成功 (${imageTokensInfo.length} 个)`);
    console.log(`✅ 获取下载链接: 成功 (${tmpUrls.length} 个)`);
    console.log(`✅ 下载成功: ${successCount} 个文件`);
    console.log(`❌ 下载失败: ${failCount} 个文件`);
    
    if (successCount > 0) {
      console.log('\n📁 成功下载的文件:');
      downloadResults.filter(r => r.success).forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.fileName} (${(result.size / 1024).toFixed(2)} KB, ${result.format})`);
      });
      
      console.log(`\n📂 文件保存位置: ${path.join(__dirname, 'feishu-downloads')}`);
    }
    
    if (failCount > 0) {
      console.log('\n❌ 下载失败的文件:');
      downloadResults.filter(r => !r.success).forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.fileToken}: ${result.error}`);
      });
    }
    
  } catch (error) {
    console.error('\n💥 最终下载测试失败:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  runFinalDownloadTest();
}

module.exports = {
  runFinalDownloadTest,
  getAllImageTokens,
  getTmpDownloadUrls,
  downloadImages
};
