/**
 * 飞书字段映射配置
 * 定义飞书多维表格字段与本地数据库字段之间的映射关系
 */

// 字段类型枚举
export enum FeishuFieldType {
  TEXT = 1,           // 多行文本
  NUMBER = 2,         // 数字
  SINGLE_SELECT = 3,  // 单选
  MULTI_SELECT = 4,   // 多选
  LINK = 15,          // 超链接
  ATTACHMENT = 17,    // 附件
  LOOKUP = 19,        // 查找引用
  FORMULA = 20,       // 公式
  CREATED_TIME = 1001, // 创建时间
  AUTO_NUMBER = 1005   // 自动编号
}

// 字段转换器类型
export type FieldTransformer = (value: any) => any;

// 字段映射配置接口
export interface FieldMapping {
  feishuFieldId: string;       // 飞书字段ID
  feishuFieldName: string;     // 飞书字段名称（用于调试）
  localFieldPath: string;      // 本地字段路径（支持嵌套，如 'category.primary'）
  type: FeishuFieldType;      // 字段类型
  required: boolean;          // 是否必填
  fallback?: string;          // 备用字段ID
  transform?: FieldTransformer; // 自定义转换函数
  validate?: (value: any) => boolean; // 验证函数
  defaultValue?: any;         // 默认值
}

