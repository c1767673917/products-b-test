#!/usr/bin/env python3
"""
飞书API数据源分析脚本
用于获取飞书多维表格的最新数据结构，分析字段变化
"""

import requests
import json
import time
from typing import Dict, List, Any, Optional

class FeishuAPIClient:
    def __init__(self, app_id: str, app_secret: str):
        self.app_id = app_id
        self.app_secret = app_secret
        self.access_token = None
        self.token_expires_at = 0
        self.base_url = "https://open.feishu.cn/open-apis"
    
    def get_access_token(self) -> str:
        """获取访问令牌"""
        if self.access_token and time.time() < self.token_expires_at:
            return self.access_token
        
        url = f"{self.base_url}/auth/v3/tenant_access_token/internal"
        payload = {
            "app_id": self.app_id,
            "app_secret": self.app_secret
        }
        
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        data = response.json()
        if data.get("code") != 0:
            raise Exception(f"获取访问令牌失败: {data.get('msg')}")
        
        self.access_token = data["tenant_access_token"]
        self.token_expires_at = time.time() + data["expire"] - 300  # 提前5分钟刷新
        
        return self.access_token
    
    def get_headers(self) -> Dict[str, str]:
        """获取请求头"""
        return {
            "Authorization": f"Bearer {self.get_access_token()}",
            "Content-Type": "application/json"
        }
    
    def get_table_fields(self, app_token: str, table_id: str) -> List[Dict]:
        """获取表格字段信息"""
        url = f"{self.base_url}/bitable/v1/apps/{app_token}/tables/{table_id}/fields"
        
        response = requests.get(url, headers=self.get_headers())
        response.raise_for_status()
        
        data = response.json()
        if data.get("code") != 0:
            raise Exception(f"获取表格字段失败: {data.get('msg')}")
        
        return data["data"]["items"]
    
    def get_table_records(self, app_token: str, table_id: str, page_size: int = 100) -> List[Dict]:
        """获取表格记录"""
        all_records = []
        page_token = None

        while True:
            url = f"{self.base_url}/bitable/v1/apps/{app_token}/tables/{table_id}/records"
            params = {"page_size": page_size}
            if page_token:
                params["page_token"] = page_token

            print(f"  正在请求: {url}, 参数: {params}")
            response = requests.get(url, headers=self.get_headers(), params=params)
            response.raise_for_status()

            data = response.json()
            print(f"  响应状态: {data.get('code')}")
            if data.get("code") != 0:
                raise Exception(f"获取表格记录失败: {data.get('msg')}")

            records = data["data"]["items"]
            all_records.extend(records)
            print(f"  本页获取到 {len(records)} 条记录，总计 {len(all_records)} 条")

            # 检查是否有更多页面
            if not data["data"].get("has_more"):
                break

            page_token = data["data"].get("page_token")

        return all_records

def analyze_data_structure(fields: List[Dict], records: List[Dict]) -> Dict[str, Any]:
    """分析数据结构"""
    analysis = {
        "field_count": len(fields),
        "record_count": len(records),
        "fields": {},
        "sample_record": records[0] if records else None,
        "field_types": {},
        "image_fields": []
    }
    
    # 分析字段
    for field in fields:
        field_name = field["field_name"]
        field_type = field["type"]
        field_id = field["field_id"]
        
        analysis["fields"][field_name] = {
            "id": field_id,
            "type": field_type,
            "description": field.get("description", "")
        }
        
        analysis["field_types"][field_type] = analysis["field_types"].get(field_type, 0) + 1
        
        # 识别图片字段 - 类型17是附件类型
        if field_type == 17:  # 附件类型
            analysis["image_fields"].append({
                "name": field_name,
                "id": field_id
            })
    
    return analysis

def compare_with_existing_data(current_analysis: Dict) -> Dict[str, Any]:
    """对比现有数据结构（模拟）"""
    # 这里应该读取现有的数据结构进行对比
    # 目前先返回基本的对比信息
    return {
        "new_fields": [],
        "removed_fields": [],
        "changed_fields": [],
        "field_type_changes": {}
    }

def main():
    # 飞书API凭证
    APP_ID = "cli_a8e575c35763d013"
    APP_SECRET = "41VyUJHWqFBoiOr5dOwgqctKwSn1RqWf"
    APP_TOKEN = "Lf6Ob6BRIaFaQEseCy4ckAPVnFf"
    TABLE_ID = "tblUT2lRAWTKgygO"
    
    print("🚀 开始分析飞书数据源...")
    print("=" * 50)
    
    try:
        # 初始化客户端
        client = FeishuAPIClient(APP_ID, APP_SECRET)
        
        # 获取表格字段
        print("📋 获取表格字段信息...")
        fields = client.get_table_fields(APP_TOKEN, TABLE_ID)
        print(f"✅ 获取到 {len(fields)} 个字段")
        
        # 暂时跳过记录获取，只分析字段结构
        print("📊 跳过记录获取，仅分析字段结构...")
        records = []
        
        # 分析数据结构
        print("🔍 分析数据结构...")
        analysis = analyze_data_structure(fields, records)
        
        # 输出分析结果
        print("\n📈 数据结构分析结果:")
        print("=" * 50)
        print(f"字段总数: {analysis['field_count']}")
        print(f"记录总数: {analysis['record_count']}")
        print(f"图片字段数: {len(analysis['image_fields'])}")
        
        print("\n📝 字段类型分布:")
        for field_type, count in analysis['field_types'].items():
            print(f"  类型 {field_type}: {count} 个字段")
        
        print("\n🖼️ 图片字段:")
        for img_field in analysis['image_fields']:
            print(f"  - {img_field['name']} (ID: {img_field['id']})")
        
        print("\n📋 所有字段列表:")
        for field_name, field_info in analysis['fields'].items():
            print(f"  - {field_name} (类型: {field_info['type']}, ID: {field_info['id']})")
        
        # 保存分析结果
        output_file = "feishu_data_analysis.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(analysis, f, ensure_ascii=False, indent=2)
        
        print(f"\n💾 分析结果已保存到: {output_file}")
        
        # 显示示例记录
        if analysis['sample_record']:
            print("\n📄 示例记录结构:")
            sample_fields = analysis['sample_record'].get('fields', {})
            for field_id, value in list(sample_fields.items())[:5]:  # 只显示前5个字段
                # 查找字段名
                field_name = "未知字段"
                for name, info in analysis['fields'].items():
                    if info['id'] == field_id:
                        field_name = name
                        break
                print(f"  - {field_name}: {str(value)[:100]}...")
        
        print("\n✅ 飞书数据源分析完成!")
        
    except Exception as e:
        print(f"❌ 分析失败: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
