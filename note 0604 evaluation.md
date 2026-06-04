# NanoLoc 0604 需求开发与测试评估

评估日期：2026-06-04  
目标分支：`0.3.0`  
需求来源：`note 0604.txt`  
评估范围：只读评估，未修改业务代码。

## 1. 当前仓库状态

- 当前分支：`0.3.0`，跟踪 `origin/0.3.0`
- 工作区状态：仅有未跟踪文件 `note 0604.txt`
- 技术栈：Next.js 16 App Router、React 19、TypeScript、Prisma 6、SQLite、Tailwind CSS、NextAuth v5 beta
- 包管理：仓库有 `pnpm-lock.yaml`，Dockerfile 也使用 `pnpm`
- 测试成熟度：当前没有可识别的自动化测试框架、测试脚本或测试文件

## 2. 需求原文拆解

`note 0604.txt` 中包含以下需求：

1. 当前项目在导出 CSV 后，部分特殊字符会出现乱码，主要涉及 `ñ`、`ç`、`ã`、`¡` 等字符。考虑在现有 CSV 导出逻辑上加强编码处理，统一按 UTF-8 with BOM 导出。
2. 在项目详情页的翻译表格中，为基础语言列增加“固定/取消固定”功能。点击后，该列在横向滚动时保持固定。再次点击后，取消固定，恢复正常滚动。固定状态在当前项目页内翻页、搜索、刷新后继续保留。
3. CSV 导出时，增加 `remark` 列。
4. bug：部分翻译结果出现换行后的 `|||`。
5. 类型系统与数据契约重构。
6. 语言配置解析收口重构。
7. 自身的多语言。
8. 大规模多语言数据性能优化。
9. 新功能：检查一个语言中重复的内容。

## 3. 需求分组与建议优先级

### 第一组：适合先实现的明确需求

这些需求边界清楚，能较快完成，适合交给 `wymacmini` 上的 agent 执行。

1. CSV 导出编码增强
   - 当前 `exportCsv` 已经在 CSV 字符串前加了 `\uFEFF`。
   - 仍需要核查响应体是否以正确字节序输出，以及下载端 Excel/浏览器兼容情况。
   - 相关文件：
     - `src/lib/services/storage.service.ts`
     - `src/app/api/projects/[id]/export/route.ts`

2. CSV 导出增加 `remark` 列
   - 数据库模型 `TranslationKey.remarks` 已存在。
   - UI 也已经支持 remarks 编辑和展示。
   - 目前 CSV header 是 `['Key', project.baseLanguage, ...targetLangs]`，需要加入 `remark` 或 `Remarks` 列。
   - 需要确认列顺序，建议：`Key, Remarks, BaseLanguage, ...TargetLanguages`。

3. 翻译结果换行后出现 `|||`
   - 主要风险点在 AI 响应清洗和解析逻辑。
   - 相关文件：
     - `src/lib/ai/br-client.ts`
     - `src/lib/services/translate.service.ts`
   - 当前解析逻辑支持 anchor `<<N>>` 和 legacy `###` 分隔。
   - 需要查明 `|||` 是模型输出残留、旧分隔符、还是换行处理后的 UI/存储问题。
   - 建议增加统一清洗函数，只清理明确的协议残留，避免误删用户真实内容。

4. 基础语言列固定/取消固定
   - 当前表格前三列 Actions、Key、Remarks 已经是 sticky。
   - 基础语言列目前不是 sticky。
   - 需要为表头、只读行、编辑行、创建行同时适配固定状态。
   - 固定状态需要在当前项目页翻页、搜索、刷新后保留。
   - 建议使用 `localStorage`，key 形如 `nanoloc:project:<projectId>:pinBaseLanguage`。
   - 相关文件：
     - `src/app/projects/[id]/page.tsx`
     - `src/app/projects/[id]/components/TermRow.tsx`
     - `src/app/projects/[id]/components/CreateTermRow.tsx`
     - 可能需要新增一个小型 client 组件承载 pin 状态

### 第二组：需要先设计，不建议与第一组混做

这些需求会影响架构、数据模型或产品体验，不建议一次性交给 agent 直接实现。

1. 类型系统与数据契约重构
   - 当前项目中存在较多 `any`，例如 project detail page、actions、auth、toolbar 等位置。
   - 这是横向重构，可能影响页面、API route、server action、Prisma 返回类型。
   - 建议单独开任务，先定义目标类型边界。

2. 语言配置解析收口重构
   - 当前 `targetLanguages` 在数据库中是 JSON string，多处直接 `JSON.parse(project.targetLanguages || '[]')`。
   - 解析点分散在 service、actions、page、settings、batch translate、export/pull 等位置。
   - 建议新增统一 helper，例如 `parseTargetLanguages`、`serializeTargetLanguages`、`getProjectLanguages`。

3. 自身的多语言
   - 涉及 UI 文案、表单、toast、dialog、导航、错误消息、服务端返回文案。
   - 当前代码大量英文/中文文案直接写在组件中。
   - 需要先确定 i18n 方案、语言切换入口、默认语言、字典组织方式。

4. 大规模多语言数据性能优化
   - 当前分页查询每页取 50 个 key，并 include 所有 values。
   - 搜索条件包含 `values.some.content contains`，在大数据量下可能很慢。
   - CSV export 和 pull API 会全量读取项目 keys 和 values。
   - 需要先定义数据规模目标，例如 key 数、语言数、并发下载/翻译量。

5. 检查一个语言中重复的内容
   - 需要明确交互：检查入口、选择语言、是否忽略空值、是否大小写敏感、是否 trim、是否按项目范围。
   - 服务端实现不难，但 UI、结果展示和性能策略需要定下来。

