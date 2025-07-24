import { calculateDiscountRate, formatDiscountRate, validateDiscountCalculation } from '../utils/discountCalculation';
import { Product } from '../types/product';

// 创建测试用的产品数据
const createTestProduct = (overrides: Partial<Product> = {}): Product => ({
  productId: 'test-001',
  recordId: 'rec001',
  name: {
    display: 'Test Product'
  },
  sequence: '001',
  category: {
    primary: {
      display: 'Test Category'
    },
    secondary: {
      display: 'Test Sub Category'
    }
  },
  price: {
    normal: 100,
    discount: 80
  },
  origin: {
    country: {
      display: 'China'
    },
    province: {
      display: 'Beijing'
    }
  },
  platform: {
    display: 'Test Platform'
  },
  collectTime: Date.now(),
  ...overrides
});

describe('折扣率计算工具函数', () => {
  describe('calculateDiscountRate', () => {
    test('应该正确计算折扣率（正常价格100，优惠价格80）', () => {
      const product = createTestProduct({
        price: {
          normal: 100,
          discount: 80
        }
      });
      
      const result = calculateDiscountRate(product);
      expect(result).toBe(20); // (100-80)/100 * 100 = 20%
    });

    test('应该使用预计算的折扣率并转换为百分比', () => {
      const product = createTestProduct({
        price: {
          normal: 100,
          discount: 80,
          discountRate: 0.2 // 20%
        }
      });
      
      const result = calculateDiscountRate(product);
      expect(result).toBe(20);
    });

    test('应该处理浮点数精度问题', () => {
      const product = createTestProduct({
        price: {
          normal: 100,
          discount: 95.05 // 这会导致 (100-95.05)/100 = 0.04999999999999993
        }
      });
      
      const result = calculateDiscountRate(product);
      expect(result).toBe(4.95); // 应该正确处理精度问题
    });

    test('当优惠价格大于等于正常价格时应该返回0', () => {
      const product1 = createTestProduct({
        price: {
          normal: 100,
          discount: 100
        }
      });
      
      const product2 = createTestProduct({
        price: {
          normal: 100,
          discount: 120
        }
      });
      
      expect(calculateDiscountRate(product1)).toBe(0);
      expect(calculateDiscountRate(product2)).toBe(0);
    });

    test('当没有优惠价格时应该返回0', () => {
      const product = createTestProduct({
        price: {
          normal: 100
        }
      });

      const result = calculateDiscountRate(product);
      expect(result).toBe(0);
    });

    test('应该允许0%折扣率存在但不显示', () => {
      const product = createTestProduct({
        price: {
          normal: 100,
          discount: 100, // 相同价格，0%折扣
          discountRate: 0
        }
      });

      const result = calculateDiscountRate(product);
      expect(result).toBe(0);

      // 格式化函数应该返回空字符串，表示不显示
      expect(formatDiscountRate(result)).toBe('');
    });

    test('应该确保不返回负数', () => {
      const product = createTestProduct({
        price: {
          normal: 100,
          discount: 120,
          discountRate: -0.1 // 负的折扣率
        }
      });
      
      const result = calculateDiscountRate(product);
      expect(result).toBe(0);
    });
  });

  describe('formatDiscountRate', () => {
    test('应该正确格式化整数折扣率', () => {
      expect(formatDiscountRate(20)).toBe('20%');
      expect(formatDiscountRate(20, false)).toBe('20');
    });

    test('应该正确格式化小数折扣率', () => {
      expect(formatDiscountRate(20.5)).toBe('20.5%');
      expect(formatDiscountRate(20.55)).toBe('20.55%');
      expect(formatDiscountRate(20.55, true, 1)).toBe('20.6%');
    });

    test('应该处理零和负数', () => {
      expect(formatDiscountRate(0)).toBe('');
      expect(formatDiscountRate(-5)).toBe('');
    });

    test('应该限制小数位数', () => {
      expect(formatDiscountRate(20.123456, true, 2)).toBe('20.12%');
      expect(formatDiscountRate(20.999, true, 1)).toBe('21%');
    });

    test('整数不应该显示小数点', () => {
      expect(formatDiscountRate(20.00, true, 2)).toBe('20%');
    });
  });

  describe('validateDiscountCalculation', () => {
    test('应该验证有效的折扣计算', () => {
      const product = createTestProduct({
        price: {
          normal: 100,
          discount: 80,
          discountRate: 0.2
        }
      });
      
      const result = validateDiscountCalculation(product);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.calculatedRate).toBe(20);
    });

    test('应该检测价格数据的无效性', () => {
      const product = createTestProduct({
        price: {
          normal: 0,
          discount: 80
        }
      });
      
      const result = validateDiscountCalculation(product);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('正常价格必须大于0');
    });

    test('应该检测优惠价格大于正常价格的情况', () => {
      const product = createTestProduct({
        price: {
          normal: 100,
          discount: 120
        }
      });
      
      const result = validateDiscountCalculation(product);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('优惠价格不能大于或等于正常价格');
    });

    test('应该检测预计算折扣率与实时计算的差异', () => {
      const product = createTestProduct({
        price: {
          normal: 100,
          discount: 80,
          discountRate: 0.1 // 10%，但实际应该是20%
        }
      });
      
      const result = validateDiscountCalculation(product);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('差异过大'))).toBe(true);
    });
  });
});
