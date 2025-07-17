#!/bin/bash

# Image Service API Test Script
# 测试图片服务API的各个端点

BASE_URL="http://localhost:3000/api/v1"

echo "🧪 开始测试图片服务API..."
echo "================================"

# 1. 测试健康检查
echo "1. 测试图片服务健康检查..."
curl -s -X GET "$BASE_URL/images/health" | jq . || echo "❌ 健康检查失败"
echo ""

# 2. 测试图片统计
echo "2. 测试图片统计信息..."
curl -s -X GET "$BASE_URL/images/stats" | jq . || echo "❌ 统计信息获取失败"
echo ""

# 3. 测试获取产品图片
echo "3. 测试获取产品图片..."
curl -s -X GET "$BASE_URL/images/product/20250708-002" | jq . || echo "❌ 产品图片获取失败"
echo ""

# 4. 测试图片代理 (如果图片存在)
echo "4. 测试图片代理访问..."
# 这里需要真实的imageId
# curl -s -X GET "$BASE_URL/images/proxy/[imageId]?width=300&format=webp" || echo "❌ 图片代理失败"

echo "================================"
echo "✅ 图片服务API测试完成"

echo ""
echo "📝 可用的API端点:"
echo "- GET /api/v1/images/health - 健康检查"
echo "- GET /api/v1/images/stats - 统计信息"
echo "- GET /api/v1/images/:imageId - 获取图片信息"
echo "- GET /api/v1/images/proxy/:imageId - 图片代理访问"
echo "- GET /api/v1/images/product/:productId - 获取产品图片"
echo "- POST /api/v1/images/upload - 上传单个图片"
echo "- POST /api/v1/images/upload/batch - 批量上传图片"
echo "- DELETE /api/v1/images/:imageId - 删除图片"
echo ""

echo "🔧 使用示例:"
echo "# 上传图片:"
echo "curl -X POST -F \"file=@image.jpg\" -F \"productId=20250708-002\" -F \"type=front\" $BASE_URL/images/upload"
echo ""
echo "# 获取缩略图:"
echo "curl \"$BASE_URL/images/proxy/[imageId]?width=300&height=300&format=webp\""
echo ""
echo "# 获取产品所有图片:"
echo "curl \"$BASE_URL/images/product/20250708-002\""