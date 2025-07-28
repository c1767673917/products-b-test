#!/bin/bash

# 测试全局收藏功能的脚本

API_BASE="http://localhost:3000/api/v1"

echo "=== 测试全局收藏功能 ==="
echo

# 1. 获取第一个产品的ID
echo "1. 获取产品列表..."
PRODUCTS=$(curl -s "$API_BASE/products?limit=1")
PRODUCT_ID=$(echo $PRODUCTS | jq -r '.data.products[0].productId' 2>/dev/null)

if [ -z "$PRODUCT_ID" ] || [ "$PRODUCT_ID" = "null" ]; then
    echo "错误: 无法获取产品ID"
    exit 1
fi

echo "   使用产品ID: $PRODUCT_ID"
echo

# 2. 检查产品的初始收藏状态
echo "2. 检查产品初始收藏状态..."
STATUS=$(curl -s "$API_BASE/global-favorites/status?productId=$PRODUCT_ID")
IS_FAVORITED=$(echo $STATUS | jq -r '.data.isFavorited' 2>/dev/null)
FAVORITE_COUNT=$(echo $STATUS | jq -r '.data.favoriteCount' 2>/dev/null)

echo "   当前收藏状态: $IS_FAVORITED"
echo "   当前收藏数: $FAVORITE_COUNT"
echo

# 3. 切换收藏状态
echo "3. 切换收藏状态..."
TOGGLE_RESULT=$(curl -s -X POST "$API_BASE/global-favorites/toggle" \
  -H "Content-Type: application/json" \
  -d "{\"productId\": \"$PRODUCT_ID\"}")

ACTION=$(echo $TOGGLE_RESULT | jq -r '.data.action' 2>/dev/null)
NEW_COUNT=$(echo $TOGGLE_RESULT | jq -r '.data.favoriteCount' 2>/dev/null)

echo "   操作结果: $ACTION"
echo "   新的收藏数: $NEW_COUNT"
echo

# 4. 再次检查状态确认变更
echo "4. 再次检查收藏状态..."
STATUS2=$(curl -s "$API_BASE/global-favorites/status?productId=$PRODUCT_ID")
IS_FAVORITED2=$(echo $STATUS2 | jq -r '.data.isFavorited' 2>/dev/null)
FAVORITE_COUNT2=$(echo $STATUS2 | jq -r '.data.favoriteCount' 2>/dev/null)

echo "   最新收藏状态: $IS_FAVORITED2"
echo "   最新收藏数: $FAVORITE_COUNT2"
echo

# 5. 获取全局收藏列表
echo "5. 获取全局收藏列表..."
FAVORITES=$(curl -s "$API_BASE/global-favorites?limit=10")
TOTAL_FAVORITES=$(echo $FAVORITES | jq -r '.data.pagination.total' 2>/dev/null)

echo "   全局收藏总数: $TOTAL_FAVORITES"
echo

echo "=== 测试完成 ==="