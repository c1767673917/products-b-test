#!/usr/bin/env node

/**
 * 配置更新验证脚本
 * 验证MongoDB和MinIO配置是否已正确更新为本地服务器配置
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始验证配置更新...\n');

// 验证后端.env文件
function verifyBackendEnv() {
  console.log('1. 验证后端 .env 文件配置...');
  
  const envPath = path.join(__dirname, 'products-backend/.env');
  if (!fs.existsSync(envPath)) {
    console.log('❌ 后端 .env 文件不存在');
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // 检查MongoDB配置
  const mongodbCheck = envContent.includes('MONGODB_URI=mongodb://lcsg:1VyUJHWqFBoiOr5dOwgqctKwSn1RqWf@localhost:27017/products?authSource=admin');
  console.log(`   MongoDB配置: ${mongodbCheck ? '✅' : '❌'} ${mongodbCheck ? 'localhost:27017' : '配置错误'}`);
  
  // 检查MinIO配置
  const minioEndpointCheck = envContent.includes('MINIO_ENDPOINT=localhost');
  const minioPortCheck = envContent.includes('MINIO_PORT=9000');
  const minioAccessKeyCheck = envContent.includes('MINIO_ACCESS_KEY=lcsm');
  const minioSecretKeyCheck = envContent.includes('MINIO_SECRET_KEY=Sa2482047260');
  
  console.log(`   MinIO端点: ${minioEndpointCheck ? '✅' : '❌'} ${minioEndpointCheck ? 'localhost:9000' : '配置错误'}`);
  console.log(`   MinIO访问密钥: ${minioAccessKeyCheck ? '✅' : '❌'} ${minioAccessKeyCheck ? 'lcsm' : '配置错误'}`);
  console.log(`   MinIO秘密密钥: ${minioSecretKeyCheck ? '✅' : '❌'} ${minioSecretKeyCheck ? 'Sa2482047260' : '配置错误'}`);
  
  return mongodbCheck && minioEndpointCheck && minioPortCheck && minioAccessKeyCheck && minioSecretKeyCheck;
}

// 验证后端imageConfig.ts文件
function verifyImageConfig() {
  console.log('\n2. 验证后端 imageConfig.ts 文件配置...');
  
  const configPath = path.join(__dirname, 'products-backend/src/config/imageConfig.ts');
  if (!fs.existsSync(configPath)) {
    console.log('❌ imageConfig.ts 文件不存在');
    return false;
  }
  
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  const endpointCheck = configContent.includes("ENDPOINT: process.env.MINIO_ENDPOINT || 'localhost'");
  const secretKeyCheck = configContent.includes("SECRET_KEY: process.env.MINIO_SECRET_KEY || 'Sa2482047260'");
  
  console.log(`   默认端点配置: ${endpointCheck ? '✅' : '❌'} ${endpointCheck ? 'localhost' : '配置错误'}`);
  console.log(`   默认秘密密钥: ${secretKeyCheck ? '✅' : '❌'} ${secretKeyCheck ? 'Sa2482047260' : '配置错误'}`);
  
  return endpointCheck && secretKeyCheck;
}

// 验证前端.env文件
function verifyFrontendEnv() {
  console.log('\n3. 验证前端 .env 文件配置...');
  
  const envPath = path.join(__dirname, 'product-showcase/.env');
  if (!fs.existsSync(envPath)) {
    console.log('❌ 前端 .env 文件不存在');
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const imageUrlCheck = envContent.includes('VITE_IMAGE_BASE_URL=http://localhost:9000');
  console.log(`   图片服务URL: ${imageUrlCheck ? '✅' : '❌'} ${imageUrlCheck ? 'http://localhost:9000' : '配置错误'}`);
  
  return imageUrlCheck;
}

// 验证前端api.ts文件
function verifyFrontendApiConfig() {
  console.log('\n4. 验证前端 api.ts 文件配置...');
  
  const configPath = path.join(__dirname, 'product-showcase/src/config/api.ts');
  if (!fs.existsSync(configPath)) {
    console.log('❌ api.ts 文件不存在');
    return false;
  }
  
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  const imageBaseUrlCheck = configContent.includes("imageBaseURL: import.meta.env.VITE_IMAGE_BASE_URL || 'http://localhost:9000'");
  console.log(`   默认图片服务URL: ${imageBaseUrlCheck ? '✅' : '❌'} ${imageBaseUrlCheck ? 'http://localhost:9000' : '配置错误'}`);
  
  return imageBaseUrlCheck;
}

// 执行验证
const backendEnvResult = verifyBackendEnv();
const imageConfigResult = verifyImageConfig();
const frontendEnvResult = verifyFrontendEnv();
const frontendApiResult = verifyFrontendApiConfig();

console.log('\n📋 验证结果汇总:');
console.log('================');
console.log(`后端环境配置: ${backendEnvResult ? '✅ 通过' : '❌ 失败'}`);
console.log(`后端图片配置: ${imageConfigResult ? '✅ 通过' : '❌ 失败'}`);
console.log(`前端环境配置: ${frontendEnvResult ? '✅ 通过' : '❌ 失败'}`);
console.log(`前端API配置: ${frontendApiResult ? '✅ 通过' : '❌ 失败'}`);

const allPassed = backendEnvResult && imageConfigResult && frontendEnvResult && frontendApiResult;
console.log(`\n🎯 总体结果: ${allPassed ? '✅ 所有配置更新成功' : '❌ 部分配置更新失败'}`);

if (allPassed) {
  console.log('\n🚀 配置更新完成！新的配置参数:');
  console.log('MongoDB: mongodb://lcsg:1VyUJHWqFBoiOr5dOwgqctKwSn1RqWf@localhost:27017/products?authSource=admin');
  console.log('MinIO API: http://localhost:9000');
  console.log('MinIO 控制台: http://localhost:9001');
  console.log('访问密钥: lcsm');
  console.log('秘密密钥: Sa2482047260');
}

process.exit(allPassed ? 0 : 1);
