# React应用重复Key错误修复方案

## 🎯 问题分析

### 当前问题
React应用控制台出现大量重复key错误警告：
```
Encountered two children with the same key, `SM-`. Keys should be unique so that components maintain their identity across updates.
Encountered two children with the same key, `DRF-`. Keys should be unique so that components maintain their identity across updates.
```

### 根本原因
1. **数据源问题**：原始数据中的"序号"字段存在不完整的值（如"SM-"、"DRF-"），导致多个产品使用相同的序号
2. **ID生成逻辑**：当前代码使用"序号"字段作为产品的唯一ID，但该字段存在重复值
3. **React Key使用**：组件渲染时使用product.id作为key，重复的ID导致React警告

## 🔧 解决方案概述

基于飞书表格新增的"编号"列（包含唯一标识符），设计以下修复方案：

### 核心策略
1. **主键切换**：使用新的"编号"字段作为产品的主要唯一标识符
2. **向后兼容**：保留"序号"字段用于图片路径映射和显示
3. **数据验证**：添加唯一性检查和数据完整性验证
4. **渐进式迁移**：确保现有功能不受影响

## 📋 实施步骤

### 第一阶段：数据结构更新

#### 1.1 更新产品类型定义

**文件：`src/types/product.ts`**

```typescript
export interface Product {
  id: string;           // 使用新的"编号"字段作为主键
  uniqueCode: string;   // 新增：存储"编号"字段的值
  recordId: string;     // 保留：飞书记录ID
  name: string;
  sequence: string;     // 保留：用于图片路径映射和显示
  
  // ... 其他字段保持不变
}

// 新增：原始数据接口更新
interface RawProductData {
  record_id: string;
  编号: string;         // 新增：唯一编号字段
  序号: string;         // 保留：用于图片路径
  产品品名: string;
  // ... 其他字段
}
```

#### 1.2 更新数据处理脚本

**文件：`scripts/processData.js`**

```javascript
// 提取唯一编号
function extractUniqueCode(rawData) {
  // 优先使用"编号"字段
  if (rawData.编号 && rawData.编号.trim()) {
    return rawData.编号.trim();
  }
  
  // 回退到record_id + 序号的组合
  const sequence = rawData.序号?.trim() || '';
  return `${rawData.record_id}_${sequence}`;
}

// 更新产品转换函数
function csvRowToProduct(row) {
  try {
    const uniqueCode = extractUniqueCode(row);
    const sequence = row.序号?.trim() || '';
    
    if (!uniqueCode || !row.品名) return null;

    const product = {
      id: uniqueCode,           // 使用唯一编号作为ID
      uniqueCode: uniqueCode,   // 存储编号值
      recordId: row.record_id,
      name: row.品名.trim(),
      sequence: sequence,       // 保留序号用于图片路径
      
      // 图片路径仍使用序号生成
      images: {
        front: getImagePath(sequence, '正面图片'),
        back: row.背面图片 ? getImagePath(sequence, '背面图片') : undefined,
        // ... 其他图片
      },
      
      // ... 其他字段处理
    };

    return product;
  } catch (error) {
    console.error('转换产品数据失败:', error);
    return null;
  }
}
```

### 第二阶段：数据验证和清洗

#### 2.1 添加数据验证函数

**文件：`scripts/dataValidator.js`**

```javascript
// 验证产品数据唯一性
function validateProductUniqueness(products) {
  const idSet = new Set();
  const duplicates = [];
  const issues = [];

  products.forEach((product, index) => {
    // 检查ID唯一性
    if (idSet.has(product.id)) {
      duplicates.push({
        id: product.id,
        name: product.name,
        index: index
      });
    } else {
      idSet.add(product.id);
    }

    // 检查必要字段
    if (!product.id || !product.name || !product.uniqueCode) {
      issues.push({
        index: index,
        product: product.name || 'Unknown',
        issue: 'Missing required fields'
      });
    }
  });

  return {
    isValid: duplicates.length === 0 && issues.length === 0,
    duplicates,
    issues,
    totalProducts: products.length,
    uniqueProducts: idSet.size
  };
}

// 生成数据质量报告
function generateDataQualityReport(products) {
  const validation = validateProductUniqueness(products);
  
  console.log('\n📊 数据质量报告');
  console.log('================');
  console.log(`总产品数: ${validation.totalProducts}`);
  console.log(`唯一产品数: ${validation.uniqueProducts}`);
  console.log(`重复ID数: ${validation.duplicates.length}`);
  console.log(`数据问题数: ${validation.issues.length}`);
  
  if (validation.duplicates.length > 0) {
    console.log('\n❌ 重复ID列表:');
    validation.duplicates.forEach(dup => {
      console.log(`  - ID: ${dup.id}, 产品: ${dup.name}`);
    });
  }
  
  if (validation.issues.length > 0) {
    console.log('\n⚠️ 数据问题:');
    validation.issues.forEach(issue => {
      console.log(`  - 产品: ${issue.product}, 问题: ${issue.issue}`);
    });
  }
  
  return validation;
}
```

#### 2.2 更新主处理脚本

**文件：`scripts/processData.js`**

```javascript
// 在主处理函数中添加验证
async function processData() {
  try {
    console.log('🚀 开始处理产品数据...');
    
    // 读取和转换数据
    const products = await loadAndTransformData();
    
    // 数据验证
    console.log('🔍 验证数据质量...');
    const validation = generateDataQualityReport(products);
    
    if (!validation.isValid) {
      console.error('❌ 数据验证失败，请检查数据质量');
      process.exit(1);
    }
    
    console.log('✅ 数据验证通过');
    
    // 保存处理后的数据
    await saveProcessedData(products);
    
    console.log('🎉 数据处理完成');
  } catch (error) {
    console.error('❌ 数据处理失败:', error);
    process.exit(1);
  }
}
```

### 第三阶段：组件和服务层更新

#### 3.1 更新数据服务

**文件：`src/services/dataService.ts`**