// 飞书字段映射配置
export const FEISHU_FIELD_MAPPING: { [key: string]: FieldMapping } = {
  // === 基础信息字段 ===
  name: {
    feishuFieldId: 'fldJZWSqLX', // Product Name
    feishuFieldName: 'Product Name',
    localFieldPath: 'name',
    type: FeishuFieldType.TEXT,
    required: true,
    fallback: 'fld98c3F01', // 品名
    transform: transformStringField
  },

  productId: {
    feishuFieldId: 'fldsbenBWp', // rx编号 (飞书记录ID)
    feishuFieldName: 'rx编号',
    localFieldPath: 'productId',
    type: FeishuFieldType.AUTO_NUMBER,
    required: true,
    transform: (value: any) => String(value)
  },

  internalId: {
    feishuFieldId: 'fldZW4Q5I2', // 编号
    feishuFieldName: '编号',
    localFieldPath: 'internalId',
    type: FeishuFieldType.AUTO_NUMBER,
    required: true,
    transform: (value: any) => String(value)
  },

  sequence: {
    feishuFieldId: 'fldRW7Bszz', // 序号
    feishuFieldName: '序号',
    localFieldPath: 'sequence',
    type: FeishuFieldType.FORMULA,
    required: true,
    transform: (value: any) => String(value)
  },

  // === 分类信息字段 ===
  categoryPrimary: {
    feishuFieldId: 'fldoD52TeP', // Category Level 1
    feishuFieldName: 'Category Level 1',
    localFieldPath: 'category.primary',
    type: FeishuFieldType.LOOKUP,
    required: true,
    fallback: 'fldGtFPP20', // 品类一级
    transform: transformSelectField
  },

  categorySecondary: {
    feishuFieldId: 'fldxk3XteX', // Category Level 2
    feishuFieldName: 'Category Level 2',
    localFieldPath: 'category.secondary',
    type: FeishuFieldType.TEXT,
    required: true,
    fallback: 'fldrfy01PS', // 品类二级
    transform: transformStringField
  },

  // === 价格信息字段 ===
  priceNormal: {
    feishuFieldId: 'fldLtVHZ5b', // 正常售价
    feishuFieldName: '正常售价',
    localFieldPath: 'price.normal',
    type: FeishuFieldType.NUMBER,
    required: true,
    transform: transformNumberField,
    validate: (value: number) => value >= 0 && value <= 999999.99
  },

  priceDiscount: {
    feishuFieldId: 'fldGvzGGFG', // 优惠到手价
    feishuFieldName: '优惠到手价',
    localFieldPath: 'price.discount',
    type: FeishuFieldType.NUMBER,
    required: false,
    transform: transformNumberField,
    validate: (value: number) => value >= 0 && value <= 999999.99,
    defaultValue: 0
  },

  // === 图片字段 ===
  imageFront: {
    feishuFieldId: 'fldRZvGjSK', // Front image(正)
    feishuFieldName: 'Front image(正)',
    localFieldPath: 'images.front',
    type: FeishuFieldType.ATTACHMENT,
    required: false,
    transform: transformAttachmentField
  },

  imageBack: {
    feishuFieldId: 'fldhXyI07b', // Back image(背)
    feishuFieldName: 'Back image(背)',
    localFieldPath: 'images.back',
    type: FeishuFieldType.ATTACHMENT,
    required: false,
    transform: transformAttachmentField
  },

  imageLabel: {
    feishuFieldId: 'fldGLGCv2m', // Tag photo(标签)
    feishuFieldName: 'Tag photo(标签)',
    localFieldPath: 'images.label',
    type: FeishuFieldType.ATTACHMENT,
    required: false,
    transform: transformAttachmentField
  },

  imagePackage: {
    feishuFieldId: 'fldkUCi2Vh', // Outer packaging image(外包装)
    feishuFieldName: 'Outer packaging image(外包装)',
    localFieldPath: 'images.package',
    type: FeishuFieldType.ATTACHMENT,
    required: false,
    transform: transformAttachmentField
  },

  imageGift: {
    feishuFieldId: 'fldC0kw9Hh', // Gift pictures(赠品图片)
    feishuFieldName: 'Gift pictures(赠品图片)',
    localFieldPath: 'images.gift',
    type: FeishuFieldType.ATTACHMENT,
    required: false,
    transform: transformAttachmentField
  },

  // === 产地信息字段 ===
  originCountry: {
    feishuFieldId: 'fldkZNReiw', // Origin (Country)
    feishuFieldName: 'Origin (Country)',
    localFieldPath: 'origin.country',
    type: FeishuFieldType.SINGLE_SELECT,
    required: true,
    transform: transformSelectField,
    defaultValue: '中国'
  },

  originProvince: {
    feishuFieldId: 'fldpRMAAXr', // Origin (Province)
    feishuFieldName: 'Origin (Province)',
    localFieldPath: 'origin.province',
    type: FeishuFieldType.MULTI_SELECT,
    required: true,
    transform: transformMultiSelectToFirst
  },

  originCity: {
    feishuFieldId: 'fldisZBrD1', // Origin (City)
    feishuFieldName: 'Origin (City)',
    localFieldPath: 'origin.city',
    type: FeishuFieldType.MULTI_SELECT,
    required: false,
    transform: transformMultiSelectToFirst
  },

  // === 产品属性字段 ===
  platform: {
    feishuFieldId: 'fldkuD0wjJ', // Platform(平台)
    feishuFieldName: 'Platform(平台)',
    localFieldPath: 'platform',
    type: FeishuFieldType.LOOKUP,
    required: true,
    fallback: 'fldlTALTDP', // 采集平台
    transform: transformSelectField
  },

  specification: {
    feishuFieldId: 'fldmUt5qWm', // Specs(规格)
    feishuFieldName: 'Specs(规格)',
    localFieldPath: 'specification',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField
  },

  flavor: {
    feishuFieldId: 'fldhkuLoKJ', // Flavor(口味)
    feishuFieldName: 'Flavor(口味)',
    localFieldPath: 'flavor',
    type: FeishuFieldType.TEXT,
    required: false,
    fallback: 'fld6dbQGAn', // 口味
    transform: transformStringField
  },

  manufacturer: {
    feishuFieldId: 'fldEFufAf2', // Manufacturer(生产商)
    feishuFieldName: 'Manufacturer(生产商)',
    localFieldPath: 'manufacturer',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField
  },

  // === 时间和其他字段 ===
  collectTime: {
    feishuFieldId: 'fldlyJcXRn', // 采集时间
    feishuFieldName: '采集时间',
    localFieldPath: 'collectTime',
    type: FeishuFieldType.CREATED_TIME,
    required: true,
    transform: transformDateField
  },

  link: {
    feishuFieldId: 'fldUZibVDt', // 商品链接
    feishuFieldName: '商品链接',
    localFieldPath: 'link',
    type: FeishuFieldType.LINK,
    required: false,
    transform: transformLinkField,
    validate: (value: string) => !value || /^https?:\/\/.+/.test(value)
  },

  boxSpec: {
    feishuFieldId: 'fld7HdKvwS', // CTN(箱规)
    feishuFieldName: 'CTN(箱规)',
    localFieldPath: 'boxSpec',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField
  },

  notes: {
    feishuFieldId: 'fldwWN61Y0', // 备注
    feishuFieldName: '备注',
    localFieldPath: 'notes',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField
  },

  gift: {
    feishuFieldId: 'fldcfIZwSn', // Gift(赠品)
    feishuFieldName: 'Gift(赠品)',
    localFieldPath: 'gift',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField
  },

  giftMechanism: {
    feishuFieldId: 'fldGrxT34A', // Gift mechanism(赠品机制)
    feishuFieldName: 'Gift mechanism(赠品机制)',
    localFieldPath: 'giftMechanism',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField
  },

  client: {
    feishuFieldId: 'fldx4OdUsm', // Client(委托方)
    feishuFieldName: 'Client(委托方)',
    localFieldPath: 'client',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField
  },

  barcode: {
    feishuFieldId: 'fldFeNTpIL', // bar code(条码)
    feishuFieldName: 'bar code(条码)',
    localFieldPath: 'barcode',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField,
    validate: (value: string) => !value || /^[0-9]{8,13}$/.test(value)
  }
};

// === 字段转换函数 ===

