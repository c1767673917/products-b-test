import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGlobalFavorite extends Document {
  favoriteId: string;
  productId: string;
  
  // 统计信息
  favoriteCount: number;
  lastFavoritedAt: Date;
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    source?: 'web' | 'mobile' | 'api';
    [key: string]: any;
  };
}

// 静态方法接口
export interface IGlobalFavoriteModel extends Model<IGlobalFavorite> {
  toggleFavorite(
    productId: string,
    metadata?: any
  ): Promise<{ action: 'added' | 'removed'; favorite: IGlobalFavorite | null; count: number }>;

  getFavoritesList(options: {
    page?: number;
    limit?: number;
    populate?: boolean;
    sortBy?: 'recent' | 'popular';
  }): Promise<{
    favorites: IGlobalFavorite[];
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

  checkFavoriteStatus(productId: string): Promise<boolean>;

  batchCheckFavoriteStatus(productIds: string[]): Promise<{ [key: string]: boolean }>;
}

const GlobalFavoriteSchema = new Schema<IGlobalFavorite>({
  favoriteId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true,
    default: () => `gfav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  productId: { 
    type: String, 
    required: true, 
    unique: true, // 每个产品只有一条全局收藏记录
    index: true,
    ref: 'Product'
  },
  
  // 统计信息
  favoriteCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastFavoritedAt: {
    type: Date,
    default: Date.now
  },
  
  // 扩展元数据
  metadata: {
    source: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web'
    }
  }
}, {
  timestamps: true
});

// 索引
GlobalFavoriteSchema.index({ favoriteCount: -1 }); // 用于按热度排序
GlobalFavoriteSchema.index({ lastFavoritedAt: -1 }); // 用于按最近收藏时间排序

// 静态方法：切换收藏状态
GlobalFavoriteSchema.statics.toggleFavorite = async function(
  productId: string,
  metadata?: any
) {
  // 查找现有收藏记录
  let favorite = await this.findOne({ productId });

  if (!favorite) {
    // 如果产品从未被收藏过，创建新记录
    favorite = new this({
      productId,
      favoriteCount: 1,
      lastFavoritedAt: new Date(),
      metadata
    });
    await favorite.save();
    return {
      action: 'added',
      favorite,
      count: 1
    };
  }

  // 如果记录存在，切换收藏状态
  if (favorite.favoriteCount > 0) {
    // 取消收藏（减少计数）
    favorite.favoriteCount = Math.max(0, favorite.favoriteCount - 1);
    if (favorite.favoriteCount === 0) {
      // 如果收藏数为0，可以选择删除记录或保留
      // 这里选择保留记录以保持历史信息
      await favorite.save();
      return {
        action: 'removed',
        favorite: null,
        count: 0
      };
    }
    await favorite.save();
    return {
      action: 'removed',
      favorite,
      count: favorite.favoriteCount
    };
  } else {
    // 添加收藏（增加计数）
    favorite.favoriteCount += 1;
    favorite.lastFavoritedAt = new Date();
    await favorite.save();
    return {
      action: 'added',
      favorite,
      count: favorite.favoriteCount
    };
  }
};

// 静态方法：获取收藏列表
GlobalFavoriteSchema.statics.getFavoritesList = async function(options: {
  page?: number;
  limit?: number;
  populate?: boolean;
  sortBy?: 'recent' | 'popular';
}) {
  const { page = 1, limit = 20, populate = true, sortBy = 'recent' } = options;
  
  const query = { favoriteCount: { $gt: 0 } }; // 只返回有收藏的产品
  const sort = sortBy === 'popular' 
    ? { favoriteCount: -1, lastFavoritedAt: -1 }
    : { lastFavoritedAt: -1, favoriteCount: -1 };
  
  const skip = (page - 1) * limit;
  
  const [favorites, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec(),
    this.countDocuments(query)
  ]);

  // 如果需要填充产品数据
  if (populate && favorites.length > 0) {
    const Product = mongoose.model('Product');
    const productIds = favorites.map((fav: IGlobalFavorite) => fav.productId);
    const products = await Product.find({ 
      productId: { $in: productIds },
      status: 'active',
      isVisible: true 
    });
    
    const productMap = new Map(products.map((p: any) => [p.productId, p]));
    
    // 将产品信息附加到收藏记录
    const populatedFavorites = favorites.map((fav: IGlobalFavorite) => {
      const favObj = fav.toObject();
      favObj.product = productMap.get(fav.productId) || null;
      return favObj;
    }).filter((fav: any) => fav.product !== null); // 过滤掉产品不存在的记录
    
    return {
      favorites: populatedFavorites,
      pagination: {
        total: populatedFavorites.length,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

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
GlobalFavoriteSchema.statics.getProductFavoriteCount = async function(productId: string) {
  const favorite = await this.findOne({ productId });
  return favorite?.favoriteCount || 0;
};

// 静态方法：检查收藏状态（全局收藏始终返回是否有人收藏过）
GlobalFavoriteSchema.statics.checkFavoriteStatus = async function(productId: string) {
  const favorite = await this.findOne({ productId });
  return (favorite?.favoriteCount || 0) > 0;
};

// 静态方法：批量获取收藏状态
GlobalFavoriteSchema.statics.batchCheckFavoriteStatus = async function(productIds: string[]) {
  const favorites = await this.find({ 
    productId: { $in: productIds },
    favoriteCount: { $gt: 0 }
  }, 'productId favoriteCount');
  
  const favoriteMap: { [key: string]: boolean } = {};
  
  productIds.forEach(id => {
    favoriteMap[id] = false;
  });
  
  favorites.forEach((fav: IGlobalFavorite) => {
    favoriteMap[fav.productId] = fav.favoriteCount > 0;
  });

  return favoriteMap;
};

export const GlobalFavorite = mongoose.model<IGlobalFavorite, IGlobalFavoriteModel>('GlobalFavorite', GlobalFavoriteSchema);