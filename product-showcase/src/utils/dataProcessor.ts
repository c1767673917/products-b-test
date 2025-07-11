import { Product } from '../types';

// CSV原始数据接口
interface RawProductData {
  record_id: string;
  产品品名: string;
  '产地（国家）': string;
  '产地（市）': string;
  '产地（省）': string;
  单混: string;
  品名: string;
  品类一级: string;
  品类二级: string;
  商品链接: string;
  序号: string;
  序号1: string;
  序号2: string;
  序号3: string;
  标签照片: string;
  正常售价: string;
  正面图片: string;
  规格: string;
  采集平台: string;
  采集时间: string;
  优惠到手价: string;
  口味: string;
  委托方: string;
  生产商: string;
  背面图片: string;
  外包装图片: string;
  箱规: string;
  赠品图片: string;
  备注: string;
}

// 提取序号信息（保留用于显示）
export const extractSequence = (sequence: string): string => {
  if (!sequence) return '';
  return sequence.trim();
};

// 处理图片文件名，生成完整路径
export const processImagePath = (filename: string, sequence: string, type: string): string => {
  if (!filename) return '';
  
  // 移除文件扩展名并重新构建路径
  const cleanFilename = filename.replace(/\.(png|jpg|jpeg)$/i, '');
  const extension = filename.match(/\.(png|jpg|jpeg)$/i)?.[0] || '.png';
  
  return `/src/assets/images/products/${sequence}_${type}_0${extension}`;
};

// 提取图片信息
export const extractImages = (data: RawProductData, sequence: string) => {
  const images: Product['images'] = {};
  
  if (data.正面图片) {
    images.front = processImagePath(data.正面图片, sequence, '正面图片');
  }
  
  if (data.背面图片) {
    images.back = processImagePath(data.背面图片, sequence, '背面图片');
  }
  
  if (data.标签照片) {
    images.label = processImagePath(data.标签照片, sequence, '标签照片');
  }
  
  if (data.外包装图片) {
    images.package = processImagePath(data.外包装图片, sequence, '外包装图片');
  }
  
  if (data.赠品图片) {
    images.gift = processImagePath(data.赠品图片, sequence, '赠品图片');
  }
  
  return images;
};

// 计算折扣率
export const calculateDiscountRate = (normal: number, discount?: number): number | undefined => {
  if (!discount || discount >= normal) return undefined;
  return Math.round(((normal - discount) / normal) * 100);
};

// 转换单个产品数据
export const transformProductData = (rawData: RawProductData): Product => {
  const sequence = extractSequence(rawData.序号);
  const normalPrice = parseFloat(rawData.正常售价) || 0;
  const discountPrice = rawData.优惠到手价 ? parseFloat(rawData.优惠到手价) : undefined;
  
  return {
    id: rawData.record_id,
    recordId: rawData.record_id,
    name: rawData.品名 || rawData.产品品名 || '',
    sequence,
    
    category: {
      primary: rawData.品类一级 || '',
      secondary: rawData.品类二级 || '',
    },
    
    price: {
      normal: normalPrice,
      discount: discountPrice,
      discountRate: calculateDiscountRate(normalPrice, discountPrice),
    },
    
    images: extractImages(rawData, sequence),
    
    origin: {
      country: rawData['产地（国家）'] || '',
      province: rawData['产地（省）'] || '',
      city: rawData['产地（市）'] || '',
    },
    
    platform: rawData.采集平台 || '',
    specification: rawData.规格 || '',
    flavor: rawData.口味 || undefined,
    manufacturer: rawData.生产商 || undefined,
    collectTime: rawData.采集时间 ? parseInt(rawData.采集时间) : Date.now(),
    link: rawData.商品链接 || undefined,
    boxSpec: rawData.箱规 || undefined,
    notes: rawData.备注 || undefined,
  };
};

// 批量转换产品数据
export const transformProductsData = (rawDataArray: RawProductData[]): Product[] => {
  return rawDataArray
    .filter(item => item.record_id && item.品名) // 过滤无效数据
    .map(transformProductData)
    .sort((a, b) => a.sequence.localeCompare(b.sequence)); // 按序号排序
};

// 数据验证
export const validateProduct = (product: Product): boolean => {
  return !!(
    product.id &&
    product.name &&
    product.sequence &&
    product.category.primary &&
    product.price.normal > 0
  );
};

// 过滤有效产品
export const filterValidProducts = (products: Product[]): Product[] => {
  return products.filter(validateProduct);
};
