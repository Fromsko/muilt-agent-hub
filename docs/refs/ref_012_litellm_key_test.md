# ref_012 — Key 连通性测试

> 对应任务：A4 Key 联通测试
> 来源：https://docs.litellm.ai/docs/completion/function_call + https://docs.litellm.ai/docs/completion/token_usage
> 可信度：★★★★★ 官方文档
> 最后访问：2026-04-22

---

## 1. 目标

在 Key 新建/编辑表单中加「测试连通性」按钮，后端用 LiteLLM 发送最小化请求验证 Key 是否可用。

---

## 2. 后端实现

### 2.1 新增端点 POST /api/v1/keys/test

```python
# app/routers/keys.py（在现有文件中追加）

import litellm
from app.schemas.key import KeyTestRequest, KeyTestResponse


@router.post("/test", response_model=KeyTestResponse)
async def test_key(
    payload: KeyTestRequest,
    user: User = Depends(current_active_user),
):
    """测试 API Key 是否可用，发送一条最小化消息"""
    try:
        response = await litellm.acompletion(
            model=payload.model or "gpt-4o-mini",
            messages=[{"role": "user", "content": "hi"}],
            api_key=payload.api_key,
            api_base=payload.api_base or None,
            max_tokens=5,
            timeout=15,
        )
        reply = response.choices[0].message.content or ""
        return KeyTestResponse(
            ok=True,
            message=f"连通成功：{reply[:50]}",
            model=response.model,
        )
    except Exception as exc:
        return KeyTestResponse(
            ok=False,
            message=f"连通失败：{type(exc).__name__}: {exc}",
        )
```

### 2.2 Schema 定义

```python
# app/schemas/key.py（追加）

class KeyTestRequest(SQLModel):
    api_key: str
    api_base: str | None = None
    model: str | None = None  # 默认 gpt-4o-mini


class KeyTestResponse(SQLModel):
    ok: bool
    message: str
    model: str | None = None
```

---

## 3. 前端实现

### 3.1 API 调用

```typescript
// web/src/api/agenthub.ts 追加

export interface KeyTestRequest {
  api_key: string;
  api_base?: string | null;
  model?: string;
}

export interface KeyTestResponse {
  ok: boolean;
  message: string;
  model?: string;
}

export const keyApi = {
  // ... 现有方法 ...
  test: (data: KeyTestRequest) =>
    httpClient.post<KeyTestResponse>('/keys/test', data),
};
```

### 3.2 UI 按钮

在 `web/src/routes/_auth/keys/index.tsx` 的 Modal 中：

```tsx
const [testing, setTesting] = useState(false);
const [testResult, setTestResult] = useState<KeyTestResponse | null>(null);

async function handleTest() {
  const values = form.getFieldsValue();
  if (!values.api_key) {
    message.warning('请先填写 API Key');
    return;
  }
  setTesting(true);
  setTestResult(null);
  try {
    const result = await keyApi.test({
      api_key: values.api_key,
      api_base: values.api_base,
    });
    setTestResult(result);
  } catch (err) {
    setTestResult({ ok: false, message: String(err) });
  } finally {
    setTesting(false);
  }
}

// 在表单中加按钮
<Form.Item label="连通性">
  <Space>
    <Button onClick={handleTest} loading={testing}>
      测试连通性
    </Button>
    {testResult && (
      <Tag color={testResult.ok ? 'green' : 'red'}>
        {testResult.message}
      </Tag>
    )}
  </Space>
</Form.Item>
```

---

## 4. 安全考虑

| 问题 | 处理方式 |
|---|---|
| API Key 明文传输 | POST body 传输，不在 URL 中 |
| 测试用 Key 是否存储 | 测试端点**不存储**，只是验证 |
| 限速 | 可选：每个用户每分钟最多 N 次测试 |
| 超时 | `timeout=15` 秒，防止长时间挂起 |

---

## 5. 支持的模型检测

如果 `payload.model` 为空，默认用 `gpt-4o-mini` 测试。对于非 OpenAI 厂商：

```python
# 根据 api_base 推断模型
if not payload.model:
    if payload.api_base and "open.bigmodel.cn" in payload.api_base:
        model = "openai/glm-4.5"
    elif payload.api_base and "moonshot" in payload.api_base:
        model = "openai/moonshot-v1-8k"
    else:
        model = "gpt-4o-mini"
```
