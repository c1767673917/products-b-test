#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
飞书多维表格数据分析器
用于获取、分析和导出飞书多维表格数据
"""

import requests
import json
import time
import pandas as pd
from datetime import datetime
from typing import Optional, Dict, Any, List
import os

class FeishuDataAnalyzer:
    """飞书多维表格数据分析器"""
    
    def __init__(self, app_id: str, app_secret: str):
        """初始化分析器"""
        self.app_id = app_id
        self.app_secret = app_secret
        self.base_url = "https://open.feishu.cn"
        self.access_token = None
        self.token_expires_at = 0
    
    def get_tenant_access_token(self) -> Optional[str]:
        """获取租户访问凭证"""
        if self.access_token and time.time() < self.token_expires_at:
            return self.access_token
            
        url = f"{self.base_url}/open-apis/auth/v3/tenant_access_token/internal"
        headers = {'Content-Type': 'application/json; charset=utf-8'}
        data = {"app_id": self.app_id, "app_secret": self.app_secret}
        
        try:
            response = requests.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            result = response.json()
            if result.get('code') == 0:
                self.access_token = result['tenant_access_token']
                self.token_expires_at = time.time() + result.get('expire', 7200) - 300
                return self.access_token
            else:
                print(f"❌ 获取访问凭证失败: {result.get('msg', '未知错误')}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"❌ 请求错误: {e}")
            return None
    
    def get_all_records(self, app_token: str, table_id: str) -> List[Dict[str, Any]]:
        """获取表格中的所有记录（支持分页）"""
        access_token = self.get_tenant_access_token()
        if not access_token:
            return []
            
        all_records = []
        page_token = None
        page_size = 500  # 最大页面大小
        
        while True:
            url = f"{self.base_url}/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records"
            headers = {'Authorization': f'Bearer {access_token}'}
            params = {'page_size': page_size}
            
            if page_token:
                params['page_token'] = page_token
            
            try:
                response = requests.get(url, headers=headers, params=params)
                response.raise_for_status()
                
                data = response.json()
                if data.get('code') == 0:
                    records = data['data']['items']
                    all_records.extend(records)
                    
                    # 检查是否还有更多页面
                    if data['data'].get('has_more'):
                        page_token = data['data'].get('page_token')
                        print(f"📄 已获取 {len(all_records)} 条记录，继续获取...")
                    else:
                        break
                else:
                    print(f"❌ 获取记录失败: {data.get('msg', '未知错误')}")
                    break
                    
            except requests.exceptions.RequestException as e:
                print(f"❌ 请求错误: {e}")
                break
        
        print(f"✅ 总共获取到 {len(all_records)} 条记录")
        return all_records
    
    def flatten_record_data(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """将记录数据扁平化，便于分析"""
        flattened_records = []
        
        for record in records:
            flat_record = {'record_id': record.get('record_id')}
            fields = record.get('fields', {})
            
            for field_name, field_value in fields.items():
                # 处理不同类型的字段值
                if isinstance(field_value, list):
                    if len(field_value) > 0:
                        if isinstance(field_value[0], dict):
                            # 处理复杂对象列表（如图片、链接等）
                            if 'text' in field_value[0]:
                                flat_record[field_name] = field_value[0]['text']
                            elif 'name' in field_value[0]:
                                flat_record[field_name] = field_value[0]['name']
                            else:
                                flat_record[field_name] = str(field_value[0])
                        else:
                            # 处理简单值列表
                            flat_record[field_name] = ', '.join(map(str, field_value))
                    else:
                        flat_record[field_name] = ''
                elif isinstance(field_value, dict):
                    # 处理字典类型（如链接）
                    if 'text' in field_value:
                        flat_record[field_name] = field_value['text']
                    elif 'link' in field_value:
                        flat_record[field_name] = field_value['link']
                    else:
                        flat_record[field_name] = str(field_value)
                else:
                    # 处理简单类型
                    flat_record[field_name] = field_value
            
            flattened_records.append(flat_record)
        
        return flattened_records
    
    def analyze_data(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """分析数据并生成统计信息"""
        if not records:
            return {}

        df = pd.DataFrame(records)
        analysis = {
            'total_records': len(records),
            'columns': list(df.columns),
            'column_count': len(df.columns),
            'data_types': {k: str(v) for k, v in df.dtypes.to_dict().items()},
            'missing_values': {k: int(v) for k, v in df.isnull().sum().to_dict().items()},
            'unique_values': {}
        }
        
        # 分析分类字段的唯一值
        categorical_fields = ['品类一级', '品类二级', '采集平台', '产地（省）', '产地（市）', '单混']
        for field in categorical_fields:
            if field in df.columns:
                analysis['unique_values'][field] = df[field].value_counts().to_dict()
        
        # 价格分析
        price_fields = ['正常售价', '优惠到手价']
        for field in price_fields:
            if field in df.columns:
                # 转换为数值类型
                numeric_values = pd.to_numeric(df[field], errors='coerce').dropna()
                if len(numeric_values) > 0:
                    analysis[f'{field}_stats'] = {
                        'count': len(numeric_values),
                        'mean': round(numeric_values.mean(), 2),
                        'median': round(numeric_values.median(), 2),
                        'min': round(numeric_values.min(), 2),
                        'max': round(numeric_values.max(), 2)
                    }
        
        return analysis
    
    def save_to_files(self, records: List[Dict[str, Any]], analysis: Dict[str, Any], 
                     app_token: str) -> None:
        """保存数据到文件"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 创建输出目录
        output_dir = f"feishu_data_{timestamp}"
        os.makedirs(output_dir, exist_ok=True)
        
        # 保存原始JSON数据
        with open(f"{output_dir}/raw_data.json", 'w', encoding='utf-8') as f:
            json.dump(records, f, ensure_ascii=False, indent=2)
        
        # 保存扁平化数据为CSV
        flattened_data = self.flatten_record_data(records)
        df = pd.DataFrame(flattened_data)
        df.to_csv(f"{output_dir}/data.csv", index=False, encoding='utf-8-sig')
        
        # 保存分析报告
        with open(f"{output_dir}/analysis_report.json", 'w', encoding='utf-8') as f:
            json.dump(analysis, f, ensure_ascii=False, indent=2)
        
        # 生成可读的分析报告
        self.generate_readable_report(analysis, f"{output_dir}/analysis_report.txt")
        
        print(f"📁 数据已保存到目录: {output_dir}")
        print(f"   📄 raw_data.json - 原始JSON数据")
        print(f"   📊 data.csv - 扁平化CSV数据")
        print(f"   📈 analysis_report.json - 分析报告(JSON)")
        print(f"   📝 analysis_report.txt - 分析报告(可读)")
    
    def generate_readable_report(self, analysis: Dict[str, Any], filepath: str) -> None:
        """生成可读的分析报告"""
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write("飞书多维表格数据分析报告\n")
            f.write("=" * 50 + "\n\n")
            
            f.write(f"📊 基本统计信息\n")
            f.write(f"总记录数: {analysis.get('total_records', 0)}\n")
            f.write(f"字段数量: {analysis.get('column_count', 0)}\n\n")
            
            f.write(f"📋 字段列表\n")
            for i, col in enumerate(analysis.get('columns', []), 1):
                f.write(f"{i:2d}. {col}\n")
            f.write("\n")
            
            # 分类字段统计
            f.write(f"🏷️ 分类字段统计\n")
            for field, values in analysis.get('unique_values', {}).items():
                f.write(f"\n{field}:\n")
                for value, count in values.items():
                    f.write(f"  - {value}: {count}条\n")
            
            # 价格统计
            f.write(f"\n💰 价格统计\n")
            for key, stats in analysis.items():
                if key.endswith('_stats'):
                    field_name = key.replace('_stats', '')
                    f.write(f"\n{field_name}:\n")
                    f.write(f"  - 有效数据: {stats['count']}条\n")
                    f.write(f"  - 平均价格: ¥{stats['mean']}\n")
                    f.write(f"  - 中位数: ¥{stats['median']}\n")
                    f.write(f"  - 最低价: ¥{stats['min']}\n")
                    f.write(f"  - 最高价: ¥{stats['max']}\n")


