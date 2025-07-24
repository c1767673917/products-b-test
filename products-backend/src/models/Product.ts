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
    front?: string | {
      imageId: string;
      url: string;
      objectName: string;
      lastUpdated: Date;
      fileSize?: number;
      mimeType?: string;
      width?: number;
      height?: number;
    };
    back?: string | {
      imageId: string;
      url: string;
      objectName: string;
      lastUpdated: Date;
      fileSize?: number;
      mimeType?: string;
      width?: number;
      height?: number;
    };
    label?: string | {
      imageId: string;
      url: string;
      objectName: string;
      lastUpdated: Date;
      fileSize?: number;
      mimeType?: string;
      width?: number;
      height?: number;
    };
    package?: string | {
      imageId: string;
      url: string;
      objectName: string;
      lastUpdated: Date;
      fileSize?: number;
      mimeType?: string;
      width?: number;
      height?: number;
    };
    gift?: string | {
      imageId: string;
      url: string;
      objectName: string;
      lastUpdated: Date;
      fileSize?: number;
      mimeType?: string;
      width?: number;
      height?: number;
    };
  };
  origin: {
    country: {
      english?: string;
      chinese?: string;
      display: string;
    };
    province: {
      english?: string;
      chinese?: string;
      display: string;
    };
    city?: {
      english?: string;
      chinese?: string;
      display: string;
    };
  };
  platform: {
    english?: string;
    chinese?: string;
    display: string;
  };
  specification?: {
    english?: string;
    chinese?: string;
    display: string;
  };
  flavor: {
    english?: string;
    chinese?: string;
    display: string;
  };
  manufacturer?: {
    english?: string;
    chinese?: string;
    display: string;
  };
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
  
  // 图片信息 - 支持字符串URL或详细对象结构
  images: {
    front: {
      type: mongoose.Schema.Types.Mixed,
      validate: {
        validator: function(value: any) {
          if (!value) return true;
          if (typeof value === 'string') return true;
          if (typeof value === 'object' && value.imageId && value.url && value.objectName) return true;
          return false;
        },
        message: 'images.front must be a string URL or an object with imageId, url, and objectName'
      }
    },
    back: {
      type: mongoose.Schema.Types.Mixed,
      validate: {
        validator: function(value: any) {
          if (!value) return true;
          if (typeof value === 'string') return true;
          if (typeof value === 'object' && value.imageId && value.url && value.objectName) return true;
          return false;
        },
        message: 'images.back must be a string URL or an object with imageId, url, and objectName'
      }
    },
    label: {
      type: mongoose.Schema.Types.Mixed,
      validate: {
        validator: function(value: any) {
          if (!value) return true;
          if (typeof value === 'string') return true;
          if (typeof value === 'object' && value.imageId && value.url && value.objectName) return true;
          return false;
        },
        message: 'images.label must be a string URL or an object with imageId, url, and objectName'
      }
    },
    package: {
      type: mongoose.Schema.Types.Mixed,
      validate: {
        validator: function(value: any) {
          if (!value) return true;
          if (typeof value === 'string') return true;
          if (typeof value === 'object' && value.imageId && value.url && value.objectName) return true;
          return false;
        },
        message: 'images.package must be a string URL or an object with imageId, url, and objectName'
      }
    },
    gift: {
      type: mongoose.Schema.Types.Mixed,
      validate: {
        validator: function(value: any) {
          if (!value) return true;
          if (typeof value === 'string') return true;
          if (typeof value === 'object' && value.imageId && value.url && value.objectName) return true;
          return false;
        },
        message: 'images.gift must be a string URL or an object with imageId, url, and objectName'
      }
    }
  },
  
  // 产地信息 - 支持中英文
  origin: {
    country: {
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
        default: '中国',
        trim: true,
        index: true
      }
    },
    province: {
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
        trim: true,
        index: true
      }
    },
    city: {
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
        trim: true,
        index: true
      }
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

  specification: {
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
  manufacturer: {
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

// 添加图片关联索引
ProductSchema.index({ 'images.front.imageId': 1 }, { sparse: true });
ProductSchema.index({ 'images.back.imageId': 1 }, { sparse: true });
ProductSchema.index({ 'images.label.imageId': 1 }, { sparse: true });
ProductSchema.index({ 'images.package.imageId': 1 }, { sparse: true });
ProductSchema.index({ 'images.gift.imageId': 1 }, { sparse: true });

// 添加关联验证中间件
ProductSchema.pre('save', async function(next) {
  try {
    // 验证图片引用的完整性
    const imageTypes = ['front', 'back', 'label', 'package', 'gift'];

    for (const imageType of imageTypes) {
      const imageData = this.images?.[imageType as keyof typeof this.images];

      if (imageData && typeof imageData === 'object' && 'imageId' in imageData) {
        // 验证引用的Image记录是否存在
        const Image = mongoose.model('Image');
        const imageExists = await Image.exists({ imageId: imageData.imageId });

        if (!imageExists) {
          console.warn(`警告: 产品 ${this.productId} 引用的 ${imageType} 图片 ${imageData.imageId} 不存在`);
          // 可以选择抛出错误或者清理无效引用
          // throw new Error(`引用的图片不存在: ${imageData.imageId}`);
        }
      }
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// 删除前清理关联的图片
ProductSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    const Image = mongoose.model('Image');

    // 标记关联的图片为孤立状态
    await Image.updateMany(
      { productId: this.productId },
      {
        $set: {
          productExists: false,
          isActive: false
        }
      }
    );

    next();
  } catch (error) {
    next(error as Error);
  }
});

export const Product = mongoose.model('Product', ProductSchema);
export default Product;