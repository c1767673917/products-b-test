#!/bin/bash

# 数据同步服务测试脚本

BASE_URL="http://localhost:3000/api/v1"

echo "🧪 开始测试数据同步服务..."
echo "========================================"

# 检查服务器状态
echo "1. 检查服务器健康状态..."
response=$(curl -s -w "%{http_code}" "${BASE_URL}/../health" -o /tmp/health_response.json)
if [ "$response" = "200" ]; then
    echo "✅ 服务器健康检查通过"
    cat /tmp/health_response.json | jq '.'
else
    echo "❌ 服务器健康检查失败 (HTTP $response)"
    exit 1
fi

echo ""

# 获取同步状态
echo "2. 获取同步状态..."
response=$(curl -s -w "%{http_code}" "${BASE_URL}/sync/status" -o /tmp/sync_status.json)
if [ "$response" = "200" ]; then
    echo "✅ 获取同步状态成功"
    cat /tmp/sync_status.json | jq '.'
else
    echo "❌ 获取同步状态失败 (HTTP $response)"
    cat /tmp/sync_status.json
fi

echo ""

# 执行数据验证
echo "3. 执行数据一致性验证..."
response=$(curl -s -w "%{http_code}" "${BASE_URL}/sync/validate" \
    -X POST \
    -H "Content-Type: application/json" \
    -o /tmp/validate_response.json)
if [ "$response" = "200" ]; then
    echo "✅ 数据验证完成"
    cat /tmp/validate_response.json | jq '.'
else
    echo "❌ 数据验证失败 (HTTP $response)"
    cat /tmp/validate_response.json
fi

echo ""

# 执行增量同步（预览模式）
echo "4. 执行增量同步（预览模式）..."
response=$(curl -s -w "%{http_code}" "${BASE_URL}/sync/products" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{
        "mode": "incremental",
        "dryRun": true
    }' \
    -o /tmp/sync_incremental.json)
if [ "$response" = "200" ]; then
    echo "✅ 增量同步预览成功"
    cat /tmp/sync_incremental.json | jq '.'
else
    echo "❌ 增量同步预览失败 (HTTP $response)"
    cat /tmp/sync_incremental.json
fi

echo ""

# 执行图片同步（预览模式）
echo "5. 执行图片同步（预览模式）..."
response=$(curl -s -w "%{http_code}" "${BASE_URL}/sync/images" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{
        "dryRun": true
    }' \
    -o /tmp/sync_images.json)
if [ "$response" = "200" ]; then
    echo "✅ 图片同步预览成功"
    cat /tmp/sync_images.json | jq '.'
else
    echo "❌ 图片同步预览失败 (HTTP $response)"
    cat /tmp/sync_images.json
fi

echo ""

# 获取同步历史
echo "6. 获取同步历史..."
response=$(curl -s -w "%{http_code}" "${BASE_URL}/sync/history?limit=5" -o /tmp/sync_history.json)
if [ "$response" = "200" ]; then
    echo "✅ 获取同步历史成功"
    cat /tmp/sync_history.json | jq '.'
else
    echo "❌ 获取同步历史失败 (HTTP $response)"
    cat /tmp/sync_history.json
fi

echo ""

# 测试错误处理
echo "7. 测试错误处理..."
response=$(curl -s -w "%{http_code}" "${BASE_URL}/sync/products" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{
        "mode": "invalid_mode"
    }' \
    -o /tmp/sync_error.json)
if [ "$response" = "400" ]; then
    echo "✅ 错误处理测试通过"
    cat /tmp/sync_error.json | jq '.'
else
    echo "❌ 错误处理测试失败 (HTTP $response)"
    cat /tmp/sync_error.json
fi

echo ""

# 清理临时文件
rm -f /tmp/health_response.json /tmp/sync_*.json /tmp/validate_response.json

echo "========================================"
echo "🎉 数据同步服务测试完成！"
echo ""
echo "如果所有测试都通过，说明数据同步服务已正常工作"
echo "可以通过以下命令进行实际的数据同步："
echo ""
echo "# 增量同步"
echo "curl -X POST ${BASE_URL}/sync/products -H 'Content-Type: application/json' -d '{\"mode\": \"incremental\"}'"
echo ""
echo "# 全量同步"
echo "curl -X POST ${BASE_URL}/sync/products -H 'Content-Type: application/json' -d '{\"mode\": \"full\"}'"
echo ""
echo "# 图片同步"
echo "curl -X POST ${BASE_URL}/sync/images -H 'Content-Type: application/json' -d '{}'"