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

  // 同步状态
  syncStatus: 'pending' | 'synced' | 'failed';
  lastSyncTime?: Date;
  syncAttempts: number;

  // 关联验证
  productExists: boolean;
  fileExists: boolean;

  // 时间戳字段 (由 timestamps: true 自动添加)
  createdAt: Date;
  updatedAt: Date;

  // 扩展元数据
  metadata?: {
    feishuFileToken?: string;
    source?: 'feishu' | 'upload' | 'migration';
    downloadTime?: Date;
    priority?: number;
    tags?: string[];
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
  isPublic: { type: Boolean, default: true },

  // 同步状态
  syncStatus: {
    type: String,
    enum: ['pending', 'synced', 'failed'],
    default: 'synced'
  },
  lastSyncTime: Date,
  syncAttempts: { type: Number, default: 0 },

  // 关联验证
  productExists: { type: Boolean, default: true },
  fileExists: { type: Boolean, default: true },

  // 扩展元数据
  metadata: {
    feishuFileToken: String,
    source: {
      type: String,
      enum: ['feishu', 'upload', 'migration'],
      default: 'upload'
    },
    downloadTime: Date,
    priority: { type: Number, default: 0 },
    tags: [String]
  }
}, {
  timestamps: true
});

// 复合索引
ImageSchema.index({ productId: 1, type: 1 }, { unique: true }); // 确保每个产品的每种类型图片唯一
ImageSchema.index({ bucketName: 1, objectName: 1 }, { unique: true }); // 确保存储路径唯一
ImageSchema.index({ isActive: 1, isPublic: 1 });
ImageSchema.index({ md5Hash: 1 }); // 用于去重检查
ImageSchema.index({ syncStatus: 1, lastSyncTime: 1 }); // 用于同步状态查询

// 添加关联验证中间件
ImageSchema.pre('save', async function(next) {
  try {
    // 验证产品是否存在
    const Product = mongoose.model('Product');
    const productExists = await Product.exists({ productId: this.productId });

    if (!productExists) {
      throw new Error(`关联的产品不存在: ${this.productId}`);
    }

    // 更新productExists字段
    this.productExists = true;
    next();
  } catch (error) {
    next(error as Error);
  }
});

// 删除前检查关联
ImageSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    // 更新Product表中的图片引用
    const Product = mongoose.model('Product');
    await Product.updateOne(
      { productId: this.productId },
      { $unset: { [`images.${this.type}`]: "" } }
    );
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const Image = mongoose.model<IImage>('Image', ImageSchema);