```typescript
export class DataService {
  private products: Product[] = [];
  
  // 根据唯一编号获取产品
  async fetchProductByUniqueCode(uniqueCode: string): Promise<Product | null> {
    await simulateDelay(200);
    const product = this.products.find(p => p.uniqueCode === uniqueCode);
    return product || null;
  }
  
  // 兼容性方法：根据序号获取产品
  async fetchProductBySequence(sequence: string): Promise<Product[]> {
    await simulateDelay(200);
    return this.products.filter(p => p.sequence === sequence);
  }
  
  // 数据完整性检查
  validateDataIntegrity(): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const idSet = new Set<string>();
    
    this.products.forEach((product, index) => {
      // 检查ID唯一性
      if (idSet.has(product.id)) {
        issues.push(`重复ID: ${product.id} (产品: ${product.name})`);
      } else {
        idSet.add(product.id);
      }
      
      // 检查必要字段
      if (!product.uniqueCode) {
        issues.push(`产品 ${product.name} 缺少唯一编号`);
      }
    });
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
}
```

#### 3.2 更新React组件

**文件：`src/pages/ProductList/ProductListWithQuery.tsx`**

```typescript
// 确保使用唯一ID作为key
{paginatedProducts.map((product) => (
  <ProductCard
    key={product.id}  // 现在使用唯一的编号作为key
    product={product}
    layout={viewMode}
    onQuickAction={(action) => handleProductAction(product, action)}
    isFavorited={favorites.includes(product.id)}
    isInCompare={compareList.includes(product.id)}
  />
))}
```

### 第四阶段：图片资源兼容性处理

#### 4.1 更新图片路径生成逻辑

**文件：`utils/imageUtils.ts`**

```typescript
// 图片路径生成函数
export function generateImagePath(
  sequence: string,  // 仍使用序号生成路径
  imageType: string,
  uniqueCode?: string  // 可选的唯一编号，用于回退
): string {
  if (!sequence && !uniqueCode) return '';
  
  // 优先使用序号生成路径（保持现有图片资源兼容）
  const pathKey = sequence || uniqueCode;
  
  // 根据序号前缀确定文件扩展名
  let extension = 'png';
  if (pathKey.startsWith('HM-')) {
    extension = 'jpg';
  } else if (pathKey.startsWith('PDL-')) {
    // PDL的图片有混合格式，需要特殊处理
    extension = determineExtensionForPDL(pathKey, imageType);
  }
  
  return `/images/${pathKey}_${imageType}_0.${extension}`;
}

// 图片资源验证
export function validateImageResources(products: Product[]): {
  missingImages: Array<{
    productId: string;
    productName: string;
    missingTypes: string[];
  }>;
  totalImages: number;
  availableImages: number;
} {
  const missingImages: any[] = [];
  let totalImages = 0;
  let availableImages = 0;
  
  products.forEach(product => {
    const missingTypes: string[] = [];
    
    Object.entries(product.images).forEach(([type, path]) => {
      totalImages++;
      if (path) {
        // 这里可以添加实际的文件存在性检查
        availableImages++;
      } else {
        missingTypes.push(type);
      }
    });
    
    if (missingTypes.length > 0) {
      missingImages.push({
        productId: product.id,
        productName: product.name,
        missingTypes
      });
    }
  });
  
  return {
    missingImages,
    totalImages,
    availableImages
  };
}
```

## 🧪 测试和验证

### 测试脚本

**文件：`scripts/testDataIntegrity.js`**

```javascript
// 数据完整性测试
function runDataIntegrityTests() {
  console.log('🧪 运行数据完整性测试...');
  
  const products = loadProducts();
  
  // 测试1: ID唯一性
  const idTest = testIdUniqueness(products);
  console.log(`✅ ID唯一性测试: ${idTest.passed ? '通过' : '失败'}`);
  
  // 测试2: 必要字段完整性
  const fieldsTest = testRequiredFields(products);
  console.log(`✅ 字段完整性测试: ${fieldsTest.passed ? '通过' : '失败'}`);
  
  // 测试3: 图片路径有效性
  const imagesTest = testImagePaths(products);
  console.log(`✅ 图片路径测试: ${imagesTest.passed ? '通过' : '失败'}`);
  
  return {
    allPassed: idTest.passed && fieldsTest.passed && imagesTest.passed,
    results: { idTest, fieldsTest, imagesTest }
  };
}
```

## 📦 部署和迁移

### 迁移步骤

1. **备份现有数据**
   ```bash
   cp src/data/products.json src/data/products.backup.json
   cp src/data/stats.json src/data/stats.backup.json
   ```

2. **更新数据源**
   - 从飞书获取包含"编号"字段的最新数据
   - 运行数据处理脚本生成新的产品数据

3. **验证数据质量**
   ```bash
   node scripts/testDataIntegrity.js
   ```

4. **部署更新**
   - 更新代码到生产环境
   - 验证React控制台不再出现重复key警告

### 回滚计划

如果出现问题，可以快速回滚：
```bash
# 恢复备份数据
cp src/data/products.backup.json src/data/products.json
cp src/data/stats.backup.json src/data/stats.json

# 重启应用
npm run dev
```

## 🔍 监控和维护

### 数据质量监控

1. **定期检查**：每次数据更新后运行完整性测试
2. **错误日志**：监控React控制台是否出现新的key重复警告
3. **性能监控**：确保新的ID生成逻辑不影响应用性能

### 长期维护

1. **数据源管理**：确保飞书表格的"编号"字段始终保持唯一性
2. **代码审查**：新增组件时确保正确使用product.id作为key
3. **文档更新**：更新开发文档，说明新的数据结构和ID使用规范

## ✅ 预期效果

实施此方案后，预期达到以下效果：

1. **消除重复Key警告**：React控制台不再出现重复key错误
2. **数据一致性**：每个产品都有唯一的标识符
3. **向后兼容**：现有图片资源和显示逻辑正常工作
4. **可维护性**：清晰的数据结构和验证机制
5. **性能稳定**：不影响应用的渲染性能

通过这个全面的解决方案，可以彻底解决React应用中的重复key问题，同时保持系统的稳定性和可维护性。

## 📝 具体实现代码

### 1. 更新产品类型定义

