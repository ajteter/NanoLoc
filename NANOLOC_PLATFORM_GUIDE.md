# NanoLoc 平台操作指南 / Platform Guide

[English](#english) | [简体中文](#简体中文)

---

## 简体中文

### 一、平台简介

NanoLoc 是一个轻量级多语言翻译管理平台，为应用开发团队提供：
- 集中管理多项目、多语言的翻译词条
- 导入 Android `strings.xml`、iOS `Localizable.strings` 或 H5 JSON，导出 CSV 翻译文件
- AI 驱动的自动翻译（支持多种翻译模式）
- 完整的翻译审计追踪

### 二、账户与登录

#### 注册
1. 打开 NanoLoc（默认 `http://localhost:3000`）
2. 点击注册链接
3. 输入用户名（必填）和密码（至少 6 位）
4. 注册成功后自动登录

#### 登录
1. 输入用户名和密码
2. 点击 **Sign In** 登录

> 系统采用 NextAuth.js 认证，支持 Session 持久化。

### 三、项目管理

#### 创建项目
1. 在仪表盘页面点击 **New Project**
2. 填写项目信息：

| 字段 | 说明 | 示例 |
|---|---|---|
| **Project Name** | 项目名称 | `OPPO Music` |
| **Description** | 项目描述（可选） | `OPPO 音乐海外版` |
| **Base Language** | 基础语言（源语言） | `en-US` |
| **Target Languages** | 目标翻译语言（多选） | `zh-CN, ja, ko-KR, ...` |

3. 语言选择支持：
   - 🔍 **搜索**：按语言名称或代码搜索
   - ⚡ **快速选择**：点击 `Select Common` 批量选中常用语言
   - ❌ **全部取消**：点击 `Deselect All`

4. **AI 配置（可选）**：

| 字段 | 说明 |
|---|---|
| **Base URL** | AI 翻译 API 地址（兼容 OpenAI 格式） |
| **API Key** | API 密钥 |
| **Model ID** | 模型 ID（如 `claude-4-5-sonnet`） |
| **System Prompt** | 自定义系统提示词，控制翻译风格和质量 |

5. 点击 **Create Project** 完成创建

#### 编辑项目
1. 进入项目详情页 → 点击 **Settings**（设置）
2. 修改项目信息、语言配置或 AI 设置
3. 保存更改

### 四、词条管理

#### 导入语言文件
1. 进入项目详情页
2. 点击 **Import XML**
3. 上传 Android `strings.xml`、iOS `Localizable.strings` 或 H5 JSON 文件
4. 系统自动解析并导入所有 key-value 对
5. **智能合并**：如果 key 已存在，则保留当前项目中的源语言内容，并将导入文件中的冲突值追加到"备注 (Remarks)"列中

#### 手动添加/编辑词条
1. 在词条列表中找到目标词条
2. 点击行上的 ✏️ **编辑图标**
3. 修改翻译内容
4. 保存更改

#### 词条列表功能
- **搜索**：即时搜索 key 名称
- **分页**：服务端分页，每页 50 条
- **冻结列**：Key 列和基础语言列固定不动，方便横向滚动查看其他语言
- **审计信息**：每个翻译单元格显示最后修改人
- **魔法棒图标**：所有 AI 触发动作（单条、行、列、批量）均统一为 **Emerald (祖母绿)** 色调。
- **更多操作菜单**：将“删除词条”和“清空整行”由原来的零散按钮整合进词条末尾的 **More Actions (更多操作)** 菜单中。
- **清空整行 (Clear Row)**：支持清理该词条除 Key、en-US (源语言) 以及 Remarks 以外的所有翻译内容，适用于需要重置翻译的场景。
- **双分页系统**：在词条列表的顶部和底部均提供了分页控制，极大减少了长列表滚动后的操作负担。

### 五、AI 翻译

NanoLoc 集成了 AI 翻译功能，支持四种翻译模式：

#### 1. 单单元格翻译
- 点击任意目标语言单元格中的 🪄 **绿色魔法棒图标**
- AI 会根据源语言内容翻译到该目标语言
- 适合逐条精确翻译

#### 2. 整行翻译
- 选择某一行，AI 将源语言翻译到该行所有目标语言
- 适合一次性完成单个 key 的所有语言翻译

#### 3. 整列翻译
- **方案 A**：点击目标语言列头中的 🪄 **绿色魔法棒**
- **方案 B**：AI 将所有空的单元格翻译
- 适合快速补全某个语言的所有缺失翻译

#### 4. 批量翻译
- 点击页面顶部的紫色 **Batch Translate** 按钮
- AI 自动扫描所有空的翻译单元格
- 在后台批量翻译所有缺失内容
- 页面顶部会显示 🔄 **"正在翻译..."** 全局状态指示
- **防中断保护**：在翻译过程中，进度对话框将隐藏关闭按钮，并提醒：**"⚠️ 请不要关闭浏览器"**，确保翻译任务完整执行并正确落库。

> **提示**：批量翻译过程中，全局指示器会防止重复提交，避免冲突操作。

#### AI System Prompt 自定义
在项目设置中可以自定义 System Prompt，控制 AI 的翻译风格。例如：
```
你是一个专业的应用本地化翻译专家。翻译时注意：
1. 保持简洁，适合移动端 UI 显示
2. 保留格式占位符（如 %1$d, %s）
3. 尊重各语言的文化习惯
```

### 六、导出翻译

#### 导出 CSV
1. 进入项目详情页
2. 点击 **Export CSV**
3. 系统生成包含所有词条和翻译的 CSV 文件
4. CSV 格式兼容 Excel（含 BOM 头），可直接打开编辑

**CSV 格式**：
| Key | en-US | zh-CN | ja | ... |
|---|---|---|---|---|
| app_name | My App | 我的应用 | マイアプリ | ... |
| welcome | Welcome | 欢迎 | ようこそ | ... |

> 导出的 CSV 可以直接作为翻译转换脚本的输入文件。详见 [翻译脚本操作指南](./TRANSLATION_SCRIPTS_GUIDE.md)。

### 七、完整工作流程

```
开发提供 strings.xml（需要翻译的 key）
        │
        ▼
  导入到 NanoLoc 平台
        │
        ▼
  AI 批量翻译 / 人工翻译校对
        │
        ▼
  从 NanoLoc 导出 CSV
        │
        ▼
  使用 csv_to_res.py 脚本转换
        │
        ▼
  生成 res/values-xx/strings.xml
        │
        ▼
  复制到 Android 项目中使用
```

### 八、部署

#### 本地开发
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

#### Docker 生产部署
```bash
./deploy.sh
```
脚本会自动处理密钥生成、数据目录创建、容器构建和启动。数据持久化在 `./data` 目录中。

> [!IMPORTANT]
> **镜像瘦身优化**：通过采用 Alpine Linux 基础镜像和多阶段构建，NanoLoc 生产镜像大小已从 **~1GB 优化至 ~472MB**，大幅提升了部署效率。

---

## English

### 1. Introduction

NanoLoc is a lightweight multilingual translation management platform providing:
- Centralized management of multi-project, multi-language translation entries
- Android `strings.xml`, iOS `Localizable.strings`, and H5 JSON import with CSV export
- AI-powered automatic translation (multiple modes)
- Full translation audit trail

### 2. Account & Login

#### Registration
1. Open NanoLoc (default: `http://localhost:3000`)
2. Click the register link
3. Enter username (required) and password (min. 6 characters)
4. Auto-login after successful registration

#### Login
Enter username and password, click **Sign In**.

### 3. Project Management

#### Create a Project
1. Click **New Project** on the dashboard
2. Fill in project details:
   - **Project Name**: e.g., `OPPO Music`
   - **Description**: Optional
   - **Base Language**: Source language (e.g., `en-US`)
   - **Target Languages**: Select from searchable language list
3. **AI Configuration** (optional): Set Base URL, API Key, Model ID, and System Prompt
4. Click **Create Project**

#### Edit a Project
Navigate to project → **Settings** → modify and save.

### 4. Term Management

#### Import Localization File
1. Go to the project detail page
2. Click **Import XML**
3. Upload your Android `strings.xml`, iOS `Localizable.strings`, or H5 JSON file
4. Keys are parsed and merged automatically. When the same key already exists, the current base-language value is kept and the imported value is appended to "Remarks".

#### Manual Editing
Click the ✏️ edit icon on any row to modify translations.

#### List Features
- **Search**: Instant key name search
- **Pagination**: Server-side, 50 items per page
- **Sticky Columns**: Key and base language columns are frozen for easy horizontal scrolling
- **Audit**: Each cell shows the last modifier
- **Wand Palette**: All AI-triggered actions (Cell, Row, Column, Batch) are unified with **Emerald** success tones
- **More Actions Menu**: Grouped "Delete Term" and "Clear Row" into a single dropdown for a cleaner grid
- **Clear Row**: Quickly wipe all target translations for a term while keeping the Key, Source content, and Remarks intact
- **Smart Navigation**: Dual-pagination controls at both Top and Bottom of the term grids

### 5. AI Translation

Four translation modes:

| Mode | Description |
|---|---|
| **Single Cell** | Click 🪄 wand icon on any target cell |
| **Row** | Translate one key to all target languages |
| **Column** | Fill all empty cells for one target language |
| **Batch** | Click purple **Batch Translate** button to auto-fill all empty cells |

A global "Translating..." indicator prevents conflicts during batch operations. 
**Safe Processing**: During active translation, the dialog disables the close button and warns: **"⚠️ Please do not close the browser"** to ensure data integrity.

#### Custom System Prompt
Set per-project system prompts in Settings to control AI translation style and quality.

### 6. Export

Click **Export CSV** on the project detail page. The CSV is Excel-compatible (BOM encoded) and can be used directly with the [Translation Scripts](./TRANSLATION_SCRIPTS_GUIDE.md).

### 7. End-to-End Workflow

```
Developer provides strings.xml (keys to translate)
        │
        ▼
  Import into NanoLoc
        │
        ▼
  AI batch translate / manual review
        │
        ▼
  Export CSV from NanoLoc
        │
        ▼
  Run csv_to_res.py script
        │
        ▼
  Generate res/values-xx/strings.xml
        │
        ▼
  Copy to Android project
```

### 8. Deployment

#### Local Development
```bash
npm install && npx prisma generate && npx prisma db push && npm run dev
```

#### Docker Production
```bash
./deploy.sh
```
Data persists in `./data`.

> [!TIP]
> **Optimized Performance**: The production image is built using Alpine Linux and multi-stage building techniques, reducing the size to **~472MB** (down from ~1GB).
