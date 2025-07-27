/**
 * 价格货币转换工具
 */

// USD to CNY exchange rate (approximate)
export const USD_TO_CNY_RATE = 6.99;

/**
 * 将USD价格转换为CNY价格
 * @param usdPrice - 美元价格
 * @returns CNY价格
 */
export const convertUSDToCNY = (usdPrice: number): number => {
  return Math.round(usdPrice * USD_TO_CNY_RATE * 100) / 100; // 保留两位小数
};

/**
 * 将CNY价格转换为USD价格
 * @param cnyPrice - 人民币价格
 * @returns USD价格
 */
export const convertCNYToUSD = (cnyPrice: number): number => {
  return Math.round((cnyPrice / USD_TO_CNY_RATE) * 100) / 100; // 保留两位小数
};

/**
 * 根据语言环境转换价格范围
 * @param priceRange - 价格范围 [min, max]
 * @param currentLanguage - 当前语言
 * @returns 转换后的价格范围（始终返回CNY价格用于后端筛选）
 */
export const convertPriceRangeForAPI = (
  priceRange: [number, number],
  currentLanguage: string
): [number, number] => {
  // 如果是英文界面，需要将USD价格转换为CNY价格
  if (currentLanguage === 'en') {
    return [
      convertUSDToCNY(priceRange[0]),
      convertUSDToCNY(priceRange[1])
    ];
  }
  
  // 中文界面直接返回CNY价格
  return priceRange;
};