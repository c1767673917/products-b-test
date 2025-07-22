// 产品相关类型定义

// 多语言字段接口
export interface MultilingualField {
  english?: string;
  chinese?: string;
  display: string;
}

export interface Product {
  productId: string;
  recordId: string;
  name: {
    english?: string;
    chinese?: string;
    display: string; // 优先显示英文，如果没有则显示中文
  };
  sequence: string;

  // 分类信息
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

  // 价格信息
  price: {
    normal: number;
    discount?: number;
    discountRate?: number;
  };

  // 图片信息 - 整个 images 对象也可能为空
  images?: {
    front?: string;
    back?: string;
    label?: string;
    package?: string;
    gift?: string;
  };

  // 产地信息
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

  // 其他信息
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
  flavor?: {
    english?: string;
    chinese?: string;
    display: string;
  };
  manufacturer?: {
    english?: string;
    chinese?: string;
    display: string;
  };
  collectTime: number;
  link?: string;
  boxSpec?: string;
  notes?: string;
}

// 图片类型枚举
export type ImageType = 'front' | 'back' | 'label' | 'package' | 'gift';

// 筛选状态接口
export interface FilterState {
  priceRange?: [number, number];
  categories: string[];
  locations: string[];
  platforms: string[];
  showDiscountOnly: boolean;
}

// 搜索配置
export interface SearchConfig {
  fields: ('name' | 'category' | 'specification' | 'flavor' | 'manufacturer')[];
  fuzzyMatch: boolean;
  highlightResults: boolean;
  searchHistory: string[];
}

// 视图模式
export type ViewMode = 'grid' | 'list';

// 排序选项
export type SortOption = 'name' | 'price-asc' | 'price-desc' | 'collect-time';

// 产品卡片属性
export interface ProductCardProps {
  product: Product;
  onImageHover?: (imageType: ImageType) => void;
  onQuickAction?: (action: 'favorite' | 'compare' | 'detail') => void;
  layout?: ViewMode;
  className?: string;
  isFavorited?: boolean;
  isInCompare?: boolean;
}

// 筛选器属性
export interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onReset: () => void;
  className?: string;
}

// 数据统计接口
export interface DataStats {
  totalProducts: number;
  categoryDistribution: Record<string, number>;
  platformDistribution: Record<string, number>;
  priceRange: {
    min: number;
    max: number;
    average: number;
  };
  locationDistribution: Record<string, number>;
}
