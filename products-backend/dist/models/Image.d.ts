import mongoose, { Document } from 'mongoose';
export interface IImage extends Document {
    imageId: string;
    productId: string;
    type: string;
    bucketName: string;
    objectName: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
    width?: number;
    height?: number;
    publicUrl: string;
    cdnUrl?: string;
    processStatus: string;
    thumbnails: Array<{
        size: string;
        url: string;
        width: number;
        height: number;
    }>;
    uploadedAt: Date;
    lastAccessedAt: Date;
    accessCount: number;
    md5Hash: string;
    sha256Hash?: string;
    isActive: boolean;
    isPublic: boolean;
}
export declare const Image: mongoose.Model<IImage, {}, {}, {}, mongoose.Document<unknown, {}, IImage, {}> & IImage & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Image.d.ts.map