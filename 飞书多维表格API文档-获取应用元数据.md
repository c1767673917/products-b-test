# 飞书多维表格API文档 - 获取应用元数据

## 概述

本文档详细介绍飞书开放平台多维表格API中的"获取多维表格元数据"接口，该接口用于通过app_token获取多维表格的基本信息和元数据。

## 1. API接口基本信息

### 接口详情
- **接口名称**: 获取多维表格元数据
- **HTTP方法**: `GET`
- **接口路径**: `/open-apis/bitable/v1/apps/{app_token}`
- **完整URL**: `https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}`
- **调用频率限制**: 20 QPS（每秒20次请求）

### 功能说明
通过app_token获取多维表格元数据，包括表格名称、版本信息、权限状态等基础信息。该接口通常作为其他多维表格操作的前置步骤使用。

## 2. 请求参数

### 2.1 Path参数

| 参数名 | 类型 | 必需 | 描述 | 示例值 |
|--------|------|------|------|--------|
| app_token | string | 是 | 多维表格应用token，用于唯一标识一个多维表格 | `appbcbWCzen6D8dezhoCH2RpMAh` |

### 2.2 Header参数

| 参数名 | 类型 | 必需 | 描述 | 示例值 |
|--------|------|------|------|--------|
| Authorization | string | 是 | 访问凭证，格式为"Bearer access_token" | `Bearer u-7f1bcd13fc57d46bac21793a18e560` |

**支持的访问凭证类型:**
- `tenant_access_token`: 租户访问凭证
- `user_access_token`: 用户访问凭证

## 3. 响应数据结构

### 3.1 成功响应 (HTTP 200)

```json
{
    "code": 0,
    "msg": "success",
    "data": {
        "app": {
            "app_token": "appbcbWCzen6D8dezhoCH2RpMAh",
            "name": "mybitable",
            "revision": 1,
            "is_advanced": false
        }
    }
}
```

### 3.2 响应字段说明

| 字段路径 | 类型 | 描述 |
|----------|------|------|
| code | integer | 错误码，0表示成功，非0表示失败 |
| msg | string | 响应消息，成功时为"success" |
| data.app | object | 多维表格元数据对象 |
| data.app.app_token | string | 多维表格应用token |
| data.app.name | string | 多维表格名称 |
| data.app.revision | integer | 多维表格版本号 |
| data.app.is_advanced | boolean | 是否开启高级权限功能 |

## 4. 错误码和错误处理

### 4.1 常见错误码

| HTTP状态码 | 错误码 | 错误描述 | 排查建议 |
|-----------|--------|----------|----------|
| 200 | 0 | 成功 | - |
| 200 | 1254003 | app_token 错误 | 检查app_token格式是否正确 |
| 200 | 1254040 | app_token 不存在 | 确认app_token是否有效，是否有访问权限 |
| 400 | 1254036 | 多维表格副本复制中 | 稍后重试，等待复制完成 |
| 200 | 1254290 | 请求过快 | 降低请求频率，遵守QPS限制 |
| 200 | 1254291 | 写冲突 | 避免并发调用写接口 |
| 504 | 1255040 | 请求超时 | 进行重试，检查网络连接 |

### 4.2 其他错误码

| 错误码 | 描述 | 处理建议 |
|--------|------|----------|
| 1254000 | 请求体错误 | 检查请求格式 |
| 1254001 | 请求体错误 | 检查请求参数 |
| 1254002 | 内部错误 | 联系客服支持 |
| 1255001 | 内部错误 | 联系客服支持 |
| 1255002 | RPC错误 | 联系客服支持 |

## 5. 使用示例

### 5.1 cURL示例

```bash
curl --location --request GET 'https://open.feishu.cn/open-apis/bitable/v1/apps/appbcbWCzen6D8dezhoCH2RpMAh' \
--header 'Authorization: Bearer your_access_token'
```

### 5.2 JavaScript示例

```javascript
const axios = require('axios');

async function getBitableMetadata(appToken, accessToken) {
    try {
        const response = await axios.get(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );
        
        if (response.data.code === 0) {
            console.log('多维表格信息:', response.data.data.app);
            return response.data.data.app;
        } else {
            console.error('获取失败:', response.data.msg);
            return null;
        }
    } catch (error) {
        console.error('请求错误:', error.message);
        return null;
    }
}

// 使用示例
const appToken = 'appbcbWCzen6D8dezhoCH2RpMAh';
const accessToken = 'your_access_token';
getBitableMetadata(appToken, accessToken);
```

### 5.3 Python示例

```python
import requests
import json

def get_bitable_metadata(app_token, access_token):
    """
    获取多维表格元数据
    
    Args:
        app_token (str): 多维表格应用token
        access_token (str): 访问凭证
    
    Returns:
        dict: 多维表格元数据，失败时返回None
    """
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}"
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        if data.get('code') == 0:
            print(f"获取成功: {data['data']['app']['name']}")
            return data['data']['app']
        else:
            print(f"获取失败: {data.get('msg', '未知错误')}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"请求错误: {e}")
        return None

# 使用示例
app_token = 'appbcbWCzen6D8dezhoCH2RpMAh'
access_token = 'your_access_token'
metadata = get_bitable_metadata(app_token, access_token)
```

## 6. 权限要求和使用限制

### 6.1 权限要求
- 需要获取有效的访问凭证（tenant_access_token 或 user_access_token）
- 需要对目标多维表格有读取权限
- 应用需要申请相应的API权限范围

### 6.2 使用限制
- **调用频率**: 20 QPS（每秒最多20次请求）
- **数据表数量**: 最多300个数据表
- **视图数量**: 最多200个视图
- **记录数量**: 最多20,000条记录
- **单次添加记录**: 最多500条

### 6.3 注意事项
1. app_token可以从多维表格的分享链接中获取
2. 建议在调用其他多维表格API前先调用此接口验证权限
3. 注意遵守API调用频率限制，避免触发限流
4. 妥善保管访问凭证，避免泄露

## 7. 常见问题

### Q1: 如何获取app_token？
A: app_token可以从多维表格的URL中提取，格式通常为：
`https://example.feishu.cn/base/appXXXXXXXXXXXXXXXX`
其中`appXXXXXXXXXXXXXXXX`就是app_token。

### Q2: 如何获取访问凭证？
A: 需要通过飞书开放平台的认证接口获取，具体可参考飞书开放平台的认证文档。

### Q3: 接口返回1254003错误怎么办？
A: 这表示app_token错误，请检查：
- app_token格式是否正确
- 是否有该多维表格的访问权限
- 多维表格是否存在

### Q4: 如何处理频率限制？
A: 建议：
- 控制请求频率不超过20 QPS
- 实现请求重试机制
- 使用指数退避策略处理限流

## 8. 相关接口

获取到多维表格元数据后，通常会继续调用以下接口：
- 列出数据表：`GET /open-apis/bitable/v1/apps/{app_token}/tables`
- 列出记录：`GET /open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records`
- 列出字段：`GET /open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/fields`

---

**文档版本**: v1.0  
**最后更新**: 2025-07-10  
**适用版本**: 飞书开放平台 API v1
