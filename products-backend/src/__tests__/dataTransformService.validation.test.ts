import { DataTransformService, ValidationResult } from '../services/dataTransformService';

describe('DataTransformService - Data Validation', () => {
  let dataTransformService: DataTransformService;

  // Helper function to create valid product base
  const createValidProductBase = (overrides: any = {}) => {
    return {
      productId: 'rec12345abcd',
      name: '测试产品',
      internalId: '98765',
      sequence: 'SEQ001',
      category: {
        primary: '食品饮料',
        secondary: '休闲零食'
      },
      price: {
        normal: 29.99
      },
      origin: {
        country: '中国',
        province: '广东省'
      },
      platform: '天猫',
      collectTime: new Date('2025-01-15T10:30:00Z'),
      ...overrides
    };
  };

  beforeEach(() => {
    dataTransformService = new DataTransformService();
  });

  describe('Product Data Validation', () => {
    it('should validate valid product data successfully', () => {
      const validProductData = createValidProductBase({
        price: {
          normal: 29.99,
          discount: 25.99,
          discountRate: 0.1337
        },
        syncTime: new Date(),
        version: 1,
        status: 'active',
        isVisible: true
      });

      const result = dataTransformService.validateProduct(validProductData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const incompleteProductData = {
        // Missing productId (required)
        // Missing name (required) 
        // Missing internalId (required)
        // Missing sequence (required)
        category: {
          primary: '食品饮料'
          // Missing secondary (required)
        },
        // Missing price (required)
        // Missing origin (required)
        // Missing platform (required)
        // Missing collectTime (required)
      };

      const result = dataTransformService.validateProduct(incompleteProductData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Check for specific required field errors
      const requiredFieldErrors = result.errors.filter(e => 
        e.message.includes('必填字段缺失')
      );
      expect(requiredFieldErrors.length).toBeGreaterThan(0);
    });

    it('should validate productId format', () => {
      const productWithInvalidId = createValidProductBase({
        productId: 'invalid-id-format' // Should start with 'rec' and contain alphanumeric
      });

      const result = dataTransformService.validateProduct(productWithInvalidId);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => 
        e.field === 'productId' && e.message.includes('飞书记录ID格式错误')
      )).toBe(true);
    });

    it('should validate price ranges', () => {
      const productWithInvalidPrices = createValidProductBase({
        name: '价格测试产品',
        price: {
          normal: -10.00, // Invalid: negative price
          discount: 1000000.00 // Invalid: exceeds maximum
        }
      });

      const result = dataTransformService.validateProduct(productWithInvalidPrices);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => 
        e.field === 'price.normal' && e.message.includes('正常价格超出有效范围')
      )).toBe(true);
      expect(result.errors.some(e => 
        e.field === 'price.discount' && e.message.includes('优惠价格超出有效范围')
      )).toBe(true);
    });

    it('should warn when discount price exceeds normal price', () => {
      const productWithHigherDiscount = createValidProductBase({
        name: '折扣异常产品',
        price: {
          normal: 25.99,
          discount: 29.99 // Warning: discount higher than normal
        }
      });

      const result = dataTransformService.validateProduct(productWithHigherDiscount);

      expect(result.isValid).toBe(true); // Should still be valid, just a warning
      expect(result.warnings.some(w => 
        w.field === 'price.discount' && w.message.includes('优惠价格大于正常价格')
      )).toBe(true);
    });

    it('should validate link format', () => {
      const productWithInvalidLink = createValidProductBase({
        name: '链接测试产品',
        link: 'invalid-url-format' // Should start with http:// or https://
      });

      const result = dataTransformService.validateProduct(productWithInvalidLink);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => 
        e.field === 'link' && e.message.includes('商品链接格式错误')
      )).toBe(true);
    });

    it('should accept valid link formats', () => {
      const validLinks = [
        'http://example.com/product',
        'https://www.example.com/product?id=123'
      ];

      for (const link of validLinks) {
        const product = createValidProductBase({
          name: `${link.startsWith('https') ? 'HTTPS' : 'HTTP'}链接产品`,
          link: link
        });

        const result = dataTransformService.validateProduct(product);
        const linkErrors = result.errors.filter(e => e.field === 'link');
        expect(linkErrors).toHaveLength(0);
      }
    });

    it('should validate barcode format', () => {
      const testCases = [
        { barcode: '12345678', shouldBeValid: true },
        { barcode: '1234567890123', shouldBeValid: true },
        { barcode: '123456789', shouldBeValid: true },
        { barcode: '1234567', shouldBeValid: false },
        { barcode: '12345678901234', shouldBeValid: false },
        { barcode: '123456ab', shouldBeValid: false },
        { barcode: '', shouldBeValid: true }
      ];

      for (const testCase of testCases) {
        const product = createValidProductBase({
          name: `条码测试产品-${testCase.barcode}`,
          barcode: testCase.barcode
        });

        const result = dataTransformService.validateProduct(product);
        
        const barcodeErrors = result.errors.filter(e => 
          e.field === 'barcode' && e.message.includes('条码格式错误')
        );

        if (testCase.shouldBeValid) {
          expect(barcodeErrors).toHaveLength(0);
        } else {
          expect(barcodeErrors.length).toBeGreaterThan(0);
        }
      }
    });

    it('should warn about long product names', () => {
      const longName = 'A'.repeat(250); // Exceeds 200 character limit
      
      const product = createValidProductBase({
        name: longName
      });

      const result = dataTransformService.validateProduct(product);

      expect(result.isValid).toBe(true); // Should still be valid, just a warning
      expect(result.warnings.some(w => 
        w.field === 'name' && w.message.includes('产品名称过长')
      )).toBe(true);
    });

    it('should handle validation errors gracefully', () => {
      // Test with null data
      const result1 = dataTransformService.validateProduct(null);
      expect(result1.isValid).toBe(false);
      expect(result1.errors.some(e => e.field === 'general')).toBe(true);

      // Test with undefined data
      const result2 = dataTransformService.validateProduct(undefined);
      expect(result2.isValid).toBe(false);
      expect(result2.errors.some(e => e.field === 'general')).toBe(true);

      // Test with non-object data
      const result3 = dataTransformService.validateProduct('invalid data');
      expect(result3.isValid).toBe(false);
      expect(result3.errors.some(e => e.field === 'general')).toBe(true);
    });
  });

  describe('Complex Validation Scenarios', () => {
    it('should validate product with all optional fields', () => {
      const completeProduct = createValidProductBase({
        name: '完整测试产品',
        price: {
          normal: 49.99,
          discount: 39.99,
          discountRate: 0.2
        },
        images: {
          front: ['front_token_1'],
          back: ['back_token_1'],
          label: ['label_token_1'],
          package: ['package_token_1'],
          gift: ['gift_token_1']
        },
        origin: {
          country: '中国',
          province: '广东省',
          city: '深圳市'
        },
        specification: '500g/包',
        flavor: '原味',
        manufacturer: '测试厂商',
        link: 'https://www.example.com/product/123',
        boxSpec: '24包/箱',
        notes: '测试备注',
        gift: '测试赠品',
        giftMechanism: '满100赠1',
        client: '测试委托方',
        barcode: '1234567890123',
        syncTime: new Date(),
        version: 1,
        status: 'active',
        isVisible: true
      });

      const result = dataTransformService.validateProduct(completeProduct);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should validate edge cases in numeric fields', () => {
      const edgeCaseProduct = createValidProductBase({
        name: '边界测试产品',
        price: {
          normal: 0.01, // Minimum valid price
          discount: 999999.99 // Maximum valid price
        }
      });

      const result = dataTransformService.validateProduct(edgeCaseProduct);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => 
        w.field === 'price.discount' && w.message.includes('优惠价格大于正常价格')
      )).toBe(true);
    });
  });

  describe('Batch Validation', () => {
    it('should validate multiple products efficiently', () => {
      const products = [];
      for (let i = 1; i <= 10; i++) {
        products.push(createValidProductBase({
          productId: `rec${i.toString().padStart(5, '0')}`,
          name: `批量测试产品${i}`,
          price: { normal: 10 + i }
        }));
      }

      const startTime = Date.now();
      const results = products.map(product => 
        dataTransformService.validateProduct(product)
      );
      const endTime = Date.now();

      // Should complete within reasonable time (less than 100ms for 10 products)
      expect(endTime - startTime).toBeLessThan(100);
      
      // All products should be valid
      expect(results.every(r => r.isValid)).toBe(true);
      expect(results.every(r => r.errors.length === 0)).toBe(true);
    });
  });
});