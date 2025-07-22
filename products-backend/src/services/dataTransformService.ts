import { 
  FEISHU_FIELD_MAPPING, 
  FieldMapping, 
  findMappingByFeishuFieldId,
  validateRequiredFields,
  setNestedValue,
  getImageFields
} from '../config/fieldMapping';
import { FeishuRecord } from './feishuApiService';
import winston from 'winston';

// 转换结果类型
export interface TransformResult {
  success: boolean;
  data?: any;
  errors: TransformError[];
  warnings: TransformWarning[];
}

// 转换错误类型
export interface TransformError {
  field: string;
  message: string;
  value?: any;
  feishuFieldId?: string;
}

// 转换警告类型
export interface TransformWarning {
  field: string;
  message: string;
  value?: any;
  feishuFieldId?: string;
}

// 变更检测结果
export interface ChangeDetectionResult {
  hasChanges: boolean;
  changedFields: string[];
  changeDetails: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    changeType: 'modified' | 'added' | 'removed';
  }>;
}

// 数据验证结果
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  value: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  value: any;
}

/**
 * 数据转换服务
 * 负责将飞书数据转换为本地数据格式，包括字段映射、数据验证、变更检测等功能
 */
export class DataTransformService {
  private logger: winston.Logger;

  constructor() {
    // 创建日志器
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  /**
   * 将飞书记录转换为本地产品数据
   */
  transformFeishuRecord(feishuRecord: FeishuRecord): TransformResult {
    const errors: TransformError[] = [];
    const warnings: TransformWarning[] = [];
    const transformedData: any = {};

    try {
      this.logger.debug('开始转换飞书记录', { recordId: feishuRecord.record_id });

      // 设置飞书记录ID作为主键
      transformedData.productId = feishuRecord.record_id;

      // 设置飞书记录ID作为内部引用
      transformedData.feishuRecordId = feishuRecord.record_id;

      // 遍历所有映射配置进行转换
      for (const [key, mapping] of Object.entries(FEISHU_FIELD_MAPPING)) {
        try {
          const fieldValue = this.extractFieldValue(feishuRecord.fields, mapping);
          let transformedValue: any = null;

          if (fieldValue !== null && fieldValue !== undefined) {
            // 应用转换函数（容错处理）
            try {
              transformedValue = fieldValue;
              if (mapping.transform) {
                transformedValue = mapping.transform(fieldValue);
              }

              // 设置到目标对象
              setNestedValue(transformedData, mapping.localFieldPath, transformedValue);

              this.logger.debug('字段转换成功', {
                field: key,
                feishuFieldId: mapping.feishuFieldId,
                localPath: mapping.localFieldPath,
                originalValue: fieldValue,
                transformedValue
              });
            } catch (transformError) {
              // 转换失败时使用默认值
              transformedValue = mapping.defaultValue !== undefined ? mapping.defaultValue : null;
              if (transformedValue !== null) {
                setNestedValue(transformedData, mapping.localFieldPath, transformedValue);
              }

              warnings.push({
                field: mapping.localFieldPath,
                message: `字段转换失败，使用默认值: ${transformError instanceof Error ? transformError.message : '未知错误'}`,
                value: fieldValue,
                feishuFieldId: mapping.feishuFieldId
              });
            }
          } else if (mapping.required && !mapping.defaultValue) {
            // 只有核心必填字段且无默认值时才报错
            if (['name'].includes(key)) { // 只有name是真正必填的
              errors.push({
                field: mapping.localFieldPath,
                message: `核心字段缺失: ${mapping.feishuFieldName}`,
                feishuFieldId: mapping.feishuFieldId
              });
            } else {
              // 其他字段降级为警告
              warnings.push({
                field: mapping.localFieldPath,
                message: `字段缺失: ${mapping.feishuFieldName}`,
                feishuFieldId: mapping.feishuFieldId
              });
            }
          } else if (mapping.defaultValue !== undefined) {
            // 使用默认值
            transformedValue = mapping.defaultValue;
            setNestedValue(transformedData, mapping.localFieldPath, mapping.defaultValue);
            warnings.push({
              field: mapping.localFieldPath,
              message: `使用默认值: ${mapping.defaultValue}`,
              feishuFieldId: mapping.feishuFieldId
            });
          }

          // 字段验证（宽松处理）
          if (mapping.validate && transformedValue !== null && transformedValue !== undefined) {
            try {
              if (!mapping.validate(transformedValue)) {
                // 验证失败时降级为警告，不阻止保存
                warnings.push({
                  field: mapping.localFieldPath,
                  message: `字段值验证失败: ${mapping.feishuFieldName}`,
                  value: transformedValue,
                  feishuFieldId: mapping.feishuFieldId
                });
              }
            } catch (validateError) {
              // 验证函数出错时也只记录警告
              warnings.push({
                field: mapping.localFieldPath,
                message: `字段验证出错: ${validateError instanceof Error ? validateError.message : '未知错误'}`,
                value: transformedValue,
                feishuFieldId: mapping.feishuFieldId
              });
            }
          }
        } catch (error) {
          errors.push({
            field: mapping.localFieldPath,
            message: `字段转换失败: ${error instanceof Error ? error.message : '未知错误'}`,
            feishuFieldId: mapping.feishuFieldId
          });
        }
      }

      // 设置元数据
      transformedData.syncTime = new Date();
      transformedData.version = transformedData.version ? transformedData.version + 1 : 1;
      transformedData.status = 'active';
      transformedData.isVisible = true;

      // 计算价格折扣率
      if (transformedData.price?.normal && transformedData.price?.discount) {
        const discountRate = 1 - (transformedData.price.discount / transformedData.price.normal);
        transformedData.price.discountRate = Math.max(0, Math.min(1, discountRate));
      }

      // 后处理：设置显示字段的值（优先英文，如果没有则使用中文）
      this.setDisplayFields(transformedData);

      // 验证核心必填字段（宽松处理）
      const coreFields = ['name.display']; // productId由飞书记录ID自动设置
      const missingCoreFields = coreFields.filter(field => {
        const value = this.getNestedValue(transformedData, field);
        return !value || (typeof value === 'string' && value.trim() === '');
      });

      if (missingCoreFields.length > 0) {
        missingCoreFields.forEach(field => {
          errors.push({
            field,
            message: `核心字段缺失: ${field}`
          });
        });
      }

      // 其他字段验证降级为警告
      const validation = validateRequiredFields(transformedData);
      if (!validation.isValid) {
        validation.missingFields.forEach(field => {
          if (!coreFields.includes(field)) {
            warnings.push({
              field,
              message: `建议字段缺失: ${field}`
            });
          }
        });
      }

      const success = errors.length === 0;
      
      this.logger.info('记录转换完成', {
        recordId: feishuRecord.record_id,
        success,
        errorCount: errors.length,
        warningCount: warnings.length
      });

      return {
        success,
        data: success ? transformedData : undefined,
        errors,
        warnings
      };

    } catch (error) {
      this.logger.error('记录转换失败', error, { recordId: feishuRecord.record_id });
      
      return {
        success: false,
        errors: [{
          field: 'general',
          message: `转换失败: ${error instanceof Error ? error.message : '未知错误'}`
        }],
        warnings
      };
    }
  }

  /**
   * 批量转换飞书记录
   */
  batchTransformFeishuRecords(feishuRecords: FeishuRecord[]): {
    successful: any[];
    failed: Array<{ record: FeishuRecord; errors: TransformError[] }>;
    totalErrors: TransformError[];
    totalWarnings: TransformWarning[];
  } {
    const successful: any[] = [];
    const failed: Array<{ record: FeishuRecord; errors: TransformError[] }> = [];
    const totalErrors: TransformError[] = [];
    const totalWarnings: TransformWarning[] = [];

    this.logger.info(`开始批量转换 ${feishuRecords.length} 条记录`);

    for (const record of feishuRecords) {
      const result = this.transformFeishuRecord(record);
      
      totalErrors.push(...result.errors);
      totalWarnings.push(...result.warnings);

      if (result.success && result.data) {
        successful.push(result.data);
      } else {
        failed.push({
          record,
          errors: result.errors
        });
      }
    }

    this.logger.info('批量转换完成', {
      total: feishuRecords.length,
      successful: successful.length,
      failed: failed.length,
      totalErrors: totalErrors.length,
      totalWarnings: totalWarnings.length
    });

    return {
      successful,
      failed,
      totalErrors,
      totalWarnings
    };
  }

  /**
   * 检测数据变更
   */
  detectChanges(newData: any, existingData: any): ChangeDetectionResult {
    const changedFields: string[] = [];
    const changeDetails: Array<{
      field: string;
      oldValue: any;
      newValue: any;
      changeType: 'modified' | 'added' | 'removed';
    }> = [];

    // 比较关键字段
    const keyFields = [
      'name',
      'category.primary',
      'category.secondary', 
      'price.normal',
      'price.discount',
      'platform',
      'specification',
      'flavor',
      'manufacturer',
      'origin.country',
      'origin.province',
      'origin.city',
      'collectTime',
      'images.front',
      'images.back',
      'images.label',
      'images.package',
      'images.gift'
    ];

    for (const field of keyFields) {
      const newValue = this.getNestedValue(newData, field);
      const oldValue = this.getNestedValue(existingData, field);

      if (!this.isEqual(newValue, oldValue)) {
        changedFields.push(field);
        
        let changeType: 'modified' | 'added' | 'removed' = 'modified';
        if (oldValue === null || oldValue === undefined) {
          changeType = 'added';
        } else if (newValue === null || newValue === undefined) {
          changeType = 'removed';
        }

        changeDetails.push({
          field,
          oldValue,
          newValue,
          changeType
        });
      }
    }

    // 特殊处理：检查采集时间变更
    const newCollectTime = new Date(newData.collectTime).getTime();
    const oldCollectTime = new Date(existingData.collectTime).getTime();
    const hasTimeChange = newCollectTime > oldCollectTime;

    const hasChanges = changedFields.length > 0 || hasTimeChange;

    this.logger.debug('变更检测结果', {
      productId: newData.productId || existingData.productId,
      hasChanges,
      changedFields,
      hasTimeChange
    });

    return {
      hasChanges,
      changedFields,
      changeDetails
    };
  }

  /**
   * 验证产品数据
   */
  validateProduct(productData: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // 检查数据是否为null或undefined
      if (!productData || typeof productData !== 'object') {
        return {
          isValid: false,
          errors: [{
            field: 'general',
            message: '产品数据为空或格式错误',
            value: productData
          }],
          warnings: []
        };
      }

      // 验证必填字段
      const requiredValidation = validateRequiredFields(productData);
      if (!requiredValidation.isValid) {
        requiredValidation.missingFields.forEach(field => {
          errors.push({
            field,
            message: `必填字段缺失`,
            value: null
          });
        });
      }

      // 验证数据格式
      if (productData.productId && !/^rec[a-zA-Z0-9]+$/.test(productData.productId)) {
        errors.push({
          field: 'productId',
          message: '飞书记录ID格式错误',
          value: productData.productId
        });
      }

      if (productData.price) {
        if (productData.price.normal < 0 || productData.price.normal > 999999.99) {
          errors.push({
            field: 'price.normal',
            message: '正常价格超出有效范围 (0-999999.99)',
            value: productData.price.normal
          });
        }

        if (productData.price.discount && (productData.price.discount < 0 || productData.price.discount > 999999.99)) {
          errors.push({
            field: 'price.discount',
            message: '优惠价格超出有效范围 (0-999999.99)',
            value: productData.price.discount
          });
        }

        if (productData.price.discount > productData.price.normal) {
          warnings.push({
            field: 'price.discount',
            message: '优惠价格大于正常价格',
            value: productData.price.discount
          });
        }
      }

      if (productData.link && !/^https?:\/\/.+/.test(productData.link)) {
        errors.push({
          field: 'link',
          message: '商品链接格式错误',
          value: productData.link
        });
      }

      if (productData.barcode && !/^[0-9]{8,13}$/.test(productData.barcode)) {
        errors.push({
          field: 'barcode',
          message: '条码格式错误（应为8-13位数字）',
          value: productData.barcode
        });
      }

      // 检查字符串字段长度
      if (productData.name?.display && productData.name.display.length > 200) {
        warnings.push({
          field: 'name.display',
          message: '产品名称过长（超过200字符）',
          value: productData.name.display
        });
      }

      if (productData.name?.english && productData.name.english.length > 200) {
        warnings.push({
          field: 'name.english',
          message: '英文产品名称过长（超过200字符）',
          value: productData.name.english
        });
      }

      if (productData.name?.chinese && productData.name.chinese.length > 200) {
        warnings.push({
          field: 'name.chinese',
          message: '中文产品名称过长（超过200字符）',
          value: productData.name.chinese
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      this.logger.error('产品数据验证失败', error);
      return {
        isValid: false,
        errors: [{
          field: 'general',
          message: `验证失败: ${error instanceof Error ? error.message : '未知错误'}`,
          value: null
        }],
        warnings
      };
    }
  }

  /**
   * 提取图片附件信息
   */
  extractImageAttachments(transformedData: any): Array<{
    productId: string;
    imageType: string;
    fileTokens: string[];
  }> {
    const imageAttachments: Array<{
      productId: string;
      imageType: string;
      fileTokens: string[];
    }> = [];

    const imageFields = getImageFields();
    const productId = transformedData.productId;

    for (const mapping of imageFields) {
      const fileTokens = this.getNestedValue(transformedData, mapping.localFieldPath);
      if (Array.isArray(fileTokens) && fileTokens.length > 0) {
        const imageType = mapping.localFieldPath.split('.')[1]; // 从 'images.front' 中提取 'front'
        
        imageAttachments.push({
          productId,
          imageType,
          fileTokens
        });
      }
    }

    return imageAttachments;
  }

  /**
   * 从飞书字段中提取值（简化版本，直接提取对应字段的值）
   */
  private extractFieldValue(fields: { [key: string]: any }, mapping: FieldMapping): any {
    // 直接使用字段名称提取值（飞书API返回的是字段名作为键）
    const value = fields[mapping.feishuFieldName];

    this.logger.debug('提取字段值', {
      fieldName: mapping.feishuFieldName,
      fieldId: mapping.feishuFieldId,
      localPath: mapping.localFieldPath,
      value: value
    });

    return value;
  }

  /**
   * 设置显示字段的值（优先英文，如果没有则使用中文）
   */
  private setDisplayFields(transformedData: any): void {
    // 设置产品名称显示值
    if (transformedData.name) {
      const englishName = transformedData.name.english;
      const chineseName = transformedData.name.chinese;
      transformedData.name.display = englishName || chineseName || '未命名产品';
    }

    // 设置分类显示值
    if (transformedData.category) {
      if (transformedData.category.primary) {
        const englishPrimary = transformedData.category.primary.english;
        const chinesePrimary = transformedData.category.primary.chinese;
        transformedData.category.primary.display = englishPrimary || chinesePrimary || '未分类';
      }

      if (transformedData.category.secondary) {
        const englishSecondary = transformedData.category.secondary.english;
        const chineseSecondary = transformedData.category.secondary.chinese;
        transformedData.category.secondary.display = englishSecondary || chineseSecondary || '';
      }
    }

    // 设置平台显示值
    if (transformedData.platform) {
      const englishPlatform = transformedData.platform.english;
      const chinesePlatform = transformedData.platform.chinese;
      transformedData.platform.display = englishPlatform || chinesePlatform || '未知平台';
    }

    // 设置口味显示值
    if (transformedData.flavor) {
      const englishFlavor = transformedData.flavor.english;
      const chineseFlavor = transformedData.flavor.chinese;
      transformedData.flavor.display = englishFlavor || chineseFlavor || '';
    }

    // 设置规格显示值
    if (transformedData.specification) {
      const englishSpec = transformedData.specification.english;
      const chineseSpec = transformedData.specification.chinese;
      transformedData.specification.display = englishSpec || chineseSpec || '';
    }

    // 设置生产商显示值
    if (transformedData.manufacturer) {
      const englishManufacturer = transformedData.manufacturer.english;
      const chineseManufacturer = transformedData.manufacturer.chinese;
      transformedData.manufacturer.display = englishManufacturer || chineseManufacturer || '';
    }

    // 设置产地显示值
    if (transformedData.origin) {
      // 设置国家显示值
      if (transformedData.origin.country) {
        const englishCountry = transformedData.origin.country.english;
        const chineseCountry = transformedData.origin.country.chinese;
        transformedData.origin.country.display = englishCountry || chineseCountry || '中国';
      }

      // 设置省份显示值
      if (transformedData.origin.province) {
        const englishProvince = transformedData.origin.province.english;
        const chineseProvince = transformedData.origin.province.chinese;
        transformedData.origin.province.display = englishProvince || chineseProvince || '';
      }

      // 设置城市显示值
      if (transformedData.origin.city) {
        const englishCity = transformedData.origin.city.english;
        const chineseCity = transformedData.origin.city.chinese;
        transformedData.origin.city.display = englishCity || chineseCity || '';
      }
    }

    this.logger.debug('设置显示字段完成', {
      nameDisplay: transformedData.name?.display,
      categoryPrimaryDisplay: transformedData.category?.primary?.display,
      categorySecondaryDisplay: transformedData.category?.secondary?.display,
      platformDisplay: transformedData.platform?.display,
      flavorDisplay: transformedData.flavor?.display,
      specificationDisplay: transformedData.specification?.display,
      manufacturerDisplay: transformedData.manufacturer?.display,
      originCountryDisplay: transformedData.origin?.country?.display,
      originProvinceDisplay: transformedData.origin?.province?.display,
      originCityDisplay: transformedData.origin?.city?.display
    });
  }

  /**
   * 根据字段ID获取字段名称
   * 基于feishu_data_analysis.json中的字段信息
   */
  private getFieldNameById(fieldId: string): string | null {
    // 字段ID到字段名的映射表
    const fieldIdToNameMapping: { [key: string]: string } = {
      // 中文字段
      'fld98c3F01': '品名',
      'fldGtFPP20': '品类一级',
      'fldrfy01PS': '品类二级',
      'fldlTALTDP': '采集平台',
      'fld6dbQGAn': '口味',

      // 英文字段
      'fldJZWSqLX': 'Product Name',
      'fldoD52TeP': 'Category Level 1',
      'fldxk3XteX': 'Category Level 2',
      'fldkuD0wjJ': 'Platform(平台)',
      'fldhkuLoKJ': 'Flavor(口味)',

      // 其他常用字段
      'fldLtVHZ5b': '正常售价',
      'fldGvzGGFG': '优惠到手价',
      'fldlyJcXRn': '采集时间',
      'fldsbenBWp': 'rx编号',
      'fldZW4Q5I2': '编号',
      'fldRW7Bszz': '序号',
      'fldkZNReiw': 'Origin (Country)',
      'fldpRMAAXr': 'Origin (Province)',
      'fldisZBrD1': 'Origin (City)',
      'fldmUt5qWm': 'Specs(规格)',
      'fldEFufAf2': 'Manufacturer(生产商)',
      'fldUZibVDt': '商品链接',
      'fld7HdKvwS': 'CTN(箱规)',
      'fldwWN61Y0': '备注',
      'fldcfIZwSn': 'Gift(赠品)',
      'fldGrxT34A': 'Gift mechanism(赠品机制)',
      'fldx4OdUsm': 'Client(委托方)',
      'fldFeNTpIL': 'bar code(条码)',

      // 图片字段
      'fldRZvGjSK': 'Front image(正)',
      'fldhXyI07b': 'Back image(背)',
      'fldGLGCv2m': 'Tag photo(标签)',
      'fldkUCi2Vh': 'Outer packaging image(外包装)',
      'fldC0kw9Hh': 'Gift pictures(赠品图片)'
    };

    return fieldIdToNameMapping[fieldId] || null;
  }

  /**
   * 获取嵌套对象的值
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * 比较两个值是否相等
   */
  private isEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a === null || b === null) return a === b;
    if (a === undefined || b === undefined) return a === b;
    
    // 特殊处理Date对象
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    
    // 特殊处理数组
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => this.isEqual(item, b[index]));
    }
    
