/**
 * URL标准化服务
 * 
 * 提供图片URL格式标准化、验证和修复功能
 */

import { Product } from '../models/Product';
import { Image } from '../models/Image';
import { IMAGE_CONFIG, ImagePathUtils } from '../config/imageConfig';

export interface UrlAnalysis {
  totalUrls: number;
  standardUrls: number;
  deprecatedUrls: number;
  invalidUrls: number;
  standardizationRate: number;
  deprecatedPatterns: Record<string, number>;
}

export interface StandardizationResult {
  processed: number;
  fixed: number;
  errors: string[];
}

export class UrlStandardizationService {
  private readonly standardUrlPrefix: string;
  private readonly deprecatedPatterns: RegExp[];
  private readonly validExtensions: string[];

  constructor() {
    this.standardUrlPrefix = `http://${IMAGE_CONFIG.MINIO.ENDPOINT}:${IMAGE_CONFIG.MINIO.PORT}/${IMAGE_CONFIG.MINIO.BUCKET_NAME}/${IMAGE_CONFIG.PATHS.PRODUCTS}/`;
    
    this.deprecatedPatterns = [
      /\/originals\//,
      /\/originals\/2025\/07\//,
      /\/images\//,
      /^\/product-images\//
    ];
    
    this.validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  }

  /**
   * 分析URL格式分布
   */
  async analyzeUrlFormats(): Promise<UrlAnalysis> {
    const analysis: UrlAnalysis = {
      totalUrls: 0,
      standardUrls: 0,
      deprecatedUrls: 0,
      invalidUrls: 0,
      standardizationRate: 0,
      deprecatedPatterns: {}
    };

    try {
      // 分析Product表中的URL
      const products = await Product.find({}).lean();
      
      for (const product of products) {
        const imageTypes = ['front', 'back', 'label', 'package', 'gift'] as const;
        
        for (const imageType of imageTypes) {
          const imageData = product.images?.[imageType];
          if (imageData) {
            const url = typeof imageData === 'string' ? imageData : imageData.url;
            if (url) {
              analysis.totalUrls++;
              this.categorizeUrl(url, analysis);
            }
          }
        }
      }

      // 分析Image表中的URL
      const images = await Image.find({}).lean();
      
      for (const image of images) {
        if (image.publicUrl) {
          analysis.totalUrls++;
          this.categorizeUrl(image.publicUrl, analysis);
        }
      }

      // 计算标准化率
      analysis.standardizationRate = analysis.totalUrls > 0 
        ? (analysis.standardUrls / analysis.totalUrls) * 100 
        : 100;

      return analysis;

    } catch (error) {
      console.error('分析URL格式失败:', error);
      throw error;
    }
  }

  /**
   * 分类URL并更新统计
   */
  private categorizeUrl(url: string, analysis: UrlAnalysis): void {
    if (!url || typeof url !== 'string') {
      analysis.invalidUrls++;
      return;
    }

    // 检查是否为标准格式
    if (url.startsWith(this.standardUrlPrefix)) {
      analysis.standardUrls++;
      return;
    }

    // 检查是否为废弃格式
    for (const pattern of this.deprecatedPatterns) {
      if (pattern.test(url)) {
        analysis.deprecatedUrls++;
        const patternKey = pattern.toString();
        analysis.deprecatedPatterns[patternKey] = (analysis.deprecatedPatterns[patternKey] || 0) + 1;
        return;
      }
    }

    analysis.invalidUrls++;
  }

  /**
   * 标准化单个URL
   */
  standardizeUrl(url: string, productId: string, imageType: string): string {
    if (!url || typeof url !== 'string') {
      return url;
    }

    // 如果已经是标准格式，直接返回
    if (url.startsWith(this.standardUrlPrefix)) {
      return url;
    }

    try {
      // 提取文件名
      let filename = this.extractFilename(url, productId, imageType);
      
      // 构建标准URL
      return `${this.standardUrlPrefix}${filename}`;

    } catch (error) {
      console.warn(`标准化URL失败: ${url}`, error);
      return url;
    }
  }

  /**
   * 从URL中提取文件名
   */
  private extractFilename(url: string, productId: string, imageType: string): string {
    let filename = '';

    if (url.startsWith('http')) {
      // 从完整URL中提取文件名
      const urlParts = url.split('/');
      filename = urlParts[urlParts.length - 1];
    } else {
      // 从相对路径中提取文件名
      filename = url.split('/').pop() || url.split('\\').pop() || '';
    }

    // 验证文件名
    if (!filename || !this.validExtensions.some(ext => filename.toLowerCase().endsWith(ext))) {
      // 如果没有有效文件名，生成一个
      const timestamp = Date.now();
      filename = `${productId}_${imageType}_${timestamp}.jpg`;
    }

    return filename;
  }

