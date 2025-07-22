const mongoose = require('mongoose');
require('dotenv').config();

// 导入飞书API服务
const { getFeishuApiService } = require('../dist/services/feishuApiService');

async function inspectFeishuData() {
  try {
    console.log('🔍 检查飞书数据结构...');
    
    // 连接MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB连接成功');
    
    // 获取飞书API服务
    const feishuService = getFeishuApiService();
    
    // 获取表格字段信息
    console.log('📊 获取表格字段信息...');
    const fields = await feishuService.getTableFields();
    
    // 创建字段ID到字段名的映射
    const fieldIdToName = {};
    const fieldNameToId = {};
    
    fields.forEach(field => {
      fieldIdToName[field.field_id] = field.field_name;
      fieldNameToId[field.field_name] = field.field_id;
    });
    
    // 获取一条记录进行检查
    console.log('📋 获取飞书记录样本...');
    const records = await feishuService.getAllRecords();
    
    if (records.length === 0) {
      console.log('❌ 没有获取到任何记录');
      return;
    }
    
    const firstRecord = records[0];
    console.log('\n📝 第一条记录详细信息:');
    console.log('Record ID:', firstRecord.record_id);
    console.log('Fields 对象结构:');
    
    // 检查fields对象的键是字段ID还是字段名
    const fieldsKeys = Object.keys(firstRecord.fields || {});
    console.log('Fields keys 数量:', fieldsKeys.length);
    console.log('前10个 Fields keys:', fieldsKeys.slice(0, 10));
    
    // 检查是否是字段ID格式
    const isFieldId = fieldsKeys.some(key => key.startsWith('fld'));
    const isFieldName = fieldsKeys.some(key => !key.startsWith('fld'));
    
    console.log('\n🔍 字段键格式分析:');
    console.log('- 包含字段ID格式 (fldXXX):', isFieldId);
    console.log('- 包含字段名格式:', isFieldName);
    
    if (isFieldId) {
      console.log('\n✅ 数据使用字段ID作为键');
      console.log('示例字段ID映射:');
      fieldsKeys.slice(0, 5).forEach(fieldId => {
        const fieldName = fieldIdToName[fieldId];
        const value = firstRecord.fields[fieldId];
        console.log(`  ${fieldId} -> ${fieldName}: ${JSON.stringify(value)}`);
      });
    }
    
    if (isFieldName) {
      console.log('\n✅ 数据使用字段名作为键');
      console.log('示例字段名映射:');
      fieldsKeys.slice(0, 5).forEach(fieldName => {
        const fieldId = fieldNameToId[fieldName];
        const value = firstRecord.fields[fieldName];
        console.log(`  ${fieldName} -> ${fieldId}: ${JSON.stringify(value)}`);
      });
    }
    
    // 检查关键字段的值
    console.log('\n🔑 关键字段值检查:');
    const keyFields = [
      { name: 'Product Name', id: 'fldJZWSqLX' },
      { name: '品名', id: 'fld98c3F01' },
      { name: 'rx编号', id: 'fldsbenBWp' },
      { name: '编号', id: 'fldZW4Q5I2' },
      { name: '序号', id: 'fldRW7Bszz' },
      { name: '正常售价', id: 'fldLtVHZ5b' }
    ];
    
    keyFields.forEach(field => {
      const valueByName = firstRecord.fields[field.name];
      const valueById = firstRecord.fields[field.id];
      
      console.log(`${field.name}:`);
      console.log(`  - 通过字段名获取: ${JSON.stringify(valueByName)}`);
      console.log(`  - 通过字段ID获取: ${JSON.stringify(valueById)}`);
    });
    
    // 检查记录ID是否在字段中
    console.log('\n🆔 记录ID检查:');
    console.log('Record ID:', firstRecord.record_id);
    console.log('rx编号字段值 (通过名称):', firstRecord.fields['rx编号']);
    console.log('rx编号字段值 (通过ID):', firstRecord.fields['fldsbenBWp']);
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB连接已关闭');
  }
}

inspectFeishuData();
