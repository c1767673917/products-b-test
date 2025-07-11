#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
飞书应用权限检查工具
用于检查当前应用是否具有必要的权限
"""

import requests
import json
from feishu_image_downloader import FeishuImageDownloader

def check_permissions():
    """检查飞书应用权限"""
    APP_ID = "cli_a8e575c35763d013"
    APP_SECRET = "41VyUJHWqFBoiOr5dOwgqctKwSn1RqWf"
    
    print("🔍 检查飞书应用权限...")
    print("=" * 50)
    
    # 创建下载器实例
    downloader = FeishuImageDownloader(APP_ID, APP_SECRET)
    
    # 获取访问令牌
    access_token = downloader.get_tenant_access_token()
    if not access_token:
        print("❌ 无法获取访问令牌")
        return
    
    print("✅ 成功获取访问令牌")
    
    # 测试不同的API端点来检查权限
    test_endpoints = [
        {
            "name": "多维表格权限",
            "url": f"{downloader.base_url}/open-apis/bitable/v1/apps",
            "required_scopes": ["bitable:app", "bitable:app:readonly"]
        },
        {
            "name": "云文档权限", 
            "url": f"{downloader.base_url}/open-apis/drive/v1/files",
            "required_scopes": ["drive:drive", "drive:drive:readonly"]
        }
    ]
    
    headers = {'Authorization': f'Bearer {access_token}'}
    
    print("\n📋 权限检查结果:")
    print("-" * 30)
    
    for endpoint in test_endpoints:
        print(f"\n🔸 {endpoint['name']}:")
        try:
            response = requests.get(endpoint['url'], headers=headers)
            if response.status_code == 200:
                print(f"   ✅ 有权限")
            elif response.status_code == 403:
                print(f"   ❌ 权限不足")
                try:
                    error_info = response.json()
                    print(f"   错误: {error_info.get('msg', '未知错误')}")
                except:
                    pass
            else:
                print(f"   ⚠️  状态码: {response.status_code}")
        except Exception as e:
            print(f"   ❌ 请求失败: {e}")
    
    # 检查具体的文件下载权限
    print(f"\n🔸 文件下载权限测试:")
    
    # 使用一个示例file_token进行测试
    test_file_token = "XwMCbud6loXtBHxuI8kc9hYJn5c"  # 从数据中获取的真实token
    
    # 测试直接下载
    download_url = f"{downloader.base_url}/open-apis/drive/v1/medias/{test_file_token}/download"
    try:
        response = requests.head(download_url, headers=headers)  # 使用HEAD请求避免下载
        if response.status_code == 200:
            print(f"   ✅ 直接下载权限正常")
        elif response.status_code == 403 or response.status_code == 400:
            print(f"   ❌ 直接下载权限不足 (状态码: {response.status_code})")
        else:
            print(f"   ⚠️  直接下载状态码: {response.status_code}")
    except Exception as e:
        print(f"   ❌ 直接下载测试失败: {e}")
    
    # 测试临时下载链接
    tmp_url = f"{downloader.base_url}/open-apis/drive/v1/medias/batch_get_tmp_download_url"
    try:
        response = requests.get(tmp_url, headers=headers, params={"file_tokens": test_file_token})
        if response.status_code == 200:
            print(f"   ✅ 临时下载链接权限正常")
        elif response.status_code == 403 or response.status_code == 400:
            print(f"   ❌ 临时下载链接权限不足 (状态码: {response.status_code})")
            try:
                error_info = response.json()
                if error_info.get('code') == 99991672:
                    print(f"   📋 需要申请的权限: {error_info.get('msg', '')}")
            except:
                pass
        else:
            print(f"   ⚠️  临时下载链接状态码: {response.status_code}")
    except Exception as e:
        print(f"   ❌ 临时下载链接测试失败: {e}")
    
    print(f"\n📖 权限申请指南:")
    print(f"   1. 访问: https://open.feishu.cn/app/{APP_ID}/auth")
    print(f"   2. 申请权限: bitable:app:readonly, drive:drive:readonly, docs:document.media:download")
    print(f"   3. 等待审批通过后重新测试")
    
    print(f"\n🔗 快速申请链接:")
    quick_link = f"https://open.feishu.cn/app/{APP_ID}/auth?q=bitable:app:readonly,drive:drive:readonly,docs:document.media:download&op_from=openapi&token_type=tenant"
    print(f"   {quick_link}")

if __name__ == "__main__":
    check_permissions()
