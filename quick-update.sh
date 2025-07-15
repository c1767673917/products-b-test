#!/bin/bash

# =============================================================================
# 快速数据更新脚本
# 功能：一键执行完整的数据更新流程
# 使用：./quick-update.sh
# =============================================================================

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 开始快速数据更新...${NC}"
echo ""

# 检查脚本是否存在
if [[ ! -f "update-data.sh" ]]; then
    echo -e "${YELLOW}⚠️  update-data.sh 不存在，请确保在项目根目录运行此脚本${NC}"
    exit 1
fi

# 添加执行权限（如果需要）
chmod +x update-data.sh

# 运行完整更新流程
echo -e "${GREEN}📊 执行完整数据更新流程...${NC}"
./update-data.sh

echo ""
echo -e "${GREEN}✅ 数据更新完成！${NC}"
echo -e "${BLUE}📋 查看详细日志: tail -f update-data.log${NC}"
echo -e "${BLUE}📖 查看使用说明: cat README-UPDATE-SCRIPT.md${NC}"
