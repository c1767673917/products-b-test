#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
飞书多维表格API调用脚本
用于获取多维表格元数据和数据
"""

import requests
import json
import time
from typing import Optional, Dict, Any

class FeishuBitableAPI:
    """飞书多维表格API客户端"""
    
    def __init__(self, app_id: str, app_secret: str):
        """
        初始化API客户端
        
        Args:
            app_id: 应用ID
            app_secret: 应用密钥
        """
        self.app_id = app_id
        self.app_secret = app_secret
        self.base_url = "https://open.feishu.cn"
        self.access_token = None
        self.token_expires_at = 0
    
    def get_tenant_access_token(self) -> Optional[str]:
        """
        获取租户访问凭证
        
        Returns:
            str: 访问凭证，失败时返回None
        """
        # 如果token还未过期，直接返回
        if self.access_token and time.time() < self.token_expires_at:
            return self.access_token
            
        url = f"{self.base_url}/open-apis/auth/v3/tenant_access_token/internal"
        headers = {
            'Content-Type': 'application/json; charset=utf-8'
        }
        data = {
            "app_id": self.app_id,
            "app_secret": self.app_secret
        }
        
        try:
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            result = response.json()
            if result.get('code') == 0:
                self.access_token = result['tenant_access_token']
                # 设置过期时间（提前5分钟刷新）
                self.token_expires_at = time.time() + result.get('expire', 7200) - 300
                print(f"✅ 成功获取访问凭证")
                return self.access_token
            else:
                print(f"❌ 获取访问凭证失败: {result.get('msg', '未知错误')}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"❌ 请求错误: {e}")
            return None
    
    def get_bitable_metadata(self, app_token: str) -> Optional[Dict[str, Any]]:
        """
        获取多维表格元数据
        
        Args:
            app_token: 多维表格应用token
            
        Returns:
            dict: 多维表格元数据，失败时返回None
        """
        access_token = self.get_tenant_access_token()
        if not access_token:
            return None
            
        url = f"{self.base_url}/open-apis/bitable/v1/apps/{app_token}"
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            if data.get('code') == 0:
                app_info = data['data']['app']
                print(f"✅ 成功获取多维表格元数据:")
                print(f"   📋 表格名称: {app_info['name']}")
                print(f"   🔑 App Token: {app_info['app_token']}")
                print(f"   📊 版本号: {app_info['revision']}")
                print(f"   🔧 高级权限: {'是' if app_info['is_advanced'] else '否'}")
                return app_info
            else:
                print(f"❌ 获取多维表格元数据失败: {data.get('msg', '未知错误')}")
                print(f"   错误码: {data.get('code')}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"❌ 请求错误: {e}")
            return None
    
    def list_tables(self, app_token: str) -> Optional[list]:
        """
        获取多维表格中的所有数据表
        
        Args:
            app_token: 多维表格应用token
            
        Returns:
            list: 数据表列表，失败时返回None
        """
        access_token = self.get_tenant_access_token()
        if not access_token:
            return None
            
        url = f"{self.base_url}/open-apis/bitable/v1/apps/{app_token}/tables"
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            if data.get('code') == 0:
                tables = data['data']['items']
                print(f"✅ 成功获取数据表列表 (共{len(tables)}个表):")
                for i, table in enumerate(tables, 1):
                    print(f"   {i}. 📊 {table['name']} (ID: {table['table_id']})")
                return tables
            else:
                print(f"❌ 获取数据表列表失败: {data.get('msg', '未知错误')}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"❌ 请求错误: {e}")
            return None
    
    def get_table_records(self, app_token: str, table_id: str, page_size: int = 100) -> Optional[list]:
        """
        获取数据表中的记录
        
        Args:
            app_token: 多维表格应用token
            table_id: 数据表ID
            page_size: 每页记录数，默认100
            
        Returns:
            list: 记录列表，失败时返回None
        """
        access_token = self.get_tenant_access_token()
        if not access_token:
            return None
            
        url = f"{self.base_url}/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records"
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        params = {
            'page_size': page_size
        }
        
        try:
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            
            data = response.json()
            if data.get('code') == 0:
                records = data['data']['items']
                print(f"✅ 成功获取记录 (共{len(records)}条):")
                return records
            else:
                print(f"❌ 获取记录失败: {data.get('msg', '未知错误')}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"❌ 请求错误: {e}")
            return None


def main():
    """主函数"""
    # 您提供的配置信息
    APP_ID = "cli_a8e575c35763d013"
    APP_SECRET = "41VyUJHWqFBoiOr5dOwgqctKwSn1RqWf"
    APP_TOKEN = "S5yvbq5txacTZOsHGszc3RpDn4f"
    TABLE_ID = "tblyBL4HSF2GqSi4"
    
    print("🚀 开始调用飞书多维表格API...")
    print("=" * 50)
    
    # 创建API客户端
    api = FeishuBitableAPI(APP_ID, APP_SECRET)
    
    # 1. 获取多维表格元数据
    print("\n📋 步骤1: 获取多维表格元数据")
    print("-" * 30)
    metadata = api.get_bitable_metadata(APP_TOKEN)
    
    if metadata:
        # 2. 获取数据表列表
        print("\n📊 步骤2: 获取数据表列表")
        print("-" * 30)
        tables = api.list_tables(APP_TOKEN)
        
        if tables:
            # 3. 获取指定表的记录
            print(f"\n📝 步骤3: 获取表 {TABLE_ID} 的记录")
            print("-" * 30)
            records = api.get_table_records(APP_TOKEN, TABLE_ID)
            
            if records:
                print(f"\n📄 记录详情 (前3条):")
                for i, record in enumerate(records[:3], 1):
                    print(f"   记录 {i}:")
                    print(f"   - Record ID: {record.get('record_id', 'N/A')}")
                    print(f"   - 字段数据: {json.dumps(record.get('fields', {}), ensure_ascii=False, indent=6)}")
                    print()
    
    print("=" * 50)
    print("✨ API调用完成!")


if __name__ == "__main__":
    main()
