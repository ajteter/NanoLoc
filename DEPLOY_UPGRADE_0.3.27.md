# NanoLoc 2.0 到 0.3.27 生产升级说明

本文档用于从生产环境当前 `2.0` 分支升级到 `0.3.27` 分支。生产环境已有约 10 个项目时，建议按本文档先做备份和预演，再执行生产升级。

## 适用前提

本文档假设生产环境使用当前仓库的 Docker 部署方式：

- 应用通过 `docker-compose.yml` 或等价 Docker Compose 配置运行。
- SQLite 数据库持久化在宿主机 `./data` 目录，对应容器内 `/app/prisma/data/dev.db`。
- 容器启动脚本 `scripts/start.sh` 会自动执行 `npx prisma migrate deploy`。
- 生产 `.env` 已配置稳定的 `AUTH_SECRET`。
- 如果 Pull API 已被外部脚本使用，生产 `.env` 需要配置 `API_ACCESS_TOKEN`。当前 `deploy.sh` 不会自动生成这个 token。

如果生产环境不是以上部署方式，需要先确认数据库路径、数据卷挂载和启动命令，再套用本文档。

## 升级范围

`0.3.27` 相比 `2.0` 不是小补丁，包含阶段一、阶段二和验收 bugfix。主要变化包括：

- 新增词条截图功能，截图会被压缩并保存到 `data/uploads/term-screenshots`。
- 新增截图相关数据库字段。
- 新增 `TranslationValue(languageCode, content)` 查询索引。
- 项目详情页变更较大，包括截图列、语言列显示控制、基础语言 sticky、搜索结果 CSV 导出、重复内容检查。
- CSV 导出改为流式导出，并新增 `Remarks` 列。
- Pull API 改为流式输出。
- API 错误响应改为结构化 `{ error, code, details? }`。
- 多处 UI 文案和交互做了本地化及稳定性调整。

相关数据库迁移：

- `20260610090000_add_term_screenshot`
- `20260610140000_add_translation_value_lookup_indexes`

这两个迁移只新增可空字段和索引，不删除表或字段。

## 风险评估

整体风险：中等。数据库破坏性风险偏低，但部署、截图持久化、CSV/API 兼容性和 UI 回归需要重点验证。

| 风险项 | 等级 | 说明 | 控制方式 |
| --- | --- | --- | --- |
| 现有项目和词条数据 | 低 | 迁移不删除旧表旧字段 | 升级前完整备份 `data/` |
| SQLite 迁移锁表 | 中低 | 建索引时可能短暂阻塞写入 | 维护窗口内升级，升级期间停止用户写入 |
| 截图文件持久化 | 中 | 新增 `/app/data` 挂载，缺失挂载会导致截图随容器丢失 | 确认 Compose 包含 `./data:/app/data` |
| Docker 构建 | 中 | 新增 `sharp` 原生依赖，Alpine 构建需验证 | 先在 staging 或同环境构建 |
| CSV 下游脚本 | 中 | CSV 现在为 `Key, Remarks, 基础语言, 目标语言...` | 检查按列序号解析 CSV 的脚本 |
| Pull API 客户端 | 中低 | 成功结果语义基本保持，错误响应结构变化 | 验证 JSON/XML 拉取和错误处理 |
| 项目详情页 UI | 中 | 这是本轮改动最大页面 | 按验收清单覆盖搜索、sticky、截图、导入导出 |
| 回滚 | 中 | 最稳妥回滚是恢复升级前备份 | 不建议手工降级数据库结构 |

## 升级前必须确认

1. 当前生产确实运行在 `2.0` 或等价版本。
2. 生产服务器有足够磁盘空间保存至少一份完整 `data/` 备份。
3. 生产 `docker-compose.yml` 或等价配置包含以下两个持久化挂载：

```yaml
volumes:
  - ./data:/app/prisma/data
  - ./data:/app/data
```

4. 生产 `.env` 中的 `AUTH_SECRET` 不要重新生成，否则可能影响已有登录会话。
5. 如果有外部系统使用 Pull API，确认 `.env` 中存在 `API_ACCESS_TOKEN`。
6. 如果有外部脚本处理 NanoLoc CSV，确认它可以接受新增的 `Remarks` 列。

## 推荐流程

推荐顺序：

