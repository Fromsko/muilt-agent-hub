#Requires -Version 7
<#
AgentHub 端到端回归脚本（PowerShell 7+）

使用：
    pwsh -File tests\e2e.ps1                  # 仅后端 API 验证
    pwsh -File tests\e2e.ps1 -IncludeUI       # 追加前端浏览器自动化（需要 playwright-cli）
    pwsh -File tests\e2e.ps1 -Backend http://127.0.0.1:8000 -Frontend http://localhost:3000

前置：
  - 后端已运行：uv run uvicorn app.main:app --port 8000
  - 前端可选：  bun run dev（若加 -IncludeUI）
  - 已在 Key「智谱 GLM」的 .env 或运行环境中备好 ZHIPU_API_KEY（用于 Chat 冒烟）

退出码：
  0 = 全部通过
  非 0 = 失败
#>
param(
    [string]$Backend = 'http://127.0.0.1:8000',
    [string]$Frontend = 'http://localhost:3000',
    [string]$Email = "e2e-$([int](Get-Date -UFormat %s))@agenthub.dev",
    [string]$Password = 'e2epass12345',
    [string]$ZhipuKey = $env:ZHIPU_API_KEY,
    [string]$McpUrl = 'http://127.0.0.1:9100/mcp/',
    [switch]$IncludeUI
)

$ErrorActionPreference = 'Stop'
$script:Passed = 0
$script:Failed = 0

function Invoke-Step {
    param([string]$Name, [scriptblock]$Body)
    Write-Host "▶ $Name" -ForegroundColor Cyan
    try {
        & $Body
        $script:Passed += 1
        Write-Host "  ✅ PASS" -ForegroundColor Green
    }
    catch {
        $script:Failed += 1
        Write-Host "  ❌ FAIL: $_" -ForegroundColor Red
    }
}

function Assert-True {
    param([bool]$Condition, [string]$Msg)
    if (-not $Condition) { throw "assertion failed: $Msg" }
}

$api = "$Backend/api/v1"
$token = $null
$promptId = $null
$keyId = $null
$agentId = $null

Write-Host "=== AgentHub E2E @ $Backend ===" -ForegroundColor Yellow
Write-Host "test account: $Email"

# --- TC-01 健康检查 ---
Invoke-Step 'TC-01 GET /health' {
    $r = Invoke-RestMethod -Uri "$api/health"
    Assert-True ($r.status -eq 'ok') "health status: $($r.status)"
}

# --- TC-02 注册 ---
Invoke-Step 'TC-02 POST /auth/register' {
    $body = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
    $r = Invoke-RestMethod -Uri "$api/auth/register" -Method Post `
        -ContentType 'application/json' -Body $body
    Assert-True ([bool]$r.id) "no user id returned"
}

# --- TC-03 登录 ---
Invoke-Step 'TC-03 POST /auth/jwt/login' {
    $r = Invoke-RestMethod -Uri "$api/auth/jwt/login" -Method Post `
        -ContentType 'application/x-www-form-urlencoded' `
        -Body @{ username = $Email; password = $Password }
    Assert-True ([bool]$r.access_token) "no access_token"
    $script:token = $r.access_token
}

$authHeader = @{ Authorization = "Bearer $token" }

# --- TC-04 当前用户 ---
Invoke-Step 'TC-04 GET /users/me' {
    $r = Invoke-RestMethod -Uri "$api/users/me" -Headers $authHeader
    Assert-True ($r.email -eq $Email) "email mismatch: $($r.email)"
}

# --- TC-05 Prompt CRUD ---
Invoke-Step 'TC-05 Prompt CRUD' {
    $body = @{ name = 'e2e 助手'; content = '你是一名测试助手。' } | ConvertTo-Json
    $c = Invoke-RestMethod -Uri "$api/prompts" -Method Post `
        -Headers $authHeader -ContentType 'application/json' -Body $body
    Assert-True ([bool]$c.id) "no prompt id"
    $script:promptId = $c.id

    $list = Invoke-RestMethod -Uri "$api/prompts" -Headers $authHeader
    Assert-True (($list | Where-Object { $_.id -eq $promptId }).Count -eq 1) "prompt not in list"

    $patch = @{ name = 'e2e 助手 v2' } | ConvertTo-Json
    $u = Invoke-RestMethod -Uri "$api/prompts/$promptId" -Method Patch `
        -Headers $authHeader -ContentType 'application/json' -Body $patch
    Assert-True ($u.name -eq 'e2e 助手 v2') "update failed"
}

# --- TC-06 Key CRUD（加密 + 脱敏） ---
Invoke-Step 'TC-06 Key CRUD' {
    $probeKey = if ($ZhipuKey) { $ZhipuKey } else { 'sk-testdummykey-1234567890abcdef' }
    $body = @{
        provider = 'zhipu'
        name     = 'e2e 智谱密钥'
        api_key  = $probeKey
        api_base = 'https://open.bigmodel.cn/api/paas/v4'
    } | ConvertTo-Json
    $c = Invoke-RestMethod -Uri "$api/keys" -Method Post `
        -Headers $authHeader -ContentType 'application/json' -Body $body
    Assert-True ([bool]$c.id) "no key id"
    Assert-True ($c.api_key_masked -match '\*') "masking not applied: $($c.api_key_masked)"
    $script:keyId = $c.id
}

