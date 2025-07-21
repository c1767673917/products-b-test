# 飞书字段映射配置文档

## 概述

本文档定义了飞书多维表格字段与本地数据库字段之间的映射关系，用于数据同步过程中的字段转换。

## 飞书字段类型说明

根据飞书API文档，主要字段类型包括：

| 类型代码 | 类型名称 | 说明 | 示例 |
|---------|---------|------|------|
| 1 | 多行文本 | 长文本内容 | 产品描述 |
| 2 | 数字 | 数值类型 | 价格、数量 |
| 3 | 单选 | 单选下拉框 | 分类、状态 |
| 4 | 多选 | 多选下拉框 | 标签、属性 |
| 15 | 超链接 | URL链接 | 商品链接 |
| 17 | 附件 | 文件附件 | 图片、文档 |
| 19 | 查找引用 | 关联其他表 | 关联数据 |
| 20 | 公式 | 计算字段 | 自动计算值 |
| 1001 | 创建时间 | 记录创建时间 | 系统时间戳 |
| 1005 | 自动编号 | 自动生成编号 | 序列号 |

## 字段映射配置

### 基础信息字段

| 飞书字段名 | 飞书字段ID | 类型 | 本地字段路径 | 转换规则 | 必填 |
|-----------|-----------|------|-------------|----------|------|
| 品名 | fld98c3F01 | 3 | name | 直接映射 | ✓ |
| Product Name | fldJZWSqLX | 1 | name | 优先使用，fallback到品名 | ✓ |
| rx编号 | fldsbenBWp | 1005 | productId | 飞书记录ID，作为主键 | ✓ |
| 编号 | fldZW4Q5I2 | 1005 | internalId | 内部编号，辅助标识 | ✓ |
| 序号 | fldRW7Bszz | 20 | sequence | 转换为字符串 | ✓ |

### 分类信息字段

| 飞书字段名 | 飞书字段ID | 类型 | 本地字段路径 | 转换规则 | 必填 |
|-----------|-----------|------|-------------|----------|------|
| 品类一级 | fldGtFPP20 | 3 | category.primary | 直接映射 | ✓ |
| Category Level 1 | fldoD52TeP | 19 | category.primary | 优先使用，fallback到品类一级 | ✓ |
| 品类二级 | fldrfy01PS | 3 | category.secondary | 直接映射 | ✓ |
| Category Level 2 | fldxk3XteX | 1 | category.secondary | 优先使用，fallback到品类二级 | ✓ |

### 价格信息字段

| 飞书字段名 | 飞书字段ID | 类型 | 本地字段路径 | 转换规则 | 必填 |
|-----------|-----------|------|-------------|----------|------|
| 正常售价 | fldLtVHZ5b | 2 | price.normal | 转换为数字，保留2位小数 | ✓ |
| 优惠到手价 | fldGvzGGFG | 2 | price.discount | 转换为数字，保留2位小数 | ✗ |
| Price（USD） | fld19OLKKG | 20 | price.usd | 美元价格，仅记录不参与主要计算 | ✗ |
| Special Price（USD） | fldfP2hZIB | 20 | price.specialUsd | 美元特价，仅记录 | ✗ |

### 图片字段

| 飞书字段名 | 飞书字段ID | 类型 | 本地字段路径 | 转换规则 | 必填 |
|-----------|-----------|------|-------------|----------|------|
| Front image(正) | fldRZvGjSK | 17 | images.front | 下载并存储到MinIO | ✗ |
| Back image(背) | fldhXyI07b | 17 | images.back | 下载并存储到MinIO | ✗ |
| Tag photo(标签) | fldGLGCv2m | 17 | images.label | 下载并存储到MinIO | ✗ |
| Outer packaging image(外包装) | fldkUCi2Vh | 17 | images.package | 下载并存储到MinIO | ✗ |
| Gift pictures(赠品图片) | fldC0kw9Hh | 17 | images.gift | 下载并存储到MinIO | ✗ |

### 产地信息字段

| 飞书字段名 | 飞书字段ID | 类型 | 本地字段路径 | 转换规则 | 必填 |
|-----------|-----------|------|-------------|----------|------|
| Origin (Country) | fldkZNReiw | 3 | origin.country | 直接映射，默认"中国" | ✓ |
| Origin (Province) | fldpRMAAXr | 4 | origin.province | 多选转为主要省份 | ✓ |
| Origin (City) | fldisZBrD1 | 4 | origin.city | 多选转为主要城市 | ✗ |

### 产品属性字段

| 飞书字段名 | 飞书字段ID | 类型 | 本地字段路径 | 转换规则 | 必填 |
|-----------|-----------|------|-------------|----------|------|
| Platform(平台) | fldkuD0wjJ | 19 | platform | 查找引用转为字符串 | ✓ |
| 采集平台 | fldlTALTDP | 3 | platform | fallback字段 | ✓ |
| Specs(规格) | fldmUt5qWm | 1 | specification | 直接映射 | ✗ |
| 口味 | fld6dbQGAn | 1 | flavor | 直接映射 | ✗ |
| Flavor(口味) | fldhkuLoKJ | 1 | flavor | 优先使用 | ✗ |
| Manufacturer(生产商) | fldEFufAf2 | 1 | manufacturer | 直接映射 | ✗ |

### 时间和链接字段

