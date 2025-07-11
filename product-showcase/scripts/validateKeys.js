#!/usr/bin/env node

/**
 * React Key唯一性验证脚本
 * 
 * 用于验证产品数据中的ID是否唯一，以及检查可能导致React重复key警告的问题
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 验证React Key唯一性...\n');

// 读取产品数据
const productsPath = path.join(__dirname, '../src/data/products.json');
if (!fs.existsSync(productsPath)) {
  console.error('❌ 找不到产品数据文件:', productsPath);
  process.exit(1);
}

const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
console.log(`📊 加载了 ${products.length} 个产品\n`);

// 验证ID唯一性
console.log('1️⃣ 验证ID唯一性...');
const idMap = new Map();
const duplicateIds = [];

products.forEach((product, index) => {
  if (!product.id) {
    console.log(`   ❌ 产品索引 ${index} 缺少ID: ${product.name || 'Unknown'}`);
    return;
  }
  
  if (idMap.has(product.id)) {
    duplicateIds.push({
      id: product.id,
      indices: [idMap.get(product.id), index],
      names: [products[idMap.get(product.id)].name, product.name]
    });
  } else {
    idMap.set(product.id, index);
  }
});

if (duplicateIds.length === 0) {
  console.log('   ✅ 所有产品ID都是唯一的');
} else {
  console.log(`   ❌ 发现 ${duplicateIds.length} 个重复ID:`);
  duplicateIds.forEach(dup => {
    console.log(`      - ID: "${dup.id}"`);
    console.log(`        产品1: ${dup.names[0]} (索引: ${dup.indices[0]})`);
    console.log(`        产品2: ${dup.names[1]} (索引: ${dup.indices[1]})`);
  });
}

// 验证序号字段
console.log('\n2️⃣ 验证序号字段...');
const sequenceMap = new Map();
const duplicateSequences = [];
const emptySequences = [];

products.forEach((product, index) => {
  if (!product.sequence || product.sequence.trim() === '') {
    emptySequences.push({
      index,
      id: product.id,
      name: product.name
    });
    return;
  }
  
  const sequence = product.sequence.trim();
  if (sequenceMap.has(sequence)) {
    const existing = sequenceMap.get(sequence);
    if (existing.count === 1) {
      duplicateSequences.push({
        sequence,
        products: [
          { index: existing.index, id: products[existing.index].id, name: products[existing.index].name },
          { index, id: product.id, name: product.name }
        ]
      });
    } else {
      const dupRecord = duplicateSequences.find(d => d.sequence === sequence);
      dupRecord.products.push({ index, id: product.id, name: product.name });
    }
    existing.count++;
  } else {
    sequenceMap.set(sequence, { count: 1, index });
  }
});

console.log(`   序号统计: ${sequenceMap.size} 个唯一序号`);

if (emptySequences.length > 0) {
  console.log(`   ⚠️ ${emptySequences.length} 个产品缺少序号:`);
  emptySequences.slice(0, 5).forEach(item => {
    console.log(`      - ${item.name} (ID: ${item.id})`);
  });
  if (emptySequences.length > 5) {
    console.log(`      ... 还有 ${emptySequences.length - 5} 个`);
  }
}

if (duplicateSequences.length > 0) {
  console.log(`   ⚠️ ${duplicateSequences.length} 个重复序号:`);
  duplicateSequences.slice(0, 5).forEach(dup => {
    console.log(`      - 序号: "${dup.sequence}" (${dup.products.length} 个产品)`);
    dup.products.slice(0, 3).forEach(p => {
      console.log(`        ${p.name} (ID: ${p.id})`);
    });
  });
  if (duplicateSequences.length > 5) {
    console.log(`      ... 还有 ${duplicateSequences.length - 5} 个重复序号`);
  }
}

// 检查常见的重复模式
console.log('\n3️⃣ 检查常见重复模式...');
const patterns = {
  'SM-': products.filter(p => p.id === 'SM-').length,
  'DRF-': products.filter(p => p.id === 'DRF-').length,
  'HM-': products.filter(p => p.id === 'HM-').length,
  'PDL-': products.filter(p => p.id === 'PDL-').length
};

let hasPatternIssues = false;
Object.entries(patterns).forEach(([pattern, count]) => {
  if (count > 1) {
    console.log(`   ❌ "${pattern}" 作为ID出现了 ${count} 次`);
    hasPatternIssues = true;
  } else if (count === 1) {
    console.log(`   ⚠️ "${pattern}" 作为ID出现了 1 次 (可能不完整)`);
  }
});

if (!hasPatternIssues) {
  console.log('   ✅ 未发现常见的重复模式');
}

// 验证必要字段
console.log('\n4️⃣ 验证必要字段...');
const fieldIssues = [];

products.forEach((product, index) => {
  const issues = [];
  
  if (!product.id) issues.push('缺少id');
  if (!product.name) issues.push('缺少name');
  if (!product.recordId) issues.push('缺少recordId');
  if (!product.category?.primary) issues.push('缺少category.primary');
  if (typeof product.price?.normal !== 'number') issues.push('price.normal无效');
  
  if (issues.length > 0) {
    fieldIssues.push({
      index,
      id: product.id || 'Unknown',
      name: product.name || 'Unknown',
      issues
    });
  }
});

if (fieldIssues.length === 0) {
  console.log('   ✅ 所有产品都有必要字段');
} else {
  console.log(`   ❌ ${fieldIssues.length} 个产品缺少必要字段:`);
  fieldIssues.slice(0, 5).forEach(item => {
    console.log(`      - ${item.name}: ${item.issues.join(', ')}`);
  });
  if (fieldIssues.length > 5) {
    console.log(`      ... 还有 ${fieldIssues.length - 5} 个问题产品`);
  }
}

// 生成验证报告
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalProducts: products.length,
    uniqueIds: idMap.size,
    duplicateIds: duplicateIds.length,
    duplicateSequences: duplicateSequences.length,
    emptySequences: emptySequences.length,
    fieldIssues: fieldIssues.length,
    isValid: duplicateIds.length === 0 && fieldIssues.length === 0
  },
  details: {
    duplicateIds,
    duplicateSequences,
    emptySequences,
    fieldIssues,
    patterns
  }
};

const reportPath = path.join(__dirname, '../src/data/validation_report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

// 总结
console.log('\n📋 验证总结');
console.log('============');
console.log(`总产品数: ${products.length}`);
console.log(`唯一ID数: ${idMap.size}`);
console.log(`重复ID: ${duplicateIds.length > 0 ? '❌' : '✅'} ${duplicateIds.length}`);
console.log(`重复序号: ${duplicateSequences.length > 0 ? '⚠️' : '✅'} ${duplicateSequences.length}`);
console.log(`字段问题: ${fieldIssues.length > 0 ? '❌' : '✅'} ${fieldIssues.length}`);
console.log(`整体状态: ${report.summary.isValid ? '✅ 通过' : '❌ 需要修复'}`);

console.log(`\n📄 详细报告已保存到: ${reportPath}`);

if (!report.summary.isValid) {
  console.log('\n🔧 建议修复步骤:');
  if (duplicateIds.length > 0) {
    console.log('1. 运行修复脚本: node scripts/fixDuplicateKeys.js');
  }
  if (fieldIssues.length > 0) {
    console.log('2. 检查并修复数据源中的缺失字段');
  }
  console.log('3. 重新运行此验证脚本确认修复效果');
}

process.exit(report.summary.isValid ? 0 : 1);
