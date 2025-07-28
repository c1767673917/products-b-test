// 折扣计算工具函数
// 确保所有组件使用统一的折扣计算逻辑

import { Product } from '../types/product';

/**
 * 计算产品折扣率
 * @param product 产品对象
 * @returns 折扣率百分比（如20表示20%）
 */
export const calculateDiscountRate = (product: Product): number => {
  // 安全检查
  if (!product || !product.price) {
    return 0;
  }
  
  // 优先使用数据中预计算的折扣率（需要转换为百分比）
  if (product.price.discountRate && product.price.discountRate > 0) {
    // discountRate 是0-1之间的小数，需要转换为百分比并保留2位小数
    const rate = Math.round(product.price.discountRate * 100 * 100) / 100;
    return Math.max(0, rate); // 确保不返回负数
  }

  // 如果没有预计算的折扣率，则实时计算
  if (product.price.discount && product.price.normal && product.price.discount < product.price.normal) {
    // 使用更精确的计算方式，避免浮点数精度问题
    const rate = Math.round((1 - product.price.discount / product.price.normal) * 100 * 100) / 100;
    return Math.max(0, rate); // 确保不返回负数
  }

  return 0;
};

/**
 * 格式化折扣率显示
 * @param discountRate 折扣率（如20表示20%）
 * @param showPercent 是否显示百分号
 * @param decimalPlaces 小数位数，默认为2位
 * @returns 格式化的折扣率字符串
 */
export const formatDiscountRate = (discountRate: number, showPercent: boolean = true, decimalPlaces: number = 2): string => {
  if (discountRate <= 0) return '';

  // 限制小数位数，避免显示过多无意义的精度位数
  const formattedRate = Number(discountRate.toFixed(decimalPlaces));

  // 如果是整数，不显示小数点；否则移除尾随零
  let displayRate: string;
  if (formattedRate % 1 === 0) {
    displayRate = formattedRate.toFixed(0);
  } else {
    displayRate = formattedRate.toFixed(decimalPlaces).replace(/\.?0+$/, '');
  }

  return `${displayRate}${showPercent ? '%' : ''}`;
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
    // 将 discountRate 转换为百分比进行比较
    const preCalculatedRate = Math.round(product.price.discountRate * 100 * 100) / 100;
    const diff = Math.abs(preCalculatedRate - calculatedRate);
    if (diff > 1) { // 允许1%的误差
      errors.push(`预计算折扣率(${preCalculatedRate}%)与实时计算(${calculatedRate}%)差异过大`);
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