**文件：`src/types/product.ts`**

```typescript
// 产品相关类型定义
export interface Product {
  id: string;           // 主键：使用唯一编号
  uniqueCode: string;   // 唯一编号（来自飞书"编号"字段）
  recordId: string;     // 飞书记录ID
  name: string;
  sequence: string;     // 序号（用于图片路径和显示）

  // 分类信息
  category: {
    primary: string;
    secondary: string;
  };

  // 价格信息
  price: {
    normal: number;
    discount?: number;
    discountRate?: number;
  };

  // 图片信息
  images: {
    front?: string;
    back?: string;
    label?: string;
    package?: string;
    gift?: string;
  };

  // 产地信息
  origin: {
    country: string;
    province: string;
    city: string;
  };

  // 其他信息
  platform: string;
  specification: string;
  flavor?: string;
  manufacturer?: string;
  collectTime: number;
  link?: string;
  boxSpec?: string;
  notes?: string;
}

// 原始数据接口（飞书数据结构）
export interface RawProductData {
  record_id: string;
  编号?: string;        // 新增：唯一编号字段
  序号?: string;        // 保留：序号字段
  产品品名?: string;
  '产地（国家）'?: string;
  '产地（市）'?: string;
  '产地（省）'?: string;
  单混?: string;
  品名?: string;
  品类一级?: string;
  品类二级?: string;
  商品链接?: string;
  标签照片?: string;
  正常售价?: string;
  正面图片?: string;
  规格?: string;
  采集平台?: string;
  采集时间?: string;
  优惠到手价?: string;
  口味?: string;
  委托方?: string;
  生产商?: string;
  背面图片?: string;
  外包装图片?: string;
  箱规?: string;
  赠品图片?: string;
  备注?: string;
}

// 数据验证结果接口
export interface DataValidationResult {
  isValid: boolean;
  totalProducts: number;
  uniqueProducts: number;
  duplicates: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  issues: Array<{
    productId: string;
    productName: string;
    issue: string;
  }>;
}
```

### 2. 数据处理核心逻辑

**文件：`scripts/processData.js`**

