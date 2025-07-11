// 产品相关类型定义

export interface Product {
  id: string;
  recordId: string;
  name: string;
  sequence: string;
  
  // 分类信息
  category: {
    primary: string;
    secondary: string;
  };
  
  // 价格信息
  price: {
    normal: number;
    discount?: number;
    discountRate?: number;
  };
  
  // 图片信息
  images: {
    front?: string;
    back?: string;
    label?: string;
    package?: string;
    gift?: string;
  };
  
  // 产地信息
  origin: {
    country: string;
    province: string;
    city: string;
  };
  
  // 其他信息
  platform: string;
  specification: string;
  flavor?: string;
  manufacturer?: string;
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
