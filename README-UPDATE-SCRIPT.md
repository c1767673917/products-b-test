# 自动化数据更新脚本使用说明

## 📋 概述

`update-data.sh` 是一个完整的自动化数据更新脚本，整合了从飞书多维表格获取数据到验证完整性的完整流程。

## 🚀 快速使用

### 基本用法
```bash
# 在项目根目录下运行
./update-data.sh
```

### 查看执行日志
```bash
# 实时查看日志
tail -f update-data.log

# 查看完整日志
cat update-data.log
```

## 🔧 脚本功能

### 自动执行的步骤
1. **环境检查** - 验证 Python3、Node.js、npm 和必要文件
2. **数据获取** - 从飞书多维表格获取最新数据
3. **数据处理** - 转换为前端可用的 JSON 格式
4. **图片分析** - 识别缺失的图片文件
5. **图片下载** - 增量下载缺失的图片
6. **数据更新** - 重新处理数据以更新图片路径
7. **数据验证** - 验证数据完整性和一致性
8. **统计报告** - 生成详细的更新统计信息

### 智能特性
- ✅ 自动检测和使用最新的飞书数据目录
- ✅ 增量图片下载（只下载缺失的图片）
- ✅ 详细的执行日志和进度显示
- ✅ 完善的错误处理和回滚机制
- ✅ 彩色输出，易于阅读
- ✅ 实时统计信息显示

## 📊 输出示例

```bash
=== 开始自动化数据更新流程 ===
[INFO] 项目根目录: /Users/xxx/projects/products-b
[INFO] 日志文件: /Users/xxx/projects/products-b/update-data.log

=== 检查依赖环境 ===
[SUCCESS] Python3: Python 3.9.7
[SUCCESS] Node.js: v18.17.0
[SUCCESS] npm: 9.6.7
[SUCCESS] 所有依赖检查通过

=== 步骤1: 从飞书多维表格获取最新数据 ===
[INFO] 正在运行 feishu_data_analyzer.py...
[SUCCESS] 数据获取成功，保存到: ./feishu_data_20250715_134609
[INFO] 获取到 788 条原始记录

=== 步骤2: 处理和转换数据为前端格式 ===
[INFO] 正在运行 npm run process-data...
[SUCCESS] 数据处理完成
[INFO] 成功转换 786 个产品

=== 步骤3: 分析图片状态 ===
[INFO] 正在分析图片状态...
[SUCCESS] 图片状态分析完成
[INFO] 现有图片: 2156 张，缺失图片: 0 张

=== 步骤4: 增量下载缺失图片 ===
[INFO] 没有缺失的图片，跳过下载步骤

=== 步骤5: 重新处理数据以更新图片路径 ===
[INFO] 重新运行数据处理以更新图片路径...
[SUCCESS] 数据重新处理完成

=== 步骤6: 验证数据完整性 ===
[INFO] 正在验证数据完整性...
[SUCCESS] 数据验证完成
[INFO] 验证结果: 总产品数 786，重复ID数 0

=== 生成更新统计报告 ===
[SUCCESS] 数据更新统计:
[INFO] 总产品数: 786
[INFO] 品类数量: 15
[INFO] 平台数量: 7
[INFO] 平均价格: ¥29.94
[INFO] 优惠产品: 440

[SUCCESS] 图片状态统计:
[INFO] 图片总数: 2156
[INFO] 存在图片: 2156
[INFO] 缺失图片: 0
[INFO] 完整率: 100.0%

=== 数据更新流程完成 ===
[SUCCESS] 所有步骤执行成功！
```

## ⚠️ 注意事项

### 运行环境要求
- macOS 或 Linux 系统
- Python 3.x 已安装
- Node.js 和 npm 已安装
- 项目依赖已安装（`npm install`）

### 网络要求
- 需要访问飞书 API
- 需要下载图片文件的网络权限

### 文件权限
- 脚本需要可执行权限：`chmod +x update-data.sh`
- 需要对项目目录的读写权限

## 🐛 故障排除

### 常见问题

1. **权限错误**
   ```bash
   chmod +x update-data.sh
   ```

2. **Python 模块缺失**
   ```bash
   pip3 install requests pandas
   ```

3. **Node.js 依赖缺失**
   ```bash
   cd product-showcase && npm install
   ```

4. **飞书 API 访问失败**
   - 检查网络连接
   - 验证飞书 API 配置信息

### 查看详细错误
```bash
# 查看最新的错误日志
tail -n 50 update-data.log

# 搜索错误信息
grep -i error update-data.log
```

## 📝 日志文件

脚本会在项目根目录生成 `update-data.log` 文件，包含：
- 详细的执行步骤
- 错误信息和堆栈跟踪
- 性能统计信息
- 时间戳记录

## 🔄 定时执行

可以通过 cron 设置定时执行：

```bash
# 编辑 crontab
crontab -e

# 添加定时任务（每天凌晨2点执行）
0 2 * * * cd /path/to/your/project && ./update-data.sh >> cron.log 2>&1
```

## 📞 技术支持

如果遇到问题，请：
1. 查看 `update-data.log` 日志文件
2. 检查网络连接和 API 配置
3. 验证所有依赖是否正确安装
4. 确认文件权限设置正确

---

**最后更新**: 2025-07-15  
**版本**: 1.0.0
