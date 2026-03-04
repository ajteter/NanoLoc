# -*- coding: utf-8 -*-
"""
NanoLoc Developer API 测试脚本

功能：
    测试 NanoLoc Pull API 的所有模式，验证 API 是否正常工作。

测试项：
    1. 认证测试（无 Token / 错误 Token / 正确 Token）
    2. 模式 A：全量 JSON 导出（所有 Key × 所有语言）
    3. 模式 B：单语言 JSON 导出
    4. 模式 C：单语言 Android XML 导出
    5. 错误处理（无效 format / XML 缺少 lang / 不存在的项目）

使用方法：
    # 先确保 .env 中配置了 API_ACCESS_TOKEN
    python3 test_api.py

无外部依赖，仅使用 Python 标准库。
"""

import json
import sys
import urllib.request
import urllib.error

# ============================================================
# 配置 - 根据实际环境修改
# ============================================================
HOST = "http://172.16.1.79:3000"
API_TOKEN = "test-nanoloc-api-token-2026"  # 需与 .env 中 API_ACCESS_TOKEN 一致

# 项目 ID，留空则自动通过页面获取
PROJECT_ID = ""

# ============================================================
# 工具函数
# ============================================================

def api_request(path, token=None, expect_status=200):
    """发送 GET 请求并返回 (status_code, content_type, body)"""
    url = f"{HOST}{path}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, headers=headers)
    try:
        resp = urllib.request.urlopen(req)
        body = resp.read().decode("utf-8")
        content_type = resp.headers.get("Content-Type", "")
        return resp.status, content_type, body
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if e.fp else ""
        return e.code, "", body


