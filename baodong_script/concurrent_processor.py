#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import time
import pandas as pd
from typing import Optional, List
from datetime import datetime

from config import TranslationConfig
from translation_service import TranslationService

class ConcurrentProcessor:
    """并发处理类"""
    def __init__(self, config: TranslationConfig, translation_service: TranslationService):
        self.config = config
        self.translation_service = translation_service

    def process_language(self, df: pd.DataFrame, target_lang: str) -> Optional[pd.DataFrame]:
        """处理单个语言的翻译"""
        result_df = pd.DataFrame()
        texts_to_translate = []
        indices_to_update = []
        
        # 收集需要翻译的文本
        for index, row in df.iterrows():
            if pd.notna(row['en-US']):  # 不判断是否为空，直接获取所有文本
                texts_to_translate.append(str(row['en-US']))
                indices_to_update.append(index)
                result_df.at[index, 'en-US'] = row['en-US']  # 只保留源语言列

        # 如果没有需要翻译的文本，返回空DataFrame
        if not texts_to_translate:
            return result_df

        # 使用分批处理
        batch_size = min(30, self.config.batch_size)  # 限制每批最大数量为30
        total_batches = (len(texts_to_translate) - 1) // batch_size + 1
        
        for i in range(0, len(texts_to_translate), batch_size):
            batch_texts = texts_to_translate[i:i + batch_size]
            batch_indices = indices_to_update[i:i + batch_size]
            
            # 翻译重试机制
            retry_success = False
            for attempt in range(self.config.retry_attempts):
                try:
                    print(f"\nProcessing batch {i//batch_size + 1}/{total_batches} for {target_lang}")
                    print(f"Batch size: {len(batch_texts)}, Attempt: {attempt + 1}")
                    
                    translations = self.translation_service.batch_translate(batch_texts, target_lang)
                    # 更新翻译结果
                    for idx, trans in zip(batch_indices, translations):
                        result_df.at[idx, target_lang] = trans if trans else "异常"
                    retry_success = True
                    break
                except Exception as e:
                    if attempt == self.config.retry_attempts - 1:  # 最后一次重试失败
                        print(f"Error in batch translation for {target_lang}: {e}")
                        # 最后一次重试失败，填充"异常"
                        for idx in batch_indices:
                            result_df.at[idx, target_lang] = "异常"
                    else:
                        print(f"Retry {attempt + 1} for {target_lang}")
                        # 根据配置计算等待时间
                        delay = self.config.retry_delay_base * (attempt + 1) if self.config.retry_delay_increment else self.config.retry_delay_base
                        time.sleep(delay)

        return result_df

    def save_language_file(self, df: pd.DataFrame, target_lang: str) -> None:
        """保存单个语言的翻译结果，只保存源语言和目标语言列"""
        # 只保留源语言和目标语言列
        columns_to_keep = ['en-US', target_lang]
        output_df = df[columns_to_keep]
        
        # 保存到文件
        output_file = f"{os.path.splitext(self.config.input_file)[0]}_{target_lang}.xlsx"
        output_df.to_excel(output_file, index=False, engine='openpyxl')
        print(f"Saved translations for {target_lang} to {output_file}")
