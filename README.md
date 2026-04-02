# NanoLoc 🌍

**English** | [简体中文](./README_zh.md)

NanoLoc is a lightweight localization (i18n) management platform with AI-powered batch translation. It helps developers and translators manage multilingual string resources efficiently.

## ✨ Features

- **Project Management**: Multi-project support with per-project language and AI configurations
- **Import/Export**: Android `strings.xml`, iOS `Localizable.strings`, and H5 JSON import with smart merge that preserves existing base-language values and logs imported conflicts to remarks; CSV export (Excel-compatible BOM)
- **AI Translation**: Batch, Row, Column, and Single-cell modes powered by LLMs
- **Activity Log**: Global audit log tracking all changes (project/term CRUD, translations, imports, batch translates) with user attribution
- **User Profile**: Change display name and password from the UI
- **Audit Trail**: Tracks "Last Modified By" for every translation entry
- **Modern SaaS UI**: Monochrome dark mode (Zinc & Emerald) with high data density, sticky columns, instant search, and real-time translation status
- **Action Grouping**: Destructive actions (Delete, Clear Row) are grouped under a "More Actions" menu for a cleaner interface
- **Clear Row**: Quickly remove all target translations for a term while preserving the key, Source (en-US), and Remarks
- **Smart Navigation**: Dual pagination (Top & Bottom on project pages) and streamlined dashboard navigation
- **Security**: NextAuth.js username-based authentication
- **Concurrency Safe**: SQLite WAL mode, busy timeout, process-level batch translation locks, chunked import transactions
- **Translation Scripts**: Offline CSV-to-Android-res conversion scripts for OPPO and Vanso apps

## 🛠 Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Database**: [Prisma](https://www.prisma.io/) + SQLite (Dev) / PostgreSQL (Prod)
- **UI**: [Tailwind CSS v4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/), [Lucide Icons](https://lucide.dev/)
- **Branding**: Monochrome tech startup logo ([icon.svg](./public/icon.svg))
- **Authentication**: [NextAuth.js (v5 Beta)](https://authjs.dev/)

## 📁 Project Structure

```
NanoLoc/
├── src/                        # NanoLoc platform source code
├── prisma/                     # Database schema and migrations
├── tranlateOppo Script/        # OPPO app: CSV → Android res conversion script
│   └── csv_to_res.py
├── tranlateVanso Script/       # Vanso app: CSV → Android res conversion script
│   └── csv_to_res.py
├── deploy.sh                   # One-click Docker deployment
├── docker-compose.yml
└── Dockerfile
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm

### Installation

```bash
git clone https://github.com/your-username/nanoloc.git
cd nanoloc
npm install
```

### Environment Setup

Create a `.env` file in the root directory:

```env
DATABASE_URL="file:./dev.db?journal_mode=WAL&busy_timeout=5000"
AUTH_SECRET="your-secret-key"       # Generate: openssl rand -base64 32
```

> AI configuration (Base URL, API Key, Model ID) is set per-project in the UI.

### Run

```bash
npx prisma generate
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 📖 Platform Guide

For a complete guide on using the NanoLoc platform — including project setup, XML import, AI translation, CSV export, and more:

👉 **[NanoLoc Platform Operation Guide](./NANOLOC_PLATFORM_GUIDE.md)**

## 🐳 Docker Deployment

```bash
./deploy.sh
```

The script auto-generates secrets, creates data directories, and starts the container on port `3000`. Data is persisted in `./data`. 

> [!TIP]
> **Optimized Image**: The Docker image uses a multi-stage Alpine-based build, reducing the size from ~1GB to **~472MB** for faster deployments.


## 📋 Translation Scripts Guide

The `tranlateOppo Script/` and `tranlateVanso Script/` directories contain standalone Python scripts that convert NanoLoc-exported CSV files into Android resource files (`res/values-xx/strings.xml`).

👉 **See [Translation Scripts Operation Guide](./TRANSLATION_SCRIPTS_GUIDE.md) for detailed usage instructions.**

## 📄 License

MIT
