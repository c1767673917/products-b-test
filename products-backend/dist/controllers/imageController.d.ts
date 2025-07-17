import { FastifyRequest, FastifyReply } from 'fastify';
interface ImageProxyQuery {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
}
export declare class ImageController {
    /**
     * 获取图片信息
     */
    static getImageInfo(request: FastifyRequest<{
        Params: {
            imageId: string;
        };
    }>, reply: FastifyReply): Promise<{
        success: boolean;
        data: {
            imageId: string;
            productId: string;
            type: string;
            originalName: string;
            fileSize: number;
            mimeType: string;
            width: number | undefined;
            height: number | undefined;
            publicUrl: string;
            thumbnails: {
                size: string;
                url: string;
                width: number;
                height: number;
            }[];
            processStatus: string;
            uploadedAt: Date;
            accessCount: number;
        };
    }>;
    /**
     * 图片代理访问
     */
    static proxyImage(request: FastifyRequest<{
        Params: {
            imageId: string;
        };
        Querystring: ImageProxyQuery;
    }>, reply: FastifyReply): Promise<{
        success: boolean;
        data: {
            url: string;
        };
    }>;
    /**
     * 上传单个图片
     */
    static uploadSingle(request: FastifyRequest, reply: FastifyReply): Promise<{
        success: boolean;
        data: {
            imageId: string;
            productId: string;
            type: string;
            publicUrl: string;
            thumbnails: {
                size: string;
                url: string;
                width: number;
                height: number;
            }[];
            fileSize: number;
            width: number | undefined;
            height: number | undefined;
        };
        message: string;
    }>;
    /**
     * 批量上传产品图片
     */
    static uploadBatch(request: FastifyRequest, reply: FastifyReply): Promise<{
        success: boolean;
        data: {
            productId: string;
            images: {
                imageId: string;
                type: string;
                publicUrl: string;
                thumbnails: {
                    size: string;
                    url: string;
                    width: number;
                    height: number;
                }[];
                fileSize: number;
                width: number | undefined;
                height: number | undefined;
            }[];
            total: number;
        };
        message: string;
    }>;
    /**
     * 获取产品的所有图片
     */
    static getProductImages(request: FastifyRequest<{
        Params: {
            productId: string;
        };
    }>, reply: FastifyReply): Promise<{
        success: boolean;
        data: {
            productId: string;
            images: {
                imageId: string;
                type: string;
                publicUrl: string;
                thumbnails: {
                    size: string;
                    url: string;
                    width: number;
                    height: number;
                }[];
                fileSize: number;
                width: number | undefined;
                height: number | undefined;
                uploadedAt: Date;
                accessCount: number;
            }[];
            total: number;
        };
    }>;
    /**
     * 删除图片
     */
    static deleteImage(request: FastifyRequest<{
        Params: {
            imageId: string;
        };
    }>, reply: FastifyReply): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * 图片服务健康检查
     */
    static healthCheck(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * 获取图片统计信息
     */
    static getStats(request: FastifyRequest, reply: FastifyReply): Promise<{
        success: boolean;
        data: any;
    }>;
    /**
     * 验证上传参数
     */
    private static validateUploadParams;
}
export {};
//# sourceMappingURL=imageController.d.ts.map