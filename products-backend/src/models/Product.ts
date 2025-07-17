import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  productId: string;
  recordId: string;
  name: string;
  sequence: string;
  category: {
    primary: string;
    secondary: string;
  };
  price: {
    normal: number;
    discount: number;
    discountRate: number;
    currency: string;
  };
  images: {
    front?: string;
    back?: string;
    label?: string;
    package?: string;
    gift?: string;
  };
  origin: {
    country: string;
    province: string;
    city: string;
  };
  platform: string;
  specification: string;
  flavor: string;
  manufacturer: string;
  collectTime: Date;
  createdAt: Date;
  updatedAt: Date;
  searchText: string;
  status: string;
  isVisible: boolean;
}

const ProductSchema = new Schema<IProduct>({
  productId: { type: String, required: true, unique: true, index: true },
  recordId: { type: String, required: true },
  name: { type: String, required: true, index: true },
  sequence: { type: String, required: true },
  
  category: {
    primary: { type: String, required: true, index: true },
    secondary: { type: String, required: true }
  },
  
  price: {
    normal: { type: Number, required: true, index: true },
    discount: { type: Number, default: 0 },
    discountRate: { type: Number, default: 0 },
    currency: { type: String, default: 'CNY' }
  },
  
  images: {
    front: String,
    back: String,
    label: String,
    package: String,
    gift: String
  },
  
  origin: {
    country: { type: String, default: '中国' },
    province: { type: String, index: true },
    city: String
  },
  
  platform: { type: String, required: true, index: true },
  specification: String,
  flavor: String,
  manufacturer: String,
  
  collectTime: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  searchText: { type: String, index: 'text' },
  status: { type: String, default: 'active', index: true },
  isVisible: { type: Boolean, default: true, index: true }
}, {
  timestamps: true
});

// 复合索引
ProductSchema.index({ status: 1, isVisible: 1, 'category.primary': 1, collectTime: -1 });
ProductSchema.index({ platform: 1, 'origin.province': 1 });
ProductSchema.index({ 'price.normal': 1, 'category.primary': 1 });

// 全文搜索索引
ProductSchema.index({ 
  name: 'text', 
  searchText: 'text', 
  manufacturer: 'text' 
}, {
  weights: { 
    name: 10, 
    searchText: 5, 
    manufacturer: 1 
  }
});

export const Product = mongoose.model<IProduct>('Product', ProductSchema);