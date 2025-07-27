import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFavorite extends Document {
  favoriteId: string;
  productId: string;
  userId?: string;
  sessionId?: string;

  // 元数据
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    userAgent?: string;
    ip?: string;
    source?: 'web' | 'mobile' | 'api';
    [key: string]: any;
  };
}

// 静态方法接口
export interface IFavoriteModel extends Model<IFavorite> {
  toggleFavorite(
    productId: string,
    userId?: string,
    sessionId?: string,
    metadata?: any
  ): Promise<{ action: 'added' | 'removed'; favorite: IFavorite | null }>;

  getFavoritesList(options: {
    userId?: string;
    sessionId?: string;
    page?: number;
    limit?: number;
    populate?: boolean;
  }): Promise<{
    favorites: IFavorite[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>;

  getProductFavoriteCount(productId: string): Promise<number>;

  checkFavoriteStatus(
    productId: string,
    userId?: string,
    sessionId?: string
  ): Promise<boolean>;

  batchCheckFavoriteStatus(
    productIds: string[],
    userId?: string,
    sessionId?: string
  ): Promise<{ [key: string]: boolean }>;
}

const FavoriteSchema = new Schema<IFavorite>({
  favoriteId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true,
    default: () => `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  productId: { 
    type: String, 
    required: true, 
    index: true,
    ref: 'Product'
  },
  userId: { 
    type: String, 
    index: true,
    sparse: true // 允许为空，但如果有值则建立索引
  },
  sessionId: { 
    type: String, 
    index: true,
    sparse: true
  },
  
  // 扩展元数据
  metadata: {
    userAgent: String,
    ip: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web'
    }
  }
}, {
  timestamps: true
});

// 复合索引 - 确保同一用户/会话对同一产品只能收藏一次
FavoriteSchema.index({ productId: 1, userId: 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { userId: { $exists: true } }
});

FavoriteSchema.index({ productId: 1, sessionId: 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { sessionId: { $exists: true } }
});

// 时间索引用于排序和清理
FavoriteSchema.index({ createdAt: -1 });
FavoriteSchema.index({ updatedAt: -1 });

// 静态方法：切换收藏状态
FavoriteSchema.statics.toggleFavorite = async function(
  productId: string, 
  userId?: string, 
  sessionId?: string, 
  metadata?: any
) {
  if (!userId && !sessionId) {
    throw new Error('必须提供用户ID或会话ID');
  }

  const query: any = { productId };
  if (userId) {
    query.userId = userId;
  } else if (sessionId) {
    query.sessionId = sessionId;
  }

  // 查找现有收藏记录
  const existingFavorite = await this.findOne(query);

  if (existingFavorite) {
    // 如果已收藏，则删除
    await this.deleteOne({ _id: existingFavorite._id });
    return {
      action: 'removed',
      favorite: null
    };
  } else {
    // 如果未收藏，则添加
    const newFavorite = new this({
      productId,
      userId,
      sessionId,
      metadata
    });
    await newFavorite.save();
    return {
      action: 'added',
      favorite: newFavorite
    };
  }
};

// 静态方法：获取收藏列表
FavoriteSchema.statics.getFavoritesList = async function(options: {
  userId?: string;
  sessionId?: string;
  page?: number;
  limit?: number;
  populate?: boolean;
}) {
  const { userId, sessionId, page = 1, limit = 20, populate = true } = options;
  
  if (!userId && !sessionId) {
    throw new Error('必须提供用户ID或会话ID');
  }

  const query: any = {};
  if (userId) {
    query.userId = userId;
  } else if (sessionId) {
    query.sessionId = sessionId;
  }

  const skip = (page - 1) * limit;
  
  let queryBuilder = this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  if (populate) {
    queryBuilder = queryBuilder.populate('productId');
  }

  const [favorites, total] = await Promise.all([
    queryBuilder.exec(),
    this.countDocuments(query)
  ]);

  return {
    favorites,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
};

// 静态方法：获取产品的收藏数量
FavoriteSchema.statics.getProductFavoriteCount = async function(productId: string) {
  return await this.countDocuments({ productId });
};

// 静态方法：检查收藏状态
FavoriteSchema.statics.checkFavoriteStatus = async function(
  productId: string, 
  userId?: string, 
  sessionId?: string
) {
  if (!userId && !sessionId) {
    return false;
  }

  const query: any = { productId };
  if (userId) {
    query.userId = userId;
  } else if (sessionId) {
    query.sessionId = sessionId;
  }

  const favorite = await this.findOne(query);
  return !!favorite;
};

// 静态方法：批量获取收藏状态
FavoriteSchema.statics.batchCheckFavoriteStatus = async function(
  productIds: string[], 
  userId?: string, 
  sessionId?: string
) {
  if (!userId && !sessionId) {
    return {};
  }

  const query: any = { productId: { $in: productIds } };
  if (userId) {
    query.userId = userId;
  } else if (sessionId) {
    query.sessionId = sessionId;
  }

  const favorites = await this.find(query, 'productId');
  const favoriteMap: { [key: string]: boolean } = {};
  
  productIds.forEach(id => {
    favoriteMap[id] = false;
  });
  
  favorites.forEach((fav: any) => {
    favoriteMap[fav.productId] = true;
  });

  return favoriteMap;
};

export const Favorite = mongoose.model<IFavorite, IFavoriteModel>('Favorite', FavoriteSchema);
