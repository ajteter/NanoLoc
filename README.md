# NanoLoc 🌍

**English** | [简体中文](./README_zh.md)


NanoLoc is a lightweight, format-agnostic localization (i18n) management platform designed to streamline the translation process for developers and product managers. It currently supports Android `strings.xml` and integrates with AI for automated batch translation.

## ✨ Features

- **Project Management**: Create multiple projects with independent configurations (Base Language, Target Languages, AI Settings).
- **Format Support**:
  - **Import**: Seamlessly import Android `strings.xml` files.
  - **Conflict Resolution**: Automatically detects existing keys. Updates values and archives old content to `remarks`.
- **Localization Workflow**:
  - **Inline Editing**: Edit translations, keys, and remarks directly in the table.
  - **AI Translation**:
    - **Single Term**: Translate individual cells using the "Magic Wand" button.
    - **Batch Translation**: Automatically find missing translations and bulk-translate them (20 items/batch).
  - **Smart Copy**: Copy base language content to all empty target slots.
  - **Search**: Global search across keys, values, and remarks.
- **Modern UI**: Built with **Next.js 15**, **Tailwind CSS v4**, and **Shadcn UI**.
- **Secure**: User authentication via NextAuth.js (Email/Password).

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

## 🐳 Docker Deployment

A `Dockerfile` is included for containerized deployment.

1.  **Build Image**
    ```bash
    docker build -t nanoloc .
    ```

2.  **Run Container**
    ```bash
    docker run -p 3000:3000 \
      -e AUTH_SECRET="your-secret" \
      -e DATABASE_URL="file:/app/data/dev.db" \
      -v $(pwd)/data:/app/data \
      nanoloc
    ```
    *(Note: For production, setting up a persistent volume for SQLite or connecting to an external Postgres DB is recommended.)*

## 📄 License

MIT