## 4. 工作量评估

### 第一阶段：明确修复与小功能

预计工作量：0.5-1.5 天。

包含：

- CSV BOM/编码检查和响应头调整
- CSV 增加 `remark` 列
- 翻译结果 `|||` 清洗 bug
- 基础语言列固定/取消固定，刷新后保留
- 最小验证和必要截图/手工测试

主要风险：

- 基础语言列 sticky 需要覆盖表头、普通行、编辑行、创建行，否则滚动时会错位。
- sticky left offset 需要与 Actions、Key、Remarks 三列宽度保持一致。
- `|||` 清洗不能误删真实翻译内容中的合法字符。
- CSV 编码问题需要验证实际下载文件字节，而不只是字符串包含 BOM。

### 第二阶段：重构与较大产品功能

预计工作量：3-7 天以上。

包含：

- 类型系统与数据契约重构
- 语言配置解析收口
- 自身多语言化
- 大规模数据性能优化
- 重复内容检查

主要风险：

- 没有自动化测试，横向重构回归风险较高。
- Prisma/SQLite 当前结构适合小规模项目，大规模性能优化可能需要索引、查询策略、导出流式化，甚至数据库方案调整。
- 自身多语言化会触及大量 UI 文案，容易产生遗漏。

## 5. 测试现状

当前没有发现：

- `test` script
- Jest/Vitest/Playwright/Cypress 配置
- `*.test.*`、`*.spec.*`、`tests/`、`__tests__/` 等测试文件
- CI 中的 PR 验证测试流水线

已执行轻量检查：

- `./node_modules/.bin/tsc --noEmit`：通过
- `./node_modules/.bin/eslint .`：失败，当前基线已有 16 个 error 和 11 个 warning

ESLint 失败主要是既有问题：

- 多处 `@typescript-eslint/no-explicit-any`
- 多处未使用变量

注意：

- `pnpm lint` 和 `pnpm exec tsc --noEmit` 在当前受限环境下会触发 pnpm 依赖状态检查，并尝试写 `/Users/huxiao/_tmp_*`，因此因权限失败。
- 直接调用 `node_modules/.bin` 可以绕过该问题。

## 6. 建议的验证方案

第一阶段完成后，至少执行：

```bash
git status --short
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint .
pnpm run build
```

其中 `eslint` 当前基线不是全绿。建议验收时记录：

- 是否新增 lint error
- 是否修复或保留既有 lint error
- TypeScript 是否仍通过
- build 是否通过

CSV 手工/脚本验证：

- 下载 CSV 文件首字节应为 UTF-8 BOM：`EF BB BF`
- `ñ`、`ç`、`ã`、`¡` 在 Excel/Numbers/文本编辑器中显示正常
- `Remarks` 列存在且值正确
- 包含逗号、双引号、换行的字段仍符合 CSV escaping

翻译 bug 验证：

- 模拟 AI 返回含换行和 `|||` 的响应
- 确认存储到 `TranslationValue.content` 的结果不再带协议残留
- 确认真实内容中如果用户确实需要 `|||`，不会被过度清洗，或明确记录清洗规则

UI 验证：

- 项目详情页横向滚动时，固定基础语言列保持可见
- 再次点击后取消固定
- 翻页后状态保留
- 搜索后状态保留
- 刷新当前项目页后状态保留
- 不同项目之间固定状态互不污染
- 编辑态、创建态、普通展示态的列宽和 sticky left offset 不错位

## 7. 是否建议放到 wymacmini 执行

建议把第一阶段放到 `wymacmini` 上执行，不建议在当前 MacBook Air M4 上做完整构建和 UI 验证。

理由：

- 第一阶段需要跑 build、可能需要启动 dev server、做浏览器手工或截图验证。
- 当前 MacBook Air 环境下 pnpm 命令受权限限制，完整验证不顺畅。
- `wymacmini` 的 SSH 和 VNC 已确认可用，适合让远端 agent 执行并用 VNC 做页面检查。

不建议把第二阶段一次性丢给 agent：

- 第二阶段需求边界不清，重构和性能优化范围大。
- 当前缺少自动化测试，直接大改回归风险高。
- 应先拆设计文档和验收标准，再分批实现。

## 8. 给远端 agent 的推荐任务边界

建议任务描述：

> 在 `0.3.0` 分支上只实现 `note 0604.txt` 的第一阶段需求：CSV UTF-8 BOM/编码核查、CSV 增加 `Remarks` 列、修复翻译结果换行后出现 `|||` 的 bug、项目详情页基础语言列固定/取消固定并在当前项目页刷新后保留。不要做类型系统重构、语言配置解析重构、自身多语言化、大规模性能优化、重复内容检查。完成后回传改动文件列表、验证命令输出、CSV 验证结果和 UI 验证截图/说明。

建议限制：

- 不修改数据库 schema，除非发现第一阶段必须变更；目前看不需要。
- 不引入大型新依赖。
- 不清理无关 lint 债务。
- 不删除或覆盖 `note 0604.txt`。
- 若新增测试框架，应先说明原因；第一阶段可以优先做轻量手工验证和少量可维护的单元测试。

## 9. 总体结论

`note 0604.txt` 不是一个单一需求，而是一组从小修复到架构重构的混合需求。

推荐执行策略：

1. 先在 `wymacmini` 上完成第一阶段明确需求，控制改动面。
2. 第一阶段通过 TypeScript、build、CSV、UI 手工验证后，再决定是否合入。
3. 第二阶段单独拆分设计与验收标准，再按模块逐步执行。