# --- TC-07 Agent CRUD ---
Invoke-Step 'TC-07 Agent CRUD' {
    $body = @{
        name        = 'e2e 对话 Bot'
        description = '端到端测试用'
        prompt_id   = $promptId
        key_id      = $keyId
        model       = 'openai/glm-4.5'
        temperature = 0.7
        max_tokens  = 512
    } | ConvertTo-Json
    $c = Invoke-RestMethod -Uri "$api/agents" -Method Post `
        -Headers $authHeader -ContentType 'application/json' -Body $body
    Assert-True ([bool]$c.id) "no agent id"
    $script:agentId = $c.id
}

# --- TC-08 Chat 非流式（真实模型，仅当 ZhipuKey 提供时） ---
if ($ZhipuKey) {
    Invoke-Step 'TC-08 POST /agents/{id}/chat (non-stream, real model)' {
        $body = @{ message = '用一个字回答：你好'; stream = $false } | ConvertTo-Json
        $r = Invoke-RestMethod -Uri "$api/agents/$agentId/chat" -Method Post `
            -Headers $authHeader -ContentType 'application/json' -Body $body `
            -TimeoutSec 30
        Assert-True ([bool]$r.reply) "empty reply"
        Write-Host "    reply: $($r.reply)" -ForegroundColor DarkGray
    }

    Invoke-Step 'TC-09 GET /agents/{id}/messages' {
        $msgs = Invoke-RestMethod -Uri "$api/agents/$agentId/messages" -Headers $authHeader
        Assert-True ($msgs.Count -ge 2) "expected >=2 messages, got $($msgs.Count)"
    }
}
else {
    Write-Host 'ℹ  ZHIPU_API_KEY 未设置，跳过真实模型 Chat 测试' -ForegroundColor Yellow
}

# --- A3 Stats 端点 ---
Invoke-Step 'A3 GET /stats' {
    $r = Invoke-RestMethod -Uri "$api/stats" -Headers $authHeader
    Assert-True ($r.agent_count -ge 1) "agent_count < 1: $($r.agent_count)"
    Assert-True ($r.prompt_count -ge 1) "prompt_count < 1"
    Assert-True ($r.key_count -ge 1) "key_count < 1"
    Write-Host "    stats: agents=$($r.agent_count) prompts=$($r.prompt_count) keys=$($r.key_count) msgs=$($r.message_count)" -ForegroundColor DarkGray
}

# --- A4 Key 连通性测试 ---
if ($ZhipuKey) {
    Invoke-Step 'A4 POST /keys/test (real Zhipu key)' {
        $body = @{
            api_key  = $ZhipuKey
            api_base = 'https://open.bigmodel.cn/api/paas/v4'
        } | ConvertTo-Json
        $r = Invoke-RestMethod -Uri "$api/keys/test" -Method Post `
            -Headers $authHeader -ContentType 'application/json' -Body $body `
            -TimeoutSec 30
        Assert-True $r.ok "key test failed: $($r.message)"
        Write-Host "    $($r.message) ($($r.latency_ms)ms, model=$($r.model))" -ForegroundColor DarkGray
    }
}

# --- A1 多轮对话 ---
if ($ZhipuKey) {
    Invoke-Step 'A1 多轮对话上下文连贯' {
        # 第 1 轮：告知名字
        $b1 = @{ message = '请记住我的名字是 Alice。如果记住了，请回复"好的，Alice"'; stream = $false } | ConvertTo-Json
        $r1 = Invoke-RestMethod -Uri "$api/agents/$agentId/chat" -Method Post `
            -Headers $authHeader -ContentType 'application/json' -Body $b1 -TimeoutSec 30
        Assert-True ([bool]$r1.reply) "no reply round 1"

        # 第 2 轮：问名字（依赖上下文）
        $b2 = @{ message = '我叫什么名字？请用一个词回答。'; stream = $false } | ConvertTo-Json
        $r2 = Invoke-RestMethod -Uri "$api/agents/$agentId/chat" -Method Post `
            -Headers $authHeader -ContentType 'application/json' -Body $b2 -TimeoutSec 30
        Assert-True ($r2.reply -match 'Alice|alice') "second turn did not remember name; reply='$($r2.reply)'"
        Write-Host "    round2 reply: $($r2.reply)" -ForegroundColor DarkGray
    }
}

# --- B1 对外 API Token ---
Invoke-Step 'B1 创建 API Token + ah_ 前缀' {
    $body = @{ name = 'e2e-curl' } | ConvertTo-Json
    $script:apiToken = Invoke-RestMethod -Uri "$api/api-tokens" -Method Post `
        -Headers $authHeader -ContentType 'application/json' -Body $body
    Assert-True ($script:apiToken.token -like 'ah_*') "token not ah_ prefix: $($script:apiToken.token)"
    Assert-True ([bool]$script:apiToken.tail) 'tail empty'
    $list = Invoke-RestMethod -Uri "$api/api-tokens" -Headers $authHeader
    Assert-True ($list.Count -ge 1) 'list empty'
    Assert-True (-not ($list[0].PSObject.Properties.Name -contains 'token')) 'list leaked plain token'
}

