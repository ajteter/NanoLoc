# -*- coding: utf-8 -*-
"""
NanoLoc CSV → Android res/strings.xml 转换脚本

功能：
    读取 NanoLoc 导出的 CSV 翻译文件，按 strings.xml 中的 key 进行增量匹配，
    生成 Android 多语言资源文件 (res/values-xx/strings.xml)。
    CSV 中同种语言变体会合并为一列 (如 en-US 包含 en-GB、en-AU、en-NZ)，
    本脚本会自动展开到所有对应的 res 文件夹。

工作流程：
    1. 开发提供 strings.xml，包含本次需要增量翻译的所有 key
    2. 将 NanoLoc 导出的全量 CSV 命名为 oppoglobal.csv 放在同目录
    3. 运行脚本，脚本只提取 strings.xml 中的 key 对应的翻译，生成 res 资源文件

使用方法：
    python3 csv_to_res.py                  # 默认读取同目录下的 oppoglobal.csv
    python3 csv_to_res.py other_file.csv   # 指定其他 CSV 文件

输入：
    - strings.xml (必需)：放在同目录下，包含需要翻译的 key 列表
    - CSV 文件：NanoLoc 导出的全量翻译 CSV

输出：
    - res/ 目录下各语言文件夹的 strings.xml (仅包含 strings.xml 中指定的 key)

语言展开规则 (部分示例)：
    en-US → values/, values-en-rAU/, values-en-rGB/, values-en-rNZ/
    zh-TW → values-zh-rTW/, values-zh-rHK/
    de-DE → values-de-rDE/, values-de-rCH/
    sr-RS → values-b+sr+Latn/, values-b+bs+BA/
    完整映射见下方 CSV_TO_RES_FOLDERS 字典。

新增语言：
    在 CSV_TO_RES_FOLDERS 字典中添加 "CSV列名": ["res文件夹名", ...] 即可。

无外部依赖，仅使用 Python 标准库。
"""

import csv
import os
import sys

# Script directory as base path for output
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RES_DIR = os.path.join(SCRIPT_DIR, "res")

# strings.xml in script directory for non-translatable strings
STRINGS_XML_FILE = os.path.join(SCRIPT_DIR, "strings.xml")

# Default CSV filename
DEFAULT_CSV_FILE = "oppoglobal.csv"

# XML tags for parsing strings.xml
STRING_TAG = '<string'
STRING_ID_TAG = '"'
STRING_VALUE_TAG1 = '>'
STRING_VALUE_TAG2 = '<'

# ============================================================
# CSV language code -> Android res folder name(s) mapping
# CSV merges variants: e.g. en-US is used for en-GB, en-AU, en-NZ
# We expand them back to all res folders.
# ============================================================
CSV_TO_RES_FOLDERS = {
    "en-US": ["values", "values-en-rAU", "values-en-rGB", "values-en-rNZ"],
    "zh-CN": ["values-zh-rCN"],
    "zh-TW": ["values-zh-rTW", "values-zh-rHK"],
    "bo-CN": ["values-bo-rCN"],
    "nl-NL": ["values-nl-rNL"],
    "ca-ES": ["values-ca-rES"],
    "eu-ES": ["values-eu-rES"],
    "da-DK": ["values-da-rDK"],
    "sk-SK": ["values-sk-rSK"],
    "de-DE": ["values-de-rDE", "values-de-rCH"],
    "hi-IN": ["values-hi-rIN"],
    "id-ID": ["values-in"],
    "th-TH": ["values-th-rTH"],
    "fil-PH": ["values-fil-rPH"],
    "lo-LA": ["values-lo-rLA"],
    "sw-KE": ["values-sw-rKE"],
    "ja-JP": ["values-ja-rJP"],
    "fr-FR": ["values-fr-rFR"],
    "es-ES": ["values-es-rES", "values-es-rMX"],
    "pl-PL": ["values-pl-rPL"],
    "nb-NO": ["values-nb-rNO"],
    "sv-SE": ["values-sv-rSE"],
    "hu-HU": ["values-hu-rHU"],
    "ko-KR": ["values-ko-rKR"],
    "si-LK": ["values-si-rLK"],
    "mr-IN": ["values-mr-rIN"],
    "ta-IN": ["values-ta-rIN"],
    "gu-IN": ["values-gu-rIN"],
    "pa-IN": ["values-pa-rIN"],
    "kn-IN": ["values-kn-rIN"],
    "as-IN": ["values-as-rIN"],
    "fa-IR": ["values-fa-rIR"],
    "pt-BR": ["values-pt-rBR"],
    "tr-TR": ["values-tr-rTR"],
    "uz-UZ": ["values-uz-rUZ"],
    "gl-ES": ["values-gl-rES"],
    "he-IL": ["values-iw-rIL"],
    "sr-RS": ["values-b+sr+Latn", "values-b+bs+BA"],
    "bg-BG": ["values-bg-rBG"],
    "fi-FI": ["values-fi-rFI"],
    "hr-HR": ["values-hr-rHR"],
    "sl-SI": ["values-sl-rSI"],
    "uk-UA": ["values-uk-rUA"],
    "ms-MY": ["values-ms-rMY"],
    "vi-VN": ["values-vi-rVN"],
    "ru-RU": ["values-ru-rRU"],
    "ar": ["values-ar-rAR"],
    "ur-PK": ["values-ur-rPK"],
    "km-KH": ["values-km-rKH"],
    "ne-NP": ["values-ne-rNP"],
    "it-IT": ["values-it-rIT"],
    "cs-CZ": ["values-cs-rCZ"],
    "ro-RO": ["values-ro-rRO"],
    "pt-PT": ["values-pt-rPT"],
    "el-GR": ["values-el-rGR"],
    "my-MM": ["values-My-rMM"],
    "bn-BD": ["values-bn-rBD"],
    "kk-KZ": ["values-kk-rKZ"],
    "te-IN": ["values-te-rIN"],
    "ml-IN": ["values-ml-rIN"],
    "or-IN": ["values-or-rIN"],
}


