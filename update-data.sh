#!/bin/bash

# =============================================================================
# 自动化数据更新脚本
# 功能：从飞书多维表格获取数据，处理转换，下载图片，验证完整性
# 作者：Augment Agent
# 日期：2025-07-15
# =============================================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRODUCT_SHOWCASE_DIR="$PROJECT_ROOT/product-showcase"
LOG_FILE="$PROJECT_ROOT/update-data.log"

# 初始化日志
echo "==============================================================================" > "$LOG_FILE"
echo "数据更新开始时间: $(date)" >> "$LOG_FILE"
echo "==============================================================================" >> "$LOG_FILE"

# 日志函数
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

log_info() {
    log "${BLUE}[INFO]${NC} $1"
}

log_success() {
    log "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    log "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    log "${RED}[ERROR]${NC} $1"
}

log_step() {
    log "\n${PURPLE}=== $1 ===${NC}"
}

# 错误处理函数
handle_error() {
    local exit_code=$?
    log_error "脚本执行失败，退出码: $exit_code"
    log_error "详细错误信息请查看日志文件: $LOG_FILE"
    exit $exit_code
}

# 设置错误处理
trap handle_error ERR

# 检查依赖
check_dependencies() {
    log_step "检查依赖环境"
    
    # 检查 Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python3 未安装或不在 PATH 中"
        exit 1
    fi
    log_success "Python3: $(python3 --version)"
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装或不在 PATH 中"
        exit 1
    fi
    log_success "Node.js: $(node --version)"
    
    # 检查 npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装或不在 PATH 中"
        exit 1
    fi
    log_success "npm: $(npm --version)"
    
    # 检查必要文件
    if [[ ! -f "$PROJECT_ROOT/feishu_data_analyzer.py" ]]; then
        log_error "feishu_data_analyzer.py 文件不存在"
        exit 1
    fi
    
    if [[ ! -f "$PROJECT_ROOT/feishu_image_downloader.py" ]]; then
        log_error "feishu_image_downloader.py 文件不存在"
        exit 1
    fi
    
    if [[ ! -d "$PRODUCT_SHOWCASE_DIR" ]]; then
        log_error "product-showcase 目录不存在"
        exit 1
    fi
    
    log_success "所有依赖检查通过"
}

# 步骤1: 从飞书获取最新数据
fetch_feishu_data() {
    log_step "步骤1: 从飞书多维表格获取最新数据"
    
    cd "$PROJECT_ROOT"
    log_info "正在运行 feishu_data_analyzer.py..."
    
    if python3 feishu_data_analyzer.py >> "$LOG_FILE" 2>&1; then
        # 查找最新的数据目录
        LATEST_DATA_DIR=$(find . -maxdepth 1 -name "feishu_data_*" -type d | sort -r | head -n 1)
        if [[ -n "$LATEST_DATA_DIR" ]]; then
            log_success "数据获取成功，保存到: $LATEST_DATA_DIR"
            # 检查记录数量
            if [[ -f "$LATEST_DATA_DIR/data.csv" ]]; then
                RECORD_COUNT=$(wc -l < "$LATEST_DATA_DIR/data.csv")
                RECORD_COUNT=$((RECORD_COUNT - 1))  # 减去标题行
                log_info "获取到 $RECORD_COUNT 条原始记录"
            fi
        else
            log_error "未找到生成的数据目录"
            exit 1
        fi
    else
        log_error "飞书数据获取失败"
        exit 1
    fi
}

# 步骤2: 处理和转换数据
process_data() {
    log_step "步骤2: 处理和转换数据为前端格式"
    
    cd "$PRODUCT_SHOWCASE_DIR"
    log_info "正在运行 npm run process-data..."
    
    if npm run process-data >> "$LOG_FILE" 2>&1; then
        log_success "数据处理完成"
        
        # 检查生成的产品数量
        if [[ -f "src/data/products.json" ]]; then
            PRODUCT_COUNT=$(python3 -c "import json; data=json.load(open('src/data/products.json')); print(len(data))" 2>/dev/null || echo "0")
            log_info "成功转换 $PRODUCT_COUNT 个产品"
        fi
    else
        log_error "数据处理失败"
        exit 1
    fi
}

# 步骤3: 分析图片状态
analyze_images() {
    log_step "步骤3: 分析图片状态"
    
    cd "$PRODUCT_SHOWCASE_DIR"
    log_info "正在分析图片状态..."
    
    if node scripts/analyzeImageStatus.js >> "$LOG_FILE" 2>&1; then
        log_success "图片状态分析完成"
        
        # 检查图片状态
        if [[ -f "src/data/image_status_report.json" ]]; then
            MISSING_COUNT=$(python3 -c "import json; data=json.load(open('src/data/image_status_report.json')); print(data.get('missingImages', 0))" 2>/dev/null || echo "0")
            EXISTING_COUNT=$(python3 -c "import json; data=json.load(open('src/data/image_status_report.json')); print(data.get('existingImages', 0))" 2>/dev/null || echo "0")
            log_info "现有图片: $EXISTING_COUNT 张，缺失图片: $MISSING_COUNT 张"
        fi
    else
        log_error "图片状态分析失败"
        exit 1
    fi
}

