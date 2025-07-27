import { describe, it, expect } from 'vitest';
import { 
  convertUSDToCNY, 
  convertCNYToUSD, 
  convertPriceRangeForAPI,
  USD_TO_CNY_RATE 
} from '../priceConversion';

describe('Price Conversion Utilities', () => {
  describe('convertUSDToCNY', () => {
    it('should convert USD to CNY correctly', () => {
      expect(convertUSDToCNY(1)).toBe(6.99);
      expect(convertUSDToCNY(10)).toBe(69.9);
      expect(convertUSDToCNY(100)).toBe(699);
    });

    it('should round to 2 decimal places', () => {
      expect(convertUSDToCNY(1.234)).toBe(8.63);
      expect(convertUSDToCNY(5.678)).toBe(39.69);
    });
  });

  describe('convertCNYToUSD', () => {
    it('should convert CNY to USD correctly', () => {
      expect(convertCNYToUSD(6.99)).toBe(1);
      expect(convertCNYToUSD(69.9)).toBe(10);
      expect(convertCNYToUSD(699)).toBe(100);
    });

    it('should round to 2 decimal places', () => {
      expect(convertCNYToUSD(10)).toBe(1.43);
      expect(convertCNYToUSD(50)).toBe(7.15);
    });
  });

  describe('convertPriceRangeForAPI', () => {
    it('should convert USD price range to CNY for English language', () => {
      const usdRange: [number, number] = [10, 50];
      const result = convertPriceRangeForAPI(usdRange, 'en');
      expect(result).toEqual([69.9, 349.5]);
    });

    it('should return CNY price range as-is for Chinese language', () => {
      const cnyRange: [number, number] = [50, 200];
      const result = convertPriceRangeForAPI(cnyRange, 'zh');
      expect(result).toEqual([50, 200]);
    });

    it('should return CNY price range as-is for other languages', () => {
      const cnyRange: [number, number] = [100, 500];
      const result = convertPriceRangeForAPI(cnyRange, 'ja');
      expect(result).toEqual([100, 500]);
    });
  });
});