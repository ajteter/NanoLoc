#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import pandas as pd
from typing import Optional
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed

from config import TranslationConfig
from translation_service import TranslationService
from concurrent_processor import ConcurrentProcessor

class ExcelProcessor:
    """Excel处理类"""
    def __init__(self, config: TranslationConfig):
        self.config = config
        self.df = None
        self.source_languages = ['en-US']
        
    def load_excel(self) -> None:
        """加载Excel文件"""
        try:
            self.df = pd.read_excel(self.config.input_file, engine='openpyxl')
            print(f"Successfully loaded {self.config.input_file}")
        except Exception as e:
            raise Exception(f"Error loading Excel file: {e}")

    def get_source_text(self, row: pd.Series) -> Optional[str]:
        """获取源文本"""
        if pd.notna(row['en-US']) and row['en-US']:
            return str(row['en-US'])
        return None

    def process_translations(self, translation_service: TranslationService) -> None:
        """处理翻译任务，使用并发处理提高效率"""
        if self.df is None:
            raise Exception("Excel file not loaded")

        # 获取需要翻译的目标语言
        target_languages = self.config.target_languages if self.config.target_languages else [
            col for col in self.df.columns if col not in self.source_languages
        ]
        
        # 显示总体进度
        print(f"\nFound {len(target_languages)} target languages to process")
        
        # 初始化并发处理器
        processor = ConcurrentProcessor(self.config, translation_service)
        
        # 使用线程池处理每种语言的翻译
        with ThreadPoolExecutor(max_workers=self.config.max_workers) as executor:
            futures = []
            
            # 提交翻译任务
            for target_lang in target_languages:
                print(f"\nSubmitting translation task for {target_lang}")
                future = executor.submit(processor.process_language, self.df, target_lang)
                futures.append((target_lang, future))
            
            # 处理完成的任务
            for target_lang, future in tqdm(futures, desc="Processing languages", unit="lang"):
                try:
                    result_df = future.result()
                    if result_df is not None:  # 如果翻译成功
                        processor.save_language_file(result_df, target_lang)
                    else:  # 如果翻译失败，创建空文件
                        empty_df = self.df.copy()
                        processor.save_language_file(empty_df, target_lang)
                except Exception as e:
                    print(f"Error processing {target_lang}: {e}")
                    # 创建空文件
                    empty_df = self.df.copy()
                    processor.save_language_file(empty_df, target_lang)
                    continue  # 继续处理其他语言
