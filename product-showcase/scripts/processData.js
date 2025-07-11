// 数据处理脚本
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取CSV文件
function readCSVFile() {
  const csvPath = path.join(__dirname, '../src/data/data.csv');
  try {
    return fs.readFileSync(csvPath, 'utf-8');
  } catch (error) {
    console.error('Error reading CSV file:', error);
    return null;
  }
}

// 解析CSV行，正确处理引号和逗号
function parseCSVLine(line) {
  const result = [];
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

// 解析CSV文本为对象数组
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row);
  }

  return rows;
}

// 获取图片路径
function getImagePath(sequence, imageType) {
  if (!sequence) return '';
  
  // 根据图片类型映射到实际文件名
  const typeMap = {
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

// 将CSV行转换为Product对象
function csvRowToProduct(row) {
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

    const product = {
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
    console.error('Error converting CSV row to product:', error, row);
    return null;
  }
}

// 生成数据统计
function generateStats(products) {
  const stats = {
    totalProducts: products.length,
    categoryDistribution: {},
    platformDistribution: {},
    locationDistribution: {},
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

// 主处理函数
function processData() {
  console.log('🚀 开始处理数据...');
  
  // 读取CSV文件
  const csvText = readCSVFile();
  if (!csvText) {
    console.error('❌ 无法读取CSV文件');
    return;
  }

  console.log('📖 解析CSV数据...');
  const rows = parseCSV(csvText);
  console.log(`📊 解析到 ${rows.length} 行数据`);

  // 转换为产品对象
  console.log('🔄 转换产品数据...');
  const products = [];
  for (const row of rows) {
    const product = csvRowToProduct(row);
    if (product) {
      products.push(product);
    }
  }

  // 按序号排序
  products.sort((a, b) => a.sequence.localeCompare(b.sequence));
  console.log(`✅ 成功转换 ${products.length} 个产品`);

  // 生成统计信息
  console.log('📈 生成统计信息...');
  const stats = generateStats(products);

  // 保存处理后的数据
  const outputDir = path.join(__dirname, '../src/data');
  
  // 保存产品数据
  const productsPath = path.join(outputDir, 'products.json');
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2));
  console.log(`💾 产品数据已保存到: ${productsPath}`);

  // 保存统计数据
  const statsPath = path.join(outputDir, 'stats.json');
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  console.log(`📊 统计数据已保存到: ${statsPath}`);

  // 输出统计摘要
  console.log('\n📋 数据处理摘要:');
  console.log(`- 总产品数: ${stats.totalProducts}`);
  console.log(`- 品类分布: ${Object.keys(stats.categoryDistribution).length} 个主要品类`);
  console.log(`- 平台分布: ${Object.keys(stats.platformDistribution).length} 个采集平台`);
  console.log(`- 价格范围: ¥${stats.priceStats.min} - ¥${stats.priceStats.max}`);
  console.log(`- 平均价格: ¥${stats.priceStats.average}`);
  console.log(`- 有优惠价格的产品: ${stats.priceStats.withDiscount} 个`);
  console.log(`- 有正面图片的产品: ${stats.imageStats.withFront} 个`);
  console.log(`- 有背面图片的产品: ${stats.imageStats.withBack} 个`);
  console.log(`- 有标签图片的产品: ${stats.imageStats.withLabel} 个`);

  console.log('\n🎉 数据处理完成！');
}

// 执行数据处理
processData();
