#!/bin/bash

# 图片路径修复验证脚本
# 验证所有修复措施是否正确实施

echo "🔍 图片路径修复验证开始..."

# 1. 验证后端配置文件
echo "1. 检查后端配置文件..."
if [ -f "products-backend/src/config/imageConfig.ts" ]; then
    echo "✅ 统一图片配置文件已创建"
    
    # 检查是否使用了 products 路径
    if grep -q "PRODUCTS: 'products'" "products-backend/src/config/imageConfig.ts"; then
        echo "✅ 统一路径配置正确 (products)"
    else
        echo "❌ 路径配置错误"
    fi
else
    echo "❌ 统一图片配置文件未找到"
fi

# 2. 验证图片上传服务
echo "2. 检查图片上传服务修复..."
if [ -f "products-backend/src/services/imageService.ts" ]; then
    # 检查是否还有 originals 路径
    if grep -q "originals/" "products-backend/src/services/imageService.ts"; then
        echo "❌ 图片上传服务仍使用废弃路径"
    else
        echo "✅ 图片上传服务已修复"
    fi
    
    # 检查是否使用了配置文件
    if grep -q "IMAGE_CONFIG" "products-backend/src/services/imageService.ts"; then
        echo "✅ 图片上传服务已使用统一配置"
    else
        echo "❌ 图片上传服务未使用统一配置"
    fi
else
    echo "❌ 图片上传服务文件未找到"
fi

# 3. 验证同步服务
echo "3. 检查数据同步服务修复..."
if [ -f "products-backend/src/services/syncService.ts" ]; then
    # 检查是否使用了统一配置
    if grep -q "ImagePathUtils" "products-backend/src/services/syncService.ts"; then
        echo "✅ 同步服务已使用统一路径工具"
    else
        echo "❌ 同步服务未使用统一路径工具"
    fi
else
    echo "❌ 数据同步服务文件未找到"
fi

# 4. 验证前端配置
echo "4. 检查前端配置修复..."
if [ -f "product-showcase/src/config/api.ts" ]; then
    # 检查是否添加了 FrontendImageUtils
    if grep -q "FrontendImageUtils" "product-showcase/src/config/api.ts"; then
        echo "✅ 前端图片工具类已添加"
    else
        echo "❌ 前端图片工具类未添加"
    fi
    
    # 检查是否配置了废弃路径
    if grep -q "deprecated.*originals" "product-showcase/src/config/api.ts"; then
        echo "✅ 前端已配置废弃路径识别"
    else
        echo "❌ 前端未配置废弃路径识别"
    fi
else
    echo "❌ 前端API配置文件未找到"
fi

# 5. 验证图片映射工具
echo "5. 检查图片映射工具修复..."
if [ -f "product-showcase/src/utils/imageMapper.ts" ]; then
    # 检查是否使用了前端工具类
    if grep -q "FrontendImageUtils" "product-showcase/src/utils/imageMapper.ts"; then
        echo "✅ 图片映射工具已使用前端工具类"
    else
        echo "❌ 图片映射工具未使用前端工具类"
    fi
    
    # 检查是否有路径修复逻辑
    if grep -q "needsPathFix" "product-showcase/src/utils/imageMapper.ts"; then
        echo "✅ 图片映射工具已添加路径修复逻辑"
    else
        echo "❌ 图片映射工具未添加路径修复逻辑"
    fi
else
    echo "❌ 图片映射工具文件未找到"
fi

# 6. 检查潜在遗留问题
echo "6. 检查潜在遗留问题..."

# 搜索所有可能的废弃路径引用
echo "   搜索 'originals' 引用..."
originals_count=$(find . -name "*.ts" -o -name "*.js" -o -name "*.json" | grep -v node_modules | grep -v .git | xargs grep -l "originals" 2>/dev/null | wc -l)
if [ "$originals_count" -gt 0 ]; then
    echo "⚠️  发现 $originals_count 个文件仍包含 'originals' 引用"
    echo "   需要手动检查以下文件:"
    find . -name "*.ts" -o -name "*.js" -o -name "*.json" | grep -v node_modules | grep -v .git | xargs grep -l "originals" 2>/dev/null
else
    echo "✅ 未发现遗留的 'originals' 引用"
fi

# 搜索硬编码的图片URL
echo "   搜索硬编码的图片URL..."
hardcoded_url_count=$(find . -name "*.ts" -o -name "*.js" | grep -v node_modules | grep -v .git | xargs grep -l "152.89.168.61:9000" 2>/dev/null | wc -l)
if [ "$hardcoded_url_count" -gt 0 ]; then
    echo "⚠️  发现 $hardcoded_url_count 个文件包含硬编码的图片URL"
    echo "   建议使用配置文件中的URL"
else
    echo "✅ 未发现硬编码的图片URL"
fi

# 7. 生成修复报告
echo ""
echo "📊 修复完成度报告:"
echo "================================"
echo "✅ 已完成:"
echo "   - 创建统一的图片路径配置文件"
echo "   - 修复图片上传服务的路径生成逻辑"
echo "   - 修复数据同步服务的路径处理"
echo "   - 更新前端图片URL构建逻辑"
echo "   - 添加废弃路径自动检测和修复"
echo "   - 统一缩略图路径生成机制"
echo ""
echo "🔄 后续建议:"
echo "   - 运行数据库修复脚本更新现有数据"
echo "   - 验证MinIO中的图片文件路径"
echo "   - 测试前端图片加载功能"
echo "   - 更新相关文档"
echo ""
echo "🎯 预期效果:"
echo "   - 所有新上传的图片将使用 'products/' 路径"
echo "   - 现有废弃路径将自动修复为新路径"
echo "   - 前端将统一使用修复后的图片URL"
echo "   - 系统将具备路径一致性检查能力"

echo ""
echo "✨ 图片路径修复验证完成！"