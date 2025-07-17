import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  categoryId: string;
  name: string;
  level: number;
  parentId?: string;
  path: string;
  
  // 统计信息
  productCount: number;
  isActive: boolean;
  sortOrder: number;
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>({
  categoryId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  level: { type: Number, required: true, index: true },
  parentId: { type: String, index: true },
  path: { type: String, required: true },
  
  // 统计信息
  productCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
  sortOrder: { type: Number, default: 0 },
  
  // 元数据
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// 复合索引
CategorySchema.index({ parentId: 1, isActive: 1 });
CategorySchema.index({ level: 1, sortOrder: 1 });

export const Category = mongoose.model<ICategory>('Category', CategorySchema);