/**
 * 图片存储和路径配置
 * 统一管理所有图片相关的路径和配置
 */

export const IMAGE_CONFIG = {
  // MinIO 配置
  MINIO: {
    ENDPOINT: process.env.MINIO_ENDPOINT || 'localhost',
    PORT: parseInt(process.env.MINIO_PORT || '9000'),
    ACCESS_KEY: process.env.MINIO_ACCESS_KEY || 'lcsm',
    SECRET_KEY: process.env.MINIO_SECRET_KEY || 'Sa2482047260',
    BUCKET_NAME: process.env.MINIO_BUCKET || 'product-images',
    USE_SSL: false
  },

  // 路径配置 - 统一使用 products/ 前缀
  PATHS: {
    // 产品图片存储路径前缀
    PRODUCTS: 'products',
    // 缩略图路径前缀
    THUMBNAILS: 'thumbnails',
    // 临时文件路径前缀
    TEMP: 'temp',
    // 废弃的路径（用于识别需要修复的路径）
    DEPRECATED: ['originals', 'originals/2025/07']
  },

  // 支持的图片类型
  IMAGE_TYPES: {
    FRONT: 'front',
    BACK: 'back', 
    LABEL: 'label',
    PACKAGE: 'package',
    GIFT: 'gift'
  },

  // 文件格式配置
  FORMATS: {
    JPEG: 'jpeg',
    PNG: 'png',
    WEBP: 'webp'
  },

  // 缩略图尺寸配置
  THUMBNAIL_SIZES: {
    small: { width: 150, height: 150, quality: 80 },
    medium: { width: 300, height: 300, quality: 85 },
    large: { width: 600, height: 600, quality: 90 }
  },

  // 图片处理配置
  PROCESSING: {
    webp: { quality: 85, lossless: false },
    jpeg: { quality: 90, progressive: true },
    optimization: {
      autoOrient: true,
      stripMetadata: true,
      progressive: true
    }
  }
} as const;

/**
 * 图片路径工具函数
 */
export class ImagePathUtils {
  /**
   * 构建产品图片存储路径
   */
  static buildProductImagePath(productId: string, imageType: string, timestamp?: number): string {
    const ts = timestamp || Date.now();
    return `${IMAGE_CONFIG.PATHS.PRODUCTS}/${productId}_${imageType}_${ts}`;
  }

  /**
   * 构建缩略图路径
   */
  static buildThumbnailPath(sizeName: string, originalPath: string): string {
    const filename = originalPath.split('/').pop();
    return `${IMAGE_CONFIG.PATHS.THUMBNAILS}/${sizeName}/${filename}`;
  }

  /**
   * 构建完整的访问URL
   */
  static buildPublicUrl(objectName: string): string {
    const protocol = IMAGE_CONFIG.MINIO.USE_SSL ? 'https' : 'http';
    return `${protocol}://${IMAGE_CONFIG.MINIO.ENDPOINT}:${IMAGE_CONFIG.MINIO.PORT}/${IMAGE_CONFIG.MINIO.BUCKET_NAME}/${objectName}`;
  }

  /**
   * 从完整URL提取对象名
   */
  static extractObjectName(fullUrl: string): string {
    const baseUrl = this.buildPublicUrl('');
    return fullUrl.replace(baseUrl, '');
  }

  /**
   * 检查路径是否为废弃路径
   */
  static isDeprecatedPath(path: string): boolean {
    return IMAGE_CONFIG.PATHS.DEPRECATED.some(deprecated => 
      path.startsWith(deprecated)
    );
  }

  /**
   * 将废弃路径转换为新路径
   */
  static convertDeprecatedPath(path: string): string {
    if (!this.isDeprecatedPath(path)) {
      return path;
    }

    // 提取文件名部分
    const filename = path.split('/').pop();
    if (!filename) {
      return path;
    }

    // 构建新的路径
    return `${IMAGE_CONFIG.PATHS.PRODUCTS}/${filename}`;
  }

  /**
   * 验证图片类型是否支持
   */
  static isValidImageType(imageType: string): boolean {
    return Object.values(IMAGE_CONFIG.IMAGE_TYPES).includes(imageType as any);
  }

  /**
   * 根据文件扩展名获取MIME类型
   */
  static getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }
}