/**
 * 转换字符串字段
 */
function transformStringField(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object' && value.text) return value.text.trim();
  return String(value).trim();
}

/**
 * 转换数字字段
 */
function transformNumberField(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Math.round(value * 100) / 100; // 保留2位小数
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  }
  return 0;
}

/**
 * 转换选择字段
 */
function transformSelectField(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  
  // 处理飞书选择字段的结构
  if (Array.isArray(value) && value.length > 0) {
    const firstItem = value[0];
    if (typeof firstItem === 'string') return firstItem;
    if (typeof firstItem === 'object' && firstItem.text) return firstItem.text;
  }
  
  if (typeof value === 'object' && value.text) return value.text;
  return String(value);
}

/**
 * 转换多选字段（取第一个值）
 */
function transformMultiSelectToFirst(value: any): string {
  if (value === null || value === undefined) return '';
  
  if (Array.isArray(value) && value.length > 0) {
    const firstItem = value[0];
    if (typeof firstItem === 'string') return firstItem;
    if (typeof firstItem === 'object' && firstItem.text) return firstItem.text;
  }
  
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value.text) return value.text;
  return '';
}

/**
 * 转换多选字段（返回数组）
 */
function transformMultiSelectField(value: any): string[] {
  if (value === null || value === undefined) return [];
  
  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item.text) return item.text;
      return String(item);
    }).filter(Boolean);
  }
  
  if (typeof value === 'string') return [value];
  if (typeof value === 'object' && value.text) return [value.text];
  return [];
}

/**
 * 转换日期字段
 */
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

/**
 * 转换附件字段（返回文件令牌数组）
 */
function transformAttachmentField(value: any): string[] {
  if (value === null || value === undefined) return [];
  
  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object') {
        return item.file_token || item.token || item.attachment_token || '';
      }
      return '';
    }).filter(Boolean);
  }
  
  if (typeof value === 'object') {
    const token = value.file_token || value.token || value.attachment_token;
    return token ? [token] : [];
  }
  
  return [];
}

/**
 * 转换链接字段
 */
function transformLinkField(value: any): string {
  if (value === null || value === undefined) return '';
  
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object' && value.text) return value.text.trim();
  if (typeof value === 'object' && value.link) return value.link.trim();
  if (typeof value === 'object' && value.url) return value.url.trim();
  
  return String(value).trim();
}

// === 映射查找和验证函数 ===

/**
 * 根据飞书字段ID查找映射配置
 */
export function findMappingByFeishuFieldId(fieldId: string): FieldMapping | undefined {
  return Object.values(FEISHU_FIELD_MAPPING).find(mapping => 
    mapping.feishuFieldId === fieldId || mapping.fallback === fieldId
  );
}

/**
 * 根据本地字段路径查找映射配置
 */
export function findMappingByLocalPath(path: string): FieldMapping | undefined {
  return Object.values(FEISHU_FIELD_MAPPING).find(mapping => 
    mapping.localFieldPath === path
  );
}

/**
 * 获取所有必填字段的映射配置
 */
export function getRequiredFields(): FieldMapping[] {
  return Object.values(FEISHU_FIELD_MAPPING).filter(mapping => mapping.required);
}

/**
 * 获取所有图片字段的映射配置
 */
export function getImageFields(): FieldMapping[] {
  return Object.values(FEISHU_FIELD_MAPPING).filter(mapping => 
    mapping.type === FeishuFieldType.ATTACHMENT
  );
}

/**
 * 验证必填字段
 */
export function validateRequiredFields(transformedData: any): {
  isValid: boolean;
  missingFields: string[];
} {
  const requiredFields = getRequiredFields();
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = getNestedValue(transformedData, field.localFieldPath);
    if (value === null || value === undefined || value === '') {
      missingFields.push(field.localFieldPath);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * 获取嵌套对象的值
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * 设置嵌套对象的值
 */
export function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  
  let current = obj;
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[lastKey] = value;
}

// === 导出常用的映射分组 ===

export const FIELD_MAPPING_GROUPS = {
  // 基础信息字段
  basic: ['name', 'productId', 'internalId', 'sequence'],
  
  // 分类信息字段
  category: ['categoryPrimary', 'categorySecondary'],
  
  // 价格信息字段
  price: ['priceNormal', 'priceDiscount'],
  
  // 图片字段
  images: ['imageFront', 'imageBack', 'imageLabel', 'imagePackage', 'imageGift'],
  
  // 产地信息字段
  origin: ['originCountry', 'originProvince', 'originCity'],
  
  // 产品属性字段
  attributes: ['platform', 'specification', 'flavor', 'manufacturer'],
  
  // 其他字段
  others: ['collectTime', 'link', 'boxSpec', 'notes', 'gift', 'giftMechanism', 'client', 'barcode']
};

// === 类型已在上面定义，无需重复导出 ===