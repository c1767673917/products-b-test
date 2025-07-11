#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试飞书图片下载功能
用于验证修复后的下载器是否正常工作
"""

import json
import os
from feishu_image_downloader import FeishuImageDownloader

def test_single_image_download():
    """测试单个图片下载"""
    # 配置信息
    APP_ID = "cli_a8fa1d87c3fad00d"
    APP_SECRET = "CDfRPlOw8VRQrPyLnpzNvd5wBmu6wROp"
    
    print("🧪 开始测试图片下载功能...")
    print("=" * 50)
    
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
            records = json.load(f)
        print(f"✅ 成功加载 {len(records)} 条记录")
    except Exception as e:
        print(f"❌ 加载数据失败: {e}")
        return
    
    # 创建下载器
    downloader = FeishuImageDownloader(APP_ID, APP_SECRET)
    
    # 提取图片信息
    image_info_list = downloader.extract_image_info(records)
    
    if not image_info_list:
        print("❌ 没有找到图片文件")
        return
    
    print(f"📸 找到 {len(image_info_list)} 个图片文件")
    
    # 测试前3个图片的下载
    test_count = min(3, len(image_info_list))
    print(f"🧪 测试下载前 {test_count} 个图片...")
    
    # 创建测试输出目录
    test_output_dir = "test_images"
    os.makedirs(test_output_dir, exist_ok=True)
    
    success_count = 0
    for i in range(test_count):
        image_info = image_info_list[i]
        print(f"\n📥 测试 {i+1}/{test_count}: {image_info['file_name']}")
        print(f"   产品: {image_info['product_name']}")
        print(f"   字段: {image_info['field_name']}")
        print(f"   文件令牌: {image_info['file_token'][:20]}...")
        
        # 检查下载链接
        download_url = image_info.get('download_url', '')
        tmp_url = image_info.get('tmp_url', '')
        
        print(f"   下载链接存在: {'✅' if download_url else '❌'}")
        print(f"   临时链接存在: {'✅' if tmp_url else '❌'}")
        
        if downloader.download_image(image_info, test_output_dir):
            success_count += 1
            print(f"   结果: ✅ 下载成功")
        else:
            print(f"   结果: ❌ 下载失败")
    
    print(f"\n📊 测试结果:")
    print(f"   测试文件: {test_count}")
    print(f"   成功下载: {success_count}")
    print(f"   失败数量: {test_count - success_count}")
    print(f"   成功率: {(success_count/test_count*100):.1f}%")
    
    if success_count > 0:
        print(f"✅ 修复成功！图片已保存到 {test_output_dir} 目录")
    else:
        print("❌ 仍有问题需要进一步调试")

if __name__ == "__main__":
    test_single_image_download()
