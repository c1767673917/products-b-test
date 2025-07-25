# 飞书字段映射分析报告

## 分析时间
2025-07-25T01:08:00Z

## 当前飞书数据表字段统计
- **总字段数**: 40个
- **图片字段数**: 5个
- **新增字段**: 需要进一步分析

## 字段类型分布
- 类型1 (文本): 14个字段
- 类型2 (数字): 2个字段  
- 类型3 (单选): 6个字段
- 类型4 (多选): 2个字段
- 类型15 (链接): 1个字段
- 类型17 (附件/图片): 5个字段
- 类型19 (查找引用): 2个字段
- 类型20 (公式): 5个字段
- 类型1001 (创建时间): 1个字段
- 类型1005 (自动编号): 2个字段

## 新发现的字段分析

### 1. 新增序号字段
- **序号1** (fldwQnkzrl, 类型20-公式)
- **序号2** (fld2vxWg3B, 类型1-文本)  
- **序号3** (fldNTalSuy, 类型1-文本)

这些字段似乎是新的序号系统，需要分析其业务用途。

### 2. 产品品名字段
- **产品品名** (fldEPFf9lm, 类型20-公式)

这是一个公式字段，可能是基于其他字段计算得出的产品名称。

### 3. Single/Mixed字段
- **Single/Mixed** (fldr1j3u4f, 类型3-单选)

这是一个新的产品分类字段，用于区分单品还是混合装。

### 4. 口味相关字段
发现了两个口味字段：
- **口味** (fld6dbQGAn, 类型1-文本) - 中文
- **Flavor(口味)** (fldhkuLoKJ, 类型1-文本) - 英文

### 5. 价格字段（美元）
- **Price（USD）** (fld19OLKKG, 类型20-公式)
- **Special Price（USD）** (fldfP2hZIB, 类型20-公式)

新增了美元价格字段，可能用于国际化定价。

## 现有映射配置状态

### 已映射的字段 ✅
- Product Name (fldJZWSqLX) → name.english
- 品名 (fld98c3F01) → name.chinese  
- rx编号 (fldsbenBWp) → rxNumber
- 编号 (fldZW4Q5I2) → internalId
- 序号 (fldRW7Bszz) → sequence
- Specs(规格) (fldmUt5qWm) → specification
- Manufacturer(生产商) (fldEFufAf2) → manufacturer
- Client(委托方) (fldx4OdUsm) → client
- Gift(赠品) (fldcfIZwSn) → gift
- Gift mechanism(赠品机制) (fldGrxT34A) → giftMechanism
- 商品链接 (fldUZibVDt) → link
- CTN(箱规) (fld7HdKvwS) → boxSpec
- 备注 (fldwWN61Y0) → notes
- 所有5个图片字段已映射

### 需要新增映射的字段 ⚠️

1. **产品品名** (fldEPFf9lm) - 公式字段
   - 建议映射到: `name.computed` 或 `name.formula`
   - 约束: 只读，由公式计算

2. **Single/Mixed** (fldr1j3u4f) - 单选字段
   - 建议映射到: `category.type` 或 `productType`
   - 约束: 枚举值 ['Single', 'Mixed']

3. **序号1/2/3** 字段
   - 建议映射到: `sequence.level1/2/3`
   - 需要分析业务用途后确定具体映射

4. **口味英文版** (fldhkuLoKJ)
   - 建议映射到: `flavor.english`
   - 现有的口味字段映射到: `flavor.chinese`

5. **美元价格字段**
   - Price（USD） → `price.usd.normal`
   - Special Price（USD） → `price.usd.discount`

## 兼容性风险评估

### 低风险 🟢
- 新增字段不会影响现有API接口
- 现有字段ID和映射关系保持不变

### 中等风险 🟡  
- 需要更新数据库Schema以支持新字段
- 前端可能需要适配新的数据结构

### 高风险 🔴
- 如果业务逻辑依赖新字段，需要同步更新相关代码
- 序号字段的变更可能影响排序逻辑

## 建议的更新步骤

1. **更新字段映射配置** - 添加新字段映射
2. **更新数据库Schema** - 添加新字段定义
3. **更新数据转换逻辑** - 处理新字段的数据转换
4. **测试数据同步** - 验证新字段数据的正确性
5. **更新API文档** - 记录新字段的使用方式

## 数据库Schema更新需求

需要在Product模型中添加以下字段：
```typescript
// 新增字段
productType: { type: String, enum: ['Single', 'Mixed'] }, // Single/Mixed
name: {
  computed: String, // 产品品名(公式)
},
flavor: {
  english: String, // Flavor(口味)
  chinese: String, // 口味 (已存在)
},
price: {
  usd: {
    normal: Number, // Price（USD）
    discount: Number, // Special Price（USD）
  }
},
sequence: {
  level1: String, // 序号1
  level2: String, // 序号2  
  level3: String, // 序号3
}
```
