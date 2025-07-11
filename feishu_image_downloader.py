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
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

class FeishuImageDownloader:
    """飞书多维表格图片下载器"""
    
    def __init__(self, app_id: str, app_secret: str, max_workers: int = 2, rate_limit: float = 3.0):
        """初始化下载器"""
        self.app_id = app_id
        self.app_secret = app_secret
        self.max_workers = max_workers  # 降低并发数避免API限制
        self.rate_limit = rate_limit  # 每秒最大请求数
        self.min_interval = 1.0 / rate_limit  # 最小请求间隔
        self.base_url = "https://open.feishu.cn"
        self.access_token = None
        self.token_expires_at = 0
        self.session = requests.Session()
        self.download_lock = threading.Lock()
        self.rate_limit_lock = threading.Lock()
        self.last_request_time = 0
        self.progress_count = 0
        self.retry_delay = 2  # 重试延迟
        self.max_retries = 3  # 最大重试次数
        
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

    def wait_for_rate_limit(self):
        """等待以满足频率限制"""
        with self.rate_limit_lock:
            current_time = time.time()
            time_since_last = current_time - self.last_request_time

            if time_since_last < self.min_interval:
                sleep_time = self.min_interval - time_since_last
                print(f"⏱️  频率限制等待 {sleep_time:.2f}s (每秒最多{self.rate_limit}次请求)")
                time.sleep(sleep_time)

            self.last_request_time = time.time()

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
            # 使用编号字段作为文件命名基础
            product_id = fields.get('编号', '未知编号')
            if not product_id or product_id == '未知编号':
                # 如果编号字段为空，尝试使用序号字段作为备用
                sequence_no = fields.get('序号', [{}])
                if isinstance(sequence_no, list) and len(sequence_no) > 0:
                    product_id = sequence_no[0].get('text', '未知编号')
                else:
                    product_id = str(sequence_no) if sequence_no else '未知编号'
            
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
                                    'product_id': product_id,  # 使用编号字段
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
    
    def get_real_download_url(self, file_token: str, tmp_url: str) -> Optional[str]:
        """获取真实的下载链接"""
        access_token = self.get_tenant_access_token()
        if not access_token:
            return None

        headers = {'Authorization': f'Bearer {access_token}'}

        try:
            # 使用批量获取临时下载链接的API
            api_url = f"{self.base_url}/open-apis/drive/v1/medias/batch_get_tmp_download_url"
            params = {
                'file_tokens': file_token,
                'extra': f'{{"bitablePerm":{{"tableId":"tblwdwrZMikMRyxq","rev":2778}}}}'
            }

            print(f"🔗 获取下载链接: {api_url}")
            response = self.session.get(api_url, headers=headers, params=params)
            response.raise_for_status()

            result = response.json()
            if result.get('code') == 0:
                tmp_download_urls = result.get('data', {}).get('tmp_download_urls', [])
                if tmp_download_urls and len(tmp_download_urls) > 0:
                    real_url = tmp_download_urls[0].get('tmp_download_url', '')
                    if real_url:
                        print(f"✅ 获取到真实下载链接: {real_url[:100]}...")
                        return real_url

            print(f"❌ 获取下载链接失败: {result}")
            return None

        except Exception as e:
            print(f"❌ 获取下载链接异常: {e}")
            return None

    def download_image(self, image_info: Dict[str, Any], output_dir: str) -> bool:
        """下载单个图片"""
        # 应用频率限制
        self.wait_for_rate_limit()

        access_token = self.get_tenant_access_token()
        if not access_token:
            return False

        # 获取真实的下载链接
        file_token = image_info.get('file_token', '')
        tmp_url = image_info.get('tmp_url', '')

        if not file_token:
            print(f"❌ 图片 {image_info['file_name']} 缺少 file_token")
            return False

        # 获取真实下载链接
        real_download_url = self.get_real_download_url(file_token, tmp_url)
        if not real_download_url:
            print(f"❌ 无法获取图片 {image_info['file_name']} 的下载链接")
            return False

        # 不需要Authorization头，因为真实下载链接已经包含了认证信息
        headers = {}

        try:
            # 发起下载请求
            print(f"📥 开始下载: {image_info['file_name']}")
            response = self.session.get(real_download_url, headers=headers, stream=True)
            response.raise_for_status()

            # 构建文件名
            product_id = image_info['product_id'].replace('/', '_')  # 使用编号字段
            field_name = image_info['field_name']
            original_name = image_info['file_name']

            # 获取文件扩展名
            if original_name:
                _, ext = os.path.splitext(original_name)
            else:
                ext = '.jpg'  # 默认扩展名

            # 构建完整文件名 - 使用编号字段作为文件名前缀
            safe_filename = f"{product_id}_{field_name}_{image_info['image_index']}{ext}"
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
            # 获取更详细的错误信息
            error_detail = str(e)
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_json = e.response.json()
                    error_detail = f"{e} - 响应: {error_json}"
                except:
                    error_detail = f"{e} - 状态码: {e.response.status_code}"

            print(f"❌ 下载失败 {image_info['file_name']}: {error_detail}")
            image_info['download_success'] = False
            image_info['error_message'] = error_detail
            return False
        except Exception as e:
            print(f"❌ 保存文件失败 {image_info['file_name']}: {e}")
            image_info['download_success'] = False
            image_info['error_message'] = str(e)
            return False
    
    def download_single_image_thread(self, image_info: Dict[str, Any], output_dir: str, total_count: int) -> bool:
        """单个图片下载的线程函数"""
        # 频率限制已在 download_image 方法中实现
        success = self.download_image(image_info, output_dir)

        with self.download_lock:
            self.progress_count += 1
            print(f"📥 下载进度: {self.progress_count}/{total_count} - {image_info['file_name']} {'✅' if success else '❌'}")

        return success

    def download_all_images(self, records: List[Dict[str, Any]], output_base_dir: str, create_timestamp_dir: bool = False) -> Dict[str, Any]:
        """下载所有图片（多线程版本）"""
        # 提取图片信息
        image_info_list = self.extract_image_info(records)

        if not image_info_list:
            print("❌ 没有找到图片文件")
            return {'success': 0, 'failed': 0, 'total': 0}

        # 根据参数决定是否创建时间戳子目录
        if create_timestamp_dir:
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            output_dir = os.path.join(output_base_dir, f"images_{timestamp}")
        else:
            output_dir = output_base_dir
        os.makedirs(output_dir, exist_ok=True)

        print(f"📁 图片将保存到: {output_dir}")
        print(f"🚀 使用 {self.max_workers} 个线程并行下载，频率限制: 每秒最多{self.rate_limit}次请求...")

        # 重置进度计数器
        self.progress_count = 0

        # 使用线程池下载图片
        success_count = 0
        failed_count = 0

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # 提交所有下载任务
            future_to_image = {
                executor.submit(self.download_single_image_thread, image_info, output_dir, len(image_info_list)): image_info
                for image_info in image_info_list
            }

            # 收集结果
            for future in as_completed(future_to_image):
                if future.result():
                    success_count += 1
                else:
                    failed_count += 1
        
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
    
    # 创建下载器（使用3个线程，频率限制为每秒3次）
    downloader = FeishuImageDownloader(APP_ID, APP_SECRET, max_workers=3, rate_limit=3.0)
    
    # 设置输出目录为product-showcase/public/images
    output_dir = "product-showcase/public/images"
    os.makedirs(output_dir, exist_ok=True)

    # 下载图片
    report = downloader.download_all_images(records, output_dir)
    
    print("\n✨ 图片下载完成!")


