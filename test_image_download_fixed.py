#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试修复后的图片下载功能
"""

import json
import os
from feishu_image_downloader import FeishuImageDownloader

def test_download():
    """测试下载功能"""
    # 配置信息
    APP_ID = "cli_a8fa1d87c3fad00d"
    APP_SECRET = "CDfRPlOw8VRQrPyLnpzNvd5wBmu6wROp"
    
    print("🧪 测试修复后的图片下载功能...")
    print("=" * 60)
    
    # 查找最新的数据文件
    data_dirs = [d for d in os.listdir('.') if d.startswith('feishu_data_') and os.path.isdir(d)]
    if not data_dirs:
        print("❌ 未找到数据目录")
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
            all_records = json.load(f)
        print(f"✅ 成功加载 {len(all_records)} 条记录")
    except Exception as e:
        print(f"❌ 加载数据失败: {e}")
        return
    
    # 只取前3条有图片的记录进行测试
    test_records = []
    for record in all_records:
        fields = record.get('fields', {})
        has_image = False
        for field_name in ['正面图片', '背面图片', '标签照片', '外包装图片', '赠品图片']:
            if field_name in fields and fields[field_name]:
                has_image = True
                break
        
        if has_image:
            test_records.append(record)
            if len(test_records) >= 3:  # 只测试3条记录
                break
    
    print(f"🎯 选择 {len(test_records)} 条记录进行测试")
    
    # 创建下载器（使用1个线程，频率限制为每秒2次）
    downloader = FeishuImageDownloader(APP_ID, APP_SECRET, max_workers=1, rate_limit=2.0)
    
    # 设置输出目录
    output_dir = "test_images_fixed"
    os.makedirs(output_dir, exist_ok=True)
    
    # 下载图片
    report = downloader.download_all_images(test_records, output_dir)
    
    print("\n✨ 测试完成!")
    print(f"📊 结果: 成功 {report['success']}/{report['total']}")
    
    # 检查下载的文件
    if report['success'] > 0:
        print("\n📁 检查下载的文件:")
        for filename in os.listdir(output_dir):
            if filename.endswith(('.jpg', '.png', '.jpeg')):
                filepath = os.path.join(output_dir, filename)
                filesize = os.path.getsize(filepath)
                print(f"   {filename}: {filesize} bytes")
                
                # 检查文件是否为有效图片
                if filesize > 1000:  # 大于1KB的文件可能是有效图片
                    print(f"   ✅ {filename} 看起来是有效的图片文件")
                else:
                    print(f"   ❌ {filename} 文件太小，可能损坏")

if __name__ == "__main__":
    test_download()
