// CSV解析工具
import { Product } from '../types/product';

// CSV行数据接口
interface CSVRow {
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
  优惠到手价?: string;
  口味?: string;
  委托方?: string;
  生产商?: string;
  背面图片?: string;
  外包装图片?: string;
  箱规?: string;
  赠品图片?: string;
  备注?: string;
}

// 解析CSV文本为对象数组
export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row as CSVRow);
  }

  return rows;
}

// 解析CSV行，正确处理引号和逗号
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // 转义的引号
        current += '"';
        i += 2;
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // 字段分隔符
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }

  // 添加最后一个字段
  result.push(current.trim());
  return result;
}

// 将CSV行转换为Product对象
export function csvRowToProduct(row: CSVRow): Product | null {
  try {
    const sequence = row.序号?.trim() || '';
    if (!sequence || !row.品名) return null;

    const normalPrice = parseFloat(row.正常售价) || 0;
    const discountPrice = row.优惠到手价 ? parseFloat(row.优惠到手价) : undefined;
    
    // 计算折扣率
    const discountRate = discountPrice && normalPrice > 0 
      ? Math.round(((normalPrice - discountPrice) / normalPrice) * 100)
      : undefined;

    // 处理图片路径
    const images = {
      front: getImagePath(sequence, '正面图片'),
      back: row.背面图片 ? getImagePath(sequence, '背面图片') : undefined,
      label: row.标签照片 ? getImagePath(sequence, '标签照片') : undefined,
      package: row.外包装图片 ? getImagePath(sequence, '外包装图片') : undefined,
      gift: row.赠品图片 ? getImagePath(sequence, '赠品图片') : undefined,
    };

    const product: Product = {
      id: sequence,
      recordId: row.record_id,
      name: row.品名.trim(),
      sequence: sequence,
      category: {
        primary: row.品类一级?.trim() || '',
        secondary: row.品类二级?.trim() || '',
      },
      price: {
        normal: normalPrice,
        discount: discountPrice,
        discountRate: discountRate,
      },
      images: images,
      origin: {
        country: row['产地（国家）']?.trim() || '',
        province: row['产地（省）']?.trim() || '',
        city: row['产地（市）']?.trim() || '',
      },
      platform: row.采集平台?.trim() || '',
      specification: row.规格?.trim() || '',
      flavor: row.口味?.trim() || undefined,
      manufacturer: row.生产商?.trim() || undefined,
      collectTime: row.采集时间 ? parseInt(row.采集时间) : Date.now(),
      link: row.商品链接?.trim() || undefined,
      boxSpec: row.箱规?.trim() || undefined,
      notes: row.备注?.trim() || undefined,
    };

    return product;
  } catch (error) {
    // Error converting CSV row to product - silently skip invalid rows
    return null;
  }
}

// 获取图片路径
function getImagePath(sequence: string, imageType: string): string {
  if (!sequence) return '';
  
  // 根据图片类型映射到实际文件名
  const typeMap: Record<string, string> = {
    '正面图片': '正面图片',
    '背面图片': '背面图片',
    '标签照片': '标签照片',
    '外包装图片': '外包装图片',
    '赠品图片': '赠品图片',
  };
  
  const mappedType = typeMap[imageType] || imageType;
  
  // 根据序号前缀确定文件扩展名
  let extension = 'png';
  if (sequence.startsWith('HM-')) {
    extension = 'jpg';
  } else if (sequence.startsWith('PDL-')) {
    // PDL的图片有混合格式，需要特殊处理
    if (imageType === '标签照片') {
      extension = sequence.includes('0002') || sequence.includes('0005') ? 'jpg' : 'png';
    } else if (imageType === '正面图片') {
      extension = sequence.includes('0002B') || sequence.includes('0003') || sequence.includes('0005B') ? 'jpg' : 'png';
    } else {
      extension = 'jpg';
    }
  }
  
  return `/src/assets/images/products/${sequence}_${mappedType}_0.${extension}`;
}

// 批量转换CSV数据为产品数组
export function convertCSVToProducts(csvText: string): Product[] {
  const rows = parseCSV(csvText);
  const products: Product[] = [];

  for (const row of rows) {
    const product = csvRowToProduct(row);
    if (product) {
      products.push(product);
    }
  }

  return products.sort((a, b) => a.sequence.localeCompare(b.sequence));
}

// 验证产品数据
export function validateProducts(products: Product[]): Product[] {
  return products.filter(product => {
    return !!(
      product.id &&
      product.name &&
      product.sequence &&
      product.category.primary &&
      product.price.normal >= 0 &&
      product.platform
    );
  });
}

// 生成数据统计
export function generateStats(products: Product[]) {
  const stats = {
    totalProducts: products.length,
    categoryDistribution: {} as Record<string, number>,
    platformDistribution: {} as Record<string, number>,
    locationDistribution: {} as Record<string, number>,
    priceStats: {
      min: Number.MAX_VALUE,
      max: 0,
      average: 0,
      withDiscount: 0,
    },
    imageStats: {
      withFront: 0,
      withBack: 0,
      withLabel: 0,
      withPackage: 0,
      withGift: 0,
    },
  };

  let totalPrice = 0;
  let discountCount = 0;

  products.forEach(product => {
    // 统计品类分布
    const primaryCategory = product.category.primary;
    stats.categoryDistribution[primaryCategory] = (stats.categoryDistribution[primaryCategory] || 0) + 1;

    // 统计平台分布
    stats.platformDistribution[product.platform] = (stats.platformDistribution[product.platform] || 0) + 1;

    // 统计产地分布
    const location = product.origin.province;
    if (location) {
      stats.locationDistribution[location] = (stats.locationDistribution[location] || 0) + 1;
    }

    // 统计价格
    const price = product.price.discount || product.price.normal;
    if (price > 0) {
      stats.priceStats.min = Math.min(stats.priceStats.min, price);
      stats.priceStats.max = Math.max(stats.priceStats.max, price);
      totalPrice += price;
    }

    if (product.price.discount) {
      discountCount++;
    }

    // 统计图片
    if (product.images.front) stats.imageStats.withFront++;
    if (product.images.back) stats.imageStats.withBack++;
    if (product.images.label) stats.imageStats.withLabel++;
    if (product.images.package) stats.imageStats.withPackage++;
    if (product.images.gift) stats.imageStats.withGift++;
  });

  // 计算平均价格
  stats.priceStats.average = products.length > 0 ? Math.round((totalPrice / products.length) * 100) / 100 : 0;
  stats.priceStats.withDiscount = discountCount;
  
  // 如果没有有效价格，重置最小值
  if (stats.priceStats.min === Number.MAX_VALUE) {
    stats.priceStats.min = 0;
  }

  return stats;
}
