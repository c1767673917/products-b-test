import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, FilterState, ViewMode, SortOption } from '../types/product';
import { apiService } from '../services/apiService';

interface ProductState {
  // 产品数据
  products: Product[];
  filteredProducts: Product[];
  
  // UI状态
  loading: boolean;
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
  setProducts: (products: Product[]) => void;
  setLoading: (loading: boolean) => void;
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
  applyFilters: () => void;
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
      loading: false,
      error: null,
      viewMode: 'grid',
      sortOption: 'name',
      searchQuery: '',
      currentPage: 1,
      itemsPerPage: 0, // 0表示显示全部
      filters: initialFilters,
      showFilters: false,
      favorites: [],
      compareList: [],

      // 设置产品数据
      setProducts: (products) => {
        set({ products });
        get().applyFilters();
      },

      // 设置加载状态
      setLoading: (loading) => set({ loading }),

      // 设置错误状态
      setError: (error) => set({ error }),

      // 设置视图模式
      setViewMode: (viewMode) => set({ viewMode }),

      // 设置排序选项
      setSortOption: (sortOption) => {
        set({ sortOption, currentPage: 1 });
        get().applyFilters();
      },

      // 设置搜索查询
      setSearchQuery: (searchQuery) => {
        set({ searchQuery, currentPage: 1 });
        get().applyFilters();
      },

      // 设置当前页
      setCurrentPage: (currentPage) => set({ currentPage }),

      // 设置每页显示数量
      setItemsPerPage: (itemsPerPage) => {
        set({ itemsPerPage, currentPage: 1 });
      },

      // 设置筛选条件
      setFilters: (newFilters) => {
        const filters = { ...get().filters, ...newFilters };
        set({ filters, currentPage: 1 });
        get().applyFilters();
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
        get().applyFilters();
      },

      // 应用筛选和排序
      applyFilters: () => {
        const { products, filters, searchQuery, sortOption } = get();

        // 直接从 store 中的 products 进行筛选，而不是创建新的 DataService 实例
        let filtered = [...products];

        // 价格筛选
        if (filters.priceRange) {
          const [minPrice, maxPrice] = filters.priceRange;
          filtered = filtered.filter(product => {
            const price = product.price.discount || product.price.normal;
            return price >= minPrice && price <= maxPrice;
          });
        }

        // 品类筛选
        if (filters.categories.length > 0) {
          filtered = filtered.filter(product =>
            filters.categories.includes(product.category.primary)
          );
        }

        // 产地筛选
        if (filters.locations.length > 0) {
          filtered = filtered.filter(product =>
            filters.locations.includes(product.origin.province)
          );
        }

        // 平台筛选
        if (filters.platforms.length > 0) {
          filtered = filtered.filter(product =>
            filters.platforms.includes(product.platform)
          );
        }

        // 只显示有优惠的产品
        if (filters.showDiscountOnly) {
          filtered = filtered.filter(product => product.price.discount !== undefined);
        }

        // 关键词搜索
        if (searchQuery && searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          filtered = filtered.filter(product => {
            const searchFields = [
              product.name,
              product.category.primary,
              product.category.secondary,
              product.manufacturer || '',
              product.flavor || '',
              product.specification,
            ].join(' ').toLowerCase();

            return searchFields.includes(query);
          });
        }
        
        // 排序产品
        switch (sortOption) {
          case 'name':
            filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
            break;
          case 'price-asc':
            filtered = filtered.sort((a, b) => {
              const priceA = a.price.discount || a.price.normal;
              const priceB = b.price.discount || b.price.normal;
              return priceA - priceB;
            });
            break;
          case 'price-desc':
            filtered = filtered.sort((a, b) => {
              const priceA = a.price.discount || a.price.normal;
              const priceB = b.price.discount || b.price.normal;
              return priceB - priceA;
            });
            break;
          case 'collect-time':
            filtered = filtered.sort((a, b) => b.collectTime - a.collectTime);
            break;
        }
        
        set({ filteredProducts: filtered });
      },

      // 初始化数据 - 使用API服务
      initializeData: async () => {
        set({ loading: true, error: null });

        try {
          // 使用API服务获取数据
          const response = await apiService.getProducts();
          const products = response.data;

          set({ products, loading: false });
          get().applyFilters();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '加载数据失败',
            loading: false
          });
        }
      },

      // 刷新数据
      refreshData: async () => {
        const { initializeData } = get();
        await initializeData();
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
export const useProductUI = () => useProductStore(state => ({
  viewMode: state.viewMode,
  sortOption: state.sortOption,
  searchQuery: state.searchQuery,
  currentPage: state.currentPage,
  itemsPerPage: state.itemsPerPage,
  showFilters: state.showFilters,
  loading: state.loading,
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
  initializeData: state.initializeData,
  refreshData: state.refreshData
}));
