# 安全设置指南

## 环境变量配置

### 后端配置 (products-backend)

1. 复制环境变量模板：
   ```bash
   cp products-backend/.env.example products-backend/.env
   ```

2. 编辑 `products-backend/.env` 文件，填入真实的配置信息：
   - `MONGODB_URI`: 您的MongoDB连接字符串
   - `MINIO_ENDPOINT`: MinIO服务器地址
   - `MINIO_ACCESS_KEY`: MinIO访问密钥
   - `MINIO_SECRET_KEY`: MinIO密钥
   - 其他配置项

### 前端配置 (product-showcase)

1. 复制环境变量模板：
   ```bash
   cp product-showcase/.env.example product-showcase/.env
   ```

2. 根据需要编辑 `product-showcase/.env` 文件

## 重要安全提醒

⚠️ **绝对不要将包含真实密码和密钥的 .env 文件提交到Git仓库！**

### 已经被保护的敏感信息类型：
- 数据库连接字符串和密码
- API密钥和访问令牌
- MinIO/S3访问密钥
- 私钥文件
- 日志文件
- 构建产物
- node_modules目录
- 系统文件(.DS_Store等)

### 如果意外提交了敏感信息：

1. 立即更改所有暴露的密码和密钥
2. 使用以下命令从Git历史中移除敏感文件：
   ```bash
   git rm --cached path/to/sensitive/file
   git commit -m "Remove sensitive file"
   ```
3. 考虑使用 `git filter-branch` 或 `BFG Repo-Cleaner` 完全清除历史记录

### 最佳实践：

1. 始终使用 `.env.example` 文件作为模板
2. 在生产环境中使用环境变量或密钥管理服务
3. 定期轮换密钥和密码
4. 使用最小权限原则配置数据库和服务访问权限
5. 启用双因素认证（如果支持）

## 部署前检查清单

- [ ] 所有 `.env` 文件都在 `.gitignore` 中
- [ ] 没有硬编码的密码或密钥在代码中
- [ ] 生产环境使用强密码
- [ ] 数据库和服务配置了适当的访问控制
- [ ] 启用了必要的安全日志记录
