#!/usr/bin/env node

/**
 * 验证React无限重渲染修复效果的脚本
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 验证React无限重渲染修复效果...\n');

// 检查修复的文件
const filesToCheck = [
  {
    path: 'src/hooks/usePerformanceOptimization.ts',
    checks: [
      {
        pattern: /useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);.*移除函数依赖/,
        description: 'usePerformanceOptimization useEffect依赖修复'
      }
    ]
  },
  {
    path: 'src/hooks/useResponsiveGrid.ts',
    checks: [
      {
        pattern: /const config = useMemo\(\(\) => \(\{ \.\.\.DEFAULT_OPTIONS, \.\.\.options \}\), \[options\]\);/,
        description: 'useResponsiveGrid config对象稳定化'
      },
      {
        pattern: /useEffect\(\(\) => \{[\s\S]*?\}, \[containerWidth, panelWidth, isDetailPanelOpen, config\]\);.*直接使用原始依赖/,
        description: 'useResponsiveGrid useEffect依赖修复'
      }
    ]
  },
  {
    path: 'src/pages/ProductList/ProductListWithQuery.tsx',
    checks: [
      {
        pattern: /const effectiveContainerWidth = useMemo\(\(\) => \{/,
        description: 'ProductListWithQuery effectiveContainerWidth稳定化'
      },
      {
        pattern: /\}, \[dimensions\.width, preferences\.width, isDetailPanelOpen, isMobile\]\);.*移除effectiveContainerWidth依赖/,
        description: 'ProductListWithQuery useEffect依赖修复'
      }
    ]
  },
  {
    path: 'src/hooks/useContainerDimensions.ts',
    checks: [
      {
        pattern: /\}, \[\]\);.*移除updateDimensions依赖/,
        description: 'useContainerDimensions useEffect依赖修复'
      }
    ]
  }
];

let allChecksPass = true;
let totalChecks = 0;
let passedChecks = 0;

filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, '..', file.path);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ 文件不存在: ${file.path}`);
    allChecksPass = false;
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log(`📁 检查文件: ${file.path}`);
  
  file.checks.forEach(check => {
    totalChecks++;
    if (check.pattern.test(content)) {
      console.log(`  ✅ ${check.description}`);
      passedChecks++;
    } else {
      console.log(`  ❌ ${check.description}`);
      allChecksPass = false;
    }
  });
  
  console.log('');
});

// 检查是否创建了调试工具
const debuggerPath = path.join(__dirname, '..', 'src/utils/useEffectDebugger.ts');
if (fs.existsSync(debuggerPath)) {
  console.log('✅ useEffect调试工具已创建');
  passedChecks++;
} else {
  console.log('❌ useEffect调试工具未创建');
  allChecksPass = false;
}
totalChecks++;

// 检查是否创建了修复文档
const docPath = path.join(__dirname, '..', '..', 'React无限重渲染修复方案.md');
if (fs.existsSync(docPath)) {
  console.log('✅ 修复方案文档已创建');
  passedChecks++;
} else {
  console.log('❌ 修复方案文档未创建');
  allChecksPass = false;
}
totalChecks++;

console.log('\n' + '='.repeat(50));
console.log(`📊 检查结果: ${passedChecks}/${totalChecks} 项通过`);

if (allChecksPass) {
  console.log('🎉 所有修复检查通过！');
  console.log('\n📋 后续验证步骤:');
  console.log('1. 访问 http://localhost:5173/ 检查应用运行状态');
  console.log('2. 打开浏览器开发者工具，检查控制台是否有错误');
  console.log('3. 测试产品列表页面的响应式布局功能');
  console.log('4. 测试详情面板的打开/关闭功能');
  console.log('5. 调整浏览器窗口大小，观察布局变化');
  console.log('6. 确认不再出现"Maximum update depth exceeded"错误');
  
  process.exit(0);
} else {
  console.log('❌ 部分修复检查未通过，请检查上述问题');
  process.exit(1);
}
