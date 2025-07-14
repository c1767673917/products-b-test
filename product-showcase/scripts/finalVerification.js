#!/usr/bin/env node

/**
 * 最终验证React无限重渲染修复效果的脚本
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 最终验证React无限重渲染修复效果...\n');

// 检查关键修复点
const criticalFixes = [
  {
    file: 'src/pages/ProductList/ProductListWithQuery.tsx',
    description: 'ProductListWithQuery gridOptions稳定化',
    check: (content) => {
      return content.includes('const gridOptions = useMemo(() => ({') &&
             content.includes('}), [viewMode]);') &&
             content.includes('gridOptions');
    }
  },
  {
    file: 'src/hooks/useResponsiveGrid.ts',
    description: 'useResponsiveGrid config依赖优化',
    check: (content) => {
      return content.includes('options.minCardWidth,') &&
             content.includes('options.maxColumns,') &&
             content.includes('options.gap,') &&
             content.includes('options.padding');
    }
  },
  {
    file: 'src/hooks/useResponsiveGrid.ts',
    description: 'useResponsiveGrid useEffect直接计算',
    check: (content) => {
      return content.includes('// 直接在useEffect中计算，避免函数依赖') &&
             content.includes('setGridCalculation(newCalculation);') &&
             !content.includes('const newCalculation = calculateGrid();');
    }
  }
];

let allFixesApplied = true;
let totalChecks = 0;
let passedChecks = 0;

criticalFixes.forEach(fix => {
  totalChecks++;
  const filePath = path.join(__dirname, '..', fix.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ 文件不存在: ${fix.file}`);
    allFixesApplied = false;
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  
  if (fix.check(content)) {
    console.log(`✅ ${fix.description}`);
    passedChecks++;
  } else {
    console.log(`❌ ${fix.description}`);
    allFixesApplied = false;
  }
});

// 检查是否有潜在的问题模式
const problemPatterns = [
  {
    file: 'src/hooks/useResponsiveGrid.ts',
    pattern: /useEffect\(\(\) => \{[\s\S]*?calculateGrid\(\)[\s\S]*?\}, \[.*calculateGrid.*\]/,
    description: '检查是否还有calculateGrid函数依赖'
  },
  {
    file: 'src/pages/ProductList/ProductListWithQuery.tsx',
    pattern: /useResponsiveGrid\([^)]*\{[^}]*\}[^)]*\)/,
    description: '检查是否还有内联对象传递给useResponsiveGrid'
  }
];

console.log('\n🔍 检查潜在问题模式...');

problemPatterns.forEach(pattern => {
  totalChecks++;
  const filePath = path.join(__dirname, '..', pattern.file);
  
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (pattern.pattern.test(content)) {
      console.log(`⚠️  发现潜在问题: ${pattern.description}`);
      allFixesApplied = false;
    } else {
      console.log(`✅ 未发现问题: ${pattern.description}`);
      passedChecks++;
    }
  }
});

// 检查调试工具
const debugToolPath = path.join(__dirname, '..', 'src/utils/useEffectDebugger.ts');
if (fs.existsSync(debugToolPath)) {
  console.log('✅ useEffect调试工具存在');
  passedChecks++;
} else {
  console.log('❌ useEffect调试工具缺失');
}
totalChecks++;

// 检查测试页面
const testPagePath = path.join(__dirname, '..', 'src/pages/TestResponsiveGrid.tsx');
if (fs.existsSync(testPagePath)) {
  console.log('✅ 响应式网格测试页面已创建');
  passedChecks++;
} else {
  console.log('❌ 响应式网格测试页面缺失');
}
totalChecks++;

console.log('\n' + '='.repeat(60));
console.log(`📊 最终检查结果: ${passedChecks}/${totalChecks} 项通过`);

if (allFixesApplied && passedChecks === totalChecks) {
  console.log('🎉 所有关键修复已应用！');
  console.log('\n📋 验证步骤:');
  console.log('1. 访问 http://localhost:5173/ 检查主页面');
  console.log('2. 访问 http://localhost:5173/test-responsive-grid 检查测试页面');
  console.log('3. 打开浏览器开发者工具，检查控制台');
  console.log('4. 确认不再出现"Maximum update depth exceeded"错误');
  console.log('5. 测试产品列表的响应式布局功能');
  console.log('6. 在测试页面观察渲染次数，确保不超过合理范围');
  
  console.log('\n🔧 如果仍有问题，请检查:');
  console.log('- 浏览器控制台的具体错误信息');
  console.log('- 测试页面的渲染次数计数器');
  console.log('- 开发者工具中的React DevTools Profiler');
  
  process.exit(0);
} else {
  console.log('❌ 部分修复未完成或存在问题');
  console.log('\n🔧 需要检查的问题:');
  
  if (passedChecks < totalChecks) {
    console.log('- 确保所有关键修复都已正确应用');
    console.log('- 检查文件内容是否符合预期的修复模式');
  }
  
  console.log('- 手动检查浏览器控制台是否还有错误');
  console.log('- 使用测试页面验证渲染次数是否正常');
  
  process.exit(1);
}
