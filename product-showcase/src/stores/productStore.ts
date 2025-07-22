import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, FilterState, ViewMode, SortOption } from '../types/product';
import { apiService } from '../services/backendApiService';

// 分页信息接口
interface PaginationInfo {
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 加载状态枚举
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// API操作类型
export type ApiOperation = 'fetch' | 'search' | 'filter' | 'refresh';

interface ProductState {
  // 产品数据
  products: Product[];
  filteredProducts: Product[];
  
  // 分页信息
  pagination: PaginationInfo;
  
  // UI状态
  loading: LoadingState;
  apiOperation: ApiOperation | null;
  error: string | null;
  viewMode: ViewMode;
  sortOption: SortOption;
  searchQuery: string;
  currentPage: number;
  itemsPerPage: number;
  
  // 筛选状态
  filters: FilterState;
  showFilters: boolean;
  
  // 用户偏好
  favorites: string[];
  compareList: string[];
  
  
  // 操作方法
  setProducts: (products: Product[], pagination?: PaginationInfo) => void;
  setLoading: (loading: LoadingState, operation?: ApiOperation) => void;
  setError: (error: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortOption: (option: SortOption) => void;
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (itemsPerPage: number) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setShowFilters: (show: boolean) => void;
  toggleFavorite: (productId: string) => void;
  addToCompare: (productId: string) => void;
  removeFromCompare: (productId: string) => void;
  clearFilters: () => void;
  loadProducts: (params?: { page?: number; search?: string; filters?: Partial<FilterState> }) => Promise<void>;
  searchProducts: (query: string, limit?: number) => Promise<void>;
  initializeData: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const initialFilters: FilterState = {
  priceRange: undefined,
  categories: [],
  locations: [],
  platforms: [],
  showDiscountOnly: false
};

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      // 初始状态
      products: [],
      filteredProducts: [],
      pagination: {
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      },
      loading: 'idle',
      apiOperation: null,
      error: null,
      viewMode: 'grid',
      sortOption: 'name',
      searchQuery: '',
      currentPage: 1,
      itemsPerPage: 20, // 默认每页20条
      filters: initialFilters,
      showFilters: false,
      favorites: [],
      compareList: [],

      // 设置产品数据
      setProducts: (products, pagination) => {
        set({ 
          products,
          filteredProducts: products,
          pagination: pagination || get().pagination
        });
      },

      // 设置加载状态
      setLoading: (loading, operation) => set({ 
        loading, 
        apiOperation: operation || null,
        error: loading === 'loading' ? null : get().error
      }),

      // 设置错误状态
      setError: (error) => set({ 
        error, 
        loading: error ? 'error' : get().loading 
      }),

      // 设置视图模式
      setViewMode: (viewMode) => set({ viewMode }),

      // 设置排序选项
      setSortOption: (sortOption) => {
        set({ sortOption, currentPage: 1 });
        // 后端API模式：重新加载数据
        get().loadProducts({ page: 1 });
      },

      // 设置搜索查询
      setSearchQuery: (searchQuery) => {
        set({ searchQuery, currentPage: 1 });
        // 后端API模式：使用搜索API
        if (searchQuery.trim()) {
          get().searchProducts(searchQuery);
        } else {
          get().loadProducts({ page: 1 });
        }
      },

      // 设置当前页
      setCurrentPage: (currentPage) => {
        set({ currentPage });
        // 后端API模式：加载指定页面数据
        get().loadProducts({ page: currentPage });
      },

      // 设置每页显示数量
      setItemsPerPage: (itemsPerPage) => {
        set({ itemsPerPage, currentPage: 1 });
        // 后端API模式：重新加载数据
        get().loadProducts({ page: 1 });
      },

      // 设置筛选条件
      setFilters: (newFilters) => {
        const filters = { ...get().filters, ...newFilters };
        set({ filters, currentPage: 1 });
        // 后端API模式：重新加载数据
        get().loadProducts({ page: 1, filters });
      },

      // 设置筛选面板显示状态
      setShowFilters: (showFilters) => set({ showFilters }),

      // 切换收藏状态
      toggleFavorite: (productId) => {
        const { favorites } = get();
        const newFavorites = favorites.includes(productId)
          ? favorites.filter(id => id !== productId)
          : [...favorites, productId];
        set({ favorites: newFavorites });
      },

      // 添加到对比列表
      addToCompare: (productId) => {
        const { compareList } = get();
        if (!compareList.includes(productId) && compareList.length < 4) {
          set({ compareList: [...compareList, productId] });
        }
      },

      // 从对比列表移除
      removeFromCompare: (productId) => {
        const { compareList } = get();
        set({ compareList: compareList.filter(id => id !== productId) });
      },

      // 清空筛选条件
      clearFilters: () => {
        set({ filters: initialFilters, searchQuery: '', currentPage: 1 });
        // 后端API模式：重新加载数据
        get().loadProducts({ page: 1 });
      },

      // 加载产品数据（适用于后端API模式）
      loadProducts: async (params = {}) => {
        const state = get();
        const { page = state.currentPage, search = state.searchQuery, filters = state.filters } = params;
        
        set(state => ({ 
          loading: 'loading',
          apiOperation: 'fetch',
          error: null,
          currentPage: page
        }));

        try {
          // 构建API参数
          const apiParams: any = {
            page,
            limit: state.itemsPerPage,
            sortBy: state.sortOption.includes('price') ? 'price' : 
                   state.sortOption === 'collect-time' ? 'time' : 'name',
            sortOrder: state.sortOption === 'price-desc' ? 'desc' : 'asc'
          };

          // 添加筛选参数
          if (filters.categories && filters.categories.length > 0) {
            apiParams.category = filters.categories.join(',');
          }
          if (filters.platforms && filters.platforms.length > 0) {
            apiParams.platform = filters.platforms.join(',');
          }
          if (filters.locations && filters.locations.length > 0) {
            apiParams.province = filters.locations.join(',');
          }
          if (filters.priceRange) {
            apiParams.priceMin = filters.priceRange[0];
            apiParams.priceMax = filters.priceRange[1];
          }
          if (search?.trim()) {
            apiParams.search = search;
          }

          // 调用API
          const response = await apiService.getProducts(apiParams);
          
          // 后端API响应结构
          const responseData = response.data;
          const products = Array.isArray(responseData) ? responseData : responseData.products || [];
          const pagination = responseData.pagination || {
            page: 1,
            limit: products.length,
            total: products.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          };
          
          set({ 
            products,
            filteredProducts: products,
            pagination: {
              total: pagination.total,
              totalPages: pagination.totalPages,
              hasNext: pagination.hasNext,
              hasPrev: pagination.hasPrev
            },
            loading: 'success',
            apiOperation: null
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '加载产品失败';
          set({
            error: errorMessage,
            loading: 'error',
            apiOperation: null
          });
        }
      },

      // 搜索产品
      searchProducts: async (query, limit?) => {
        set({ 
          loading: 'loading',
          apiOperation: 'search',
          error: null,
          searchQuery: query,
          currentPage: 1
        });

        try {
          const response = await apiService.searchProducts(query, limit);
          const responseData = response.data;
          const products = Array.isArray(responseData) ? responseData : responseData.products || [];
          
          set({ 
            filteredProducts: products,
            loading: 'success',
            apiOperation: null
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '搜索失败';
          set({
            error: errorMessage,
            loading: 'error',
            apiOperation: null
          });
        }
      },

      // 初始化数据
      initializeData: async () => {
        await get().loadProducts({ page: 1 });
      },

      // 刷新数据
      refreshData: async () => {
        set({ apiOperation: 'refresh' });
        await get().loadProducts({ page: get().currentPage });
      }
    }),
    {
      name: 'product-store',
      // 只持久化用户偏好，不持久化产品数据
      partialize: (state) => ({
        viewMode: state.viewMode,
        sortOption: state.sortOption,
        itemsPerPage: state.itemsPerPage,
        favorites: state.favorites,
        compareList: state.compareList
      })
    }
  )
);

// 选择器函数
export const useProducts = () => useProductStore(state => state.products);
export const useFilteredProducts = () => useProductStore(state => state.filteredProducts);
export const useProductFilters = () => useProductStore(state => state.filters);
export const useProductPagination = () => useProductStore(state => state.pagination);
export const useProductUI = () => useProductStore(state => ({
  viewMode: state.viewMode,
  sortOption: state.sortOption,
  searchQuery: state.searchQuery,
  currentPage: state.currentPage,
  itemsPerPage: state.itemsPerPage,
  showFilters: state.showFilters,
  loading: state.loading,
  apiOperation: state.apiOperation,
  error: state.error
}));
export const useProductActions = () => useProductStore(state => ({
  setViewMode: state.setViewMode,
  setSortOption: state.setSortOption,
  setSearchQuery: state.setSearchQuery,
  setCurrentPage: state.setCurrentPage,
  setItemsPerPage: state.setItemsPerPage,
  setFilters: state.setFilters,
  setShowFilters: state.setShowFilters,
  toggleFavorite: state.toggleFavorite,
  addToCompare: state.addToCompare,
  removeFromCompare: state.removeFromCompare,
  clearFilters: state.clearFilters,
  loadProducts: state.loadProducts,
  searchProducts: state.searchProducts,
  initializeData: state.initializeData,
  refreshData: state.refreshData
}));

// 便捷的复合选择器
export const useProductStore_V2 = () => {
  const products = useProducts();
  const filteredProducts = useFilteredProducts();
  const filters = useProductFilters();
  const pagination = useProductPagination();
  const ui = useProductUI();
  const actions = useProductActions();
  
  return {
    products,
    filteredProducts,
    filters,
    pagination,
    ui,
    actions
  };
};
