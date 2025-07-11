import fs from 'fs';
import path from 'path';

// 读取产品数据
const productsData = JSON.parse(fs.readFileSync('src/data/products.json', 'utf8'));

// 图片目录路径
const imagesDir = 'public/images';

// 分析图片状态
function analyzeImageStatus() {
    const analysis = {
        totalProducts: productsData.length,
        totalImagePaths: 0,
        existingImages: 0,
        missingImages: 0,
        missingImagesList: [],
        existingImagesList: [],
        imageTypes: {
            front: { total: 0, existing: 0, missing: 0 },
            back: { total: 0, existing: 0, missing: 0 },
            label: { total: 0, existing: 0, missing: 0 },
            package: { total: 0, existing: 0, missing: 0 }
        }
    };

    productsData.forEach((product, index) => {
        const images = product.images || {};
        
        Object.entries(images).forEach(([type, imagePath]) => {
            if (imagePath) {
                analysis.totalImagePaths++;
                
                // 移除开头的 /images/ 前缀
                const fileName = imagePath.replace(/^\/images\//, '');
                const fullPath = path.join(imagesDir, fileName);
                
                // 检查文件是否存在
                const exists = fs.existsSync(fullPath);
                
                if (exists) {
                    analysis.existingImages++;
                    analysis.existingImagesList.push({
                        productId: product.id,
                        productName: product.name,
                        type: type,
                        path: imagePath,
                        fileName: fileName
                    });
                } else {
                    analysis.missingImages++;
                    analysis.missingImagesList.push({
                        productId: product.id,
                        productName: product.name,
                        type: type,
                        path: imagePath,
                        fileName: fileName
                    });
                }
                
                // 统计各类型图片
                const imageType = type === 'package' ? 'package' : 
                                type === 'front' ? 'front' :
                                type === 'back' ? 'back' : 'label';
                
                analysis.imageTypes[imageType].total++;
                if (exists) {
                    analysis.imageTypes[imageType].existing++;
                } else {
                    analysis.imageTypes[imageType].missing++;
                }
            }
        });
    });

    return analysis;
}

// 生成报告
function generateReport(analysis) {
    const successRate = ((analysis.existingImages / analysis.totalImagePaths) * 100).toFixed(2);
    
    console.log('=== 图片加载状态分析报告 ===');
    console.log(`总产品数: ${analysis.totalProducts}`);
    console.log(`总图片路径数: ${analysis.totalImagePaths}`);
    console.log(`存在的图片: ${analysis.existingImages}`);
    console.log(`缺失的图片: ${analysis.missingImages}`);
    console.log(`图片加载成功率: ${successRate}%`);
    console.log('');
    
    console.log('=== 各类型图片统计 ===');
    Object.entries(analysis.imageTypes).forEach(([type, stats]) => {
        const rate = stats.total > 0 ? ((stats.existing / stats.total) * 100).toFixed(2) : '0.00';
        console.log(`${type}: ${stats.existing}/${stats.total} (${rate}%)`);
    });
    console.log('');
    
    // 保存详细报告到文件
    const reportData = {
        timestamp: new Date().toISOString(),
        summary: {
            totalProducts: analysis.totalProducts,
            totalImagePaths: analysis.totalImagePaths,
            existingImages: analysis.existingImages,
            missingImages: analysis.missingImages,
            successRate: parseFloat(successRate)
        },
        imageTypes: analysis.imageTypes,
        missingImages: analysis.missingImagesList,
        existingImages: analysis.existingImagesList
    };
    
    fs.writeFileSync('src/data/image_status_report.json', JSON.stringify(reportData, null, 2));
    console.log('详细报告已保存到: src/data/image_status_report.json');
    
    // 生成缺失图片列表
    const missingList = analysis.missingImagesList.map(item => 
        `${item.productId},${item.productName},${item.type},${item.fileName}`
    );
    
    fs.writeFileSync('src/data/missing_images.csv', 
        'ProductID,ProductName,ImageType,FileName\n' + missingList.join('\n'));
    console.log('缺失图片列表已保存到: src/data/missing_images.csv');
}

// 执行分析
const analysis = analyzeImageStatus();
generateReport(analysis);