```javascript
const fs = require('fs');
const path = require('path');

// 提取唯一编号的策略
function extractUniqueCode(rawData) {
  // 策略1: 优先使用"编号"字段
  if (rawData.编号 && typeof rawData.编号 === 'string' && rawData.编号.trim()) {
    return rawData.编号.trim();
  }

  // 策略2: 如果编号字段是数组格式（飞书API返回）
  if (rawData.编号 && Array.isArray(rawData.编号) && rawData.编号.length > 0) {
    const codeValue = rawData.编号[0];
    if (typeof codeValue === 'string') {
      return codeValue.trim();
    }
    if (typeof codeValue === 'object' && codeValue.text) {
      return codeValue.text.trim();
    }
  }

  // 策略3: 使用record_id作为唯一标识
  if (rawData.record_id) {
    return rawData.record_id;
  }

  // 策略4: 生成临时唯一ID
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 提取序号（用于图片路径）
function extractSequence(rawData) {
  // 从序号字段提取
  if (rawData.序号) {
    if (typeof rawData.序号 === 'string') {
      return rawData.序号.trim();
    }
    if (Array.isArray(rawData.序号) && rawData.序号.length > 0) {
      const seqValue = rawData.序号[0];
      if (typeof seqValue === 'string') {
        return seqValue.trim();
      }
      if (typeof seqValue === 'object' && seqValue.text) {
        return seqValue.text.trim();
      }
    }
  }

  // 回退到使用唯一编号
  return extractUniqueCode(rawData);
}

// 数据转换函数
function transformRawDataToProduct(rawData) {
  try {
    const uniqueCode = extractUniqueCode(rawData);
    const sequence = extractSequence(rawData);

    if (!uniqueCode) {
      console.warn('跳过无效数据：缺少唯一标识符', rawData);
      return null;
    }

    // 提取产品名称
    const name = rawData.品名 || rawData.产品品名 || '';
    if (!name.trim()) {
      console.warn('跳过无效数据：缺少产品名称', rawData);
      return null;
    }

    // 价格处理
    const normalPrice = parseFloat(rawData.正常售价) || 0;
    const discountPrice = rawData.优惠到手价 ? parseFloat(rawData.优惠到手价) : undefined;
    const discountRate = discountPrice && normalPrice > 0
      ? Math.round(((normalPrice - discountPrice) / normalPrice) * 100)
      : undefined;

    // 图片路径生成（仍使用序号）
    const images = {
      front: getImagePath(sequence, '正面图片'),
      back: rawData.背面图片 ? getImagePath(sequence, '背面图片') : undefined,
      label: rawData.标签照片 ? getImagePath(sequence, '标签照片') : undefined,
      package: rawData.外包装图片 ? getImagePath(sequence, '外包装图片') : undefined,
      gift: rawData.赠品图片 ? getImagePath(sequence, '赠品图片') : undefined,
    };

    const product = {
      id: uniqueCode,           // 使用唯一编号作为主键
      uniqueCode: uniqueCode,   // 存储唯一编号
      recordId: rawData.record_id || '',
      name: name.trim(),
      sequence: sequence,       // 保留序号用于图片路径

      category: {
        primary: rawData.品类一级?.trim() || '',
        secondary: rawData.品类二级?.trim() || '',
      },

      price: {
        normal: normalPrice,
        discount: discountPrice,
        discountRate: discountRate,
      },

      images: images,

      origin: {
        country: rawData['产地（国家）']?.trim() || '',
        province: rawData['产地（省）']?.trim() || '',
        city: rawData['产地（市）']?.trim() || '',
      },

      platform: rawData.采集平台?.trim() || '',
      specification: rawData.规格?.trim() || '',
      flavor: rawData.口味?.trim() || undefined,
      manufacturer: rawData.生产商?.trim() || undefined,
      collectTime: rawData.采集时间 ? parseInt(rawData.采集时间) : Date.now(),
      link: rawData.商品链接?.trim() || undefined,
      boxSpec: rawData.箱规?.trim() || undefined,
      notes: rawData.备注?.trim() || undefined,
    };

    return product;
  } catch (error) {
    console.error('转换产品数据失败:', error, rawData);
    return null;
  }
}

// 数据验证函数
function validateProducts(products) {
  const idMap = new Map();
  const duplicates = [];
  const issues = [];

  products.forEach((product, index) => {
    // 检查ID唯一性
    if (idMap.has(product.id)) {
      const existing = idMap.get(product.id);
      duplicates.push({
        id: product.id,
        name: product.name,
        count: existing.count + 1,
        indices: [...existing.indices, index]
      });
      existing.count++;
      existing.indices.push(index);
    } else {
      idMap.set(product.id, {
        count: 1,
        indices: [index]
      });
    }

    // 检查必要字段
    if (!product.uniqueCode) {
      issues.push({
        productId: product.id,
        productName: product.name,
        issue: '缺少唯一编号'
      });
    }

    if (!product.name) {
      issues.push({
        productId: product.id,
        productName: 'Unknown',
        issue: '缺少产品名称'
      });
    }

    if (!product.category.primary) {
      issues.push({
        productId: product.id,
        productName: product.name,
        issue: '缺少主要分类'
      });
    }
  });

  return {
    isValid: duplicates.length === 0 && issues.length === 0,
    totalProducts: products.length,
    uniqueProducts: idMap.size,
    duplicates: duplicates,
    issues: issues
  };
}

// 主处理函数
async function processData() {
  try {
    console.log('🚀 开始处理产品数据...');

    // 读取原始数据
    const rawDataPath = path.join(__dirname, '../src/data/raw_data.json');
    if (!fs.existsSync(rawDataPath)) {
      throw new Error('找不到原始数据文件: ' + rawDataPath);
    }

    const rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf-8'));
    console.log(`📖 读取到 ${rawData.length} 条原始数据`);

    // 转换数据
    console.log('🔄 转换数据格式...');
    const products = rawData
      .map(item => transformRawDataToProduct(item.fields || item))
      .filter(product => product !== null);

    console.log(`✅ 成功转换 ${products.length} 个产品`);

    // 验证数据
    console.log('🔍 验证数据质量...');
    const validation = validateProducts(products);

    console.log('\n📊 数据质量报告');
    console.log('================');
    console.log(`总产品数: ${validation.totalProducts}`);
    console.log(`唯一产品数: ${validation.uniqueProducts}`);
    console.log(`重复ID数: ${validation.duplicates.length}`);
    console.log(`数据问题数: ${validation.issues.length}`);

    if (validation.duplicates.length > 0) {
      console.log('\n❌ 重复ID列表:');
      validation.duplicates.forEach(dup => {
        console.log(`  - ID: ${dup.id}, 产品: ${dup.name}, 重复次数: ${dup.count}`);
      });
    }

    if (validation.issues.length > 0) {
      console.log('\n⚠️ 数据问题:');
      validation.issues.slice(0, 10).forEach(issue => {
        console.log(`  - 产品: ${issue.productName}, 问题: ${issue.issue}`);
      });
      if (validation.issues.length > 10) {
        console.log(`  ... 还有 ${validation.issues.length - 10} 个问题`);
      }
    }

    if (!validation.isValid) {
      console.error('\n❌ 数据验证失败，请检查数据质量');
      // 在开发环境中，我们继续处理，但会记录问题
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    } else {
      console.log('\n✅ 数据验证通过');
    }

    // 按唯一编号排序
    products.sort((a, b) => a.uniqueCode.localeCompare(b.uniqueCode));

    // 生成统计信息
    console.log('📈 生成统计信息...');
    const stats = generateStats(products);

    // 保存处理后的数据
    const outputDir = path.join(__dirname, '../src/data');

    // 保存产品数据
    const productsPath = path.join(outputDir, 'products.json');
    fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
    console.log(`💾 产品数据已保存到: ${productsPath}`);

    // 保存统计数据
    const statsPath = path.join(outputDir, 'stats.json');
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    console.log(`📊 统计数据已保存到: ${statsPath}`);

    // 保存验证报告
    const validationPath = path.join(outputDir, 'validation_report.json');
    fs.writeFileSync(validationPath, JSON.stringify(validation, null, 2));
    console.log(`📋 验证报告已保存到: ${validationPath}`);

    console.log('\n🎉 数据处理完成！');

  } catch (error) {
    console.error('❌ 数据处理失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  processData();
}

module.exports = {
  processData,
  transformRawDataToProduct,
  validateProducts,
  extractUniqueCode,
  extractSequence
};
```

### 3. 数据服务层更新

**文件：`src/services/dataService.ts`**

