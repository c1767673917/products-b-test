// 测试所有关键导入是否正常工作
console.log('🧪 开始测试导入...');

try {
  // 测试类型导入
  import('./types/product.js').then(() => {
    console.log('✅ 产品类型导入成功');
  }).catch(err => {
    console.error('❌ 产品类型导入失败:', err);
  });

  // 测试组件导入
  import('./components/product/ProductCard.jsx').then(() => {
    console.log('✅ ProductCard组件导入成功');
  }).catch(err => {
    console.error('❌ ProductCard组件导入失败:', err);
  });

  import('./components/product/LazyImage.jsx').then(() => {
    console.log('✅ LazyImage组件导入成功');
  }).catch(err => {
    console.error('❌ LazyImage组件导入失败:', err);
  });

  // 测试页面导入
  import('./pages/ProductList/ProductList.jsx').then(() => {
    console.log('✅ ProductList页面导入成功');
  }).catch(err => {
    console.error('❌ ProductList页面导入失败:', err);
  });

  // 测试状态管理导入
  import('./stores/productStore.js').then(() => {
    console.log('✅ 产品状态管理导入成功');
  }).catch(err => {
    console.error('❌ 产品状态管理导入失败:', err);
  });

  // 测试数据服务导入
  import('./services/dataService.js').then(() => {
    console.log('✅ 数据服务导入成功');
  }).catch(err => {
    console.error('❌ 数据服务导入失败:', err);
  });

  console.log('🎉 所有导入测试完成！');
  
} catch (error) {
  console.error('💥 导入测试过程中发生错误:', error);
}
