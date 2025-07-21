# 主键设计说明文档

## 设计决策

### 主键选择：使用"rx编号"作为主键

经过分析，我们决定使用飞书的**"rx编号"字段**作为产品数据的主键，而不是"编号"字段。

## 字段映射调整

### 调整前的设计
```typescript
// 原设计 (有问题)
productId: string;  // 来自飞书"编号"字段
recordId: string;   // 来自飞书"rx编号"字段
```

### 调整后的设计
```typescript
// 新设计 (推荐)
productId: string;   // 来自飞书"rx编号"字段，作为主键
internalId: string;  // 来自飞书"编号"字段，作为内部编号
```

## 设计理由

### 1. 为什么选择"rx编号"作为主键

**稳定性优势**:
- "rx编号"是飞书系统自动生成的记录唯一标识符
- 格式固定：`rec` + 字母数字组合 (如: `recuQUf1GGohz3`)
- 在飞书系统中具有全局唯一性，永不重复

**一致性优势**:
- 直接对应飞书记录，便于数据同步和关联
- 可以通过这个ID直接在飞书API中查询和操作记录
- 避免了自定义ID可能产生的冲突问题

**可追溯性优势**:
- 可以直接通过这个ID在飞书中定位到具体记录
- 便于调试和数据验证
- 支持双向数据同步

### 2. "编号"字段的问题

**不稳定性**:
- "编号"字段可能由用户手动编辑
- 存在重复或格式不一致的风险
- 可能在飞书中被修改或删除

**格式不统一**:
- 当前数据中的编号格式：`20250708-002`, `20250714-739` 等
- 格式可能随时间变化
- 不具备系统级的唯一性保证

## 数据库Schema更新

### 新的Product模型
```typescript
interface Product {
  // 主键字段
  productId: string;        // 飞书记录ID (rx编号) - 主键
  
  // 辅助标识字段
  internalId: string;       // 内部编号 (编号字段)
  name: string;            // 产品名称
  sequence: string;        // 序号
  
  // ... 其他字段保持不变
}
```

### MongoDB Schema定义
```typescript
const ProductSchema = new Schema<IProduct>({
  // 主键：使用飞书记录ID
  productId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true,
    match: /^rec[a-zA-Z0-9]+$/ // 飞书记录ID格式验证
  },
  
  // 内部编号：原"编号"字段
  internalId: { 
    type: String, 
    required: true,
    index: true 
  },
  
  // 其他字段...
  name: { type: String, required: true, index: true },
  sequence: { type: String, required: true },
  // ...
});

// 复合索引
ProductSchema.index({ productId: 1 }); // 主键索引
ProductSchema.index({ internalId: 1 }); // 内部编号索引
```

## 字段映射配置

### 飞书字段到本地字段映射
```typescript
const FIELD_MAPPING = {
  // 主键映射
  productId: {
    feishuFieldId: 'fldsbenBWp',    // rx编号
    feishuFieldName: 'rx编号',
    type: 'auto_number',
    required: true,
    isPrimaryKey: true,
    transform: (value: any) => String(value)
  },
  
  // 内部编号映射
  internalId: {
    feishuFieldId: 'fldZW4Q5I2',    // 编号
    feishuFieldName: '编号',
    type: 'auto_number',
    required: true,
    transform: (value: any) => String(value)
  }
};
```

## 数据转换逻辑

### 从飞书数据转换
```typescript
function transformFeishuRecord(feishuRecord: any): Product {
  const fields = feishuRecord.fields;
  
  return {
    // 主键：使用rx编号
    productId: String(fields['fldsbenBWp'] || ''), // rx编号
    
    // 内部编号：使用编号字段
    internalId: String(fields['fldZW4Q5I2'] || ''), // 编号
    
    // 其他字段转换...
    name: getFieldValue(fields, ['fldJZWSqLX', 'fld98c3F01']), // Product Name > 品名
    sequence: String(fields['fldRW7Bszz'] || ''),
    
    // ... 其他字段
  };
}
```

### 数据验证规则
```typescript
const validationRules = {
  // 主键验证：飞书记录ID格式
  productId: (value: string) => {
    return /^rec[a-zA-Z0-9]+$/.test(value) && value.length >= 10;
  },
  
  // 内部编号验证：允许更灵活的格式
  internalId: (value: string) => {
    return value.length > 0 && value.length <= 50;
  }
};
```

## API接口调整

### 查询接口
```typescript
// 通过主键查询
GET /api/v1/products/:productId
// 示例: GET /api/v1/products/recuQUf1GGohz3

// 通过内部编号查询
GET /api/v1/products/by-internal-id/:internalId
// 示例: GET /api/v1/products/by-internal-id/20250708-002
```

### 同步接口
```typescript
// 选择性同步时使用主键
POST /api/v1/sync/feishu
{
  "mode": "selective",
  "productIds": ["recuQUf1GGohz3", "recXs2FE00"] // 使用飞书记录ID
}
```

## 迁移策略

### 现有数据迁移
如果系统中已有数据使用"编号"作为主键，需要进行数据迁移：

```typescript
// 数据迁移脚本示例
async function migrateExistingData() {
  const products = await Product.find({});
  
  for (const product of products) {
    // 如果当前productId是编号格式，需要重新映射
    if (!product.productId.startsWith('rec')) {
      // 保存原编号到internalId
      product.internalId = product.productId;
      
      // 从飞书获取对应的记录ID
      const feishuRecord = await findFeishuRecordByInternalId(product.productId);
      if (feishuRecord) {
        product.productId = feishuRecord.record_id;
        await product.save();
      }
    }
  }
}
```

## 优势总结

### 1. 数据一致性
- 主键直接对应飞书记录，确保数据同步的一致性
- 避免了自定义ID可能产生的冲突和不一致问题

### 2. 系统稳定性
- 飞书记录ID由系统生成，具有高度稳定性
- 不会因为用户操作而意外改变

### 3. 开发便利性
- 可以直接使用记录ID调用飞书API
- 简化了数据同步和验证逻辑

### 4. 可扩展性
- 为未来可能的双向同步提供了基础
- 便于实现更复杂的数据关联功能

## 注意事项

### 1. 向后兼容
- 保留internalId字段，确保现有业务逻辑的兼容性
- 提供通过内部编号查询的接口

### 2. 数据验证
- 加强对飞书记录ID格式的验证
- 确保数据导入时的ID有效性

### 3. 错误处理
- 处理飞书记录ID不存在的情况
- 提供清晰的错误信息和恢复建议

---

**文档版本**: v1.1  
**创建时间**: 2025-07-21  
**最后更新**: 2025-07-21  
**变更原因**: 主键设计优化  
**负责人**: 数据架构师
