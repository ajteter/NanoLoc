#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import pandas as pd
from datetime import datetime
from typing import List, Optional
from config import TranslationConfig

class ExcelMerger:
    """Excel翻译结果合并类"""
    def __init__(self, config: TranslationConfig):
        self.config = config
        self.source_df = None
        self.source_languages = ['en-US']

    def _get_translation_files(self) -> List[str]:
        """获取所有翻译文件"""
        base_name = os.path.splitext(os.path.basename(self.config.input_file))[0]
        dir_path = os.path.dirname(self.config.input_file) or '.'
        files = []
        
        # 获取目录下所有文件
        for file in os.listdir(dir_path):
            if file.startswith(base_name) and file.endswith('.xlsx'):
                if '_20' not in file:  # 排除已经合并的文件
                    full_path = os.path.join(dir_path, file)
                    files.append(full_path)
        
        return files

    def _get_language_code(self, filename: str) -> Optional[str]:
        """从文件名中提取语言代码"""
        base_name = os.path.splitext(os.path.basename(self.config.input_file))[0]
        file_base = os.path.splitext(os.path.basename(filename))[0]
        
        if file_base == base_name:  # 原始文件
            return None
            
        lang_code = file_base[len(base_name) + 1:]  # +1 for underscore
        return lang_code

    def merge_translations(self) -> None:
        """合并所有翻译文件"""
        try:
            # 获取所有翻译文件
            translation_files = self._get_translation_files()
            if not translation_files:
                raise Exception("No translation files found")
                
            print(f"\nFound {len(translation_files)} translation files")
            
            # 读取原始文件作为基础
            self.source_df = pd.read_excel(self.config.input_file, engine='openpyxl')
            result_df = self.source_df.copy()
            
            # 合并每个翻译文件
            for file in translation_files:
                lang_code = self._get_language_code(file)
                if not lang_code:  # 跳过原始文件
                    continue
                    
                print(f"Processing translations for {lang_code}")
                try:
                    # 读取翻译文件
                    trans_df = pd.read_excel(file, engine='openpyxl')
                    # 只复制目标语言列
                    if lang_code in trans_df.columns:
                        result_df[lang_code] = trans_df[lang_code]
                except Exception as e:
                    print(f"Error processing {file}: {e}")
                    continue
            
            # 生成输出文件名
            current_date = datetime.now().strftime('%Y%m%d')
            output_file = f"{os.path.splitext(self.config.input_file)[0]}_{current_date}.xlsx"
            
            # 保存合并结果
            result_df.to_excel(output_file, index=False, engine='openpyxl')
            print(f"\nSuccessfully merged translations to: {output_file}")
            
        except Exception as e:
            raise Exception(f"Error merging translations: {e}")
