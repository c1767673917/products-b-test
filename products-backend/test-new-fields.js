require('dotenv').config();
const { getFeishuApiService } = require('./dist/services/feishuApiService');
const { dataTransformService } = require('./dist/services/dataTransformService');

async function testNewFields() {
  try {
    console.log('🔍 测试新字段数据同步...');
    
    const feishuService = getFeishuApiService();
    
    // 获取少量记录进行测试
    const result = await feishuService.getTableRecords({ pageSize: 3 });
    console.log(`📊 获取到 ${result.records.length} 条测试记录`);
    
    if (result.records.length > 0) {
      // 转换第一条记录
      const transformResult = dataTransformService.transformFeishuRecord(result.records[0]);
      
      if (transformResult.success) {
        const product = transformResult.data;
        console.log('✅ 数据转换成功');
        console.log('🔍 新字段检查:');
        console.log(`  - 产品品名(computed): ${product.name?.computed || '无'}`);
        console.log(`  - 产品类型: ${product.productType || '无'}`);
        console.log(`  - 美元正常价: ${product.price?.usd?.normal || '无'}`);
        console.log(`  - 美元优惠价: ${product.price?.usd?.discount || '无'}`);
        console.log(`  - 序号结构: ${JSON.stringify(product.sequence) || '无'}`);
        
        // 显示原始飞书数据中的新字段
        console.log('\n🔍 原始飞书数据中的新字段:');
        const fields = result.records[0].fields;
        console.log(`  - 产品品名: ${fields['fldEPFf9lm'] || '无'}`);
        console.log(`  - Single/Mixed: ${fields['fldr1j3u4f'] || '无'}`);
        console.log(`  - Price（USD）: ${fields['fld19OLKKG'] || '无'}`);
        console.log(`  - Special Price（USD）: ${fields['fldfP2hZIB'] || '无'}`);
        console.log(`  - 序号1: ${fields['fldwQnkzrl'] || '无'}`);
        console.log(`  - 序号2: ${fields['fld2vxWg3B'] || '无'}`);
        console.log(`  - 序号3: ${fields['fldNTalSuy'] || '无'}`);
        
      } else {
        console.log('❌ 数据转换失败:', transformResult.errors);
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  }
}

testNewFields();
