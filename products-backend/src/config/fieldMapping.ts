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
  transform?: FieldTransformer; // 自定义转换函数
  validate?: (value: any) => boolean; // 验证函数
  defaultValue?: any;         // 默认值
}

// 飞书字段映射配置
export const FEISHU_FIELD_MAPPING: { [key: string]: FieldMapping } = {
  // === 基础信息字段 ===
  // 产品名称 - 英文
  nameEnglish: {
    feishuFieldId: 'fldJZWSqLX', // Product Name
    feishuFieldName: 'Product Name',
    localFieldPath: 'name.english',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField
  },

  // 产品名称 - 中文
  nameChinese: {
    feishuFieldId: 'fld98c3F01', // 品名
    feishuFieldName: '品名',
    localFieldPath: 'name.chinese',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField
  },

  // 主要显示名称（优先使用英文，如果没有则使用中文）
  name: {
    feishuFieldId: 'fldJZWSqLX', // Product Name
    feishuFieldName: 'Product Name',
    localFieldPath: 'name.display',
    type: FeishuFieldType.TEXT,
    required: true,
    transform: transformStringField,
    defaultValue: '未命名产品'
  },

  rxNumber: {
    feishuFieldId: 'fldsbenBWp', // rx编号
    feishuFieldName: 'rx编号',
    localFieldPath: 'rxNumber',
    type: FeishuFieldType.AUTO_NUMBER,
    required: false, // 降级为可选
    transform: (value: any) => String(value || ''),
    defaultValue: ''
  },

  internalId: {
    feishuFieldId: 'fldZW4Q5I2', // 编号
    feishuFieldName: '编号',
    localFieldPath: 'internalId',
    type: FeishuFieldType.AUTO_NUMBER,
    required: false, // 降级为可选
    transform: (value: any) => String(value || ''),
    defaultValue: ''
  },

  sequence: {
    feishuFieldId: 'fldRW7Bszz', // 序号
    feishuFieldName: '序号',
    localFieldPath: 'sequence',
    type: FeishuFieldType.FORMULA,
    required: false, // 降级为可选
    transform: transformSequenceField,
    defaultValue: ''
  },

  // === 分类信息字段 ===
  // 一级分类 - 英文
  categoryPrimaryEnglish: {
    feishuFieldId: 'fldoD52TeP', // Category Level 1
    feishuFieldName: 'Category Level 1',
    localFieldPath: 'category.primary.english',
    type: FeishuFieldType.LOOKUP,
    required: false,
    transform: transformSelectField
  },

  // 一级分类 - 中文
  categoryPrimaryChinese: {
    feishuFieldId: 'fldGtFPP20', // 品类一级
    feishuFieldName: '品类一级',
    localFieldPath: 'category.primary.chinese',
    type: FeishuFieldType.LOOKUP,
    required: false,
    transform: transformSelectField
  },

  // 主要显示的一级分类
  categoryPrimary: {
    feishuFieldId: 'fldoD52TeP', // Category Level 1
    feishuFieldName: 'Category Level 1',
    localFieldPath: 'category.primary.display',
    type: FeishuFieldType.LOOKUP,
    required: false,
    transform: transformSelectField,
    defaultValue: '未分类'
  },

  // 二级分类 - 英文
  categorySecondaryEnglish: {
    feishuFieldId: 'fldxk3XteX', // Category Level 2
    feishuFieldName: 'Category Level 2',
    localFieldPath: 'category.secondary.english',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField
  },

  // 二级分类 - 中文
  categorySecondaryChinese: {
    feishuFieldId: 'fldrfy01PS', // 品类二级
    feishuFieldName: '品类二级',
    localFieldPath: 'category.secondary.chinese',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField
  },

  // 主要显示的二级分类
  categorySecondary: {
    feishuFieldId: 'fldxk3XteX', // Category Level 2
    feishuFieldName: 'Category Level 2',
    localFieldPath: 'category.secondary.display',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField,
    defaultValue: ''
  },

  // === 价格信息字段 ===
  priceNormal: {
    feishuFieldId: 'fldLtVHZ5b', // 正常售价
    feishuFieldName: '正常售价',
    localFieldPath: 'price.normal',
    type: FeishuFieldType.NUMBER,
    required: false, // 降级为可选
    transform: transformNumberFieldTolerant,
    defaultValue: 0
  },

  priceDiscount: {
    feishuFieldId: 'fldGvzGGFG', // 优惠到手价
    feishuFieldName: '优惠到手价',
    localFieldPath: 'price.discount',
    type: FeishuFieldType.NUMBER,
    required: false,
    transform: transformNumberFieldTolerant,
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
  // 国家 - 英文
  originCountryEnglish: {
    feishuFieldId: 'fldkZNReiw', // Origin (Country)
    feishuFieldName: 'Origin (Country)',
    localFieldPath: 'origin.country.english',
    type: FeishuFieldType.SINGLE_SELECT,
    required: false,
    transform: transformSelectField
  },

  // 国家 - 中文
  originCountryChinese: {
    feishuFieldId: 'fldkZNReiw', // Origin (Country)
    feishuFieldName: 'Origin (Country)',
    localFieldPath: 'origin.country.chinese',
    type: FeishuFieldType.SINGLE_SELECT,
    required: false,
    transform: transformSelectField
  },

  // 主要显示的国家
  originCountry: {
    feishuFieldId: 'fldkZNReiw', // Origin (Country)
    feishuFieldName: 'Origin (Country)',
    localFieldPath: 'origin.country.display',
    type: FeishuFieldType.SINGLE_SELECT,
    required: true,
    transform: transformSelectField,
    defaultValue: '中国'
  },

  // 省份 - 英文
  originProvinceEnglish: {
    feishuFieldId: 'fldpRMAAXr', // Origin (Province)
    feishuFieldName: 'Origin (Province)',
    localFieldPath: 'origin.province.english',
    type: FeishuFieldType.MULTI_SELECT,
    required: false,
    transform: transformMultiSelectToFirst
  },

  // 省份 - 中文
  originProvinceChinese: {
    feishuFieldId: 'fldpRMAAXr', // Origin (Province)
    feishuFieldName: 'Origin (Province)',
    localFieldPath: 'origin.province.chinese',
    type: FeishuFieldType.MULTI_SELECT,
    required: false,
    transform: transformMultiSelectToFirst
  },

  // 主要显示的省份
  originProvince: {
    feishuFieldId: 'fldpRMAAXr', // Origin (Province)
    feishuFieldName: 'Origin (Province)',
    localFieldPath: 'origin.province.display',
    type: FeishuFieldType.MULTI_SELECT,
    required: false,
    transform: transformMultiSelectToFirst,
    defaultValue: ''
  },

  // 城市 - 英文
  originCityEnglish: {
    feishuFieldId: 'fldisZBrD1', // Origin (City)
    feishuFieldName: 'Origin (City)',
    localFieldPath: 'origin.city.english',
    type: FeishuFieldType.MULTI_SELECT,
    required: false,
    transform: transformMultiSelectToFirst
  },

  // 城市 - 中文
  originCityChinese: {
    feishuFieldId: 'fldisZBrD1', // Origin (City)
    feishuFieldName: 'Origin (City)',
    localFieldPath: 'origin.city.chinese',
    type: FeishuFieldType.MULTI_SELECT,
    required: false,
    transform: transformMultiSelectToFirst
  },

  // 主要显示的城市
  originCity: {
    feishuFieldId: 'fldisZBrD1', // Origin (City)
    feishuFieldName: 'Origin (City)',
    localFieldPath: 'origin.city.display',
    type: FeishuFieldType.MULTI_SELECT,
    required: false,
    transform: transformMultiSelectToFirst,
    defaultValue: ''
  },

  // === 产品属性字段 ===
  // 平台 - 英文
  platformEnglish: {
    feishuFieldId: 'fldkuD0wjJ', // Platform(平台)
    feishuFieldName: 'Platform(平台)',
    localFieldPath: 'platform.english',
    type: FeishuFieldType.LOOKUP,
    required: false,
    transform: transformSelectField
  },

  // 平台 - 中文
  platformChinese: {
    feishuFieldId: 'fldlTALTDP', // 采集平台
    feishuFieldName: '采集平台',
    localFieldPath: 'platform.chinese',
    type: FeishuFieldType.LOOKUP,
    required: false,
    transform: transformSelectField
  },

  // 主要显示的平台
  platform: {
    feishuFieldId: 'fldkuD0wjJ', // Platform(平台)
    feishuFieldName: 'Platform(平台)',
    localFieldPath: 'platform.display',
    type: FeishuFieldType.LOOKUP,
    required: false,
    transform: transformSelectField,
    defaultValue: '未知平台'
  },

  // 规格 - 英文
  specificationEnglish: {
    feishuFieldId: 'fldmUt5qWm', // Specs(规格)
    feishuFieldName: 'Specs(规格)',
    localFieldPath: 'specification.english',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField
  },

  // 规格 - 中文
  specificationChinese: {
    feishuFieldId: 'fldmUt5qWm', // Specs(规格)
    feishuFieldName: 'Specs(规格)',
    localFieldPath: 'specification.chinese',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField
  },

  // 主要显示的规格
  specification: {
    feishuFieldId: 'fldmUt5qWm', // Specs(规格)
    feishuFieldName: 'Specs(规格)',
    localFieldPath: 'specification.display',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField
  },

  // 口味 - 英文
  flavorEnglish: {
    feishuFieldId: 'fldhkuLoKJ', // Flavor(口味)
    feishuFieldName: 'Flavor(口味)',
    localFieldPath: 'flavor.english',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField
  },

  // 口味 - 中文
  flavorChinese: {
    feishuFieldId: 'fld6dbQGAn', // 口味
    feishuFieldName: '口味',
    localFieldPath: 'flavor.chinese',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField
  },

  // 主要显示的口味
  flavor: {
    feishuFieldId: 'fldhkuLoKJ', // Flavor(口味)
    feishuFieldName: 'Flavor(口味)',
    localFieldPath: 'flavor.display',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField
  },

  // 生产商 - 英文
  manufacturerEnglish: {
    feishuFieldId: 'fldEFufAf2', // Manufacturer(生产商)
    feishuFieldName: 'Manufacturer(生产商)',
    localFieldPath: 'manufacturer.english',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField
  },

  // 生产商 - 中文
  manufacturerChinese: {
    feishuFieldId: 'fldEFufAf2', // Manufacturer(生产商)
    feishuFieldName: 'Manufacturer(生产商)',
    localFieldPath: 'manufacturer.chinese',
    type: FeishuFieldType.TEXT,
    required: false,
    transform: transformStringField
  },

  // 主要显示的生产商
  manufacturer: {
    feishuFieldId: 'fldEFufAf2', // Manufacturer(生产商)
    feishuFieldName: 'Manufacturer(生产商)',
    localFieldPath: 'manufacturer.display',
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
 * 容错数字字段转换（更宽松）
 */
function transformNumberFieldTolerant(value: any): number {
  try {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return Math.max(0, Math.round(value * 100) / 100);
    if (typeof value === 'string') {
      // 移除非数字字符，只保留数字和小数点
      const cleanValue = value.replace(/[^\d.-]/g, '');
      const num = parseFloat(cleanValue);
      return isNaN(num) ? 0 : Math.max(0, Math.round(num * 100) / 100);
    }
    // 尝试转换其他类型
    const num = Number(value);
    return isNaN(num) ? 0 : Math.max(0, Math.round(num * 100) / 100);
  } catch (error) {
    return 0; // 任何错误都返回0
  }
}

/**
 * 容错序号字段转换
 */
function transformSequenceField(value: any): string {
  try {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (Array.isArray(value) && value.length > 0) {
      const firstItem = value[0];
      if (typeof firstItem === 'string') return firstItem.trim();
      if (typeof firstItem === 'object' && firstItem.text) return firstItem.text.trim();
    }
    if (typeof value === 'object' && value.text) return value.text.trim();
    return String(value).trim();
  } catch (error) {
    return ''; // 任何错误都返回空字符串
  }
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
 * 转换附件字段（返回第一个文件令牌作为字符串）
 */
function transformAttachmentField(value: any): string {
  if (value === null || value === undefined) return '';

  if (Array.isArray(value) && value.length > 0) {
    const firstItem = value[0];
    if (typeof firstItem === 'string') return firstItem;
    if (typeof firstItem === 'object') {
      return firstItem.file_token || firstItem.token || firstItem.attachment_token || '';
    }
    return '';
  }

  if (typeof value === 'object') {
    return value.file_token || value.token || value.attachment_token || '';
  }

  return '';
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
    mapping.feishuFieldId === fieldId
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
 * 验证必填字段（宽松模式）
 */
export function validateRequiredFields(transformedData: any): {
  isValid: boolean;
  missingFields: string[];
} {
  const requiredFields = getRequiredFields();
  const missingFields: string[] = [];

  // 只检查核心必填字段
  const coreRequiredPaths = ['name.display', 'productId'];

  for (const field of requiredFields) {
    // 只对核心字段进行严格验证
    if (coreRequiredPaths.includes(field.localFieldPath)) {
      const value = getNestedValue(transformedData, field.localFieldPath);
      if (value === null || value === undefined ||
          (typeof value === 'string' && value.trim() === '')) {
        missingFields.push(field.localFieldPath);
      }
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
  origin: ['originCountryEnglish', 'originCountryChinese', 'originCountry', 'originProvinceEnglish', 'originProvinceChinese', 'originProvince', 'originCityEnglish', 'originCityChinese', 'originCity'],
  
  // 产品属性字段
  attributes: ['platform', 'specificationEnglish', 'specificationChinese', 'specification', 'flavor', 'manufacturerEnglish', 'manufacturerChinese', 'manufacturer'],
  
  // 其他字段
  others: ['collectTime', 'link', 'boxSpec', 'notes', 'gift', 'giftMechanism', 'client', 'barcode']
};

// === 类型已在上面定义，无需重复导出 ===