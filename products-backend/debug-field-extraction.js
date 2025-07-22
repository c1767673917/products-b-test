/**
 * 调试字段提取逻辑
 * 检查为什么fallback机制没有正确使用中文字段
 */

const { FeishuApiService } = require('./dist/services/feishuApiService.js');
const { DataTransformService } = require('./dist/services/dataTransformService.js');
const { FEISHU_FIELD_MAPPING } = require('./dist/config/fieldMapping.js');

async function debugFieldExtraction() {
  try {
    console.log('=== 调试字段提取逻辑 ===\n');
    
    // 1. 获取飞书数据
    const feishuService = new FeishuApiService();
    const dataTransformService = new DataTransformService();
    
    console.log('1. 获取飞书数据...');
    const records = await feishuService.getAllRecords();
    console.log(`获取到 ${records.length} 条记录\n`);
    
    // 2. 找到目标记录 (rectq2ENo8)
    const targetRecord = records.find(record => record.record_id === 'rectq2ENo8');
    if (!targetRecord) {
      console.log('❌ 未找到目标记录 rectq2ENo8');
      return;
    }
    
    console.log('2. 找到目标记录:');
    console.log('Record ID:', targetRecord.record_id);
    console.log('Fields keys:', Object.keys(targetRecord.fields));
    console.log('');
    
    // 3. 检查关键字段的原始数据
    console.log('3. 检查关键字段的原始数据:');
    const fields = targetRecord.fields;
    
    // 检查name相关字段
    console.log('=== Name字段分析 ===');
    console.log('Product Name:', JSON.stringify(fields['Product Name']));
    console.log('品名:', JSON.stringify(fields['品名']));
    
    // 检查flavor相关字段
    console.log('\n=== Flavor字段分析 ===');
    console.log('Flavor(口味):', JSON.stringify(fields['Flavor(口味)']));
    console.log('口味:', JSON.stringify(fields['口味']));
    
    // 检查platform相关字段
    console.log('\n=== Platform字段分析 ===');
    console.log('Platform(平台):', JSON.stringify(fields['Platform(平台)']));
    console.log('采集平台:', JSON.stringify(fields['采集平台']));
    
    // 检查category相关字段
    console.log('\n=== Category字段分析 ===');
    console.log('Category Level 1:', JSON.stringify(fields['Category Level 1']));
    console.log('品类一级:', JSON.stringify(fields['品类一级']));
    console.log('Category Level 2:', JSON.stringify(fields['Category Level 2']));
    console.log('品类二级:', JSON.stringify(fields['品类二级']));
    
    // 4. 模拟字段提取过程
    console.log('\n4. 模拟字段提取过程:');
    
    // 测试name字段提取
    console.log('\n=== Name字段提取测试 ===');
    const nameMapping = FEISHU_FIELD_MAPPING.name;
    console.log('映射配置:', {
      feishuFieldName: nameMapping.feishuFieldName,
      fallback: nameMapping.fallback
    });
    
    const nameResult = simulateExtractFieldValue(fields, nameMapping);
    console.log('提取结果:', nameResult);
    
    // 测试flavor字段提取
    console.log('\n=== Flavor字段提取测试 ===');
    const flavorMapping = FEISHU_FIELD_MAPPING.flavor;
    console.log('映射配置:', {
      feishuFieldName: flavorMapping.feishuFieldName,
      fallback: flavorMapping.fallback
    });
    
    const flavorResult = simulateExtractFieldValue(fields, flavorMapping);
    console.log('提取结果:', flavorResult);
    
    // 5. 完整转换测试
    console.log('\n5. 完整转换测试:');
    const transformResult = dataTransformService.transformFeishuRecord(targetRecord);
    console.log('转换成功:', transformResult.success);
    console.log('错误数量:', transformResult.errors.length);
    console.log('警告数量:', transformResult.warnings.length);
    
    if (transformResult.success && transformResult.data) {
      console.log('\n转换后的关键字段:');
      console.log('name:', transformResult.data.name);
      console.log('flavor:', transformResult.data.flavor);
      console.log('platform:', transformResult.data.platform);
      console.log('category.primary:', transformResult.data.category?.primary);
      console.log('category.secondary:', transformResult.data.category?.secondary);
    }
    
    if (transformResult.errors.length > 0) {
      console.log('\n错误信息:');
      transformResult.errors.forEach(error => {
        console.log(`- ${error.field}: ${error.message}`);
      });
    }
    
    if (transformResult.warnings.length > 0) {
      console.log('\n警告信息 (前5个):');
      transformResult.warnings.slice(0, 5).forEach(warning => {
        console.log(`- ${warning.field}: ${warning.message}`);
      });
    }
    
  } catch (error) {
    console.error('调试失败:', error);
  }
}

// 模拟extractFieldValue方法
function simulateExtractFieldValue(fields, mapping) {
  console.log(`\n--- 模拟提取字段: ${mapping.localFieldPath} ---`);
  console.log(`主字段名: ${mapping.feishuFieldName}`);
  console.log(`Fallback字段ID: ${mapping.fallback}`);
  
  // 优先使用主字段名称
  let value = fields[mapping.feishuFieldName];
  console.log(`主字段值: ${JSON.stringify(value)}`);
  
  // 检查是否需要使用fallback
  const needsFallback = (value === null || value === undefined || value === '');
  console.log(`需要fallback: ${needsFallback}`);
  
  if (needsFallback && mapping.fallback) {
    console.log(`尝试使用fallback...`);
    
    // 当前的逻辑：在FEISHU_FIELD_MAPPING中查找fallback字段
    const fallbackMapping = Object.values(FEISHU_FIELD_MAPPING).find(m =>
      m.feishuFieldId === mapping.fallback
    );
    
    if (fallbackMapping) {
      console.log(`找到fallback映射: ${fallbackMapping.feishuFieldName}`);
      value = fields[fallbackMapping.feishuFieldName];
      console.log(`Fallback值: ${JSON.stringify(value)}`);
    } else {
      console.log(`未找到fallback映射，尝试直接使用字段ID映射...`);
      // 使用字段ID到字段名的映射
      const fieldIdToNameMapping = {
        'fld98c3F01': '品名',
        'fld6dbQGAn': '口味',
        'fldlTALTDP': '采集平台',
        'fldGtFPP20': '品类一级',
        'fldrfy01PS': '品类二级'
      };
      
      const fallbackFieldName = fieldIdToNameMapping[mapping.fallback];
      if (fallbackFieldName) {
        console.log(`通过字段ID映射找到: ${fallbackFieldName}`);
        value = fields[fallbackFieldName];
        console.log(`最终fallback值: ${JSON.stringify(value)}`);
      } else {
        console.log(`字段ID映射中也未找到: ${mapping.fallback}`);
      }
    }
  }
  
  console.log(`最终值: ${JSON.stringify(value)}`);
  return value;
}

// 运行调试
debugFieldExtraction().then(() => {
  console.log('\n=== 调试完成 ===');
}).catch(error => {
  console.error('调试失败:', error);
});
