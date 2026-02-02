#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
from typing import List, Optional

class TranslationConfig:
    """配置管理类"""
    def __init__(self, config_path: str = "config.json"):
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
            
        self.base_url = config['openai']['base_url']
        self.secret = config['openai']['secret']
        self.model_id = config['openai']['model_id']
        self.input_file = config['translation']['input_file']
        self.batch_size = config['translation']['batch_size']
        self.max_tokens = config['translation']['max_tokens']
        self.max_workers = config['translation']['max_workers']
        self.retry_attempts = config['translation']['retry_attempts']
        self.retry_delay_base = config['translation']['retry_delay_base']
        self.retry_delay_increment = config['translation']['retry_delay_increment']
        self.target_languages: Optional[List[str]] = config['translation'].get('target_languages')