```typescript
// 数据服务类
import type { Product, FilterState, DataStats, DataValidationResult } from '../types/product';
import productsData from '../data/products.json';
import statsData from '../data/stats.json';
import validationData from '../data/validation_report.json';

// 模拟API延迟
const simulateDelay = (ms: number = 500) =>
  new Promise(resolve => setTimeout(resolve, ms));

export class DataService {
  private products: Product[] = [];
  private stats: DataStats;
  private validationReport: DataValidationResult;

  constructor() {
    this.products = productsData as Product[];
    this.stats = statsData as DataStats;
    this.validationReport = validationData as DataValidationResult;

    // 启动时验证数据完整性
    this.validateDataIntegrity();
  }

  // 数据完整性验证
  private validateDataIntegrity(): void {
    const issues: string[] = [];
    const idSet = new Set<string>();

    this.products.forEach((product, index) => {
      // 检查ID唯一性
      if (idSet.has(product.id)) {
        issues.push(`重复ID: ${product.id} (产品: ${product.name})`);
      } else {
        idSet.add(product.id);
      }

      // 检查必要字段
      if (!product.uniqueCode) {
        issues.push(`产品 ${product.name} 缺少唯一编号`);
      }

      if (!product.id) {
        issues.push(`产品索引 ${index} 缺少ID`);
      }
    });

    if (issues.length > 0) {
      console.warn('数据完整性问题:', issues);
    } else {
      console.log('✅ 数据完整性验证通过');
    }
  }

  // 获取所有产品
  async fetchAllProducts(): Promise<Product[]> {
    await simulateDelay(300);
    return this.products;
  }

  // 根据唯一编号获取产品
  async fetchProductByUniqueCode(uniqueCode: string): Promise<Product | null> {
    await simulateDelay(200);
    const product = this.products.find(p => p.uniqueCode === uniqueCode);
    return product || null;
  }

  // 根据ID获取产品（主要方法）
  async fetchProductById(id: string): Promise<Product | null> {
    await simulateDelay(200);
    const product = this.products.find(p => p.id === id);
    return product || null;
  }

  // 兼容性方法：根据序号获取产品
  async fetchProductsBySequence(sequence: string): Promise<Product[]> {
    await simulateDelay(200);
    return this.products.filter(p => p.sequence === sequence);
  }

  // 批量获取产品
  async fetchProductsByIds(ids: string[]): Promise<Product[]> {
    await simulateDelay(300);
    return this.products.filter(p => ids.includes(p.id));
  }

  // 获取数据统计
  async fetchStats(): Promise<DataStats> {
    await simulateDelay(100);
    return this.stats;
  }

  // 获取验证报告
  getValidationReport(): DataValidationResult {
    return this.validationReport;
  }

  // 搜索产品
  searchProducts(
    query: string,
    fields: string[] = ['name', 'category', 'specification'],
    limit: number = 50
  ): Product[] {
    if (!query.trim()) return [];

    const searchTerm = query.toLowerCase().trim();
    const results: Array<{ product: Product; score: number }> = [];

    this.products.forEach(product => {
      let score = 0;

      // 搜索产品名称
      if (fields.includes('name') && product.name.toLowerCase().includes(searchTerm)) {
        score += product.name.toLowerCase().indexOf(searchTerm) === 0 ? 10 : 5;
      }

      // 搜索分类
      if (fields.includes('category')) {
        if (product.category.primary.toLowerCase().includes(searchTerm)) {
          score += 3;
        }
        if (product.category.secondary.toLowerCase().includes(searchTerm)) {
          score += 2;
        }
      }

      // 搜索规格
      if (fields.includes('specification') && product.specification.toLowerCase().includes(searchTerm)) {
        score += 2;
      }

      // 搜索口味
      if (fields.includes('flavor') && product.flavor?.toLowerCase().includes(searchTerm)) {
        score += 2;
      }

      // 搜索生产商
      if (fields.includes('manufacturer') && product.manufacturer?.toLowerCase().includes(searchTerm)) {
        score += 1;
      }

      if (score > 0) {
        results.push({ product, score });
      }
    });

    // 按分数排序并返回指定数量的结果
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(result => result.product);
  }

  // 获取热门产品（有优惠的产品）
  getPopularProducts(limit: number = 8): Product[] {
    return this.products
      .filter(product => product.price.discount !== undefined)
      .sort((a, b) => {
        const aDiscount = a.price.discountRate || 0;
        const bDiscount = b.price.discountRate || 0;
        return bDiscount - aDiscount; // 按折扣率降序
      })
      .slice(0, limit);
  }

  // 获取最新产品（按采集时间）
  getLatestProducts(limit: number = 8): Product[] {
    return this.products
      .sort((a, b) => b.collectTime - a.collectTime)
      .slice(0, limit);
  }

  // 获取相关产品推荐
  getRelatedProducts(productId: string, limit: number = 4): Product[] {
    const targetProduct = this.products.find(p => p.id === productId);
    if (!targetProduct) return [];

    const related = this.products
      .filter(p => p.id !== productId)
      .map(product => {
        let score = 0;

        // 同一主要分类
        if (product.category.primary === targetProduct.category.primary) {
          score += 5;
        }

        // 同一次要分类
        if (product.category.secondary === targetProduct.category.secondary) {
          score += 3;
        }

        // 同一平台
        if (product.platform === targetProduct.platform) {
          score += 2;
        }

        // 相似价格区间
        const priceDiff = Math.abs(product.price.normal - targetProduct.price.normal);
        if (priceDiff < targetProduct.price.normal * 0.3) {
          score += 1;
        }

        return { product, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.product);

    return related;
  }
}

// 创建单例实例
export const dataService = new DataService();
```

### 4. React组件更新

**文件：`src/pages/ProductList/ProductListWithQuery.tsx`**

```typescript
// 关键部分的更新
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProducts } from '../../hooks/useProducts';
import { ProductCard } from '../../components/product/ProductCard';
import type { Product, ViewMode, SortOption } from '../../types/product';

const ProductListWithQuery: React.FC = () => {
  // ... 其他状态和逻辑

  // 确保使用唯一ID作为key
  const renderProductList = () => {
    return (
      <motion.div
        layout
        className={cn(
          "gap-6",
          viewMode === 'grid'
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "space-y-4"
        )}
      >
        <AnimatePresence mode="popLayout">
          {paginatedProducts.map((product) => (
            <ProductCard
              key={product.id}  // 使用唯一的ID作为key
              product={product}
              layout={viewMode}
              onQuickAction={(action) => handleProductAction(product, action)}
              isFavorited={favorites.includes(product.id)}
              isInCompare={compareList.includes(product.id)}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    );
  };

  // 处理产品操作时使用唯一ID
  const handleProductAction = (product: Product, action: 'favorite' | 'compare' | 'detail') => {
    switch (action) {
      case 'favorite':
        setFavorites(prev =>
          prev.includes(product.id)
            ? prev.filter(id => id !== product.id)
            : [...prev, product.id]
        );
        showSuccess(
          favorites.includes(product.id) ? '已取消收藏' : '已添加到收藏'
        );
        break;
      case 'compare':
        if (compareList.length >= 4) {
          showError('最多只能对比4个产品');
          return;
        }
        if (compareList.includes(product.id)) {
          showInfo('该产品已在对比列表中');
          return;
        }
        setCompareList(prev => [...prev, product.id]);
        showSuccess('已添加到对比列表');
        break;
      case 'detail':
        // 使用唯一ID导航到详情页
        navigate(`/products/${product.id}`);
        break;
    }
  };

  // ... 其他组件逻辑

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部和筛选器 */}
      {/* ... */}

      {/* 产品列表 */}
      <div className="flex-1">
        {paginatedProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">没有找到匹配的产品</div>
            <div className="text-gray-400 text-sm mt-2">
              尝试调整搜索条件或筛选器
            </div>
          </div>
        ) : (
          <>
            {renderProductList()}

            {/* 分页组件 */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductListWithQuery;
```

