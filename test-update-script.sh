#!/bin/bash

# =============================================================================
# 数据更新脚本测试工具
# 功能：测试自动化数据更新脚本的各个组件
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 测试脚本存在性和权限
test_script_basics() {
    echo "=== 测试脚本基础功能 ==="
    
    if [[ -f "$PROJECT_ROOT/update-data.sh" ]]; then
        log_success "update-data.sh 文件存在"
    else
        log_error "update-data.sh 文件不存在"
        return 1
    fi
    
    if [[ -x "$PROJECT_ROOT/update-data.sh" ]]; then
        log_success "update-data.sh 具有可执行权限"
    else
        log_warning "update-data.sh 没有可执行权限，正在添加..."
        chmod +x "$PROJECT_ROOT/update-data.sh"
        log_success "已添加可执行权限"
    fi
}

# 测试依赖环境
test_dependencies() {
    echo -e "\n=== 测试依赖环境 ==="
    
    # 测试 Python
    if command -v python3 &> /dev/null; then
        log_success "Python3: $(python3 --version)"
    else
        log_error "Python3 未安装"
        return 1
    fi
    
    # 测试 Node.js
    if command -v node &> /dev/null; then
        log_success "Node.js: $(node --version)"
    else
        log_error "Node.js 未安装"
        return 1
    fi
    
    # 测试 npm
    if command -v npm &> /dev/null; then
        log_success "npm: $(npm --version)"
    else
        log_error "npm 未安装"
        return 1
    fi
}

# 测试必要文件
test_required_files() {
    echo -e "\n=== 测试必要文件 ==="
    
    local files=(
        "feishu_data_analyzer.py"
        "feishu_image_downloader.py"
        "product-showcase/package.json"
        "product-showcase/scripts/processData.js"
        "product-showcase/scripts/analyzeImageStatus.js"
        "product-showcase/scripts/validateKeys.js"
    )
    
    for file in "${files[@]}"; do
        if [[ -f "$PROJECT_ROOT/$file" ]]; then
            log_success "$file 存在"
        else
            log_error "$file 不存在"
        fi
    done
}

# 测试 npm 脚本
test_npm_scripts() {
    echo -e "\n=== 测试 npm 脚本 ==="
    
    cd "$PROJECT_ROOT/product-showcase"
    
    # 检查 package.json 中的脚本
    local scripts=("process-data" "validate-keys")
    
    for script in "${scripts[@]}"; do
        if npm run "$script" --silent 2>/dev/null; then
            log_success "npm run $script 可以执行"
        else
            log_warning "npm run $script 执行有问题（可能是正常的，如果没有数据）"
        fi
    done
}

# 测试 Python 脚本
test_python_scripts() {
    echo -e "\n=== 测试 Python 脚本 ==="
    
    cd "$PROJECT_ROOT"
    
    # 测试 Python 脚本语法
    if python3 -m py_compile feishu_data_analyzer.py; then
        log_success "feishu_data_analyzer.py 语法正确"
    else
        log_error "feishu_data_analyzer.py 语法错误"
    fi
    
    if python3 -m py_compile feishu_image_downloader.py; then
        log_success "feishu_image_downloader.py 语法正确"
    else
        log_error "feishu_image_downloader.py 语法错误"
    fi
}

# 测试数据目录结构
test_data_structure() {
    echo -e "\n=== 测试数据目录结构 ==="
    
    local dirs=(
        "product-showcase/src/data"
        "product-showcase/public/images"
        "product-showcase/scripts"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ -d "$PROJECT_ROOT/$dir" ]]; then
            log_success "$dir 目录存在"
        else
            log_warning "$dir 目录不存在，将在运行时创建"
        fi
    done
}

# 运行完整测试
run_full_test() {
    echo -e "\n=== 运行完整脚本测试（仅检查语法） ==="
    
    cd "$PROJECT_ROOT"
    
    # 使用 bash -n 检查脚本语法
    if bash -n update-data.sh; then
        log_success "update-data.sh 脚本语法正确"
    else
        log_error "update-data.sh 脚本语法错误"
        return 1
    fi
    
    log_info "如需运行完整更新流程，请执行: ./update-data.sh"
}

# 显示使用说明
show_usage() {
    echo -e "\n=== 使用说明 ==="
    log_info "测试完成后，您可以："
    log_info "1. 运行完整更新: ./update-data.sh"
    log_info "2. 查看使用说明: cat README-UPDATE-SCRIPT.md"
    log_info "3. 查看执行日志: tail -f update-data.log"
}

# 主函数
main() {
    echo "🧪 数据更新脚本测试工具"
    echo "项目根目录: $PROJECT_ROOT"
    echo ""
    
    test_script_basics
    test_dependencies
    test_required_files
    test_npm_scripts
    test_python_scripts
    test_data_structure
    run_full_test
    show_usage
    
    echo -e "\n${GREEN}✅ 测试完成！${NC}"
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