    // 特殊处理对象
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      return keysA.every(key => this.isEqual(a[key], b[key]));
    }
    
    // 字符串比较（忽略空白字符差异）
    if (typeof a === 'string' && typeof b === 'string') {
      return a.trim() === b.trim();
    }
    
    return false;
  }

  /**
   * 清理和标准化数据
   */
  cleanAndNormalizeData(data: any): any {
    const cleaned = { ...data };

    // 清理字符串字段
    const stringFields = ['name', 'specification', 'flavor', 'manufacturer', 'platform'];
    stringFields.forEach(field => {
      if (typeof cleaned[field] === 'string') {
        cleaned[field] = cleaned[field].trim();
      }
    });

    // 清理嵌套对象
    if (cleaned.category) {
      if (typeof cleaned.category.primary === 'string') {
        cleaned.category.primary = cleaned.category.primary.trim();
      }
      if (typeof cleaned.category.secondary === 'string') {
        cleaned.category.secondary = cleaned.category.secondary.trim();
      }
    }

    if (cleaned.origin) {
      if (typeof cleaned.origin.country === 'string') {
        cleaned.origin.country = cleaned.origin.country.trim();
      }
      if (typeof cleaned.origin.province === 'string') {
        cleaned.origin.province = cleaned.origin.province.trim();
      }
      if (typeof cleaned.origin.city === 'string') {
        cleaned.origin.city = cleaned.origin.city.trim();
      }
    }

    // 确保价格字段为数字
    if (cleaned.price) {
      if (cleaned.price.normal) {
        cleaned.price.normal = Math.round(cleaned.price.normal * 100) / 100;
      }
      if (cleaned.price.discount) {
        cleaned.price.discount = Math.round(cleaned.price.discount * 100) / 100;
      }
    }

    return cleaned;
  }

  /**
   * 生成数据统计报告
   */
  generateTransformReport(transformResults: TransformResult[]): {
    total: number;
    successful: number;
    failed: number;
    errorsByField: { [field: string]: number };
    warningsByField: { [field: string]: number };
  } {
    const report = {
      total: transformResults.length,
      successful: 0,
      failed: 0,
      errorsByField: {} as { [field: string]: number },
      warningsByField: {} as { [field: string]: number }
    };

    for (const result of transformResults) {
      if (result.success) {
        report.successful++;
      } else {
        report.failed++;
      }

      // 统计错误
      for (const error of result.errors) {
        report.errorsByField[error.field] = (report.errorsByField[error.field] || 0) + 1;
      }

      // 统计警告
      for (const warning of result.warnings) {
        report.warningsByField[warning.field] = (report.warningsByField[warning.field] || 0) + 1;
      }
    }

    return report;
  }
}

// 创建单例实例
export const dataTransformService = new DataTransformService();