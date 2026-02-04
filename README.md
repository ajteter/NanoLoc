# NanoLoc 🌍

**English** | [简体中文](./README_zh.md)


NanoLoc is a lightweight, format-agnostic localization (i18n) management platform designed to streamline the translation process for developers and product managers. It currently supports Android `strings.xml` and integrates with AI for automated batch translation.

## ✨ Features

For a detailed breakdown of all features, please see [Feature Documentation](./FEATURES.md).

- **Project Management**: Multi-project support with flexible language and AI configurations.
- **Data Integration**:
  - **Import**: Android `strings.xml` support with smart conflict resolution.
  - **Export**: CSV export with Excel compatibility (BOM) and robust error handling.
- **Advanced Localization**:
  - **AI Translation**: Batch, Row, Column, and Single-cell modes powered by LLMs.
  - **Audit**: Track "Last Modified By" for every translation.
  - **Context**: Remarks field with tooltip support for better translator context.
- **Modern UI**:
  - **Real-time Status**: Global "Translating..." indicator prevents conflicts.
  - **Efficiency**: Sticky columns, server-side pagination (50 items/page), and instant search.
- **Security**: Secure authentication via NextAuth.js.

## 🛠 Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Database**: [Prisma](https://www.prisma.io/) + SQLite (Dev) / PostgreSQL (Prod ready)
- **UI**: [Tailwind CSS](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/), [Lucide Icons](https://lucide.dev/)
- **State Management**: [TanStack Query](https://tanstack.com/query/latest)
- **Authentication**: [NextAuth.js (v5 Beta)](https://authjs.dev/)
- **XML Parsing**: `fast-xml-parser`

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/nanoloc.git
    cd nanoloc
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory:
    ```env
    # Database (SQLite by default)
    DATABASE_URL="file:./dev.db"

    # Authentication
    AUTH_SECRET="your-super-secret-key-at-least-32-chars" # Generate with: openssl rand -base64 32

    # Initial User (Auto-created on first run if enabled in auth logic, or register manually)
    # The current auth setup allows public registration.

    # AI Configuration (Default credentials, can be overridden per project)
    # Supported: Compatible OpenAI API (e.g. Bedrock proxy)
    AI_BASE_URL="https://your-ai-api-endpoint.com"
    AI_API_KEY="your-api-key"
    AI_MODEL_ID="your-model-id" # e.g. "anthropic.claude-3-sonnet"
    ```

4.  **Database Setup**
    ```bash
    npx prisma generate
    npx prisma db push
    ```

5.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to view the app.

## 📖 Usage Guide

### 1. Create a Project
- Navigate to the dashboard.
- Click **"New Project"**.
- Enter details:
  - **Base Language**: e.g., `en-US`
  - **Target Languages**: Comma-separated (e.g., `zh-CN, ja, es`)
  - **AI Config**: Optional. Overrides global `.env` settings.

### 2. Import Strings
- Go to the **Project Detail** page.
- Click **"Import XML"**.
- Upload your `strings.xml`.
- The system will parse keys and merge them. Old values are saved in the "Remarks" column.

### 3. Translate
- **Manual**: Click the "Edit" (pencil) icon on a row.
- **AI Assist**: Click the "Wand" icon in any target language cell.
- **Batch Translate**: Click the purple **"Batch Translate"** button in the header. It will find all empty fields and translate them in the background.

## 🐳 Docker Deployment (Production Ready)

NanoLoc includes a production-ready Docker setup with SQLite persistence.

### Prerequisites
- Docker & Docker Compose installed

### **One-Click Deployment**
Simply run the included deploy script. It handles permissions, secrets generation, and database volume setup automatically.

```bash
./deploy.sh
```

**What this script does:**
1. ✅ Checks/Creates `.env` from template.
2. 🔑 Generates a secure `AUTH_SECRET` if missing.
3. 📁 Creates `./data` directory with correct permissions.
4. 🚀 Builds and starts the container on port `3000`.

Your data will be persisted in `./data` on the host machine.



## 📄 License

MIT
