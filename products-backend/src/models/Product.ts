import mongoose from 'mongoose';

// TypeScript interface for Product
export interface IProduct extends mongoose.Document {
  productId: string;
  rxNumber: string;
  internalId: string;
  name: {
    english?: string;
    chinese?: string;
    display: string; // 优先显示英文，如果没有则显示中文
  };
  sequence: string;
  category: {
    primary: {
      english?: string;
      chinese?: string;
      display: string;
    };
    secondary: {
      english?: string;
      chinese?: string;
      display: string;
    };
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
    city?: string;
  };
  platform: {
    english?: string;
    chinese?: string;
    display: string;
  };
  specification?: string;
  flavor: {
    english?: string;
    chinese?: string;
    display: string;
  };
  manufacturer?: string;
  collectTime: Date;
  syncTime: Date;
  version: number;
  status: 'active' | 'inactive' | 'deleted';
  isVisible: boolean;
}

// Product Schema - 优化后的产品数据模型
const ProductSchema = new mongoose.Schema({
  // 主键：使用飞书记录ID
  productId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match: /^rec[a-zA-Z0-9]+$/,
    trim: true
  },

  // rx编号字段
  rxNumber: {
    type: String,
    index: true,
    trim: true
  },

  // 辅助标识字段
  internalId: {
    type: String,
    index: true,
    trim: true
  },
  
  // 基本信息 - 支持中英文
  name: {
    english: {
      type: String,
      maxLength: 200,
      trim: true,
      index: true
    },
    chinese: {
      type: String,
      maxLength: 200,
      trim: true,
      index: true
    },
    display: {
      type: String,
      required: true,
      index: true,
      maxLength: 200,
      trim: true
    }
  },
  
  sequence: { 
    type: String, 
    required: true,
    trim: true
  },
  
  // 分类信息 - 支持中英文
  category: {
    primary: {
      english: {
        type: String,
        trim: true,
        index: true
      },
      chinese: {
        type: String,
        trim: true,
        index: true
      },
      display: {
        type: String,
        required: true,
        index: true,
        trim: true
      }
    },
    secondary: {
      english: {
        type: String,
        trim: true,
        index: true
      },
      chinese: {
        type: String,
        trim: true,
        index: true
      },
      display: {
        type: String,
        required: true,
        index: true,
        trim: true
      }
    }
  },
  
  // 价格信息
  price: {
    normal: { 
      type: Number, 
      required: true,
      min: 0,
      max: 999999.99
    },
    discount: { 
      type: Number, 
      default: 0,
      min: 0,
      max: 999999.99
    },
    discountRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    currency: {
      type: String,
      default: 'CNY',
      enum: ['CNY', 'USD', 'EUR']
    }
  },
  
  // 图片信息
  images: {
    front: { type: String, trim: true },
    back: { type: String, trim: true },
    label: { type: String, trim: true },
    package: { type: String, trim: true },
    gift: { type: String, trim: true }
  },
  
  // 产地信息
  origin: {
    country: { 
      type: String, 
      required: true,
      default: '中国',
      trim: true
    },
    province: { 
      type: String, 
      required: true,
      index: true,
      trim: true
    },
    city: { 
      type: String,
      index: true,
      trim: true
    }
  },
  
  // 产品属性 - 支持中英文
  platform: {
    english: {
      type: String,
      trim: true,
      index: true
    },
    chinese: {
      type: String,
      trim: true,
      index: true
    },
    display: {
      type: String,
      required: true,
      index: true,
      trim: true
    }
  },

  specification: { type: String, trim: true },
  flavor: {
    english: {
      type: String,
      trim: true
    },
    chinese: {
      type: String,
      trim: true
    },
    display: {
      type: String,
      trim: true
    }
  },
  manufacturer: { type: String, trim: true },
  
  // 其他信息
  boxSpec: { type: String, trim: true },
  notes: { type: String, trim: true },
  gift: { type: String, trim: true },
  giftMechanism: { type: String, trim: true },
  client: { type: String, trim: true },
  barcode: { type: String, trim: true },
  link: { type: String, trim: true },
  
  // 时间信息
  collectTime: { 
    type: Date, 
    required: true,
    index: true
  },
  
  syncTime: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  
  // 元数据
  version: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['active', 'inactive', 'deleted'],
    default: 'active',
    index: true
  },
  isVisible: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// 复合索引
ProductSchema.index({ 'category.primary.display': 1, 'category.secondary.display': 1 });
ProductSchema.index({ 'platform.display': 1, status: 1 });
ProductSchema.index({ collectTime: -1, syncTime: -1 });
ProductSchema.index({ isVisible: 1, status: 1 });
ProductSchema.index({ 'name.display': 1, status: 1 });
ProductSchema.index({ 'name.english': 1, 'name.chinese': 1 });
ProductSchema.index({ 'category.primary.english': 1, 'category.primary.chinese': 1 });
ProductSchema.index({ 'platform.english': 1, 'platform.chinese': 1 });

export const Product = mongoose.model('Product', ProductSchema);
export default Product;