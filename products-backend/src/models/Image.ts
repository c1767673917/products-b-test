import mongoose, { Schema, Document } from 'mongoose';

export interface IImage extends Document {
  imageId: string;
  productId: string;
  type: string;
  
  // MinIO存储信息
  bucketName: string;
  objectName: string;
  originalName: string;
  
  // 文件信息
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  
  // 访问信息
  publicUrl: string;
  cdnUrl?: string;
  
  // 处理状态
  processStatus: string;
  thumbnails: Array<{
    size: string;
    url: string;
    width: number;
    height: number;
  }>;
  
  // 元数据
  uploadedAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
  
  // 哈希值用于去重
  md5Hash: string;
  sha256Hash?: string;
  
  // 状态
  isActive: boolean;
  isPublic: boolean;

  // 扩展元数据
  metadata?: {
    feishuFileToken?: string;
    [key: string]: any;
  };
}

const ImageSchema = new Schema<IImage>({
  imageId: { type: String, required: true, unique: true, index: true },
  productId: { type: String, required: true, index: true },
  type: { type: String, required: true, enum: ['front', 'back', 'label', 'package', 'gift'] },
  
  // MinIO存储信息
  bucketName: { type: String, required: true },
  objectName: { type: String, required: true },
  originalName: { type: String, required: true },
  
  // 文件信息
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  width: Number,
  height: Number,
  
  // 访问信息
  publicUrl: { type: String, required: true },
  cdnUrl: String,
  
  // 处理状态
  processStatus: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'completed' 
  },
  thumbnails: [{
    size: { type: String, required: true },
    url: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true }
  }],
  
  // 元数据
  uploadedAt: { type: Date, default: Date.now },
  lastAccessedAt: { type: Date, default: Date.now },
  accessCount: { type: Number, default: 0 },
  
  // 哈希值用于去重
  md5Hash: { type: String, required: true, index: true },
  sha256Hash: String,
  
  // 状态
  isActive: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: true }
}, {
  timestamps: true
});

// 复合索引
ImageSchema.index({ productId: 1, type: 1 });
ImageSchema.index({ bucketName: 1, objectName: 1 });
ImageSchema.index({ isActive: 1, isPublic: 1 });

export const Image = mongoose.model<IImage>('Image', ImageSchema);