### 5. 数据完整性测试脚本

**文件：`scripts/testDataIntegrity.js`**

```javascript
const fs = require('fs');
const path = require('path');

// 加载产品数据
function loadProducts() {
  const productsPath = path.join(__dirname, '../src/data/products.json');
  if (!fs.existsSync(productsPath)) {
    throw new Error('产品数据文件不存在');
  }
  return JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
}

// 测试ID唯一性
function testIdUniqueness(products) {
  const idSet = new Set();
  const duplicates = [];

  products.forEach((product, index) => {
    if (idSet.has(product.id)) {
      duplicates.push({
        id: product.id,
        name: product.name,
        index: index
      });
    } else {
      idSet.add(product.id);
    }
  });

  return {
    passed: duplicates.length === 0,
    totalProducts: products.length,
    uniqueIds: idSet.size,
    duplicates: duplicates
  };
}

// 测试必要字段完整性
function testRequiredFields(products) {
  const issues = [];

  products.forEach((product, index) => {
    const missingFields = [];

    if (!product.id) missingFields.push('id');
    if (!product.uniqueCode) missingFields.push('uniqueCode');
    if (!product.name) missingFields.push('name');
    if (!product.category?.primary) missingFields.push('category.primary');
    if (typeof product.price?.normal !== 'number') missingFields.push('price.normal');

    if (missingFields.length > 0) {
      issues.push({
        index: index,
        productId: product.id || 'Unknown',
        productName: product.name || 'Unknown',
        missingFields: missingFields
      });
    }
  });

  return {
    passed: issues.length === 0,
    totalProducts: products.length,
    validProducts: products.length - issues.length,
    issues: issues
  };
}

// 测试图片路径有效性
function testImagePaths(products) {
  const imageIssues = [];
  let totalImages = 0;
  let validImages = 0;

  products.forEach((product, index) => {
    const productIssues = [];

    Object.entries(product.images || {}).forEach(([type, path]) => {
      totalImages++;

      if (!path) {
        productIssues.push(`${type}: 路径为空`);
      } else if (typeof path !== 'string') {
        productIssues.push(`${type}: 路径类型错误`);
      } else if (!path.includes(product.sequence) && !path.includes(product.uniqueCode)) {
        productIssues.push(`${type}: 路径与产品标识符不匹配`);
      } else {
        validImages++;
      }
    });

    if (productIssues.length > 0) {
      imageIssues.push({
        index: index,
        productId: product.id,
        productName: product.name,
        issues: productIssues
      });
    }
  });

  return {
    passed: imageIssues.length === 0,
    totalImages: totalImages,
    validImages: validImages,
    issues: imageIssues
  };
}

// 测试数据一致性
function testDataConsistency(products) {
  const issues = [];

  products.forEach((product, index) => {
    // 检查价格逻辑
    if (product.price.discount && product.price.discount >= product.price.normal) {
      issues.push({
        index: index,
        productId: product.id,
        productName: product.name,
        issue: '优惠价格大于等于正常价格'
      });
    }

    // 检查折扣率计算
    if (product.price.discount && product.price.discountRate) {
      const calculatedRate = Math.round(((product.price.normal - product.price.discount) / product.price.normal) * 100);
      if (Math.abs(calculatedRate - product.price.discountRate) > 1) {
        issues.push({
          index: index,
          productId: product.id,
          productName: product.name,
          issue: `折扣率计算错误: 期望${calculatedRate}%, 实际${product.price.discountRate}%`
        });
      }
    }

    // 检查采集时间
    if (product.collectTime && (product.collectTime < 0 || product.collectTime > Date.now() + 86400000)) {
      issues.push({
        index: index,
        productId: product.id,
        productName: product.name,
        issue: '采集时间异常'
      });
    }
  });

  return {
    passed: issues.length === 0,
    totalProducts: products.length,
    issues: issues
  };
}

// 运行所有测试
function runAllTests() {
  console.log('🧪 开始运行数据完整性测试...\n');

  try {
    const products = loadProducts();
    console.log(`📊 加载了 ${products.length} 个产品\n`);

    // 测试1: ID唯一性
    console.log('1️⃣ 测试ID唯一性...');
    const idTest = testIdUniqueness(products);
    console.log(`   结果: ${idTest.passed ? '✅ 通过' : '❌ 失败'}`);
    console.log(`   总产品数: ${idTest.totalProducts}`);
    console.log(`   唯一ID数: ${idTest.uniqueIds}`);
    if (!idTest.passed) {
      console.log(`   重复ID数: ${idTest.duplicates.length}`);
      idTest.duplicates.slice(0, 5).forEach(dup => {
        console.log(`     - ID: ${dup.id}, 产品: ${dup.name}`);
      });
      if (idTest.duplicates.length > 5) {
        console.log(`     ... 还有 ${idTest.duplicates.length - 5} 个重复ID`);
      }
    }
    console.log('');

    // 测试2: 必要字段完整性
    console.log('2️⃣ 测试必要字段完整性...');
    const fieldsTest = testRequiredFields(products);
    console.log(`   结果: ${fieldsTest.passed ? '✅ 通过' : '❌ 失败'}`);
    console.log(`   有效产品数: ${fieldsTest.validProducts}/${fieldsTest.totalProducts}`);
    if (!fieldsTest.passed) {
      console.log(`   问题产品数: ${fieldsTest.issues.length}`);
      fieldsTest.issues.slice(0, 3).forEach(issue => {
        console.log(`     - 产品: ${issue.productName}, 缺少字段: ${issue.missingFields.join(', ')}`);
      });
      if (fieldsTest.issues.length > 3) {
        console.log(`     ... 还有 ${fieldsTest.issues.length - 3} 个问题产品`);
      }
    }
    console.log('');

    // 测试3: 图片路径有效性
    console.log('3️⃣ 测试图片路径有效性...');
    const imagesTest = testImagePaths(products);
    console.log(`   结果: ${imagesTest.passed ? '✅ 通过' : '❌ 失败'}`);
    console.log(`   有效图片数: ${imagesTest.validImages}/${imagesTest.totalImages}`);
    if (!imagesTest.passed) {
      console.log(`   问题产品数: ${imagesTest.issues.length}`);
      imagesTest.issues.slice(0, 3).forEach(issue => {
        console.log(`     - 产品: ${issue.productName}`);
        issue.issues.slice(0, 2).forEach(img => {
          console.log(`       ${img}`);
        });
      });
    }
    console.log('');

    // 测试4: 数据一致性
    console.log('4️⃣ 测试数据一致性...');
    const consistencyTest = testDataConsistency(products);
    console.log(`   结果: ${consistencyTest.passed ? '✅ 通过' : '❌ 失败'}`);
    if (!consistencyTest.passed) {
      console.log(`   一致性问题数: ${consistencyTest.issues.length}`);
      consistencyTest.issues.slice(0, 3).forEach(issue => {
        console.log(`     - 产品: ${issue.productName}, 问题: ${issue.issue}`);
      });
    }
    console.log('');

    // 总结
    const allPassed = idTest.passed && fieldsTest.passed && imagesTest.passed && consistencyTest.passed;
    console.log('📋 测试总结');
    console.log('===========');
    console.log(`总体结果: ${allPassed ? '✅ 所有测试通过' : '❌ 存在问题'}`);
    console.log(`ID唯一性: ${idTest.passed ? '✅' : '❌'}`);
    console.log(`字段完整性: ${fieldsTest.passed ? '✅' : '❌'}`);
    console.log(`图片路径: ${imagesTest.passed ? '✅' : '❌'}`);
    console.log(`数据一致性: ${consistencyTest.passed ? '✅' : '❌'}`);

    // 保存测试报告
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        allPassed: allPassed,
        totalProducts: products.length
      },
      tests: {
        idUniqueness: idTest,
        requiredFields: fieldsTest,
        imagePaths: imagesTest,
        dataConsistency: consistencyTest
      }
    };

    const reportPath = path.join(__dirname, '../src/data/test_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 测试报告已保存到: ${reportPath}`);

    return allPassed;

  } catch (error) {
    console.error('❌ 测试运行失败:', error);
    return false;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const success = runAllTests();
  process.exit(success ? 0 : 1);
}

