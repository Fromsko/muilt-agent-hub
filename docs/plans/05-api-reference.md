# API 参考

所有接口统一前缀 **`/api/v1`**。认证采用 `Authorization: Bearer <JWT>`。

运行时可在 `http://127.0.0.1:8000/docs` 查看交互式 Swagger UI。

## 一、认证 `/api/v1/auth`

### POST `/auth/register`
注册新用户。

Request:
```json
{"email": "user@example.com", "password": "pass1234"}
```

Response 201:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "is_active": true,
  "is_superuser": false,
  "is_verified": false
}
```

### POST `/auth/jwt/login`
OAuth2 Password flow，**表单**提交。

Request（`application/x-www-form-urlencoded`）:
```
username=user@example.com&password=pass1234
```

Response 200:
```json
{"access_token": "eyJhbGci...", "token_type": "bearer"}
```

### POST `/auth/jwt/logout`
退出登录。需要 JWT。

## 二、用户 `/api/v1/users`

### GET `/users/me`
获取当前用户信息。

### PATCH `/users/me`
更新自己的信息（如修改密码）。

```json
{"password": "newpass5678"}
```

### 管理员端点（需 `is_superuser`）
- `GET /users/{id}`
- `PATCH /users/{id}`
- `DELETE /users/{id}`

## 三、Prompts `/api/v1/prompts`

### POST `/prompts`
```json
{"name": "客服", "content": "你是一名客服..."}
```
返回 201 + `PromptRead`

### GET `/prompts`
返回当前用户的所有 prompts。

### GET `/prompts/{id}`
404 if not owned.

### PATCH `/prompts/{id}`
```json
{"name": "新名字"}
```
支持部分更新。

### DELETE `/prompts/{id}`
204.

## 四、Keys `/api/v1/keys`

### POST `/keys`
```json
{
  "name": "智谱生产",
  "provider": "zhipu",
  "api_key": "370650f901...",
  "api_base": "https://open.bigmodel.cn/api/paas/v4"
}
```

Response 201:
```json
{
  "id": 1,
  "name": "智谱生产",
  "provider": "zhipu",
  "api_key_masked": "370******1RGc",
  "api_base": "https://open.bigmodel.cn/api/paas/v4",
  "created_at": "2026-04-22T08:00:00"
}
```

**明文只接受一次，之后永远只返回 masked。**

### GET `/keys`
返回列表，全部脱敏。

### DELETE `/keys/{id}`
204.

## 五、Agents `/api/v1/agents`

### POST `/agents`
```json
{
  "name": "客服机器人",
  "description": "处理客户咨询",
  "prompt_id": 1,
  "key_id": 1,
  "model": "openai/glm-4.5",
  "temperature": 0.7,
  "max_tokens": 2048
}
```

若 `prompt_id` 或 `key_id` 不属于当前用户，返回 400。

### GET `/agents`
### GET `/agents/{id}`
### PATCH `/agents/{id}`
### DELETE `/agents/{id}`

## 六、Chat `/api/v1/agents/{id}/chat`

### POST `/agents/{id}/chat`

Request:
```json
{"message": "你好", "stream": true}
```

**流式模式**（`stream=true`，默认）:
返回 `Content-Type: text/event-stream`，每行：

```
data: {"delta": "你"}

data: {"delta": "好"}

data: [DONE]

```

异常时：
```
data: {"error": "BadRequestError", "message": "..."}
data: [DONE]
```

**非流式模式**（`stream=false`）:
```json
{
  "agent_id": 1,
  "reply": "你好！有什么可以帮您？",
  "prompt_tokens": 35,
  "completion_tokens": 42
}
```

### GET `/agents/{id}/messages?limit=50`
返回该 Agent 的对话历史，按时间倒序。

```json
[
  {"id": 2, "agent_id": 1, "role": "assistant", "content": "你好！", "created_at": "..."},
  {"id": 1, "agent_id": 1, "role": "user", "content": "hi", "created_at": "..."}
]
```

## 七、杂项

### GET `/api/v1/health`
```json
{"status": "ok"}
```
无需鉴权，用于探活。

### GET `/`
根路径，返回元信息。

### GET `/docs` / `/redoc`
交互式 API 文档。

## 八、错误约定

| HTTP | 场景 |
|---|---|
| 400 | 请求体参数不合法、FK 非本人 |
| 401 | 未登录 / JWT 无效过期 |
| 403 | 权限不足（管理员专属） |
| 404 | 资源不存在或非本人 |
| 422 | Pydantic 校验失败 |
| 502 | 上游模型调用失败（LiteLLM 抛异常） |

错误响应格式：
```json
{"detail": "具体错误信息"}
```

## 九、LiteLLM 模型名速查

| 厂商 | 模型名格式 | api_base |
|---|---|---|
| OpenAI | `gpt-4o-mini` | 默认 |
| Anthropic | `claude-3-5-sonnet-20241022` | 默认 |
| DeepSeek | `deepseek/deepseek-chat` | 默认 |
| Gemini | `gemini/gemini-2.0-flash` | 默认 |
| **智谱 GLM** | `openai/glm-4.5` | `https://open.bigmodel.cn/api/paas/v4` |
| 通义 Qwen | `openai/qwen-max` | dashscope OpenAI 兼容端点 |
| Moonshot | `openai/moonshot-v1-8k` | `https://api.moonshot.cn/v1` |
| Ollama 本地 | `openai/llama3.2` | `http://localhost:11434/v1` |

完整列表：https://docs.litellm.ai/docs/providers