  /**
   * 批量标准化Product表中的URL
   */
  async standardizeProductUrls(batchSize: number = 100): Promise<StandardizationResult> {
    const result: StandardizationResult = {
      processed: 0,
      fixed: 0,
      errors: []
    };

    try {
      const totalProducts = await Product.countDocuments({});
      let skip = 0;

      while (skip < totalProducts) {
        const products = await Product.find({})
          .skip(skip)
          .limit(batchSize)
          .lean();

        for (const product of products) {
          try {
            let needsUpdate = false;
            const updates: Record<string, any> = {};

            const imageTypes = ['front', 'back', 'label', 'package', 'gift'] as const;

            for (const imageType of imageTypes) {
              const imageData = product.images?.[imageType];

              if (imageData) {
                const currentUrl = typeof imageData === 'string' ? imageData : imageData.url;

                if (currentUrl) {
                  const standardizedUrl = this.standardizeUrl(currentUrl, product.productId, imageType);

                  if (standardizedUrl !== currentUrl) {
                    needsUpdate = true;
                    result.fixed++;

                    if (typeof imageData === 'string') {
                      updates[`images.${imageType}`] = standardizedUrl;
                    } else {
                      updates[`images.${imageType}.url`] = standardizedUrl;
                    }
                  }
                }
              }
            }

            // 应用更新
            if (needsUpdate && Object.keys(updates).length > 0) {
              await Product.updateOne(
                { productId: product.productId },
                { $set: updates }
              );
            }

            result.processed++;

          } catch (error) {
            result.errors.push(`产品 ${product.productId}: ${(error as Error).message}`);
          }
        }

        skip += batchSize;
      }

      return result;

    } catch (error) {
      console.error('批量标准化Product URL失败:', error);
      throw error;
    }
  }

  /**
   * 批量标准化Image表中的URL
   */
  async standardizeImageUrls(batchSize: number = 100): Promise<StandardizationResult> {
    const result: StandardizationResult = {
      processed: 0,
      fixed: 0,
      errors: []
    };

    try {
      const totalImages = await Image.countDocuments({});
      let skip = 0;

      while (skip < totalImages) {
        const images = await Image.find({})
          .skip(skip)
          .limit(batchSize);

        for (const image of images) {
          try {
            const originalUrl = image.publicUrl;
            const standardizedUrl = this.standardizeUrl(originalUrl, image.productId, image.type);

            if (standardizedUrl !== originalUrl) {
              result.fixed++;
              image.publicUrl = standardizedUrl;
              await image.save();
            }

            result.processed++;

          } catch (error) {
            result.errors.push(`图片 ${image.imageId}: ${(error as Error).message}`);
          }
        }

        skip += batchSize;
      }

      return result;

    } catch (error) {
      console.error('批量标准化Image URL失败:', error);
      throw error;
    }
  }

  /**
   * 验证URL是否为标准格式
   */
  isStandardUrl(url: string): boolean {
    return url && typeof url === 'string' && url.startsWith(this.standardUrlPrefix);
  }

  /**
   * 检查URL是否为废弃格式
   */
  isDeprecatedUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    return this.deprecatedPatterns.some(pattern => pattern.test(url));
  }

  /**
   * 获取标准化建议
   */
  getStandardizationSuggestions(analysis: UrlAnalysis): string[] {
    const suggestions: string[] = [];

    if (analysis.deprecatedUrls > 0) {
      suggestions.push(`发现 ${analysis.deprecatedUrls} 个废弃格式URL，建议立即标准化`);
    }

    if (analysis.invalidUrls > 0) {
      suggestions.push(`发现 ${analysis.invalidUrls} 个无效URL，需要手动检查和修复`);
    }

    if (analysis.standardizationRate < 95) {
      suggestions.push(`当前标准化率为 ${analysis.standardizationRate.toFixed(2)}%，建议提升至95%以上`);
    }

    if (Object.keys(analysis.deprecatedPatterns).length > 0) {
      suggestions.push('主要废弃格式: ' + Object.keys(analysis.deprecatedPatterns).join(', '));
    }

    if (suggestions.length === 0) {
      suggestions.push('URL格式已完全标准化，无需额外处理');
    }

    return suggestions;
  }
}

// 导出单例实例
export const urlStandardizationService = new UrlStandardizationService();
