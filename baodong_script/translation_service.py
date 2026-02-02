#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re
import requests
import time
from typing import List
from config import TranslationConfig

class TranslationService:
    """翻译服务类"""
    def __init__(self, config: TranslationConfig):
        self.config = config
        self.headers = {
            "Authorization": f"Bearer {config.secret}",
            "Content-Type": "application/json"
        }
        self.system_prompt = """你是一个专业的多语言翻译专家。在处理批量翻译时请注意：
1. 每个文本都必须翻译，保持原有顺序
2. 占位符（如 {name}, %s, %1$s 等）和换行符(\n)保持原样不翻译
3. 标点符号要符合目标语言的使用习惯和位置
4. 保持简洁准确，不要添加任何额外的解释或标记
5. 使用 ### 分隔每个翻译结果"""

    def translate_text(self, text: str, target_lang: str) -> str:
        """调用API翻译单个文本"""
        try:
            prompt = f"Translate the following text to {target_lang}. Text: {text}"
            
            payload = {
                "model": self.config.model_id,
                "messages": [
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ]
            }
            
            response = requests.post(
                f"{self.config.base_url}/v1/chat/completions",
                headers=self.headers,
                json=payload,
                timeout=30  # 设置30秒超时
            )
            
            if response.status_code == 200:
                return response.json()['choices'][0]['message']['content'].strip()
            else:
                raise Exception(f"Translation API error: {response.status_code}")
                
        except Exception as e:
            print(f"Error translating text: {e}")
            return ""

    def batch_translate(self, texts: List[str], target_lang: str) -> List[str]:
        """批量翻译文本"""
        if not texts:
            return []

        try:
            # 构建批量翻译的提示词
            combined_prompt = (
                f"请将以下文本翻译成{target_lang}。注意事项：\n"
                "1. 每个翻译后的文本用 ### 分隔\n"
                "2. 按顺序翻译每个文本\n"
                "3. 不要在翻译结果中包含序号\n"
                "4. 不要遗漏任何文本\n"
                "5. 不要合并或拆分文本\n\n"
                "需要翻译的文本：\n\n"
            )
            for i, text in enumerate(texts, 1):
                if text:
                    combined_prompt += f"[{i}] {text}\n"

            payload = {
                "model": self.config.model_id,
                "messages": [
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": combined_prompt}
                ]
            }

            response = requests.post(
                f"{self.config.base_url}/v1/chat/completions",
                headers=self.headers,
                json=payload,
                timeout=30  # 设置30秒超时
            )

            if response.status_code == 200:
                content = response.json()['choices'][0]['message']['content'].strip()
                # 使用 ### 分隔符拆分结果
                # 打印原始响应内容
                print(f"\nRaw translation response for {target_lang}:")
                print(content)
                
                # 使用 ### 分隔符拆分结果
                translations = [t.strip() for t in content.split('###') if t.strip()]
                print(f"\nSplit translations ({len(translations)} items):")
                for i, t in enumerate(translations):
                    print(f"{i+1}. {t}")
                
                # 清理序号和多余空格
                translations = [re.sub(r'^\[?\d+\]?\.\s*', '', t).strip() for t in translations]
                translations = [re.sub(r'^\[?\d+\]?\s*', '', t).strip() for t in translations]
                print(f"\nCleaned translations:")
                for i, t in enumerate(translations):
                    print(f"{i+1}. {t}")
                
                # 确保翻译结果数量与输入文本数量匹配
                results = []
                non_empty_texts = [t for t in texts if t]
                print(f"\nMatching translations: Expected {len(non_empty_texts)}, Got {len(translations)}")
                
                for i, text in enumerate(texts):
                    if not text:  # 如果原文为空，保持为空
                        results.append("")
                    elif i < len(translations) and translations[i]:  # 如果有对应的非空翻译
                        results.append(translations[i])
                    else:  # 如果翻译结果不足或为空
                        print(f"Missing or empty translation for text[{i}]: {text[:100]}")
                        results.append("异常")
                        
                return results
            else:
                raise Exception(f"Translation API error: {response.status_code}")

        except requests.exceptions.Timeout:
            raise Exception("Translation request timed out")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Network error: {str(e)}")
        except Exception as e:
            raise Exception(f"Translation error: {str(e)}")