1. 生产数据备份。
2. 用备份数据在 staging 或临时目录预演升级。
3. staging 验证通过后，在维护窗口执行生产升级。
4. 生产升级后做 smoke test。
5. 线上观察一段时间后再清理旧分支或旧备份。

不要直接在没有备份的生产环境上升级。

## 生产备份步骤

在生产服务器的 NanoLoc 项目目录执行。以下命令使用 `docker-compose`，如果服务器使用 Docker Compose v2，可替换为 `docker compose`。

1. 创建备份目录：

```bash
mkdir -p backups
BACKUP_DIR="backups/nanoloc-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
```

2. 停止应用，确保 SQLite、WAL 和 SHM 文件状态一致：

```bash
docker-compose stop web
```

3. 备份生产配置和数据：

```bash
cp -a .env "$BACKUP_DIR/.env"
cp -a data "$BACKUP_DIR/data"
git rev-parse --abbrev-ref HEAD > "$BACKUP_DIR/git-branch.txt"
git rev-parse HEAD > "$BACKUP_DIR/git-commit.txt"
```

4. 确认备份内容存在：

```bash
ls -lah "$BACKUP_DIR"
ls -lah "$BACKUP_DIR/data"
```

如果此时不马上升级，可以重新启动旧版本：

```bash
docker-compose start web
```

## Staging 预演步骤

建议在同一台服务器的临时目录，或与生产尽量一致的机器上预演。

1. 准备临时目录：

```bash
cd /path/to/staging-parent
git clone /path/to/production/NanoLoc NanoLoc-upgrade-test
cd NanoLoc-upgrade-test
git fetch origin
git checkout 0.3.27
git pull --ff-only origin 0.3.27
```

2. 复制生产备份数据到 staging：

```bash
PROD_BACKUP_DIR="/path/to/production/NanoLoc/backups/nanoloc-YYYYMMDD-HHMMSS"
cp -a "$PROD_BACKUP_DIR/.env" .env
rm -rf data
cp -a "$PROD_BACKUP_DIR/data" data
```

3. 如果 staging 与生产在同一台机器上，避免端口冲突。可以临时修改 `docker-compose.yml` 的端口，例如：

```yaml
ports:
  - "3001:3000"
```

4. 构建并启动：

```bash
docker-compose up -d --build
docker-compose logs -f --tail=200 web
```

5. 日志中应能看到迁移执行和服务启动。重点关注：

- `Running database migrations`
- `Starting NanoLoc server`
- 没有 Prisma migration 错误
- 没有 `sharp` 加载或构建错误

6. 打开 staging 页面，按本文后面的 smoke test 清单验证。

staging 通过后，再进入生产升级。

## 生产升级步骤

在维护窗口执行，期间不要让用户继续编辑项目。

本文推荐使用显式 `docker-compose` 命令执行升级。也可以使用 `./deploy.sh`，但必须先完成备份，并确认生产 `.env` 已存在且不会被覆盖。

1. 确保已经完成备份，并且当前应用已停止：

```bash
docker-compose stop web
```

2. 切换到 `0.3.27`：

```bash
git fetch origin
git checkout 0.3.27
git pull --ff-only origin 0.3.27
```

3. 确认数据卷挂载：

```bash
grep -n "/app/prisma/data" docker-compose.yml
grep -n "/app/data" docker-compose.yml
```

应该能看到：

```text
./data:/app/prisma/data
./data:/app/data
```

4. 确认 `.env` 没有被覆盖：

```bash
test -f .env && grep -n "AUTH_SECRET" .env
```

如果 Pull API 正在使用：

```bash
grep -n "API_ACCESS_TOKEN" .env
```

不要把 `.env` 的密钥内容输出到聊天窗口或日志系统。

5. 构建并启动：

```bash
docker-compose up -d --build
```

6. 查看启动日志：

```bash
docker-compose logs -f --tail=200 web
```

日志中应能看到迁移执行完成并启动服务。如果构建失败，数据库通常还没有被迁移；如果容器启动后迁移失败，立即停止并按回滚流程处理。

7. 确认容器运行：

```bash
docker-compose ps
```

8. 打开生产页面进行 smoke test。

## 生产 smoke test 清单

建议至少由一个熟悉项目数据的人执行。

