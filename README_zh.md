# NanoLoc 🌍

[English](./README.md) | **简体中文**

NanoLoc 是一个轻量级、格式无关的本地化 (i18n) 管理平台，旨在简化开发人员和产品经理的翻译流程。它目前支持 Android `strings.xml` 格式，并集成了 AI 进行自动批量翻译。

## ✨ 特性

有关所有功能的详细分类，请参阅 [功能文档](./FEATURES_zh.md)。

- **项目管理**：支持多项目管理，灵活配置语言和 AI 设置。
- **数据集成**：
  - **导入**：支持 Android `strings.xml`，具备智能冲突解决机制。
  - **导出**：CSV 导出（兼容 Excel BOM），具备稳健的错误处理。
- **高级本地化**：
  - **AI 翻译**：支持批量、整行、整列及单单元格 AI 翻译模式。
  - **审计**：追踪每条翻译的“最后修改人”。
  - **上下文**：备注字段支持 Tooltip，提供更好的翻译语境。
- **现代 UI**：
  - **实时状态**：全局“正在翻译”指示器，防止操作冲突。
  - **高效**：冻结列、服务端分页（默认 50 条/页）和即时搜索。
- **安全**：集成 NextAuth.js 安全认证。

## 🛠 技术栈

- **框架**：[Next.js 15 (App Router)](https://nextjs.org/)
- **数据库**：[Prisma](https://www.prisma.io/) + SQLite (开发环境) / PostgreSQL (生产环境准备)
- **UI**：[Tailwind CSS](https://tailwindcss.com/)、[Shadcn UI](https://ui.shadcn.com/)、[Lucide Icons](https://lucide.dev/)
- **状态管理**：[TanStack Query](https://tanstack.com/query/latest)
- **认证**：[NextAuth.js (v5 Beta)](https://authjs.dev/)
- **XML 解析**：`fast-xml-parser`

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm / yarn / pnpm

### 安装

1.  **克隆仓库**
    ```bash
    git clone https://github.com/your-username/nanoloc.git
    cd nanoloc
    ```

2.  **安装依赖**
    ```bash
    npm install
    # 或者
    yarn install
    ```

3.  **环境配置**
    在根目录创建 `.env` 文件：
    ```env
    # 数据库 (默认使用 SQLite)
    DATABASE_URL="file:./dev.db"

    # 认证密钥
    AUTH_SECRET="your-super-secret-key-at-least-32-chars" # 生成命令：openssl rand -base64 32

    # 初始用户 (如果启用了自动注册逻辑，或手动注册)
    # 当前认证设置允许开放注册。

    # AI 配置 (默认凭证，可在项目级别覆盖)
    # 支持：兼容 OpenAI 的 API (例如 Bedrock proxy)
    AI_BASE_URL="https://your-ai-api-endpoint.com"
    AI_API_KEY="your-api-key"
    AI_MODEL_ID="your-model-id" # 例如 "anthropic.claude-3-sonnet"
    ```

4.  **数据库设置**
    ```bash
    npx prisma generate
    npx prisma db push
    ```

5.  **运行开发服务器**
    ```bash
    npm run dev
    ```
    打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📖 使用指南

### 1. 创建项目
- 导航到仪表盘。
- 点击 **"New Project"** (新建项目)。
- 输入详情：
  - **基础语言**：例如 `en-US`
  - **目标语言**：逗号分隔 (例如 `zh-CN, ja, es`)
  - **AI 配置**：可选。覆盖全局 `.env` 设置。

### 2. 导入字符串
- 进入 **Project Detail** (项目详情) 页面。
- 点击 **"Import XML"** (导入 XML)。
- 上传您的 `strings.xml`。
- 系统将解析 Keys 并合并它们。旧值将保存到 "Remarks" (备注) 列中。

### 3. 翻译
- **手动**：点击行上的 "Edit" (铅笔) 图标。
- **AI 辅助**：点击任何目标语言单元格中的 "Wand" (魔术棒) 图标。
- **批量翻译**：点击顶部的紫色 **"Batch Translate"** 按钮。它将在后台找到所有空字段并进行翻译。

## 🐳 Docker 部署 (生产可用)

NanoLoc 内置了生产就绪的 Docker 配置，支持 SQLite 数据持久化。

### 前置要求
- 已安装 Docker 和 Docker Compose

### **一键部署**
直接运行内置的部署脚本，它会自动处理权限、密钥生成和数据目录挂载。

```bash
./deploy.sh
```

**脚本功能：**
1. ✅ 检查/创建 `.env` 配置文件。
2. 🔑 如果缺失，自动生成安全的 `AUTH_SECRET`。
3. 📁 创建 `./data` 持久化目录并设置正确权限。
4. 🚀 构建并启动容器，监听 `3000` 端口。

您的所有数据将持久化保存在主机上的 `./data` 目录中。



## 📄 许可证

MIT
