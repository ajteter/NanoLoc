# NanoLoc 🌍

[English](./README.md) | **简体中文**

NanoLoc 是一个轻量级的本地化 (i18n) 管理平台，支持 AI 驱动的批量翻译。帮助开发者和翻译人员高效管理多语言字符串资源。

## ✨ 特性

- **项目管理**：多项目支持，每个项目可独立配置语言和 AI 参数
- **导入/导出**：支持 Android `strings.xml`、iOS `Localizable.strings`、H5 JSON 导入（智能合并，保留现有源语言并将冲突导入值记录到备注）；CSV 导出（兼容 Excel BOM）
- **AI 翻译**：支持批量、整行、整列、单单元格四种 AI 翻译模式
- **改动记录**：全局审计日志，跟踪所有变更（项目/词条增删改、翻译更新、导入、批量翻译），标注操作人
- **用户设置**：支持修改显示名称和密码
- **审计追踪**：记录每条翻译的最后修改人
- **现代 SaaS UI**：黑白灰极简极深模式 (Zinc & Emerald)，高数据密度，支持冻结列、即时搜索、实时翻译状态
- **操作分组**：高危操作（删除词条、清空整行）统一收纳在“更多操作”菜单中，界面更整洁
- **清空整行**：一键清除词条的所有目标语言翻译，同时保留 Key、源语言 (en-US) 和备注 (Remarks)
- **智能导航**：双分页系统（详情页顶部 & 底部均有分页控制），优化的仪表盘布局
- **安全认证**：基于用户名的 NextAuth.js 认证
- **并发安全**：SQLite WAL 模式、busy timeout、批量翻译进程锁、导入事务分块
- **翻译转换脚本**：提供离线 CSV 转 Android res 资源文件的脚本（OPPO / Vanso）

## 🛠 技术栈

- **框架**：[Next.js 16 (App Router)](https://nextjs.org/)
- **数据库**：[Prisma](https://www.prisma.io/) + SQLite (开发) / PostgreSQL (生产)
- **UI**：[Tailwind CSS v4](https://tailwindcss.com/)、[Shadcn UI](https://ui.shadcn.com/)、[Lucide Icons](https://lucide.dev/)
- **品牌设计**：极简科技感 Logo ([icon.svg](./public/icon.svg))
- **认证**：[NextAuth.js (v5 Beta)](https://authjs.dev/)

## 📁 项目结构

```
NanoLoc/
├── src/                        # NanoLoc 平台源代码
├── prisma/                     # 数据库 Schema 和迁移
├── tranlateOppo Script/        # OPPO 应用：CSV → Android res 转换脚本
│   └── csv_to_res.py
├── tranlateVanso Script/       # Vanso 应用：CSV → Android res 转换脚本
│   └── csv_to_res.py
├── deploy.sh                   # 一键 Docker 部署
├── docker-compose.yml
└── Dockerfile
```

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm / yarn / pnpm

### 安装

```bash
git clone https://github.com/your-username/nanoloc.git
cd nanoloc
npm install
```

### 环境配置

在根目录创建 `.env` 文件：

```env
DATABASE_URL="file:./dev.db?journal_mode=WAL&busy_timeout=5000"
AUTH_SECRET="your-secret-key"       # 生成命令：openssl rand -base64 32
```

> AI 配置（Base URL、API Key、Model ID）在 UI 中按项目单独设置。

### 运行

```bash
npx prisma generate
npx prisma db push
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📖 平台使用指南

NanoLoc 平台的完整操作指南，包括项目管理、XML 导入、AI 翻译、CSV 导出等：

👉 **[NanoLoc 平台操作指南](./NANOLOC_PLATFORM_GUIDE.md)**

## � Docker 部署

```bash
./deploy.sh
```

脚本会自动生成密钥、创建数据目录，并在 `3000` 端口启动容器。数据持久化保存在 `./data` 目录中。

> [!TIP]
> **镜像优化**：Docker 镜像采用多阶段 Alpine 构建，体积从 ~1GB 优化至 **~472MB**，显著提升拉取和部署速度。


## 📋 翻译转换脚本使用指南

`tranlateOppo Script/` 和 `tranlateVanso Script/` 目录包含独立的 Python 脚本，用于将 NanoLoc 导出的 CSV 文件转换为 Android 资源文件 (`res/values-xx/strings.xml`)。

👉 **详细操作指引请查看 [翻译脚本操作指南](./TRANSLATION_SCRIPTS_GUIDE.md)**

## 📄 许可证

MIT
