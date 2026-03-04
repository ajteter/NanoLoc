# NanoLoc 开发者 API 文档

## 概述

NanoLoc 提供 REST API 接口，供开发者和 CI/CD 流水线直接拉取项目翻译数据。

**基础地址：** `https://<你的NanoLoc服务地址>`

---

## 认证方式

所有 API 请求需要在 `Authorization` 头中携带 Bearer Token。

```
Authorization: Bearer <API_ACCESS_TOKEN>
```

`API_ACCESS_TOKEN` 配置在服务器的 `.env` 文件中。请向 NanoLoc 管理员获取 Token。

| 响应码 | 含义 |
|---|---|
| `401 Unauthorized` | Token 缺失、为空或无效 |

---

## 接口

### `GET /api/projects/{projectId}/pull`

拉取指定项目的翻译数据。

#### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `projectId` | string | ✅ | 项目 ID（可在 UI 中通过"API"按钮查看，或从 URL 获取） |

#### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `format` | `json` \| `xml` | `json` | 输出格式 |
| `lang` | string | — | 语言代码（如 `zh-CN`、`ja`、`ko`）。`format=json` 时不传则返回全部语言 |

#### 返回模式

##### 模式 A：全量 JSON 导出

**条件：** `format=json` 且无 `lang` 参数

返回所有翻译 Key 及其所有语言的翻译。

```bash
curl -H "Authorization: Bearer <TOKEN>" \
     "https://<HOST>/api/projects/<PROJECT_ID>/pull?format=json" \
     -o translations.json
```

**响应示例** (`Content-Type: application/json`)：

```json
{
  "app_name": {
    "en-US": "My App",
    "zh-CN": "我的应用",
    "ja": "マイアプリ"
  },
  "welcome_message": {
    "en-US": "Welcome, %s!",
    "zh-CN": "欢迎，%s！",
    "ja": "ようこそ、%s！"
  }
}
```

##### 模式 B：单语言 JSON

**条件：** `format=json` 且指定了 `lang`

返回指定语言的扁平 key-value 映射。若某个 Key 没有该语言的翻译，则使用基础语言的值作为兜底。

```bash
curl -H "Authorization: Bearer <TOKEN>" \
     "https://<HOST>/api/projects/<PROJECT_ID>/pull?format=json&lang=zh-CN" \
     -o strings_zh-CN.json
```

**响应示例** (`Content-Type: application/json`)：

```json
{
  "app_name": "我的应用",
  "welcome_message": "欢迎，%s！"
}
```

##### 模式 C：Android XML

**条件：** `format=xml` 且指定了 `lang`（XML 格式必须指定语言）

返回标准 Android `strings.xml` 文件。缺失的翻译使用基础语言兜底。

```bash
curl -H "Authorization: Bearer <TOKEN>" \
     "https://<HOST>/api/projects/<PROJECT_ID>/pull?format=xml&lang=zh-CN" \
     -o strings.xml
```

**响应示例** (`Content-Type: application/xml`)：

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">我的应用</string>
    <string name="welcome_message">欢迎，%s！</string>
</resources>
```

#### 错误响应

| 状态码 | 响应体 | 原因 |
|---|---|---|
| `400` | `{"error": "Invalid format..."}` | `format` 不是 `json` 或 `xml` |
| `400` | `{"error": "XML format requires..."}` | `format=xml` 但未提供 `lang` |
| `401` | `{"error": "Unauthorized"}` | Token 缺失或无效 |
| `404` | `{"error": "Project not found"}` | `projectId` 无效 |
| `500` | `{"error": "Internal Server Error"}` | 服务器内部错误 |

---

## CI/CD 集成示例

### Shell 脚本

```bash
#!/bin/bash
NANOLOC_HOST="https://nanoloc.example.com"
PROJECT_ID="clxxxxxxxxxxxxxxxxx"
TOKEN="your-api-access-token"

# 拉取全量翻译 JSON
curl -s -H "Authorization: Bearer $TOKEN" \
     "$NANOLOC_HOST/api/projects/$PROJECT_ID/pull?format=json" \
     -o src/i18n/translations.json

# 拉取各语言的 Android XML
for LANG in zh-CN ja ko; do
    curl -s -H "Authorization: Bearer $TOKEN" \
         "$NANOLOC_HOST/api/projects/$PROJECT_ID/pull?format=xml&lang=$LANG" \
         -o "app/src/main/res/values-${LANG}/strings.xml"
done

echo "✅ 翻译数据已更新"
```

### GitHub Actions

```yaml
- name: 从 NanoLoc 拉取翻译
  run: |
    curl -s -H "Authorization: Bearer ${{ secrets.NANOLOC_API_TOKEN }}" \
         "${{ vars.NANOLOC_HOST }}/api/projects/${{ vars.NANOLOC_PROJECT_ID }}/pull?format=json" \
         -o src/i18n/translations.json
```

### Python 脚本

```python
import requests

HOST = "https://nanoloc.example.com"
PROJECT_ID = "clxxxxxxxxxxxxxxxxx"
TOKEN = "your-api-access-token"

headers = {"Authorization": f"Bearer {TOKEN}"}

# 全量导出
resp = requests.get(f"{HOST}/api/projects/{PROJECT_ID}/pull?format=json", headers=headers)
resp.raise_for_status()
translations = resp.json()

# 单语言导出
resp = requests.get(f"{HOST}/api/projects/{PROJECT_ID}/pull?format=json&lang=zh-CN", headers=headers)
zh_cn = resp.json()
```

---

## 如何获取 Project ID

1. 打开 NanoLoc 中的项目
2. 点击工具栏中的 **API** 按钮（在"Export CSV"旁边）
3. 弹窗顶部即可看到 Project ID，旁边有复制按钮

或者直接从项目 URL 中提取：
```
https://nanoloc.example.com/projects/clxxxxxxxxxxxxxxxxx
                                      └── 这就是 Project ID
```

---

## 排序规则

API 返回的 Key 按 **导入顺序** 排列（`sortOrder ASC`）：
- 先从 XML 导入的 Key 排在前面
- 与 CSV 导出顺序一致，也与原始 XML 文件中的顺序一致
- 在 UI 中手动创建的新 Key 排在最后

---

## 性能说明

- 默认不限制请求频率
- JSON 全量导出针对 5,000 个 Key 以内的项目做了优化
- 响应不缓存（`Cache-Control: no-store`），确保数据实时性