Invoke-Step 'B1 用 ah_ token 调 /public/me' {
    $ph = @{ Authorization = "Bearer $($script:apiToken.token)" }
    $me = Invoke-RestMethod -Uri "$api/public/me" -Headers $ph
    Assert-True ($me.email -eq $Email) "public/me email mismatch: $($me.email)"
}

Invoke-Step 'B1 /public 拒绝 JWT（防滥用）' {
    try {
        Invoke-RestMethod -Uri "$api/public/me" -Headers $authHeader | Out-Null
        throw 'expected 401, got 200'
    }
    catch {
        $code = $_.Exception.Response.StatusCode.value__
        Assert-True ($code -eq 401) "expected 401, got $code"
    }
}

Invoke-Step 'B1 禁用 token 后 401' {
    $tid = $script:apiToken.id
    Invoke-RestMethod -Uri "$api/api-tokens/$tid/enabled?enabled=false" `
        -Method Patch -Headers $authHeader | Out-Null
    try {
        $ph = @{ Authorization = "Bearer $($script:apiToken.token)" }
        Invoke-RestMethod -Uri "$api/public/me" -Headers $ph | Out-Null
        throw 'expected 401 after disable'
    }
    catch {
        $code = $_.Exception.Response.StatusCode.value__
        Assert-True ($code -eq 401) "expected 401, got $code"
    }
    # 重新启用，后续测试仍可用
    Invoke-RestMethod -Uri "$api/api-tokens/$tid/enabled?enabled=true" `
        -Method Patch -Headers $authHeader | Out-Null
}

