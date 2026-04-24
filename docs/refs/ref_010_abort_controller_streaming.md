# ref_010 — 停止生成（AbortController）

> 对应任务：A2 Chat 页 UX — 停止生成按钮
> 来源：https://developer.mozilla.org/en-US/docs/Web/API/AbortController
> 可信度：★★★★★ MDN Web API 标准
> 最后访问：2026-04-22

---

## 1. 核心原理

`AbortController` 可以取消 `fetch` 请求，中断 SSE 流式读取。

---

## 2. 前端实现

### 2.1 在 chatApi.stream 中支持 Abort

改造 `web/src/api/agenthub.ts:127-180`：

```typescript
export const chatApi = {
  async *stream(
    agentId: number,
    message: string,
    token: string,
    signal?: AbortSignal,  // 新增参数
  ): AsyncGenerator<string> {
    const url = `${API_BASE}/agents/${agentId}/chat`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message, stream: true }),
      signal,  // 传给 fetch
    });

    if (!resp.ok || !resp.body) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Chat stream failed (${resp.status}): ${text}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          if (!frame.startsWith('data:')) continue;
          const payload = frame.slice(5).trim();
          if (payload === '[DONE]') return;
          try {
            const obj = JSON.parse(payload) as { delta?: string; error?: string };
            if (obj.delta) yield obj.delta;
            if (obj.error) throw new Error(obj.error);
          } catch { /* ignore */ }
        }
      }
    } finally {
      reader.releaseLock();  // 释放 reader
    }
  },
};
```

### 2.2 在 ChatPage 中管理 AbortController

```tsx
const [abortController, setAbortController] = useState<AbortController | null>(null);

async function handleSend() {
  const text = input.trim();
  if (!text || sending) return;

  const controller = new AbortController();
  setAbortController(controller);

  // ... 前面的消息处理不变 ...

  try {
    let acc = '';
    for await (const delta of chatApi.stream(agentIdNum, text, token, controller.signal)) {
      acc += delta;
      setMessages((ms) =>
        ms.map((m) => (m.id === botMsgId ? { ...m, content: acc } : m)),
      );
    }
    // 正常结束
    setMessages((ms) =>
      ms.map((m) => (m.id === botMsgId ? { ...m, streaming: false } : m)),
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      // 用户主动停止
      setMessages((ms) =>
        ms.map((m) => (m.id === botMsgId ? { ...m, streaming: false } : m)),
      );
    } else {
      message.error(err instanceof Error ? err.message : String(err));
    }
  } finally {
    setSending(false);
    setAbortController(null);
  }
}

function handleStop() {
  abortController?.abort();
}
```

### 2.3 UI 按钮切换

```tsx
{sending ? (
  <Button
    danger
    icon={<StopOutlined />}
    onClick={handleStop}
    style={{ height: 'auto' }}
  >
    停止
  </Button>
) : (
  <Button
    type="primary"
    icon={<Send size={16} />}
    onClick={handleSend}
    style={{ height: 'auto' }}
  >
    发送
  </Button>
)}
```

---

## 3. 后端兼容

`AbortController.abort()` 会：
1. 中断 fetch 连接
2. 后端的 `StreamingResponse` generator 收到 `GeneratorExit` 异常
3. `finally` 块仍会执行 → `_persist_exchange` 保存已生成的部分内容

**无需修改后端**，Python 的 `finally` 保证持久化逻辑正常执行。

---

## 4. 注意事项

| 问题 | 处理方式 |
|---|---|
| 停止后已生成内容 | 保留已流式输出的部分，不删除 |
| AbortError 不应报错 | catch 中判断 `err.name === 'AbortError'` |
| 重复 abort | 确保 `setAbortController(null)` 清理 |
| reader.releaseLock() | 在 finally 中释放，避免资源泄漏 |