| 飞书字段名 | 飞书字段ID | 类型 | 本地字段路径 | 转换规则 | 必填 |
|-----------|-----------|------|-------------|----------|------|
| 采集时间 | fldlyJcXRn | 1001 | collectTime | 转换为Date对象 | ✓ |
| 商品链接 | fldUZibVDt | 15 | link | 直接映射URL | ✗ |

### 其他字段

| 飞书字段名 | 飞书字段ID | 类型 | 本地字段路径 | 转换规则 | 必填 |
|-----------|-----------|------|-------------|----------|------|
| CTN(箱规) | fld7HdKvwS | 1 | boxSpec | 直接映射 | ✗ |
| 备注 | fldwWN61Y0 | 1 | notes | 直接映射 | ✗ |
| Gift(赠品) | fldcfIZwSn | 1 | gift | 直接映射 | ✗ |
| Gift mechanism(赠品机制) | fldGrxT34A | 1 | giftMechanism | 直接映射 | ✗ |
| Client(委托方) | fldx4OdUsm | 1 | client | 直接映射 | ✗ |
| bar code(条码) | fldFeNTpIL | 1 | barcode | 直接映射 | ✗ |

## 数据转换规则

### 1. 字符串字段转换

```typescript
function transformStringField(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object' && value.text) return value.text.trim();
  return String(value).trim();
}
```

### 2. 数字字段转换

```typescript
function transformNumberField(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Math.round(value * 100) / 100; // 保留2位小数
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  }
  return 0;
}
```

### 3. 选择字段转换

```typescript
function transformSelectField(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0) {
    return value[0]; // 多选取第一个
  }
  if (typeof value === 'object' && value.text) return value.text;
  return '';
}
```

### 4. 多选字段转换

```typescript
function transformMultiSelectField(value: any): string[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value.map(item => 
      typeof item === 'string' ? item : (item.text || String(item))
    );
  }
  if (typeof value === 'string') return [value];
  return [];
}
```

### 5. 日期字段转换

```typescript
function transformDateField(value: any): Date {
  if (value === null || value === undefined) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? new Date() : date;
  }
  return new Date();
}
```

### 6. 附件字段转换

```typescript
function transformAttachmentField(value: any): string[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value.map(item => item.file_token || item.token || '').filter(Boolean);
  }
  return [];
}
```

## 字段优先级规则

当存在多个相似字段时，按以下优先级选择：

1. **产品名称**: Product Name > 品名
2. **分类信息**: Category Level 1/2 > 品类一级/二级
3. **口味信息**: Flavor(口味) > 口味
4. **平台信息**: Platform(平台) > 采集平台

## 数据验证规则

### 必填字段验证

```typescript
const requiredFields = [
  'name',
  'productId',  // 使用rx编号作为主键
  'internalId', // 内部编号
  'sequence',
  'category.primary',
  'category.secondary',
  'price.normal',
  'origin.country',
  'origin.province',
  'platform',
  'collectTime'
];
```

### 数据格式验证

```typescript
const validationRules = {
  name: (value: string) => value.length > 0 && value.length <= 200,
  productId: (value: string) => /^rec[a-zA-Z0-9]+$/.test(value), // 飞书记录ID格式
  internalId: (value: string) => /^[a-zA-Z0-9\-_]+$/.test(value), // 内部编号格式
  'price.normal': (value: number) => value >= 0 && value <= 999999.99,
  'price.discount': (value: number) => value >= 0 && value <= 999999.99,
  link: (value: string) => !value || /^https?:\/\/.+/.test(value),
  barcode: (value: string) => !value || /^[0-9]{8,13}$/.test(value)
};
```

## 错误处理策略

### 1. 字段缺失处理

- 必填字段缺失：记录错误，跳过该记录
- 可选字段缺失：使用默认值或空值

### 2. 数据类型错误处理

- 数字字段非数字：转换失败时使用0
- 日期字段格式错误：使用当前时间
- 字符串字段类型错误：强制转换为字符串

### 3. 数据范围错误处理

- 价格超出范围：记录警告，使用边界值
- 字符串长度超限：截断并记录警告
- 无效URL：清空字段并记录警告

## 配置文件示例

```typescript
// feishu-field-mapping.config.ts
export const FEISHU_FIELD_MAPPING = {
  // 基础信息映射
  basic: {
    name: {
      primary: 'fldJZWSqLX', // Product Name
      fallback: 'fld98c3F01', // 品名
      type: 'string',
      required: true
    },
    productId: {
      primary: 'fldsbenBWp', // rx编号 (飞书记录ID)
      type: 'auto_number',
      required: true,
      transform: (value: any) => String(value) // 直接使用飞书记录ID
    },
    internalId: {
      primary: 'fldZW4Q5I2', // 编号
      type: 'auto_number',
      required: true,
      transform: (value: any) => `product-${value}`
    }
  },
  
  // 分类信息映射
  category: {
    primary: {
      primary: 'fldoD52TeP', // Category Level 1
      fallback: 'fldGtFPP20', // 品类一级
      type: 'select',
      required: true
    }
  },
  
  // 价格信息映射
  price: {
    normal: {
      primary: 'fldLtVHZ5b', // 正常售价
      type: 'number',
      required: true,
      precision: 2
    }
  },
  
  // 图片信息映射
  images: {
    front: {
      primary: 'fldRZvGjSK', // Front image(正)
      type: 'attachment',
      required: false,
      download: true
    }
  }
};
```

---

**文档版本**: v1.0  
**创建时间**: 2025-07-21  
**最后更新**: 2025-07-21  
**维护人**: 数据架构师
