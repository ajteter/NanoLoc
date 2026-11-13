# 0.3.31 使用反馈：测试与交付记录

日期：2026-11-13。分支：`codex/0.3.31-feedback`。基线：`0.3.31`，提交 `0625a6a`。

## 自动化验证

以下检查全部通过：

```sh
pnpm verify:feedback
pnpm verify:contracts
pnpm verify:placeholders
pnpm exec tsc --noEmit
pnpm exec eslint .
pnpm build
```

本地通过 `node_modules/.bin` 运行上述对应入口。反馈回归脚本使用临时 SQLite 数据库，实际执行全部迁移，模拟 AI 响应，不修改现有业务数据库、不调用真实 AI 服务。

覆盖的行为：

- 保留 `10-20 kg`、`24/7 support`、`3.5 MB`、负数、百分比及合法编号，继续识别明确的 AI 响应协议。
- 导入和新增要求非空负责人；需求/缺陷说明支持自由文本；XML、JSON、iOS strings 导入均写入元数据。
- 重复导入只补缺失元数据、保留源文及备注、拼接并去重新增说明；无效元数据不写入。
- 手工、AI、同源文来源正确区分；保存未改动的值不会将机器译文误标为人工。
- Clear Row 保留人工译文及基础语言；人工空值不会被批量填入。
- AI 请求期间保存的人工译文不会被返回的机器结果覆盖。
- 现有存储格式及占位符契约保持通过。

## 浏览器验证

使用本地生产构建、隔离测试数据和 Chrome 验证：

- 只读、编辑、新建、空结果、横向滚动、基础语言冻结切换及语言列增减时表头与正文对齐；常规行实测列边界偏差为 0 px。
- 1600 × 1000 和 1024 × 768 窗口布局；后者无页面横向溢出。
- 缺失及纯空白翻译红色提示、人工标识、Clear Row 保留人工稿。
- 导入弹窗必填校验（包括纯空白负责人）、自由文本说明及新增词条元数据。
- 原生 Cmd+V 截图上传、预览、替换、连续粘贴防重，以及上传失败后重试。
- 两个页面并发编辑：一个页面上传截图触发刷新后，保存自己的翻译草稿仍保留另一页面已保存的其他语言译文和负责人。
- 一键同源文跳过人工稿，复制内容不标为人工，随后 Clear Row 正确保留人工单元格。

最终浏览器回归无页面脚本错误。浏览器检查为手工驱动的验收记录，未新增持久化 E2E 测试套件。

## 升级说明

- 新增迁移 `20261113090000_add_term_metadata_and_manual_flag`，包含 `TranslationKey.developerOwner`、`TranslationKey.requestNote`、`TranslationValue.isManual` 三个字段。
- 部署新版前执行 `pnpm exec prisma migrate deploy`；现有 Docker 启动脚本会执行数据库迁移。本轮仅提交代码，不部署生产环境。
- 历史词条的元数据默认为空，历史译文 `isManual` 默认为 `false`；不自动推断人工来源。历史已损坏的开头数字需另行复核恢复。
- 导入 API 的 FormData 现在必须包含 `developerOwner`，可选 `requestNote`；新增词条 API 同样要求 `developerOwner`。
- 完整发布前质检门禁已记录于 [TODO.md](./TODO.md)，后续单独实现。
