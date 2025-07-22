const mongoose = require('mongoose');
require('dotenv').config();

// 导入飞书API服务
const { getFeishuApiService } = require('../dist/services/feishuApiService');

async function getFieldMapping() {
  try {
    console.log('🔍 获取飞书字段映射...');
    
    // 连接MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功');
    
    // 获取飞书API服务
    const feishuService = getFeishuApiService();
    
    // 获取表格字段信息
    console.log('📊 获取表格字段信息...');
    const fields = await feishuService.getTableFields();
    
    console.log(`✅ 成功获取 ${fields.length} 个字段`);
    
    // 创建字段名到字段ID的映射
    const fieldNameToId = {};
    const fieldIdToName = {};
    
    fields.forEach(field => {
      fieldNameToId[field.field_name] = field.field_id;
      fieldIdToName[field.field_id] = field.field_name;
    });
    
    // 需要映射的字段列表
    const requiredFields = [
      'Product Name',
      '品名',
      'rx编号',
      '编号',
      '序号',
      'Category Level 1',
      '品类一级',
      'Category Level 2',
      '品类二级',
      '正常售价',
      '优惠到手价',
      'Front image(正)',
      'Back image(背)',
      'Tag photo(标签)',
      'Outer packaging image(外包装)',
      'Gift pictures(赠品图片)',
      'Origin (Country)',
      'Origin (Province)',
      'Origin (City)',
      'Platform(平台)',
      '采集平台',
      'Specs(规格)',
      'Flavor(口味)',
      '口味',
      'Manufacturer(生产商)',
      '采集时间',
      '商品链接',
      'CTN(箱规)',
      '备注',
      'Gift(赠品)',
      'Gift mechanism(赠品机制)',
      'Client(委托方)',
      'bar code(条码)'
    ];
    
    console.log('\n📋 字段映射结果:');
    console.log('='.repeat(80));
    
    const foundMappings = {};
    const missingFields = [];
    
    requiredFields.forEach(fieldName => {
      if (fieldNameToId[fieldName]) {
        foundMappings[fieldName] = fieldNameToId[fieldName];
        console.log(`✅ ${fieldName.padEnd(30)} -> ${fieldNameToId[fieldName]}`);
      } else {
        missingFields.push(fieldName);
        console.log(`❌ ${fieldName.padEnd(30)} -> 未找到`);
      }
    });
    
    console.log('\n📊 统计信息:');
    console.log(`- 找到的字段: ${Object.keys(foundMappings).length}`);
    console.log(`- 缺失的字段: ${missingFields.length}`);
    
    if (missingFields.length > 0) {
      console.log('\n⚠️  缺失的字段:');
      missingFields.forEach(field => console.log(`  - ${field}`));
    }
    
    // 显示所有可用字段
    console.log('\n📝 所有可用字段:');
    console.log('='.repeat(80));
    fields.forEach(field => {
      console.log(`${field.field_name.padEnd(30)} -> ${field.field_id} (类型: ${field.type})`);
    });
    
    // 生成新的字段映射配置
    console.log('\n🔧 生成字段映射配置:');
    console.log('='.repeat(80));
    
    const mappingConfig = {
      // 基础信息
      name: foundMappings['Product Name'] || foundMappings['品名'],
      productId: foundMappings['rx编号'],
      internalId: foundMappings['编号'],
      sequence: foundMappings['序号'],
      
      // 分类信息
      categoryPrimary: foundMappings['Category Level 1'] || foundMappings['品类一级'],
      categorySecondary: foundMappings['Category Level 2'] || foundMappings['品类二级'],
      
      // 价格信息
      priceNormal: foundMappings['正常售价'],
      priceDiscount: foundMappings['优惠到手价'],
      
      // 图片信息
      imageFront: foundMappings['Front image(正)'],
      imageBack: foundMappings['Back image(背)'],
      imageLabel: foundMappings['Tag photo(标签)'],
      imagePackage: foundMappings['Outer packaging image(外包装)'],
      imageGift: foundMappings['Gift pictures(赠品图片)'],
      
      // 产地信息
      originCountry: foundMappings['Origin (Country)'],
      originProvince: foundMappings['Origin (Province)'],
      originCity: foundMappings['Origin (City)'],
      
      // 其他信息
      platform: foundMappings['Platform(平台)'] || foundMappings['采集平台'],
      specification: foundMappings['Specs(规格)'],
      flavor: foundMappings['Flavor(口味)'] || foundMappings['口味'],
      manufacturer: foundMappings['Manufacturer(生产商)'],
      collectTime: foundMappings['采集时间'],
      link: foundMappings['商品链接'],
      boxSpec: foundMappings['CTN(箱规)'],
      notes: foundMappings['备注'],
      gift: foundMappings['Gift(赠品)'],
      giftMechanism: foundMappings['Gift mechanism(赠品机制)'],
      client: foundMappings['Client(委托方)'],
      barcode: foundMappings['bar code(条码)']
    };
    
    console.log('const FIELD_ID_MAPPING = {');
    Object.entries(mappingConfig).forEach(([key, value]) => {
      if (value) {
        console.log(`  ${key}: '${value}',`);
      } else {
        console.log(`  // ${key}: null, // 字段未找到`);
      }
    });
    console.log('};');
    
  } catch (error) {
    console.error('❌ 获取字段映射失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB连接已关闭');
  }
}

getFieldMapping();