def print_header(title):
    """打印测试标题"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def print_result(name, passed, detail=""):
    """打印单项测试结果"""
    icon = "✅" if passed else "❌"
    print(f"  {icon} {name}")
    if detail:
        for line in detail.strip().split("\n"):
            print(f"       {line}")


def discover_project_id():
    """
    尝试通过 session cookie 获取项目列表来自动发现 Project ID。
    如果失败则提示用户手动填写。
    """
    print("\n🔍 未指定 PROJECT_ID，尝试自动发现...")

    # 先用 API token 无法获取项目列表（那是 session 认证的）
    # 提示用户从浏览器获取
    print("   ℹ️  请在浏览器中打开项目，从 URL 中复制 Project ID")
    print(f"   ℹ️  例如: {HOST}/projects/clxxxxxxxxxxxxxxxxx")
    print(f"   ℹ️  或在项目页面点击 API 按钮查看 Project ID")
    print()
    pid = input("   请输入 Project ID: ").strip()
    if not pid:
        print("   ❌ 未输入 Project ID，退出")
        sys.exit(1)
    return pid


# ============================================================
# 测试用例
# ============================================================

def test_auth_no_token(project_id):
    """测试：无 Token 请求应返回 401"""
    status, _, body = api_request(f"/api/projects/{project_id}/pull", token=None)
    passed = status == 401
    print_result(
        "无 Token → 401 Unauthorized",
        passed,
        f"状态码: {status}" + ("" if passed else f" (期望 401)\n响应: {body[:200]}")
    )
    return passed


def test_auth_wrong_token(project_id):
    """测试：错误 Token 请求应返回 401"""
    status, _, body = api_request(f"/api/projects/{project_id}/pull", token="wrong-token-12345")
    passed = status == 401
    print_result(
        "错误 Token → 401 Unauthorized",
        passed,
        f"状态码: {status}" + ("" if passed else f" (期望 401)\n响应: {body[:200]}")
    )
    return passed


def test_auth_correct_token(project_id):
    """测试：正确 Token 请求应返回 200"""
    status, _, body = api_request(f"/api/projects/{project_id}/pull", token=API_TOKEN)
    passed = status == 200
    print_result(
        "正确 Token → 200 OK",
        passed,
        f"状态码: {status}" + ("" if passed else f" (期望 200)\n响应: {body[:200]}")
    )
    return passed


def test_mode_a_full_json(project_id):
    """测试模式 A：全量 JSON 导出"""
    status, ct, body = api_request(
        f"/api/projects/{project_id}/pull?format=json",
        token=API_TOKEN
    )
    if status != 200:
        print_result("模式 A: 全量 JSON", False, f"状态码 {status}: {body[:200]}")
        return False

    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        print_result("模式 A: 全量 JSON", False, f"响应不是合法 JSON: {body[:200]}")
        return False

    is_json = "application/json" in ct
    key_count = len(data)
    sample_keys = list(data.keys())[:3]

    # 检查结构：每个 key 应该是 { lang: value } 的字典
    valid_structure = True
    lang_count = 0
    for k in sample_keys:
        if isinstance(data[k], dict):
            lang_count = max(lang_count, len(data[k]))
        else:
            valid_structure = False

    passed = is_json and key_count > 0 and valid_structure
    detail = (
        f"Content-Type: {ct}\n"
        f"Key 数量: {key_count}\n"
        f"语言数量: {lang_count}\n"
        f"示例 Key: {sample_keys}\n"
        f"数据结构正确: {'是' if valid_structure else '否'}"
    )
    if sample_keys:
        first_key = sample_keys[0]
        detail += f"\n示例数据: {first_key} → {json.dumps(data[first_key], ensure_ascii=False)[:100]}"

    print_result("模式 A: 全量 JSON", passed, detail)
    return passed


def test_mode_b_single_lang_json(project_id, lang="zh-CN"):
    """测试模式 B：单语言 JSON"""
    status, ct, body = api_request(
        f"/api/projects/{project_id}/pull?format=json&lang={lang}",
        token=API_TOKEN
    )
    if status != 200:
        print_result(f"模式 B: 单语言 JSON ({lang})", False, f"状态码 {status}: {body[:200]}")
        return False

    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        print_result(f"模式 B: 单语言 JSON ({lang})", False, f"响应不是合法 JSON: {body[:200]}")
        return False

    key_count = len(data)
    sample = list(data.items())[:3]

    # 单语言模式下值应该直接是字符串
    valid_structure = all(isinstance(v, str) for k, v in sample)

    passed = key_count > 0 and valid_structure
    detail = (
        f"Content-Type: {ct}\n"
        f"Key 数量: {key_count}\n"
        f"值类型正确 (string): {'是' if valid_structure else '否'}"
    )
    for k, v in sample:
        detail += f"\n  {k} → {v[:80]}"

    print_result(f"模式 B: 单语言 JSON ({lang})", passed, detail)
    return passed


def test_mode_c_xml(project_id, lang="zh-CN"):
    """测试模式 C：Android XML"""
    status, ct, body = api_request(
        f"/api/projects/{project_id}/pull?format=xml&lang={lang}",
        token=API_TOKEN
    )
    if status != 200:
        print_result(f"模式 C: Android XML ({lang})", False, f"状态码 {status}: {body[:200]}")
        return False

    has_xml_header = '<?xml' in body
    has_resources = '<resources>' in body and '</resources>' in body
    has_string_tag = '<string name=' in body
    is_xml_ct = "xml" in ct.lower()

    passed = has_xml_header and has_resources and has_string_tag
    string_count = body.count('<string name=')
    detail = (
        f"Content-Type: {ct}\n"
        f"XML 声明: {'有' if has_xml_header else '无'}\n"
        f"<resources> 标签: {'有' if has_resources else '无'}\n"
        f"<string> 条目数: {string_count}\n"
        f"前 200 字符:\n{body[:200]}"
    )

    print_result(f"模式 C: Android XML ({lang})", passed, detail)
    return passed


def test_error_invalid_format(project_id):
    """测试错误：无效 format 参数"""
    status, _, body = api_request(
        f"/api/projects/{project_id}/pull?format=csv",
        token=API_TOKEN
    )
    # format 参数只允许 json 和 xml，csv 应该返回 400
    # 但实际代码中 format 被转为 'json' | 'xml'，csv 会变成 'csv' 不匹配
    passed = status == 400
    print_result(
        "错误处理: 无效 format → 400",
        passed,
        f"状态码: {status}" + ("" if passed else f" (期望 400)\n响应: {body[:200]}")
    )
    return passed


def test_error_xml_no_lang(project_id):
    """测试错误：XML 格式未提供 lang"""
    status, _, body = api_request(
        f"/api/projects/{project_id}/pull?format=xml",
        token=API_TOKEN
    )
    passed = status == 400
    print_result(
        "错误处理: XML 无 lang → 400",
        passed,
        f"状态码: {status}" + ("" if passed else f" (期望 400)\n响应: {body[:200]}")
    )
    return passed


def test_error_not_found():
    """测试错误：不存在的项目 ID"""
    status, _, body = api_request(
        "/api/projects/nonexistent-project-id/pull",
        token=API_TOKEN
    )
    passed = status == 404
    print_result(
        "错误处理: 不存在的项目 → 404",
        passed,
        f"状态码: {status}" + ("" if passed else f" (期望 404)\n响应: {body[:200]}")
    )
    return passed


# ============================================================
# 主函数
# ============================================================

def main():
    print("╔════════════════════════════════════════════════════════════╗")
    print("║           NanoLoc Developer API 测试工具                  ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print(f"\n🌐 服务地址: {HOST}")
    print(f"🔑 API Token: {API_TOKEN[:8]}{'*' * (len(API_TOKEN) - 8)}")

    global PROJECT_ID
    project_id = PROJECT_ID
    if not project_id:
        project_id = discover_project_id()

    print(f"📦 Project ID: {project_id}")

    results = []

    # ---- 认证测试 ----
    print_header("认证测试")
    results.append(test_auth_no_token(project_id))
    results.append(test_auth_wrong_token(project_id))
    results.append(test_auth_correct_token(project_id))

    # ---- 功能测试 ----
    print_header("功能测试 - 三种导出模式")
    results.append(test_mode_a_full_json(project_id))
    results.append(test_mode_b_single_lang_json(project_id, "zh-CN"))
    results.append(test_mode_c_xml(project_id, "zh-CN"))

    # ---- 错误处理测试 ----
    print_header("错误处理测试")
    results.append(test_error_invalid_format(project_id))
    results.append(test_error_xml_no_lang(project_id))
    results.append(test_error_not_found())

    # ---- 总结 ----
    print_header("测试总结")
    total = len(results)
    passed = sum(results)
    failed = total - passed

    print(f"\n  总计: {total} 项测试")
    print(f"  通过: {passed} ✅")
    if failed > 0:
        print(f"  失败: {failed} ❌")
    print()

    if failed == 0:
        print("  🎉 全部通过！API 工作正常。")
    else:
        print(f"  ⚠️ 有 {failed} 项测试失败，请检查。")

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