if ($ZhipuKey) {
    Invoke-Step 'B1 /public/agents/{id}/chat (ah_ token)' {
        $ph = @{ Authorization = "Bearer $($script:apiToken.token)" }
        $body = @{ message = '用一个字回复：好'; stream = $false } | ConvertTo-Json
        $r = Invoke-RestMethod -Uri "$api/public/agents/$agentId/chat" -Method Post `
            -Headers $ph -ContentType 'application/json' -Body $body -TimeoutSec 30
        # 只验证 token 鉴权 + 路由命中（reply 字段存在即可，内容取决于模型本轮输出）
        Assert-True ($null -ne $r.reply) 'no reply field'
        Assert-True ($r.agent_id -eq $agentId) "agent_id mismatch: $($r.agent_id)"
        Assert-True ($r.prompt_tokens -gt 0) "prompt_tokens=0 means request not sent to model"
        Write-Host "    public reply='$($r.reply)' tokens=$($r.prompt_tokens)+$($r.completion_tokens)" -ForegroundColor DarkGray
    }
}

# --- B3 调用日志聚合 ---
Invoke-Step 'B3 GET /stats/daily?days=7 返回 7 条' {
    $rows = Invoke-RestMethod -Uri "$api/stats/daily?days=7" -Headers $authHeader
    Assert-True ($rows.Count -eq 7) "expected 7 rows, got $($rows.Count)"
    # 每条必须有 day / calls / prompt_tokens / completion_tokens / avg_duration_ms / error_count
    $first = $rows[0]
    foreach ($f in 'day', 'calls', 'prompt_tokens', 'completion_tokens', 'avg_duration_ms', 'error_count') {
        Assert-True ($first.PSObject.Properties.Name -contains $f) "missing field: $f"
    }
    # 日期按升序
    for ($i = 1; $i -lt $rows.Count; $i++) {
        Assert-True ([string]$rows[$i].day -ge [string]$rows[$i - 1].day) "not ascending: $($rows[$i-1].day) -> $($rows[$i].day)"
    }
    $today = ($rows[-1].day)
    Write-Host "    days=7, last day=$today calls=$($rows[-1].calls)" -ForegroundColor DarkGray
}

if ($ZhipuKey) {
    Invoke-Step 'B3 chat 后 daily 今日 calls 增加' {
        $before = Invoke-RestMethod -Uri "$api/stats/daily?days=1" -Headers $authHeader
        $c0 = [int]$before[0].calls
        # 随便发一条非流式
        $body = @{ message = '好'; stream = $false } | ConvertTo-Json
        Invoke-RestMethod -Uri "$api/agents/$agentId/chat" -Method Post `
            -Headers $authHeader -ContentType 'application/json' -Body $body -TimeoutSec 30 | Out-Null
        $after = Invoke-RestMethod -Uri "$api/stats/daily?days=1" -Headers $authHeader
        $c1 = [int]$after[0].calls
        Assert-True ($c1 -eq $c0 + 1) "calls not incremented: $c0 -> $c1"
        Write-Host "    today calls: $c0 -> $c1" -ForegroundColor DarkGray
    }
}

# --- B2 MCP 工具集成 ---
# 先探一下 demo MCP server 是否在线（影响是否跑 discover/tool-call 这两步）
$mcpReachable = $false
try {
    $probeBody = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"e2e","version":"1"}}}'
    $resp = Invoke-WebRequest -Uri $McpUrl -Method Post `
        -Headers @{ Accept = 'application/json, text/event-stream'; 'Content-Type' = 'application/json' } `
        -Body $probeBody -UseBasicParsing -TimeoutSec 3
    if ($resp.StatusCode -eq 200) { $mcpReachable = $true }
}
catch {
    Write-Host 'ℹ  demo MCP server（9100）未响应，将跳过 discover / tool-call 断言' -ForegroundColor Yellow
}

$script:mcpServerId = $null

Invoke-Step 'B2 POST /mcp-servers 创建 http 类型' {
    $body = @{
        name       = 'e2e-demo-mcp'
        transport  = 'http'
        server_url = $McpUrl
    } | ConvertTo-Json
    $c = Invoke-RestMethod -Uri "$api/mcp-servers" -Method Post `
        -Headers $authHeader -ContentType 'application/json' -Body $body
    Assert-True ([bool]$c.id) 'no mcp server id'
    Assert-True ($c.transport -eq 'http') "transport mismatch: $($c.transport)"
    Assert-True ($c.enabled) 'enabled should default true'
    Assert-True (-not $c.has_auth_token) 'has_auth_token should be false when no token provided'
    $script:mcpServerId = $c.id
}

Invoke-Step 'B2 GET /mcp-servers 列表包含新建项' {
    $list = Invoke-RestMethod -Uri "$api/mcp-servers" -Headers $authHeader
    Assert-True (($list | Where-Object { $_.id -eq $script:mcpServerId }).Count -eq 1) 'new mcp server not in list'
}

Invoke-Step 'B2 PATCH /mcp-servers/{id} 改名' {
    $body = @{ name = 'e2e-demo-mcp-v2' } | ConvertTo-Json
    $u = Invoke-RestMethod -Uri "$api/mcp-servers/$($script:mcpServerId)" -Method Patch `
        -Headers $authHeader -ContentType 'application/json' -Body $body
    Assert-True ($u.name -eq 'e2e-demo-mcp-v2') "rename failed: $($u.name)"
}

