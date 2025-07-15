// 折扣计算工具函数
// 确保所有组件使用统一的折扣计算逻辑

import { Product } from '../types/product';

/**
 * 计算产品折扣率
 * @param product 产品对象
 * @returns 折扣率百分比（如20表示20%）
 */
export const calculateDiscountRate = (product: Product): number => {
  // 优先使用数据中预计算的折扣率
  if (product.price.discountRate) {
    return product.price.discountRate;
  }
  
  // 如果没有预计算的折扣率，则实时计算
  if (product.price.discount && product.price.normal && product.price.discount < product.price.normal) {
    return Math.round((1 - product.price.discount / product.price.normal) * 100);
  }
  
  return 0;
};

/**
 * 格式化折扣率显示
 * @param discountRate 折扣率（如20表示20%）
 * @param showPercent 是否显示百分号
 * @returns 格式化的折扣率字符串
 */
export const formatDiscountRate = (discountRate: number, showPercent: boolean = true): string => {
  if (discountRate <= 0) return '';
  return `${discountRate.toFixed(0)}${showPercent ? '%' : ''}`;
};

/**
 * 计算节省金额
 * @param product 产品对象
 * @returns 节省的金额
 */
export const calculateSavings = (product: Product): number => {
  if (product.price.discount && product.price.normal && product.price.discount < product.price.normal) {
    return product.price.normal - product.price.discount;
  }
  return 0;
};

/**
 * 验证折扣计算的正确性
 * @param product 产品对象
 * @returns 验证结果
 */
export const validateDiscountCalculation = (product: Product): {
  isValid: boolean;
  errors: string[];
  calculatedRate: number;
  dataRate?: number;
} => {
  const errors: string[] = [];
  let isValid = true;
  
  const calculatedRate = product.price.discount && product.price.normal && product.price.discount < product.price.normal
    ? Math.round((1 - product.price.discount / product.price.normal) * 100)
    : 0;
  
  // 检查价格数据的有效性
  if (product.price.normal <= 0) {
    errors.push('正常价格必须大于0');
    isValid = false;
  }
  
  if (product.price.discount && product.price.discount >= product.price.normal) {
    errors.push('优惠价格不能大于或等于正常价格');
    isValid = false;
  }
  
  // 检查预计算折扣率与实时计算的一致性
  if (product.price.discountRate && calculatedRate > 0) {
    const diff = Math.abs(product.price.discountRate - calculatedRate);
    if (diff > 1) { // 允许1%的误差
      errors.push(`预计算折扣率(${product.price.discountRate}%)与实时计算(${calculatedRate}%)差异过大`);
      isValid = false;
    }
  }
  
  return {
    isValid,
    errors,
    calculatedRate,
    dataRate: product.price.discountRate
  };
};