def main():
    """主函数"""
    # 配置信息
    APP_ID = "cli_a8e575c35763d013"
    APP_SECRET = "41VyUJHWqFBoiOr5dOwgqctKwSn1RqWf"
    APP_TOKEN = "S5yvbq5txacTZOsHGszc3RpDn4f"
    TABLE_ID = "tblyBL4HSF2GqSi4"
    
    print("🚀 开始飞书多维表格数据分析...")
    print("=" * 60)
    
    # 创建分析器
    analyzer = FeishuDataAnalyzer(APP_ID, APP_SECRET)
    
    # 获取所有记录
    print("\n📥 获取数据...")
    records = analyzer.get_all_records(APP_TOKEN, TABLE_ID)
    
    if records:
        # 分析数据
        print("\n📊 分析数据...")
        analysis = analyzer.analyze_data(analyzer.flatten_record_data(records))
        
        # 显示简要分析结果
        print(f"\n📈 分析结果概览:")
        print(f"   总记录数: {analysis.get('total_records', 0)}")
        print(f"   字段数量: {analysis.get('column_count', 0)}")
        
        # 保存数据
        print("\n💾 保存数据...")
        analyzer.save_to_files(records, analysis, APP_TOKEN)
        
        print("\n✨ 数据分析完成!")
    else:
        print("❌ 未能获取到数据")


if __name__ == "__main__":
    main()