1. 登录已有账号。
2. 打开项目列表，确认约 10 个项目都可见。
3. 逐个打开每个项目详情页，确认词条表格能加载，没有空白页或服务端错误。
4. 在一个非关键项目或测试词条上编辑一个目标语言内容并保存，确认刷新后仍存在。
5. 搜索一个已存在关键词，确认结果正确。
6. 在搜索状态下开启基础语言 sticky，确认 sticky 列背景不透明，文字不重叠。
7. 鼠标悬停在 sticky 单元格上，确认背景不透明，文字不重叠。
8. 使用语言列显示控制，隐藏和恢复一个目标语言列。
9. 执行完整 CSV 导出，确认文件能打开，列顺序为 `Key, Remarks, 基础语言, 目标语言...`。
10. 在搜索有结果时执行搜索结果 CSV 导出，确认只包含所有命中行，不只包含当前分页。
11. 搜索无结果时，确认搜索结果 CSV 导出按钮不可用。
12. 用一个测试词条上传截图，确认表格显示图片图标，悬停可预览。
13. 替换同一词条截图，确认预览变为新图片。
14. 删除该截图，确认图标和预览消失。
15. 重启容器后再次打开该项目，确认已保留的截图仍可访问：

```bash
docker-compose restart web
```

16. 如果生产使用导入功能，导入一个小测试文件，确认不会覆盖已有基础语言冲突内容，冲突会记录到备注。
17. 如果生产使用 Pull API，验证 JSON 和 XML：

```bash
curl -H "Authorization: Bearer $API_ACCESS_TOKEN" \
  "http://localhost:3000/api/projects/PROJECT_ID/pull?format=json"

curl -H "Authorization: Bearer $API_ACCESS_TOKEN" \
  "http://localhost:3000/api/projects/PROJECT_ID/pull?format=xml&lang=en-US"
```

18. 如果生产使用 AI 翻译，选择少量词条测试一次批量翻译或单元格翻译。
19. 查看活动日志，确认刚才的编辑、导入或截图操作有记录。
20. 查看容器日志，确认没有持续报错：

```bash
docker-compose logs --tail=200 web
```

## 回滚方案

最安全的回滚方式是恢复升级前备份，而不是手工删除数据库字段或迁移记录。

### 情况 A：构建失败，容器未成功启动

通常数据库还没有被迁移。可以切回 `2.0` 并启动旧版本：

```bash
git checkout 2.0
docker-compose up -d --build
```

如果不确定是否已经迁移，按情况 B 处理。

### 情况 B：容器启动后发现严重问题，且升级后没有产生重要新数据

停止服务，恢复升级前备份：

```bash
docker-compose down
rm -rf data
cp -a "$BACKUP_DIR/data" data
cp -a "$BACKUP_DIR/.env" .env
git checkout 2.0
docker-compose up -d --build
```

恢复后执行基础验证：

- 可以登录。
- 项目列表正常。
- 项目详情页正常。
- 旧 CSV 导出或 Pull API 正常。

### 情况 C：升级后已经有用户写入了重要新数据

优先建议修复前进，不建议直接回滚。原因：

- 回滚到备份会丢失升级后的编辑、导入、截图等新数据。
- `2.0` 不识别截图 UI，即使数据库保留截图字段，旧界面也无法使用。
- 手工合并 SQLite 新旧数据风险较高。

如果必须回滚，需要先明确可接受的数据损失窗口，再恢复备份。

## 不建议执行的操作

- 不要在生产上运行 `prisma db push`。
- 不要删除 `data/` 后重新启动。
- 不要手工编辑 Prisma migration 表。
- 不要在没有备份的情况下执行 `docker-compose up -d --build`。
- 不要重新生成生产 `AUTH_SECRET`。
- 不要把 GitHub token、`.env` 或 API token 打印到聊天窗口。

## 升级后观察

升级后建议至少观察一段完整工作日，重点看：

- 项目详情页加载是否稳定。
- CSV 导出和搜索结果 CSV 导出是否符合团队使用方式。
- Pull API 是否被外部脚本正常调用。
- 截图上传后磁盘空间增长是否可接受。
- 容器日志是否持续出现 Prisma、Next.js、sharp 或文件权限错误。

确认线上稳定后，再考虑合并分支和清理过旧分支。不要在验收和线上运行初期删除可回滚参考分支。
