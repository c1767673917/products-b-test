import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Define resources directly to avoid import issues for now
export const resources = {
  en: {
    common: {
      "navigation": {
        "products": "Products",
        "categories": "Categories",
        "search": "Search",
        "filters": "Filters",
        "home": "Home",
        "list": "Product List",
        "detail": "Product Detail",
        "sync": "Data Sync",
        "performance": "Performance",
        "demo": "API Demo"
      },
      "actions": {
        "add": "Add",
        "edit": "Edit",
        "delete": "Delete",
        "save": "Save",
        "cancel": "Cancel",
        "confirm": "Confirm",
        "reset": "Reset",
        "clear": "Clear",
        "apply": "Apply"
      },
      "status": {
        "loading": "Loading...",
        "error": "Error",
        "success": "Success"
      },
      "language": {
        "switch": "Language",
        "english": "English",
        "chinese": "中文"
      }
    },
    product: {
      "actions": {
        "viewDetails": "View Details",
        "favorite": "Add to Favorites",
        "compare": "Compare"
      },
      "fields": {
        "name": "Product Name",
        "price": "Price",
        "category": "Category"
      },
      "filters": {
        "allCategories": "All Categories",
        "allPlatforms": "All Platforms"
      }
    },
    navigation: {
      "titles": {
        "home": "Product Showcase"
      },
      "navigation": {
        "list": "Product List",
        "sync": "Data Sync",
        "demo": "API Demo"
      }
    }
  },
  zh: {
    common: {
      "navigation": {
        "products": "产品",
        "categories": "分类",
        "search": "搜索",
        "filters": "筛选",
        "home": "首页",
        "list": "产品列表",
        "detail": "产品详情",
        "sync": "数据同步",
        "performance": "性能测试",
        "demo": "API 演示"
      },
      "actions": {
        "add": "添加",
        "edit": "编辑",
        "delete": "删除",
        "save": "保存",
        "cancel": "取消",
        "confirm": "确认",
        "reset": "重置",
        "clear": "清空",
        "apply": "应用"
      },
      "status": {
        "loading": "加载中...",
        "error": "错误",
        "success": "成功"
      },
      "language": {
        "switch": "语言切换",
        "english": "English",
        "chinese": "中文"
      }
    },
    product: {
      "actions": {
        "viewDetails": "查看详情",
        "favorite": "收藏",
        "compare": "对比"
      },
      "fields": {
        "name": "产品名称",
        "price": "价格",
        "category": "分类"
      },
      "filters": {
        "allCategories": "全部分类",
        "allPlatforms": "全部平台"
      }
    },
    navigation: {
      "titles": {
        "home": "产品展示系统"
      },
      "navigation": {
        "list": "产品列表",
        "sync": "数据同步",
        "demo": "API 演示"
      }
    }
  }
} as const;

// Configure language detection
const languageDetector = new LanguageDetector();

// Initialize i18next
i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh', // Default to Chinese as most content is Chinese
    lng: undefined, // Let the detector decide
    
    // Namespace configuration
    defaultNS: 'common',
    ns: ['common', 'product', 'navigation'],
    
    // Detection configuration
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    
    // Interpolation configuration
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // React specific options
    react: {
      useSuspense: false, // Disable suspense for now
    },
    
    // Debug mode (disable in production)
    debug: process.env.NODE_ENV === 'development',
  });

export default i18n;