module.exports = {
  runAllTests,
  testIdUniqueness,
  testRequiredFields,
  testImagePaths,
  testDataConsistency
};
```

## 🚀 部署和执行指南

### 执行步骤

#### 1. 备份现有数据

```bash
# 创建备份目录
mkdir -p backups/$(date +%Y%m%d_%H%M%S)

# 备份现有数据文件
cp src/data/products.json backups/$(date +%Y%m%d_%H%M%S)/
cp src/data/stats.json backups/$(date +%Y%m%d_%H%M%S)/

echo "✅ 数据备份完成"
```

#### 2. 更新数据源

```bash
# 从飞书获取最新数据（包含"编号"字段）
# 将新数据保存为 src/data/raw_data.json

# 验证新数据格式
node -e "
const data = require('./src/data/raw_data.json');
console.log('数据条数:', data.length);
console.log('示例数据字段:', Object.keys(data[0].fields || data[0]));
const hasUniqueCode = data.some(item => (item.fields || item)['编号']);
console.log('包含编号字段:', hasUniqueCode ? '✅' : '❌');
"
```

#### 3. 运行数据处理

```bash
# 处理数据
node scripts/processData.js

# 验证处理结果
echo "检查生成的文件..."
ls -la src/data/products.json
ls -la src/data/stats.json
ls -la src/data/validation_report.json
```

#### 4. 运行完整性测试

```bash
# 运行数据完整性测试
node scripts/testDataIntegrity.js

# 检查测试结果
if [ $? -eq 0 ]; then
  echo "✅ 所有测试通过"
else
  echo "❌ 测试失败，请检查数据"
  exit 1
fi
```

#### 5. 启动应用验证

```bash
# 启动开发服务器
npm run dev

# 在浏览器中访问 http://localhost:5173/
# 检查控制台是否还有重复key警告
```

### 自动化脚本

**文件：`scripts/deploy-fix.sh`**

```bash
#!/bin/bash

# React应用重复Key错误修复部署脚本
set -e

echo "🚀 开始部署重复Key错误修复方案..."

# 检查必要文件
echo "📋 检查必要文件..."
if [ ! -f "src/data/raw_data.json" ]; then
  echo "❌ 错误: 找不到原始数据文件 src/data/raw_data.json"
  echo "请确保已从飞书获取包含'编号'字段的最新数据"
  exit 1
fi

if [ ! -f "scripts/processData.js" ]; then
  echo "❌ 错误: 找不到数据处理脚本 scripts/processData.js"
  exit 1
fi

if [ ! -f "scripts/testDataIntegrity.js" ]; then
  echo "❌ 错误: 找不到测试脚本 scripts/testDataIntegrity.js"
  exit 1
fi

# 创建备份
echo "💾 创建数据备份..."
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -f "src/data/products.json" ]; then
  cp src/data/products.json "$BACKUP_DIR/"
  echo "✅ 备份 products.json"
fi

if [ -f "src/data/stats.json" ]; then
  cp src/data/stats.json "$BACKUP_DIR/"
  echo "✅ 备份 stats.json"
fi

echo "📁 备份保存在: $BACKUP_DIR"

# 验证原始数据
echo "🔍 验证原始数据..."
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('src/data/raw_data.json', 'utf-8'));
console.log('数据条数:', data.length);

let hasUniqueCode = false;
let sampleFields = [];

if (data.length > 0) {
  const sample = data[0].fields || data[0];
  sampleFields = Object.keys(sample);
  hasUniqueCode = sampleFields.includes('编号') || data.some(item => {
    const fields = item.fields || item;
    return fields['编号'] !== undefined;
  });
}