def download_missing_images():
    """补充下载缺失的图片"""
    # 配置信息
    APP_ID = "cli_a8fa1d87c3fad00d"
    APP_SECRET = "CDfRPlOw8VRQrPyLnpzNvd5wBmu6wROp"

    print("🔄 开始补充下载缺失的图片...")
    print("=" * 60)

    # 读取缺失图片列表
    missing_csv_path = "product-showcase/src/data/missing_images.csv"
    if not os.path.exists(missing_csv_path):
        print(f"❌ 未找到缺失图片列表: {missing_csv_path}")
        print("请先运行图片状态分析脚本")
        return

    # 读取缺失图片数据
    try:
        missing_df = pd.read_csv(missing_csv_path)
        print(f"📋 发现 {len(missing_df)} 个缺失的图片")
    except Exception as e:
        print(f"❌ 读取缺失图片列表失败: {e}")
        return

    # 查找最新的原始数据文件
    data_dirs = [d for d in os.listdir('.') if d.startswith('feishu_data_') and os.path.isdir(d)]
    if not data_dirs:
        print("❌ 未找到数据目录，请先运行 feishu_data_analyzer.py")
        return

    latest_dir = sorted(data_dirs)[-1]
    json_path = os.path.join(latest_dir, 'raw_data.json')

    if not os.path.exists(json_path):
        print(f"❌ 未找到数据文件: {json_path}")
        return

    # 加载原始数据
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            all_records = json.load(f)
        print(f"✅ 成功加载 {len(all_records)} 条原始记录")
    except Exception as e:
        print(f"❌ 加载原始数据失败: {e}")
        return

    # 创建产品ID到记录的映射
    product_id_to_record = {}
    for record in all_records:
        fields = record.get('fields', {})
        product_id = fields.get('编号')
        if product_id:
            product_id_to_record[product_id] = record

    # 筛选需要下载的记录
    records_to_download = []
    missing_product_ids = set(missing_df['ProductID'].unique())

    for product_id in missing_product_ids:
        if product_id in product_id_to_record:
            records_to_download.append(product_id_to_record[product_id])

    print(f"🎯 找到 {len(records_to_download)} 个产品需要补充下载图片")

    if not records_to_download:
        print("✅ 没有需要补充下载的图片")
        return

    # 创建下载器（使用保守的设置：1个线程，频率限制为每秒3次）
    downloader = FeishuImageDownloader(APP_ID, APP_SECRET, max_workers=1, rate_limit=3.0)

    # 设置输出目录
    output_dir = "product-showcase/public/images"
    os.makedirs(output_dir, exist_ok=True)

    # 下载图片
    print(f"🚀 开始下载，使用1个线程，频率限制每秒3次...")
    report = downloader.download_all_images(records_to_download, output_dir)

    print("\n✨ 缺失图片补充下载完成!")
    return report


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "missing":
        download_missing_images()
    else:
        main()
