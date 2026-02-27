# 翻译脚本操作指南 / Translation Scripts Guide

[English](#english) | [简体中文](#简体中文)

---

## 简体中文

### 概述

NanoLoc 平台导出 CSV 格式的全量翻译文件后，开发人员使用本仓库中的 Python 脚本将其转换为 Android 项目所需的 `res/values-xx/strings.xml` 资源文件。

目前提供两个 App 的转换脚本：

| 目录 | 应用 | 默认 CSV 文件名 | 输出语言数 |
|---|---|---|---|
| `tranlateOppo Script/` | OPPO Music | `oppoglobal.csv` | 68 (含语言变体展开) |
| `tranlateVanso Script/` | Vanso | `vansoglobal.csv` | 6 |

### 前置要求

- Python 3.x（无需额外依赖，仅使用标准库）

### 操作步骤

#### 1. 从 NanoLoc 导出 CSV

1. 登录 NanoLoc 平台
2. 进入对应项目
3. 点击 **Export CSV** 导出全量翻译 CSV 文件

#### 2. 准备增量翻译的 key 列表

开发人员需要提供一个 `strings.xml` 文件，包含**本次需要翻译的所有 key**。

示例 `strings.xml`：
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="sort_by_update_time">Sort by date updated</string>
    <string name="main_library_tab">Library</string>
    <string name="create_new_playlist">Create new playlist</string>
</resources>
```

> **说明**：脚本只会从 CSV 中提取 `strings.xml` 里列出的 key 对应的翻译。这样可以实现增量翻译——每次只翻译新增或变更的词条。

#### 3. 放置文件

将以下文件放到对应的脚本目录中：

```
tranlateOppo Script/          # 或 tranlateVanso Script/
├── csv_to_res.py             # 转换脚本（已存在）
├── strings.xml               # 开发提供的增量 key 列表
└── oppoglobal.csv            # NanoLoc 导出的全量 CSV（或 vansoglobal.csv）
```

#### 4. 运行脚本

```bash
# OPPO
cd "tranlateOppo Script"
python3 csv_to_res.py

# Vanso
cd "tranlateVanso Script"
python3 csv_to_res.py
```

也可以指定其他 CSV 文件：
```bash
python3 csv_to_res.py other_file.csv
```

#### 5. 获取输出

脚本运行后，翻译结果会输出到 `res/` 目录：

```
res/
├── values/                   # 默认语言 (English)
│   └── strings.xml
├── values-zh-rCN/
│   └── strings.xml
├── values-ja-rJP/
│   └── strings.xml
└── ...
```

将 `res/` 目录下的文件复制到 Android 项目对应位置即可。

### 语言展开规则

CSV 中的语言会合并变体（如 `en-US` 代表所有英语变体），脚本会自动展开到所有对应的 res 文件夹。

**OPPO 部分展开示例**：

| CSV 列 | 展开到的 res 文件夹 |
|---|---|
| `en-US` | `values/`, `values-en-rAU/`, `values-en-rGB/`, `values-en-rNZ/` |
| `zh-TW` | `values-zh-rTW/`, `values-zh-rHK/` |
| `de-DE` | `values-de-rDE/`, `values-de-rCH/` |
| `es-ES` | `values-es-rES/`, `values-es-rMX/` |
| `sr-RS` | `values-b+sr+Latn/`, `values-b+bs+BA/` |

**Vanso 语言映射**：

| CSV 列 | res 文件夹 |
|---|---|
| `en-US` | `values/` |
| `zh-CN` | `values-zh-rCN/` |
| `es-ES` | `values-es-rES/` |
| `ms-MY` | `values-ms/` |
| `pt-BR` | `values-pt-rBR/` |
| `pt-PT` | `values-pt-rPT/` |

### 新增语言

编辑 `csv_to_res.py` 中的 `CSV_TO_RES_FOLDERS` 字典，添加一行映射即可：

```python
CSV_TO_RES_FOLDERS = {
    ...
    "新的CSV列名": ["对应的res文件夹名"],
}
```

### 常见问题

**Q: 运行后提示 `strings.xml is empty or not found`**
A: 确保 `strings.xml` 文件放在与 `csv_to_res.py` 同一目录下。

**Q: 某些 key 没有被翻译**
A: 脚本会打印 Warning 提示哪些 key 在 CSV 中找不到。请检查 key 名称是否与 NanoLoc 中的一致。

**Q: CSV 中有些语言被跳过了**
A: 如果 CSV 中的语言列名不在 `CSV_TO_RES_FOLDERS` 映射中，脚本会打印 Warning 并跳过。需要时在映射中添加对应语言。

---

## English

### Overview

After exporting a full translation CSV from the NanoLoc platform, developers use the Python scripts in this repository to convert them into Android `res/values-xx/strings.xml` resource files.

Two app-specific scripts are provided:

| Directory | App | Default CSV | Output Languages |
|---|---|---|---|
| `tranlateOppo Script/` | OPPO Music | `oppoglobal.csv` | 68 (with variant expansion) |
| `tranlateVanso Script/` | Vanso | `vansoglobal.csv` | 6 |

### Prerequisites

- Python 3.x (no external dependencies, uses standard library only)

### Steps

#### 1. Export CSV from NanoLoc

1. Log into the NanoLoc platform
2. Navigate to the target project
3. Click **Export CSV** to download the full translation CSV

#### 2. Prepare the incremental key list

Developers provide a `strings.xml` containing **only the keys that need translation this time**.

Example `strings.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="sort_by_update_time">Sort by date updated</string>
    <string name="main_library_tab">Library</string>
</resources>
```

> The script only extracts translations for keys listed in `strings.xml`, enabling incremental translation workflows.

#### 3. Place files

```
tranlateOppo Script/          # or tranlateVanso Script/
├── csv_to_res.py             # Conversion script (already exists)
├── strings.xml               # Incremental key list from developer
└── oppoglobal.csv            # Full CSV from NanoLoc (or vansoglobal.csv)
```

#### 4. Run

```bash
cd "tranlateOppo Script"
python3 csv_to_res.py

# Or specify a different CSV:
python3 csv_to_res.py other_file.csv
```

#### 5. Collect output

Results are generated in `res/`. Copy the contents to your Android project.

### Adding new languages

Edit `CSV_TO_RES_FOLDERS` in `csv_to_res.py`:

```python
CSV_TO_RES_FOLDERS = {
    ...
    "new-LANG": ["values-xx-rYY"],
}
```