# ============================================================
# File I/O utilities (self-contained, no external dependencies)
# ============================================================

def read_file(path):
    """Read a file and return its content as string."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception:
        return ""


def write_file(path, data):
    """Write data to a file, creating parent directories if needed."""
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(data)
    except Exception:
        import traceback
        traceback.print_exc()


# ============================================================
# Core logic
# ============================================================

def escape_xml_value(value):
    """Escape special characters for Android strings.xml, matching original script behavior."""
    value = value.replace('&', '&amp;')
    value = value.replace("'", "\\'")
    value = value.replace("\\\\\\'", "\\'")
    return value


def link_string(str_id, value):
    """Generate a <string> XML element."""
    return f'\t<string name="{str_id}">{value}</string>'


def link_string_none_translatable(str_id, value):
    """Generate a <string> XML element with translatable=false."""
    return f'\t<string name="{str_id}" translatable="false">{value}</string>'


def write_string_xml(path, entries):
    """Write a strings.xml file with the given entries."""
    result = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n' + \
             "\n".join(entries) + '\n</resources>'
    write_file(path, result)


def parse_strings_xml():
    """
    Parse strings.xml to extract:
    - required_keys: all string name keys (used as filter for CSV)
    - ids_same / values_same: reference strings (@string/...) to append to values/
    - ids_nontrans / values_nontrans: non-translatable strings to append to values/
    """
    required_keys = []
    ids_same = []
    values_same = []
    ids_nontrans = []
    values_nontrans = []

    string_result = read_file(STRINGS_XML_FILE)
    if not string_result:
        return required_keys, ids_same, values_same, ids_nontrans, values_nontrans

    index = 0
    ids = []
    values = []
    while True:
        index = string_result.find(STRING_TAG, index)
        if index > 0:
            index = string_result.index(STRING_ID_TAG, index)
            if index >= 0:
                index2 = string_result.index(STRING_ID_TAG, index + 1)
                if index2 >= 0:
                    str_id = string_result[index + 1:index2]
                    ids.append(str_id)
                    index = index2 + 1
                    index = string_result.index(STRING_VALUE_TAG1, index)
                    if index >= 0:
                        index2 = string_result.index(STRING_VALUE_TAG2, index + 1)
                        value = string_result[index + 1:index2]
                        values.append(value)
                        index = index2 + 1
        else:
            break

    for i in range(len(ids)):
        required_keys.append(ids[i])
        if values[i].find("@string/") >= 0:
            ids_same.append(ids[i])
            values_same.append(values[i])
        elif 'translatable="false"' in string_result:
            # Check if this specific entry is non-translatable
            ids_nontrans.append(ids[i])
            values_nontrans.append(values[i])

    return required_keys, ids_same, values_same, ids_nontrans, values_nontrans


def read_csv_file(csv_path):
    """
    Read a NanoLoc-exported CSV file.
    Returns:
        keys: list of string resource IDs
        languages: dict mapping CSV language code -> list of translated values
    """
    keys = []
    languages = {}

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)  # First row is the header

        # First column is "Key", rest are language codes
        lang_codes = header[1:]
        for lang in lang_codes:
            languages[lang] = []

        for row in reader:
            if not row or not row[0].strip():
                continue  # Skip empty rows

            key = row[0].strip()
            keys.append(key)

            for i, lang in enumerate(lang_codes):
                col_index = i + 1
                if col_index < len(row):
                    value = row[col_index] if row[col_index] else ""
                else:
                    value = ""
                languages[lang].append(value)

    return keys, languages


def generate_res_files(csv_keys, languages, required_keys, ids_same, values_same, ids_nontrans, values_nontrans):
    """
    Generate strings.xml files for all res folders.
    Only outputs keys that are present in required_keys (from strings.xml).
    """
    generated_count = 0
    required_set = set(required_keys)

    # Build a mapping from CSV key -> index for quick lookup
    csv_key_index = {key: i for i, key in enumerate(csv_keys)}

    # Filter: only keys that are both in required_keys and in CSV
    matched_keys = [k for k in required_keys if k in csv_key_index]
    missing_keys = [k for k in required_keys if k not in csv_key_index
                    and k not in [x for x in ids_same]
                    and k not in [x for x in ids_nontrans]]
    if missing_keys:
        print(f"Warning: {len(missing_keys)} keys in strings.xml not found in CSV: {missing_keys[:5]}{'...' if len(missing_keys) > 5 else ''}")

    for csv_lang, translations in languages.items():
        # Get the corresponding res folder(s) for this CSV language
        res_folders = CSV_TO_RES_FOLDERS.get(csv_lang)
        if not res_folders:
            print(f"Warning: No res folder mapping found for CSV language '{csv_lang}', skipping.")
            continue

        # Build the string entries for this language (only matched keys)
        entries = []
        for key in matched_keys:
            idx = csv_key_index[key]
            value = translations[idx] if idx < len(translations) else ""
            if value and value != "None":
                value = escape_xml_value(value)
                entries.append(link_string(key, value))

        # Write to each mapped res folder
        for folder in res_folders:
            if folder == "values":
                # Default (English) folder: add reference and non-translatable strings
                full_entries = list(entries)

                for j in range(len(ids_same)):
                    full_entries.append(link_string(ids_same[j], values_same[j]))
                    full_entries.append("\n")

                for j in range(len(ids_nontrans)):
                    full_entries.append(link_string_none_translatable(ids_nontrans[j], values_nontrans[j]))

                out_path = os.path.join(RES_DIR, "values", "strings.xml")
                write_string_xml(out_path, full_entries)
            else:
                out_path = os.path.join(RES_DIR, folder, "strings.xml")
                write_string_xml(out_path, entries)

            generated_count += 1

    return generated_count


def main():
    csv_file = sys.argv[1] if len(sys.argv) >= 2 else DEFAULT_CSV_FILE

    # If path is relative, resolve from script directory
    if not os.path.isabs(csv_file):
        csv_file = os.path.join(SCRIPT_DIR, csv_file)

    if not os.path.exists(csv_file):
        print(f"Error: CSV file not found: {csv_file}")
        sys.exit(1)

    print(f"Reading CSV: {csv_file}")

    # Parse strings.xml to get required keys (filter) and non-translatable entries
    required_keys, ids_same, values_same, ids_nontrans, values_nontrans = parse_strings_xml()
    if not required_keys:
        print("Error: strings.xml is empty or not found. Please provide strings.xml with required keys.")
        sys.exit(1)
    print(f"strings.xml: {len(required_keys)} required keys ({len(ids_same)} reference, {len(ids_nontrans)} non-translatable)")

    # Read NanoLoc CSV
    csv_keys, languages = read_csv_file(csv_file)
    print(f"CSV: {len(csv_keys)} total keys, {len(languages)} languages")

    # Generate res files (only keys from strings.xml)
    count = generate_res_files(csv_keys, languages, required_keys, ids_same, values_same, ids_nontrans, values_nontrans)
    print(f"\nDone! Generated {count} strings.xml files.")


if __name__ == '__main__':
    main()
