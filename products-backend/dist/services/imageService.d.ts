import { IImage } from '../models/Image';
export declare class ImageService {
    private minioClient;
    private bucketName;
    constructor();
    /**
     * 上传图片到MinIO并创建数据库记录
     */
    uploadImage(buffer: Buffer, filename: string, productId: string, imageType: string): Promise<IImage>;
    /**
     * 生成缩略图
     */
    private generateThumbnails;
    /**
     * 获取图片信息
     */
    getImageInfo(imageId: string): Promise<IImage | null>;
    /**
     * 获取图片代理URL
     */
    getImageProxy(imageId: string, options?: {
        width?: number;
        height?: number;
        quality?: number;
        format?: string;
    }): Promise<string | null>;
    /**
     * 实时图片处理
     */
    processImageOnDemand(imageId: string, options: {
        width?: number;
        height?: number;
        quality?: number;
        format?: string;
    }): Promise<Buffer | null>;
    /**
     * 删除图片
     */
    deleteImage(imageId: string): Promise<boolean>;
    /**
     * 批量上传产品图片
     */
    uploadProductImages(productId: string, images: {
        buffer: Buffer;
        filename: string;
        type: string;
    }[]): Promise<IImage[]>;
    /**
     * 获取产品的所有图片
     */
    getProductImages(productId: string): Promise<IImage[]>;
    /**
     * 辅助方法
     */
    private generateImageId;
    private generateProcessedImageUrl;
    private streamToBuffer;
    /**
     * 健康检查
     */
    healthCheck(): Promise<{
        status: string;
        bucketExists: boolean;
        error?: string;
    }>;
}
export declare const imageService: ImageService;
//# sourceMappingURL=imageService.d.ts.map