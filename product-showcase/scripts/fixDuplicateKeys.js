#!/usr/bin/env node

/**
 * React应用重复Key错误紧急修复脚本
 * 
 * 此脚本用于立即修复当前产品数据中的重复ID问题
 * 通过为重复的产品生成唯一的ID来解决React key重复警告
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 开始修复重复Key错误...\n');

// 读取当前产品数据
const productsPath = path.join(__dirname, '../src/data/products.json');
if (!fs.existsSync(productsPath)) {
  console.error('❌ 找不到产品数据文件:', productsPath);
  process.exit(1);
}

console.log('📖 读取产品数据...');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
console.log(`   加载了 ${products.length} 个产品`);

// 分析重复ID
console.log('🔍 分析重复ID...');
const idMap = new Map();
const duplicates = [];

products.forEach((product, index) => {
  if (idMap.has(product.id)) {
    const existing = idMap.get(product.id);
    if (existing.count === 1) {
      // 第一次发现重复，将原始产品也加入重复列表
      duplicates.push({
        id: product.id,
        indices: [existing.index, index],
        products: [products[existing.index], product]
      });
    } else {
      // 已知重复，添加到现有记录
      const dupRecord = duplicates.find(d => d.id === product.id);
      dupRecord.indices.push(index);
      dupRecord.products.push(product);
    }
    existing.count++;
  } else {
    idMap.set(product.id, { count: 1, index });
  }
});

console.log(`   发现 ${duplicates.length} 个重复ID`);
console.log(`   影响 ${duplicates.reduce((sum, dup) => sum + dup.indices.length, 0)} 个产品`);

if (duplicates.length === 0) {
  console.log('✅ 没有发现重复ID，无需修复');
  process.exit(0);
}

// 显示重复ID详情
console.log('\n📋 重复ID详情:');
duplicates.slice(0, 10).forEach((dup, index) => {
  console.log(`   ${index + 1}. ID: "${dup.id}" (${dup.indices.length} 个产品)`);
  dup.products.slice(0, 3).forEach((product, pIndex) => {
    console.log(`      - ${product.name} (recordId: ${product.recordId})`);
  });
  if (dup.products.length > 3) {
    console.log(`      ... 还有 ${dup.products.length - 3} 个产品`);
  }
});

if (duplicates.length > 10) {
  console.log(`   ... 还有 ${duplicates.length - 10} 个重复ID`);
}

// 创建备份
console.log('\n💾 创建备份...');
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `products_backup_${timestamp}.json`);
fs.writeFileSync(backupPath, JSON.stringify(products, null, 2));
console.log(`   备份保存到: ${backupPath}`);

// 修复重复ID
console.log('\n🔧 修复重复ID...');
let fixedCount = 0;

duplicates.forEach(dup => {
  // 保留第一个产品的原始ID，为其他产品生成新ID
  dup.indices.slice(1).forEach((productIndex, dupIndex) => {
    const product = products[productIndex];
    const originalId = product.id;
    
    // 生成新的唯一ID
    let newId;
    if (product.recordId) {
      // 优先使用recordId作为新ID
      newId = product.recordId;
    } else {
      // 使用原ID + 序号的方式
      newId = `${originalId}_${dupIndex + 1}`;
    }
    
    // 确保新ID是唯一的
    let counter = 1;
    let finalId = newId;
    while (products.some((p, i) => i !== productIndex && p.id === finalId)) {
      finalId = `${newId}_${counter}`;
      counter++;
    }
    
    // 更新产品ID
    product.id = finalId;
    
    // 如果产品有uniqueCode字段，也更新它
    if (product.uniqueCode === originalId) {
      product.uniqueCode = finalId;
    }
    
    fixedCount++;
    console.log(`   ✅ ${product.name}: "${originalId}" → "${finalId}"`);
  });
});

console.log(`\n📊 修复完成: ${fixedCount} 个产品ID已更新`);

// 验证修复结果
console.log('\n🔍 验证修复结果...');
const newIdMap = new Map();
const stillDuplicated = [];

products.forEach((product, index) => {
  if (newIdMap.has(product.id)) {
    stillDuplicated.push({
      id: product.id,
      name: product.name,
      index
    });
  } else {
    newIdMap.set(product.id, index);
  }
});

if (stillDuplicated.length > 0) {
  console.log(`❌ 仍有 ${stillDuplicated.length} 个重复ID:`);
  stillDuplicated.forEach(dup => {
    console.log(`   - ID: "${dup.id}", 产品: ${dup.name}`);
  });
  console.log('\n请检查数据并手动修复剩余问题');
} else {
  console.log('✅ 所有ID现在都是唯一的');
}

// 保存修复后的数据
console.log('\n💾 保存修复后的数据...');
fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
console.log(`   已保存到: ${productsPath}`);

// 生成修复报告
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalProducts: products.length,
    duplicatesFound: duplicates.length,
    productsFixed: fixedCount,
    stillDuplicated: stillDuplicated.length,
    success: stillDuplicated.length === 0
  },
  duplicatesFixed: duplicates.map(dup => ({
    originalId: dup.id,
    affectedProducts: dup.products.length,
    productNames: dup.products.map(p => p.name)
  })),
  backup: backupPath
};

const reportPath = path.join(__dirname, '../src/data/fix_report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`   修复报告保存到: ${reportPath}`);

// 最终总结
console.log('\n🎉 修复完成！');
console.log('================');
console.log(`总产品数: ${products.length}`);
console.log(`修复的产品: ${fixedCount}`);
console.log(`唯一ID数: ${newIdMap.size}`);
console.log(`修复成功: ${stillDuplicated.length === 0 ? '✅ 是' : '❌ 否'}`);

if (stillDuplicated.length === 0) {
  console.log('\n🚀 下一步:');
  console.log('1. 启动应用: npm run dev');
  console.log('2. 检查控制台是否还有重复key警告');
  console.log('3. 如果有问题，可以恢复备份:');
  console.log(`   cp "${backupPath}" "${productsPath}"`);
} else {
  console.log('\n⚠️ 注意: 仍有重复ID需要手动处理');
  console.log('建议检查数据源并重新处理');
}

process.exit(stillDuplicated.length === 0 ? 0 : 1);