console.log('示例字段:', sampleFields.slice(0, 10).join(', '));
console.log('包含编号字段:', hasUniqueCode ? '✅ 是' : '❌ 否');

if (!hasUniqueCode) {
  console.error('❌ 原始数据中未找到编号字段，请检查数据源');
  process.exit(1);
}
"

if [ $? -ne 0 ]; then
  echo "❌ 原始数据验证失败"
  exit 1
fi

# 处理数据
echo "🔄 处理数据..."
node scripts/processData.js

if [ $? -ne 0 ]; then
  echo "❌ 数据处理失败"
  exit 1
fi

# 运行完整性测试
echo "🧪 运行完整性测试..."
node scripts/testDataIntegrity.js

if [ $? -ne 0 ]; then
  echo "❌ 完整性测试失败"
  echo "🔄 正在恢复备份数据..."

  if [ -f "$BACKUP_DIR/products.json" ]; then
    cp "$BACKUP_DIR/products.json" src/data/
  fi

  if [ -f "$BACKUP_DIR/stats.json" ]; then
    cp "$BACKUP_DIR/stats.json" src/data/
  fi

  echo "📁 数据已恢复，请检查问题后重试"
  exit 1
fi

# 检查生成的文件
echo "📊 检查生成的文件..."
echo "products.json: $(wc -l < src/data/products.json) 行"
echo "stats.json: $(wc -l < src/data/stats.json) 行"

if [ -f "src/data/validation_report.json" ]; then
  echo "validation_report.json: ✅ 已生成"
else
  echo "validation_report.json: ❌ 未生成"
fi

# 验证产品数据中的ID唯一性
echo "🔍 最终验证ID唯一性..."
node -e "
const products = require('./src/data/products.json');
const ids = products.map(p => p.id);
const uniqueIds = new Set(ids);

console.log('总产品数:', products.length);
console.log('唯一ID数:', uniqueIds.size);

if (ids.length === uniqueIds.size) {
  console.log('✅ 所有产品ID都是唯一的');
} else {
  console.log('❌ 发现重复ID:', ids.length - uniqueIds.size, '个');
  process.exit(1);
}
"

if [ $? -ne 0 ]; then
  echo "❌ 最终验证失败"
  exit 1
fi

echo ""
echo "🎉 修复方案部署成功！"
echo ""
echo "📋 部署总结:"
echo "  - 数据备份: $BACKUP_DIR"
echo "  - 处理产品数: $(node -e "console.log(require('./src/data/products.json').length)")"
echo "  - ID唯一性: ✅ 通过"
echo "  - 数据完整性: ✅ 通过"
echo ""
echo "🚀 下一步:"
echo "  1. 启动应用: npm run dev"
echo "  2. 访问: http://localhost:5173/"
echo "  3. 检查控制台是否还有重复key警告"
echo ""
echo "如果出现问题，可以使用以下命令恢复备份:"
echo "  cp $BACKUP_DIR/products.json src/data/"
echo "  cp $BACKUP_DIR/stats.json src/data/"
```

**文件：`package.json` 脚本更新**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "process-data": "node scripts/processData.js",
    "test-data": "node scripts/testDataIntegrity.js",
    "deploy-fix": "bash scripts/deploy-fix.sh",
    "backup-data": "mkdir -p backups/$(date +%Y%m%d_%H%M%S) && cp src/data/*.json backups/$(date +%Y%m%d_%H%M%S)/",
    "validate-data": "node -e \"const r=require('./src/data/products.json'); const ids=r.map(p=>p.id); console.log('Products:',r.length,'Unique IDs:',new Set(ids).size,'Valid:',ids.length===new Set(ids).size)\""
  }
}
```

### 快速执行命令

```bash
# 一键部署修复方案
npm run deploy-fix

# 或者分步执行
npm run backup-data
npm run process-data
npm run test-data
npm run validate-data
npm run dev
```

### 验证修复效果

1. **启动应用**
   ```bash
   npm run dev
   ```

2. **检查控制台**
   - 打开浏览器开发者工具
   - 访问 http://localhost:5173/
   - 查看Console标签页
   - 确认不再出现重复key警告

3. **功能测试**
   - 测试产品列表渲染
   - 测试搜索功能
   - 测试筛选功能
   - 测试分页功能
   - 测试产品详情页面

4. **性能检查**
   - 检查页面加载速度
   - 检查列表滚动性能
   - 检查内存使用情况

## 🔧 故障排除

### 常见问题及解决方案

1. **数据处理失败**
   ```bash
   # 检查原始数据格式
   node -e "console.log(JSON.stringify(require('./src/data/raw_data.json')[0], null, 2))"

   # 检查编号字段
   node -e "const data=require('./src/data/raw_data.json'); console.log(data.filter(item => (item.fields||item)['编号']).length)"
   ```

2. **测试失败**
   ```bash
   # 查看详细测试报告
   cat src/data/test_report.json | jq '.'

   # 检查具体问题
   node scripts/testDataIntegrity.js 2>&1 | grep "❌"
   ```

3. **应用启动问题**
   ```bash
   # 检查数据文件格式
   node -e "try { require('./src/data/products.json'); console.log('✅ products.json 格式正确'); } catch(e) { console.log('❌ products.json 格式错误:', e.message); }"

   # 恢复备份
   cp backups/latest/products.json src/data/
   ```

4. **仍有重复key警告**
   ```bash
   # 检查是否还有重复ID
   npm run validate-data

   # 查找具体重复的产品
   node -e "
   const products = require('./src/data/products.json');
   const idMap = new Map();
   products.forEach((p, i) => {
     if (idMap.has(p.id)) {
       console.log('重复ID:', p.id, '产品:', p.name, '索引:', i);
     } else {
       idMap.set(p.id, i);
     }
   });
   "
   ```

通过这个完整的解决方案，您可以彻底解决React应用中的重复key错误问题，确保每个产品都有唯一的标识符，同时保持系统的稳定性和向后兼容性。
```
```
```
