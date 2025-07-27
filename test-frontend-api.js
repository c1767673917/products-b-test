// 测试前端API调用
const testFrontendAPI = async () => {
  try {
    console.log('测试前端API调用...');
    
    // 测试获取筛选选项
    const response = await fetch('http://localhost:3000/api/v1/stats/overview');
    const data = await response.json();
    
    console.log('API响应状态:', response.status);
    console.log('API响应数据:', data);
    
    if (data.success) {
      const priceStats = data.data.priceStats;
      console.log('价格统计:', {
        min: priceStats.min,
        max: priceStats.max,
        distribution: priceStats.distribution,
        distributionUSD: priceStats.distributionUSD
      });
      
      // 验证分布数据
      if (priceStats.distribution && priceStats.distribution.length > 0) {
        console.log('✅ CNY价格分布数据正常，长度:', priceStats.distribution.length);
        console.log('CNY分布数据:', priceStats.distribution);
      } else {
        console.log('❌ CNY价格分布数据缺失');
      }
      
      if (priceStats.distributionUSD && priceStats.distributionUSD.length > 0) {
        console.log('✅ USD价格分布数据正常，长度:', priceStats.distributionUSD.length);
        console.log('USD分布数据:', priceStats.distributionUSD);
      } else {
        console.log('❌ USD价格分布数据缺失');
      }
    } else {
      console.log('❌ API调用失败:', data.message);
    }
  } catch (error) {
    console.error('❌ 网络错误:', error);
  }
};

// 在浏览器控制台中运行
if (typeof window !== 'undefined') {
  window.testFrontendAPI = testFrontendAPI;
  console.log('测试函数已加载，请在控制台运行: testFrontendAPI()');
} else {
  // Node.js环境
  testFrontendAPI();
}