Invoke-Step 'B2 PUT /mcp-servers/agents/{aid}/tools 绑定到当前 agent' {
    $body = @{ mcp_server_ids = @($script:mcpServerId) } | ConvertTo-Json
    $bound = Invoke-RestMethod -Uri "$api/mcp-servers/agents/$agentId/tools" -Method Put `
        -Headers $authHeader -ContentType 'application/json' -Body $body
    Assert-True ($bound.Count -eq 1) "binding count != 1: $($bound.Count)"
    Assert-True ($bound[0].id -eq $script:mcpServerId) "bound id mismatch: $($bound[0].id)"
}

Invoke-Step 'B2 GET /mcp-servers/agents/{aid}/tools 确认绑定回显' {
    $bound = Invoke-RestMethod -Uri "$api/mcp-servers/agents/$agentId/tools" -Headers $authHeader
    Assert-True ($bound.Count -eq 1) "binding query returned $($bound.Count)"
}

if ($mcpReachable) {
    Invoke-Step 'B2 POST /mcp-servers/{id}/discover 发现 add/echo 工具' {
        $tools = Invoke-RestMethod -Uri "$api/mcp-servers/$($script:mcpServerId)/discover" `
            -Method Post -Headers $authHeader -TimeoutSec 15
        Assert-True ($tools.Count -ge 2) "expected >=2 tools, got $($tools.Count)"
        $names = ($tools | ForEach-Object { $_.name }) -join ','
        Assert-True ($names -match 'add') "tool 'add' not found in: $names"
        Assert-True ($names -match 'echo') "tool 'echo' not found in: $names"
        Write-Host "    tools: $names" -ForegroundColor DarkGray
    }

    if ($ZhipuKey) {
        Invoke-Step 'B2 chat 触发 tool call（add 17+25）' {
            $body = @{
                message = '请调用 add 工具，计算 17 加 25 的结果，然后只用一个阿拉伯数字回答。'
                stream  = $false
            } | ConvertTo-Json
            $r = Invoke-RestMethod -Uri "$api/agents/$agentId/chat" -Method Post `
                -Headers $authHeader -ContentType 'application/json' -Body $body -TimeoutSec 60
            Assert-True ([bool]$r.reply) 'empty reply after tool loop'
            # 模型可能回「42」或带文字，只要包含 42 就算命中工具结果
            Assert-True ($r.reply -match '42|四十二') "reply lacks '42': $($r.reply)"
            Write-Host "    tool-call reply: $($r.reply)" -ForegroundColor DarkGray
        }
    }
}
else {
    Write-Host 'ℹ  跳过 B2 discover 与 tool-call 断言（如需跑，先启动 tests/demo_mcp_server.py）' -ForegroundColor Yellow
}

Invoke-Step 'B2 解绑 + 删除 MCP server 级联清空' {
    # 先解绑
    $empty = @{ mcp_server_ids = @() } | ConvertTo-Json
    $bound = Invoke-RestMethod -Uri "$api/mcp-servers/agents/$agentId/tools" -Method Put `
        -Headers $authHeader -ContentType 'application/json' -Body $empty
    Assert-True ($bound.Count -eq 0) "still bound after clear: $($bound.Count)"
    # 再删
    Invoke-RestMethod -Uri "$api/mcp-servers/$($script:mcpServerId)" -Method Delete `
        -Headers $authHeader | Out-Null
    $list = Invoke-RestMethod -Uri "$api/mcp-servers" -Headers $authHeader
    Assert-True (($list | Where-Object { $_.id -eq $script:mcpServerId }).Count -eq 0) 'mcp server not deleted'
    $script:mcpServerId = $null
}

# --- TC-10 数据隔离 ---
Invoke-Step 'TC-10 第二账号看不到 e2e 数据' {
    $otherEmail = "e2e-other-$([int](Get-Date -UFormat %s))@agenthub.dev"
    $regBody = @{ email = $otherEmail; password = $Password } | ConvertTo-Json
    Invoke-RestMethod -Uri "$api/auth/register" -Method Post `
        -ContentType 'application/json' -Body $regBody | Out-Null
    $lr = Invoke-RestMethod -Uri "$api/auth/jwt/login" -Method Post `
        -ContentType 'application/x-www-form-urlencoded' `
        -Body @{ username = $otherEmail; password = $Password }
    $otherHeader = @{ Authorization = "Bearer $($lr.access_token)" }

    $prompts = Invoke-RestMethod -Uri "$api/prompts" -Headers $otherHeader
    Assert-True ($prompts.Count -eq 0) "other account sees prompts: $($prompts.Count)"

    try {
        Invoke-RestMethod -Uri "$api/prompts/$promptId" -Headers $otherHeader | Out-Null
        throw 'expected 404 for cross-user access'
    }
    catch {
        Assert-True ($_.Exception.Response.StatusCode.Value__ -eq 404) `
            "expected 404, got $($_.Exception.Response.StatusCode.Value__)"
    }
}

# --- 清理 ---
Invoke-Step 'CLEANUP DELETE resources' {
    Invoke-RestMethod -Uri "$api/agents/$agentId" -Method Delete -Headers $authHeader | Out-Null
    Invoke-RestMethod -Uri "$api/keys/$keyId" -Method Delete -Headers $authHeader | Out-Null
    Invoke-RestMethod -Uri "$api/prompts/$promptId" -Method Delete -Headers $authHeader | Out-Null
    if ($script:apiToken) {
        Invoke-RestMethod -Uri "$api/api-tokens/$($script:apiToken.id)" `
            -Method Delete -Headers $authHeader | Out-Null
    }
}

# --- 可选：UI 烟测（playwright-cli） ---
if ($IncludeUI) {
    Invoke-Step 'UI-01 登录页可达' {
        $r = Invoke-WebRequest -Uri $Frontend -UseBasicParsing
        Assert-True ($r.StatusCode -eq 200) "frontend not 200: $($r.StatusCode)"
    }

    if (Get-Command playwright-cli -ErrorAction SilentlyContinue) {
        Invoke-Step 'UI-02 playwright-cli 打开并登录' {
            playwright-cli close 2>$null | Out-Null
            playwright-cli open "$Frontend/login" | Out-Null

            # 切换到「注册」tab
            playwright-cli --raw eval "() => { for (const el of document.querySelectorAll('.ant-tabs-tab')) { if (el.textContent?.trim() === '注册') { el.click(); return 'ok'; } } return 'none'; }" | Out-Null

            Start-Sleep -Milliseconds 500
            $uiEmail = "ui-$([int](Get-Date -UFormat %s))@agenthub.dev"
            playwright-cli --raw eval "(e, p) => { const emails = document.querySelectorAll('input[type=\`"email\`"], input[id*=email]'); const pwds = document.querySelectorAll('input[type=password]'); const set = (el, v) => { const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; d.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); }; set(emails[emails.length-1], e); set(pwds[0], p); set(pwds[1], p); return 'filled'; }" $uiEmail $Password | Out-Null
            playwright-cli click "getByRole('button', { name: '注册并登录' })" | Out-Null
            Start-Sleep -Seconds 2

            $url = playwright-cli --raw eval '() => location.pathname'
            Assert-True ($url -like '*dashboard*') "expected /dashboard, got $url"
            playwright-cli close | Out-Null
        }
    }
    else {
        Write-Host 'ℹ  未找到 playwright-cli，跳过浏览器自动化' -ForegroundColor Yellow
    }
}

Write-Host ''
Write-Host "=== 结果：$Passed passed, $Failed failed ===" -ForegroundColor $(if ($Failed -gt 0) { 'Red' } else { 'Green' })
exit $Failed
