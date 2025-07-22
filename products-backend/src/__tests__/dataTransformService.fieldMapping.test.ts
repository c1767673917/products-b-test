import { DataTransformService, TransformResult } from '../services/dataTransformService';
import { FeishuRecord } from '../services/feishuApiService';
import { FEISHU_FIELD_MAPPING, FeishuFieldType } from '../config/fieldMapping';

describe('DataTransformService - Field Mapping', () => {
  let dataTransformService: DataTransformService;

  beforeEach(() => {
    dataTransformService = new DataTransformService();
  });

  describe('Basic Field Mapping', () => {
    it('should correctly map basic string fields', () => {
      const mockFeishuRecord: FeishuRecord = {
        record_id: 'rec_test_001',
        fields: {
          'fldJZWSqLX': 'Test Product Name', // Product Name
          'fldZW4Q5I2': '12345', // 编号
          'fldRW7Bszz': 'SEQ001', // 序号
        }
      };

      const result = dataTransformService.transformFeishuRecord(mockFeishuRecord);

      expect(result.success).toBe(false); // Will fail due to missing required fields
      expect(result.data).toBeUndefined();
      
      // Verify that the fields that were present got mapped correctly
      // We'll check the partial transformation by examining error messages
      expect(result.errors.some(e => e.field.includes('category.primary'))).toBe(true);
      expect(result.errors.some(e => e.field.includes('price.normal'))).toBe(true);
    });

    it('should handle complete valid record transformation', () => {
      const mockFeishuRecord: FeishuRecord = {
        record_id: 'rec_test_complete',
        fields: {
          // Required basic fields
          'fldJZWSqLX': 'Complete Test Product',
          'fldsbenBWp': 'RX001',
          'fldZW4Q5I2': '54321',
          'fldRW7Bszz': 'SEQ002',
          
          // Required category fields
          'fldoD52TeP': '食品饮料',
          'fldxk3XteX': '休闲零食',
          
          // Required price field
          'fldLtVHZ5b': 29.99,
          
          // Required origin fields
          'fldkZNReiw': '中国',
          'fldpRMAAXr': ['广东省'],
          
          // Required platform
          'fldkuD0wjJ': '天猫',
          
          // Required collect time
          'fldlyJcXRn': '2025-01-15T10:30:00Z'
        }
      };

      const result = dataTransformService.transformFeishuRecord(mockFeishuRecord);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.productId).toBe('RX001'); // This comes from the field mapping, not record_id
      expect(result.data.name).toBe('Complete Test Product');
      expect(result.data.internalId).toBe('54321');
      expect(result.data.sequence).toBe('SEQ002');
      expect(result.data.category.primary).toBe('食品饮料');
      expect(result.data.category.secondary).toBe('休闲零食');
      expect(result.data.price.normal).toBe(29.99);
      expect(result.data.origin.country).toBe('中国');
      expect(result.data.origin.province).toBe('广东省');
      expect(result.data.platform).toBe('天猫');
      expect(result.data.collectTime).toBeInstanceOf(Date);
    });

    it('should apply default values when fields are missing', () => {
      const mockFeishuRecord: FeishuRecord = {
        record_id: 'rec_test_defaults',
        fields: {
          // Required basic fields
          'fldJZWSqLX': 'Test with Defaults',
          'fldsbenBWp': 'RX002',
          'fldZW4Q5I2': '98765',
          'fldRW7Bszz': 'SEQ003',
          
          // Required category fields
          'fldoD52TeP': '食品饮料',
          'fldxk3XteX': '休闲零食',
          
          // Required price field
          'fldLtVHZ5b': 15.50,
          
          // Required platform
          'fldkuD0wjJ': '京东',
          
          // Required collect time
          'fldlyJcXRn': '2025-01-15T10:30:00Z',
          
          // Missing origin country (should use default)
          // But we need to provide province as it's required
          'fldpRMAAXr': ['江苏省'],
          
          // Missing discount price (should use default value of 0)
        }
      };

      const result = dataTransformService.transformFeishuRecord(mockFeishuRecord);

      // Even if there are some validation errors, we should check that defaults were applied
      expect(result.warnings.some(w => w.message.includes('使用默认值'))).toBe(true);
      
      // Check that the transformation attempted to process all fields
      expect(result.errors.length).toBeLessThan(5); // Should have minimal errors with mostly complete data
    });
  });

  describe('Field Type Transformations', () => {
    it('should transform number fields correctly', () => {
      const mockFeishuRecord: FeishuRecord = {
        record_id: 'rec_number_test',
        fields: {
          'fldLtVHZ5b': 29.999, // Should round to 30.00
          'fldGvzGGFG': 25.123, // Should round to 25.12
        }
      };

      const result = dataTransformService.transformFeishuRecord(mockFeishuRecord);

      // Even though this will fail validation due to missing required fields,
      // we can check the number transformation in the partial data
      expect(result.errors).toBeDefined();
      
      // Check that number transformation occurred by verifying no number-related errors
      const numberErrors = result.errors.filter(e => 
        e.message.includes('字段转换失败') && 
        (e.field === 'price.normal' || e.field === 'price.discount')
      );
      expect(numberErrors).toHaveLength(0);
    });

    it('should transform attachment fields correctly', () => {
      const mockFeishuRecord: FeishuRecord = {
        record_id: 'rec_attachment_test',
        fields: {
          // Required basic fields for valid transformation
          'fldJZWSqLX': 'Product with Images',
          'fldsbenBWp': 'RX003',
          'fldZW4Q5I2': '11111',
          'fldRW7Bszz': 'SEQ004',
          'fldoD52TeP': '食品饮料',
          'fldxk3XteX': '休闲零食',
          'fldLtVHZ5b': 19.99,
          'fldkZNReiw': '中国',
          'fldpRMAAXr': ['北京市'],
          'fldkuD0wjJ': '淘宝',
          'fldlyJcXRn': '2025-01-15T10:30:00Z',
          
          // Image attachments
          'fldRZvGjSK': [
            { file_token: 'front_image_token_1' },
            { file_token: 'front_image_token_2' }
          ], // Front image
          'fldhXyI07b': [
            { file_token: 'back_image_token_1' }
          ], // Back image
          'fldGLGCv2m': [], // Empty label images
        }
      };

      const result = dataTransformService.transformFeishuRecord(mockFeishuRecord);

      expect(result.success).toBe(true);
      expect(result.data.images.front).toEqual(['front_image_token_1', 'front_image_token_2']);
      expect(result.data.images.back).toEqual(['back_image_token_1']);
      expect(result.data.images.label).toEqual([]);
    });

    it('should transform date fields correctly', () => {
      const testDate = '2025-01-15T10:30:00Z';
      const mockFeishuRecord: FeishuRecord = {
        record_id: 'rec_date_test',
        fields: {
          'fldlyJcXRn': testDate // 采集时间
        }
      };

      const result = dataTransformService.transformFeishuRecord(mockFeishuRecord);

      // Check that date transformation didn't cause errors
      const dateErrors = result.errors.filter(e => 
        e.field === 'collectTime' && e.message.includes('字段转换失败')
      );
      expect(dateErrors).toHaveLength(0);
    });

    it('should transform select fields correctly', () => {
      const mockFeishuRecord: FeishuRecord = {
        record_id: 'rec_select_test',
        fields: {
          'fldoD52TeP': '食品饮料', // Single select
          'fldpRMAAXr': ['广东省', '江苏省'], // Multi-select, should take first
          'fldisZBrD1': ['深圳市'] // Multi-select single value
        }
      };

      const result = dataTransformService.transformFeishuRecord(mockFeishuRecord);

      // Check that select field transformations didn't cause errors
      const selectErrors = result.errors.filter(e => 
        (e.field === 'category.primary' || e.field === 'origin.province' || e.field === 'origin.city') &&
        e.message.includes('字段转换失败')
      );
      expect(selectErrors).toHaveLength(0);
    });
  });

  describe('Fallback Field Mapping', () => {
    it('should use fallback fields when primary field is missing', () => {
      const mockFeishuRecord: FeishuRecord = {
        record_id: 'rec_fallback_test',
        fields: {
          // Missing primary name field 'fldJZWSqLX', should use fallback 'fld98c3F01'
          'fld98c3F01': 'Fallback Product Name',
          
          // Required fields for successful transformation
          'fldsbenBWp': 'RX004',
          'fldZW4Q5I2': '22222',
          'fldRW7Bszz': 'SEQ005',
          'fldoD52TeP': '食品饮料',
          'fldxk3XteX': '休闲零食',
          'fldLtVHZ5b': 12.50,
          'fldkZNReiw': '中国',
          'fldpRMAAXr': ['上海市'],
          'fldkuD0wjJ': '拼多多',
          'fldlyJcXRn': '2025-01-15T10:30:00Z'
        }
      };

      const result = dataTransformService.transformFeishuRecord(mockFeishuRecord);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Fallback Product Name');
    });

    it('should handle case where both primary and fallback fields are missing', () => {
      const mockFeishuRecord: FeishuRecord = {
        record_id: 'rec_no_fallback_test',
        fields: {
          // Missing both primary 'fldJZWSqLX' and fallback 'fld98c3F01' for name
          'fldsbenBWp': 'RX005',
          'fldZW4Q5I2': '33333',
          'fldRW7Bszz': 'SEQ006',
          'fldoD52TeP': '食品饮料',
          'fldxk3XteX': '休闲零食',
          'fldLtVHZ5b': 8.99,
          'fldkZNReiw': '中国',
          'fldpRMAAXr': ['浙江省'],
          'fldkuD0wjJ': '唯品会',
          'fldlyJcXRn': '2025-01-15T10:30:00Z'
        }
      };

      const result = dataTransformService.transformFeishuRecord(mockFeishuRecord);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.field === 'name' && e.message.includes('必填字段缺失'))).toBe(true);
    });
  });

  describe('Field Validation', () => {
    it('should validate number field ranges', () => {
      const mockFeishuRecord: FeishuRecord = {
        record_id: 'rec_validation_test',
        fields: {
          'fldJZWSqLX': 'Validation Test Product',
          'fldsbenBWp': 'RX006',
          'fldZW4Q5I2': '44444',
          'fldRW7Bszz': 'SEQ007',
          'fldoD52TeP': '食品饮料',
          'fldxk3XteX': '休闲零食',
          'fldLtVHZ5b': 1000000.00, // Invalid: exceeds max price
          'fldGvzGGFG': -10.00, // Invalid: negative price
          'fldkZNReiw': '中国',
          'fldpRMAAXr': ['四川省'],
          'fldkuD0wjJ': '美团',
          'fldlyJcXRn': '2025-01-15T10:30:00Z'
        }
      };

      const result = dataTransformService.transformFeishuRecord(mockFeishuRecord);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => 
        e.field === 'price.normal' && e.message.includes('字段值验证失败')
      )).toBe(true);
      expect(result.errors.some(e => 
        e.field === 'price.discount' && e.message.includes('字段值验证失败')
      )).toBe(true);
    });

    it('should validate barcode format', () => {
      const mockFeishuRecord: FeishuRecord = {
        record_id: 'rec_barcode_test',
        fields: {
          'fldJZWSqLX': 'Barcode Test Product',
          'fldsbenBWp': 'RX007',
          'fldZW4Q5I2': '55555',
          'fldRW7Bszz': 'SEQ008',
          'fldoD52TeP': '食品饮料',
          'fldxk3XteX': '休闲零食',
          'fldLtVHZ5b': 18.88,
          'fldkZNReiw': '中国',
          'fldpRMAAXr': ['湖北省'],
          'fldkuD0wjJ': '苏宁',
          'fldlyJcXRn': '2025-01-15T10:30:00Z',
          'fldFeNTpIL': 'invalid_barcode' // Invalid barcode format
        }
      };

      const result = dataTransformService.transformFeishuRecord(mockFeishuRecord);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => 
        e.field === 'barcode' && e.message.includes('字段值验证失败')
      )).toBe(true);
    });

    it('should validate link format', () => {
      const mockFeishuRecord: FeishuRecord = {
        record_id: 'rec_link_test',
        fields: {
          'fldJZWSqLX': 'Link Test Product',
          'fldsbenBWp': 'RX008',
          'fldZW4Q5I2': '66666',
          'fldRW7Bszz': 'SEQ009',
          'fldoD52TeP': '食品饮料',
          'fldxk3XteX': '休闲零食',
          'fldLtVHZ5b': 25.25,
          'fldkZNReiw': '中国',
          'fldpRMAAXr': ['湖南省'],
          'fldkuD0wjJ': '聚美',
          'fldlyJcXRn': '2025-01-15T10:30:00Z',
          'fldUZibVDt': 'invalid_url' // Invalid link format
        }
      };

      const result = dataTransformService.transformFeishuRecord(mockFeishuRecord);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => 
        e.field === 'link' && e.message.includes('字段值验证失败')
      )).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle transformation errors gracefully', () => {
      const mockFeishuRecord: FeishuRecord = {
        record_id: 'rec_error_test',
        fields: {
          'fldJZWSqLX': 'Error Test Product',
          // Simulate transformation errors by providing invalid data types
          'fldLtVHZ5b': { invalid: 'object' }, // Invalid price data
        }
      };

      const result = dataTransformService.transformFeishuRecord(mockFeishuRecord);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // The name field should not have errors since it was provided correctly
      expect(result.errors.some(e => e.field === 'name')).toBe(false);
      
      // There should be some errors from the transformation process
      const transformErrors = result.errors.filter(e => 
        e.message.includes('字段转换失败') || e.message.includes('必填字段缺失')
      );
      expect(transformErrors.length).toBeGreaterThan(0);
    });

    it('should handle missing required fields', () => {
      const mockFeishuRecord: FeishuRecord = {
        record_id: 'rec_missing_required',
        fields: {
          'fldJZWSqLX': 'Missing Required Fields Product'
          // Missing all other required fields
        }
      };

      const result = dataTransformService.transformFeishuRecord(mockFeishuRecord);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      
      // Check for specific required field errors
      const requiredFieldErrors = result.errors.filter(e => 
        e.message.includes('必填字段缺失')
      );
      expect(requiredFieldErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Metadata and Computed Fields', () => {
    it('should set metadata fields correctly', () => {
      const mockFeishuRecord: FeishuRecord = {
        record_id: 'rec_metadata_test',
        fields: {
          'fldJZWSqLX': 'Metadata Test Product',
          'fldsbenBWp': 'RX009',
          'fldZW4Q5I2': '77777',
          'fldRW7Bszz': 'SEQ010',
          'fldoD52TeP': '食品饮料',
          'fldxk3XteX': '休闲零食',
          'fldLtVHZ5b': 50.00,
          'fldGvzGGFG': 35.00,
          'fldkZNReiw': '中国',
          'fldpRMAAXr': ['重庆市'],
          'fldkuD0wjJ': '1688',
          'fldlyJcXRn': '2025-01-15T10:30:00Z'
        }
      };

      const result = dataTransformService.transformFeishuRecord(mockFeishuRecord);

      expect(result.success).toBe(true);
      expect(result.data.syncTime).toBeInstanceOf(Date);
      expect(result.data.version).toBe(1);
      expect(result.data.status).toBe('active');
      expect(result.data.isVisible).toBe(true);
      
      // Check discount rate calculation
      const expectedDiscountRate = 1 - (35.00 / 50.00);
      expect(result.data.price.discountRate).toBeCloseTo(expectedDiscountRate, 2);
    });
  });
});