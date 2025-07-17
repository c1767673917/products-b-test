/**
 * 图片存储和路径配置
 * 统一管理所有图片相关的路径和配置
 */
export declare const IMAGE_CONFIG: {
    readonly MINIO: {
        readonly ENDPOINT: string;
        readonly PORT: number;
        readonly ACCESS_KEY: string;
        readonly SECRET_KEY: string;
        readonly BUCKET_NAME: string;
        readonly USE_SSL: false;
    };
    readonly PATHS: {
        readonly PRODUCTS: "products";
        readonly THUMBNAILS: "thumbnails";
        readonly TEMP: "temp";
        readonly DEPRECATED: readonly ["originals", "originals/2025/07"];
    };
    readonly IMAGE_TYPES: {
        readonly FRONT: "front";
        readonly BACK: "back";
        readonly LABEL: "label";
        readonly PACKAGE: "package";
        readonly GIFT: "gift";
    };
    readonly FORMATS: {
        readonly JPEG: "jpeg";
        readonly PNG: "png";
        readonly WEBP: "webp";
    };
    readonly THUMBNAIL_SIZES: {
        readonly small: {
            readonly width: 150;
            readonly height: 150;
            readonly quality: 80;
        };
        readonly medium: {
            readonly width: 300;
            readonly height: 300;
            readonly quality: 85;
        };
        readonly large: {
            readonly width: 600;
            readonly height: 600;
            readonly quality: 90;
        };
    };
    readonly PROCESSING: {
        readonly webp: {
            readonly quality: 85;
            readonly lossless: false;
        };
        readonly jpeg: {
            readonly quality: 90;
            readonly progressive: true;
        };
        readonly optimization: {
            readonly autoOrient: true;
            readonly stripMetadata: true;
            readonly progressive: true;
        };
    };
};
/**
 * 图片路径工具函数
 */
export declare class ImagePathUtils {
    /**
     * 构建产品图片存储路径
     */
    static buildProductImagePath(productId: string, imageType: string, timestamp?: number): string;
    /**
     * 构建缩略图路径
     */
    static buildThumbnailPath(sizeName: string, originalPath: string): string;
    /**
     * 构建完整的访问URL
     */
    static buildPublicUrl(objectName: string): string;
    /**
     * 从完整URL提取对象名
     */
    static extractObjectName(fullUrl: string): string;
    /**
     * 检查路径是否为废弃路径
     */
    static isDeprecatedPath(path: string): boolean;
    /**
     * 将废弃路径转换为新路径
     */
    static convertDeprecatedPath(path: string): string;
    /**
     * 验证图片类型是否支持
     */
    static isValidImageType(imageType: string): boolean;
    /**
     * 根据文件扩展名获取MIME类型
     */
    static getMimeType(filename: string): string;
}
//# sourceMappingURL=imageConfig.d.ts.map