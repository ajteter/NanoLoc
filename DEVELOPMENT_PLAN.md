## 1. System Overview

一个轻量级、格式无关的 i18n 管理平台，支持多端（Android, Web, Server）项目。

* **核心目标**：解耦文件格式与翻译逻辑，利用 AI 实现增量翻译，支持内网部署。
* **关键约束**：使用 BRConnector (Bedrock) API，严格保护占位符（如 `%d`, `%1$s`）。

## 2. Tech Stack

* **Framework**: Next.js 15 (App Router).
* **Database**: SQLite via Prisma (适合内网，单文件部署).
* **XML Parser**: `fast-xml-parser`.
* **AI API**: 自定义封装 Fetch 调用 BRConnector。具体方法参考 baodong_script文件夹中的内容

## 3. Data Schema (加固版)

```prisma
model Project {
  id                String   @id @default(cuid())
  name              String
  baseLanguageCode  String   @default("en") 
  systemPrompt      String?  @db.Text       // 存放术语表和指令
  languages         Language[]
  keys              TranslationKey[]
}

model TranslationKey {
  id            String   @id @default(cuid())
  stringName    String   // 词条唯一标识
  remarks       String?  @db.Text
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt // 最后修改时间
  projectId     String
  project       Project  @relation(fields: [projectId], references: [id])
  values        TranslationValue[]
  
  @@unique([projectId, stringName])
  @@index([stringName])
}

model TranslationValue {
  id             String         @id @default(cuid())
  languageCode   String         // 如 'zh-CN', 'en'
  content        String?        @db.Text
  translationKeyId String
  translationKey TranslationKey @relation(fields: [translationKeyId], references: [id], onDelete: Cascade)
}

```

## 4. Implementation Steps

### Phase 1: 核心 API 与 AI 适配

1. **Task**: 封装 `lib/ai/br-client.ts`。参考 `translation_service.py`：
* 使用 `fetch` 调用 `config.base_url`。
* 实现批量翻译逻辑：使用 `[i]` 索引和 `###` 分隔符。
* **Prompt 约束**：强制要求 AI 保留 `%d`, `%s`, `%1$s` 等符号，且不翻译备注信息。



### Phase 2: Android XML 导入与“冲突合并”逻辑

1. **Task**: 实现上传接口。
2. **Logic (关键)**：当解析到某个 `stringName` 已存在时：
* 比较新旧英文 `value`。
* 如果不同，将旧 `value` 写入 `remarks` 字段（例如：“[Old Value]: Previous content”），并更新 `values` 表中的内容。
* 更新 `updatedAt` 为当前时间。



### Phase 3: 管理后台与搜索增强

1. **Task**: 实现主列表，集成 **全局搜索**。
* 搜索范围：`stringName`、所有语言的 `TranslationValue.content`、`remarks`。


2. **Task**: 实现单个词条操作栏：
* **单条翻译**：针对该条目调用 AI。
* **仅英文 (Copy English to All)**：一键将当前 `baseLanguage` 的内容同步到该 Key 下的所有语言。
* **备注编辑**。



### Phase 4: 产品经理工作流 (AI & UI)

1. **Task**: “翻译”按钮逻辑：
* **自检**：检查待翻译条目是否有英文原文。若无，弹窗列出这些 `stringName` 并中断。
* **增量翻译**：仅选取目标语言为空的条目进行 AI 处理。