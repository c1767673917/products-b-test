import { backendApiService } from '../src/services/backendApiService';

async function checkPlatformData() {
  console.log('开始检查平台数据...\n');
  
  try {
    // 获取统计数据
    const statsResponse = await backendApiService.getStats();
    const platformDistribution = statsResponse.data.platformDistribution;
    
    console.log('平台分布数据:');
    console.log('=' .repeat(50));
    
    const problemPlatforms = ['零食很忙', '天猫旗舰店'];
    
    Object.entries(platformDistribution).forEach(([platform, count]) => {
      const isProblem = problemPlatforms.includes(platform);
      console.log(`${platform}: ${count}${isProblem ? ' ⚠️ (问题平台)' : ''}`);
    });
    
    console.log('\n问题分析:');
    console.log('=' .repeat(50));
    
    problemPlatforms.forEach(platform => {
      const count = platformDistribution[platform];
      if (count === 0 || count === undefined) {
        console.log(`❌ ${platform}: 数量为 ${count || 0}，这就是条形图为空的原因`);
      } else {
        console.log(`✅ ${platform}: 数量为 ${count}，条形图应该正常显示`);
      }
    });
    
    // 检查具体产品
    console.log('\n查询具体产品数据...');
    console.log('=' .repeat(50));
    
    for (const platform of problemPlatforms) {
      try {
        const productsResponse = await backendApiService.getProducts({
          platform: platform,
          limit: 5
        });
        
        const products = productsResponse.data.products;
        console.log(`\n${platform} 平台的产品数量: ${productsResponse.data.pagination.total}`);
        
        if (products.length > 0) {
          console.log(`前 ${products.length} 个产品:`);
          products.forEach((product, index) => {
            console.log(`  ${index + 1}. ${product.name} (ID: ${product.id})`);
          });
        } else {
          console.log('  没有找到任何产品');
        }
      } catch (error) {
        console.error(`查询 ${platform} 平台产品时出错:`, error);
      }
    }
    
  } catch (error) {
    console.error('获取统计数据失败:', error);
  }
}

// 运行检查
checkPlatformData().then(() => {
  console.log('\n检查完成');
  process.exit(0);
}).catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});