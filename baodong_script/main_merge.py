#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import argparse

from config import TranslationConfig
from merge_excel import ExcelMerger

def check_dependencies():
    """检查必要的依赖是否已安装"""
    try:
        import pandas
        import openpyxl
    except ImportError as e:
        print(f"Error: Missing required dependency - {str(e)}")
        print("Please install required packages using: pip install -r requirements.txt")
        sys.exit(1)

def parse_arguments():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(description='Excel翻译结果合并工具')
    parser.add_argument('--config', type=str, default='config.json',
                      help='配置文件路径 (默认: config.json)')
    parser.add_argument('--input', type=str,
                      help='输入Excel文件路径 (覆盖配置文件中的设置)')
    return parser.parse_args()

def main():
    try:
        # 检查依赖
        check_dependencies()
        
        # 解析命令行参数
        args = parse_arguments()
        
        # 初始化配置
        config = TranslationConfig(args.config)
        if args.input:
            config.input_file = args.input
            
        # 验证输入文件存在
        if not os.path.exists(config.input_file):
            raise FileNotFoundError(f"Input file not found: {config.input_file}")
            
        print(f"Starting merge process...")
        print(f"Input file: {config.input_file}")
        
        # 初始化合并器
        excel_merger = ExcelMerger(config)
        
        # 执行合并
        excel_merger.merge_translations()
        
        print("\nMerge completed successfully!")
        
    except FileNotFoundError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