# 步骤4: 下载缺失图片
download_images() {
    log_step "步骤4: 增量下载缺失图片"
    
    cd "$PROJECT_ROOT"
    
    # 检查是否有缺失图片
    if [[ -f "$PRODUCT_SHOWCASE_DIR/src/data/missing_images.csv" ]]; then
        MISSING_COUNT=$(wc -l < "$PRODUCT_SHOWCASE_DIR/src/data/missing_images.csv")
        MISSING_COUNT=$((MISSING_COUNT - 1))  # 减去标题行
        
        if [[ $MISSING_COUNT -gt 0 ]]; then
            log_info "发现 $MISSING_COUNT 个缺失图片，开始下载..."
            
            if python3 feishu_image_downloader.py missing >> "$LOG_FILE" 2>&1; then
                log_success "图片下载完成"
            else
                log_error "图片下载失败"
                exit 1
            fi
        else
            log_info "没有缺失的图片，跳过下载步骤"
        fi
    else
        log_warning "未找到缺失图片列表文件，跳过下载步骤"
    fi
}

# 步骤5: 重新处理数据（更新图片路径）
reprocess_data() {
    log_step "步骤5: 重新处理数据以更新图片路径"
    
    cd "$PRODUCT_SHOWCASE_DIR"
    log_info "重新运行数据处理以更新图片路径..."
    
    if npm run process-data >> "$LOG_FILE" 2>&1; then
        log_success "数据重新处理完成"
    else
        log_error "数据重新处理失败"
        exit 1
    fi
}

# 步骤6: 验证数据完整性
validate_data() {
    log_step "步骤6: 验证数据完整性"
    
    cd "$PRODUCT_SHOWCASE_DIR"
    log_info "正在验证数据完整性..."
    
    if npm run validate-keys >> "$LOG_FILE" 2>&1; then
        log_success "数据验证完成"
        
        # 检查验证结果
        if [[ -f "src/data/validation_report.json" ]]; then
            TOTAL_PRODUCTS=$(python3 -c "import json; data=json.load(open('src/data/validation_report.json')); print(data.get('totalProducts', 0))" 2>/dev/null || echo "0")
            DUPLICATE_IDS=$(python3 -c "import json; data=json.load(open('src/data/validation_report.json')); print(data.get('duplicateIds', 0))" 2>/dev/null || echo "0")
            log_info "验证结果: 总产品数 $TOTAL_PRODUCTS，重复ID数 $DUPLICATE_IDS"
        fi
    else
        log_error "数据验证失败"
        exit 1
    fi
}

# 生成最终统计报告
generate_summary() {
    log_step "生成更新统计报告"
    
    cd "$PRODUCT_SHOWCASE_DIR"
    
    # 读取统计数据
    if [[ -f "src/data/stats.json" ]]; then
        STATS=$(python3 -c "
import json
try:
    with open('src/data/stats.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f\"总产品数: {data.get('totalProducts', 0)}\")
    print(f\"品类数量: {len(data.get('categories', {}))}\")
    print(f\"平台数量: {len(data.get('platforms', {}))}\")
    print(f\"平均价格: ¥{data.get('averagePrice', 0):.2f}\")
    print(f\"优惠产品: {data.get('discountedProducts', 0)}\")
except Exception as e:
    print('统计数据读取失败')
" 2>/dev/null)
        
        log_success "数据更新统计:"
        echo "$STATS" | while read line; do
            log_info "$line"
        done
    fi
    
    # 读取图片状态
    if [[ -f "src/data/image_status_report.json" ]]; then
        IMAGE_STATS=$(python3 -c "
import json
try:
    with open('src/data/image_status_report.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    total = data.get('totalImagePaths', 0)
    existing = data.get('existingImages', 0)
    missing = data.get('missingImages', 0)
    success_rate = (existing / total * 100) if total > 0 else 0
    print(f\"图片总数: {total}\")
    print(f\"存在图片: {existing}\")
    print(f\"缺失图片: {missing}\")
    print(f\"完整率: {success_rate:.1f}%\")
except Exception as e:
    print('图片状态读取失败')
" 2>/dev/null)
        
        log_success "图片状态统计:"
        echo "$IMAGE_STATS" | while read line; do
            log_info "$line"
        done
    fi
}

# 主函数
main() {
    log_step "开始自动化数据更新流程"
    log_info "项目根目录: $PROJECT_ROOT"
    log_info "日志文件: $LOG_FILE"
    
    # 执行各个步骤
    check_dependencies
    fetch_feishu_data
    process_data
    analyze_images
    download_images
    reprocess_data
    validate_data
    generate_summary
    
    log_step "数据更新流程完成"
    log_success "所有步骤执行成功！"
    log_info "详细日志已保存到: $LOG_FILE"
    log_info "结束时间: $(date)"
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
