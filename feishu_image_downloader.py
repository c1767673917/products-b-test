#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
飞书多维表格图片下载器
用于下载表格中的图片文件
"""

import requests
import json
import os
import time
from urllib.parse import urlparse
from typing import List, Dict, Any, Optional
import pandas as pd

class FeishuImageDownloader:
    """飞书多维表格图片下载器"""
    
    def __init__(self, app_id: str, app_secret: str):
        """初始化下载器"""
        self.app_id = app_id
        self.app_secret = app_secret
        self.base_url = "https://open.feishu.cn"
        self.access_token = None
        self.token_expires_at = 0
        self.session = requests.Session()
        
    def get_tenant_access_token(self) -> Optional[str]:
        """获取租户访问凭证"""
        if self.access_token and time.time() < self.token_expires_at:
            return self.access_token
            
        url = f"{self.base_url}/open-apis/auth/v3/tenant_access_token/internal"
        headers = {'Content-Type': 'application/json; charset=utf-8'}
        data = {"app_id": self.app_id, "app_secret": self.app_secret}
        
        try:
            response = self.session.post(url, headers=headers, json=data)
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
    
    def extract_image_info(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """从记录中提取图片信息"""
        image_info_list = []
        
        # 定义图片字段
        image_fields = ['正面图片', '背面图片', '标签照片', '外包装图片', '赠品图片']
        
        for record in records:
            record_id = record.get('record_id', '')
            fields = record.get('fields', {})
            
            # 获取产品基本信息
            product_name = fields.get('品名', '未知产品')
            sequence_no = fields.get('序号', [{}])
            if isinstance(sequence_no, list) and len(sequence_no) > 0:
                sequence_no = sequence_no[0].get('text', '未知序号')
            else:
                sequence_no = str(sequence_no) if sequence_no else '未知序号'
            
            # 遍历所有图片字段
            for field_name in image_fields:
                if field_name in fields and fields[field_name]:
                    images = fields[field_name]
                    if isinstance(images, list):
                        for i, image in enumerate(images):
                            if isinstance(image, dict):
                                image_info = {
                                    'record_id': record_id,
                                    'product_name': product_name,
                                    'sequence_no': sequence_no,
                                    'field_name': field_name,
                                    'image_index': i,
                                    'file_token': image.get('file_token', ''),
                                    'file_name': image.get('name', ''),
                                    'file_size': image.get('size', 0),
                                    'file_type': image.get('type', ''),
                                    'download_url': image.get('url', ''),
                                    'tmp_url': image.get('tmp_url', '')
                                }
                                image_info_list.append(image_info)
        
        print(f"📸 找到 {len(image_info_list)} 个图片文件")
        return image_info_list
    
    def download_image(self, image_info: Dict[str, Any], output_dir: str) -> bool:
        """下载单个图片"""
        access_token = self.get_tenant_access_token()
        if not access_token:
            return False
        
        file_token = image_info['file_token']
        if not file_token:
            print(f"❌ 图片 {image_info['file_name']} 缺少file_token")
            return False
        
        # 构建下载URL
        download_url = f"{self.base_url}/open-apis/drive/v1/medias/{file_token}/download"
        headers = {'Authorization': f'Bearer {access_token}'}
        
        try:
            # 发起下载请求
            response = self.session.get(download_url, headers=headers, stream=True)
            response.raise_for_status()
            
            # 构建文件名
            sequence_no = image_info['sequence_no'].replace('/', '_')
            field_name = image_info['field_name']
            original_name = image_info['file_name']
            
            # 获取文件扩展名
            if original_name:
                _, ext = os.path.splitext(original_name)
            else:
                ext = '.jpg'  # 默认扩展名
            
            # 构建完整文件名
            safe_filename = f"{sequence_no}_{field_name}_{image_info['image_index']}{ext}"
            file_path = os.path.join(output_dir, safe_filename)
            
            # 保存文件
            with open(file_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            
            file_size = os.path.getsize(file_path)
            print(f"✅ 下载成功: {safe_filename} ({file_size} bytes)")
            
            # 更新图片信息
            image_info['local_path'] = file_path
            image_info['download_success'] = True
            
            return True
            
        except requests.exceptions.RequestException as e:
            print(f"❌ 下载失败 {image_info['file_name']}: {e}")
            image_info['download_success'] = False
            image_info['error_message'] = str(e)
            return False
        except Exception as e:
            print(f"❌ 保存文件失败 {image_info['file_name']}: {e}")
            image_info['download_success'] = False
            image_info['error_message'] = str(e)
            return False
    
    def download_all_images(self, records: List[Dict[str, Any]], output_base_dir: str) -> Dict[str, Any]:
        """下载所有图片"""
        # 提取图片信息
        image_info_list = self.extract_image_info(records)
        
        if not image_info_list:
            print("❌ 没有找到图片文件")
            return {'success': 0, 'failed': 0, 'total': 0}
        
        # 创建输出目录
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        output_dir = os.path.join(output_base_dir, f"images_{timestamp}")
        os.makedirs(output_dir, exist_ok=True)
        
        print(f"📁 图片将保存到: {output_dir}")
        
        # 下载图片
        success_count = 0
        failed_count = 0
        
        for i, image_info in enumerate(image_info_list, 1):
            print(f"📥 下载进度: {i}/{len(image_info_list)} - {image_info['file_name']}")
            
            if self.download_image(image_info, output_dir):
                success_count += 1
            else:
                failed_count += 1
            
            # 添加延迟避免请求过快
            time.sleep(0.5)
        
        # 生成下载报告
        report = {
            'total': len(image_info_list),
            'success': success_count,
            'failed': failed_count,
            'output_dir': output_dir,
            'image_info_list': image_info_list
        }
        
        # 保存图片信息到CSV
        df = pd.DataFrame(image_info_list)
        csv_path = os.path.join(output_dir, 'image_download_report.csv')
        df.to_csv(csv_path, index=False, encoding='utf-8-sig')
        
        # 生成下载报告
        self.generate_download_report(report, output_dir)
        
        print(f"\n📊 下载完成统计:")
        print(f"   总计: {report['total']} 个文件")
        print(f"   成功: {report['success']} 个文件")
        print(f"   失败: {report['failed']} 个文件")
        print(f"   成功率: {(success_count/len(image_info_list)*100):.1f}%")
        
        return report
    
    def generate_download_report(self, report: Dict[str, Any], output_dir: str):
        """生成下载报告"""
        report_path = os.path.join(output_dir, 'download_report.txt')
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write("飞书多维表格图片下载报告\n")
            f.write("=" * 50 + "\n\n")
            
            f.write(f"📊 下载统计\n")
            f.write(f"总文件数: {report['total']}\n")
            f.write(f"成功下载: {report['success']}\n")
            f.write(f"下载失败: {report['failed']}\n")
            f.write(f"成功率: {(report['success']/report['total']*100):.1f}%\n\n")
            
            # 按字段类型统计
            f.write(f"📸 按图片类型统计\n")
            field_stats = {}
            for img in report['image_info_list']:
                field_name = img['field_name']
                if field_name not in field_stats:
                    field_stats[field_name] = {'total': 0, 'success': 0}
                field_stats[field_name]['total'] += 1
                if img.get('download_success', False):
                    field_stats[field_name]['success'] += 1
            
            for field_name, stats in field_stats.items():
                success_rate = (stats['success'] / stats['total'] * 100) if stats['total'] > 0 else 0
                f.write(f"{field_name}: {stats['success']}/{stats['total']} ({success_rate:.1f}%)\n")
            
            f.write(f"\n📁 文件保存位置\n")
            f.write(f"目录: {output_dir}\n")
            
            # 失败文件列表
            failed_files = [img for img in report['image_info_list'] if not img.get('download_success', False)]
            if failed_files:
                f.write(f"\n❌ 下载失败的文件\n")
                for img in failed_files:
                    f.write(f"- {img['file_name']} ({img.get('error_message', '未知错误')})\n")


def main():
    """主函数"""
    # 配置信息
    APP_ID = "cli_a8e575c35763d013"
    APP_SECRET = "41VyUJHWqFBoiOr5dOwgqctKwSn1RqWf"
    
    print("🖼️ 开始下载飞书多维表格中的图片...")
    print("=" * 60)
    
    # 查找最新的数据文件
    data_dirs = [d for d in os.listdir('.') if d.startswith('feishu_data_') and os.path.isdir(d)]
    if not data_dirs:
        print("❌ 未找到数据目录，请先运行 feishu_data_analyzer.py")
        return
    
    latest_dir = sorted(data_dirs)[-1]
    json_path = os.path.join(latest_dir, 'raw_data.json')
    
    if not os.path.exists(json_path):
        print(f"❌ 未找到数据文件: {json_path}")
        return
    
    print(f"📂 使用数据文件: {json_path}")
    
    # 加载数据
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            records = json.load(f)
        print(f"✅ 成功加载 {len(records)} 条记录")
    except Exception as e:
        print(f"❌ 加载数据失败: {e}")
        return
    
    # 创建下载器
    downloader = FeishuImageDownloader(APP_ID, APP_SECRET)
    
    # 下载图片
    report = downloader.download_all_images(records, latest_dir)
    
    print("\n✨ 图片下载完成!")


if __name__ == "__main__":
    main()
