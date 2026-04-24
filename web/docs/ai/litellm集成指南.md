# LiteLLM 集成指南

> 适用项目：Gateway Manager (Python 后端 + React 前端)
> 编写时间：2026-04-22

---

## 一、为什么选择 LiteLLM

### 项目需求匹配

| 需求 | LiteLLM 支持 | 说明 |
|------|--------------|------|
| 统一 LLM 接口 | ✅ | 100+ 提供商统一 OpenAI 格式 |
| 异步 SSE 流式 | ✅ | 内置 async streaming |
| 工具调用 | ✅ | OpenAI 格式的 function calling |
| 思考过程展示 | ✅ | Responses API reasoning_content |
| 上下文计算 | ✅ | 自动 token 计数和成本追踪 |
| 智谱 AI 支持 | ✅ | 原生支持 zai/ 前缀 |
| 负载均衡 | ✅ | 多部署点路由和故障转移 |

### 架构优势

```
┌─────────────────────────────────────────────────────────┐
│                    Gateway Manager                      │
├─────────────────────────────────────────────────────────┤
│  React 前端 (assistant-ui)                              │
│    ↓                                                    │
│  FastAPI 后端                                           │
│    ↓                                                    │
│  LiteLLM Gateway (统一接口层)                           │
│    ↓         ↓         ↓         ↓                     │
│  OpenAI   Anthropic  智谱AI   其他...                   │
└─────────────────────────────────────────────────────────┘
```

---

## 二、安装配置

### 2.1 安装依赖

```bash
# 后端
uv add litellm[proxy]
uv add fastapi uvicorn

# 前端 (如果需要直接调用)
bun add openai
```

### 2.2 配置文件

**文件**：`litellm_config.yaml`

```yaml
model_list:
  # 智谱 AI 模型
  - model_name: glm-4.7
    litellm_params:
      model: zai/glm-4.7
      api_key: os.environ/ZAI_API_KEY
  
  - model_name: glm-4.5
    litellm_params:
      model: zai/glm-4.5
      api_key: os.environ/ZAI_API_KEY
  
  - model_name: glm-4.5-flash
    litellm_params:
      model: zai/glm-4.5-flash
      api_key: os.environ/ZAI_API_KEY

  # OpenAI 模型 (可选)
  - model_name: gpt-4o
    litellm_params:
      model: openai/gpt-4o
      api_key: os.environ/OPENAI_API_KEY

litellm_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  database_url: os.environ/DATABASE_URL
  
  # 日志配置
  callbacks: ["langfuse"]
  
  # 上下文窗口管理
  max_tokens: 4096
  
  # 速率限制
  rpm: 100
  tpm: 100000

router_settings:
  routing_strategy: usage-based-routing-v2
  enable_pre_call_checks: true
```

---

## 三、后端集成

### 3.1 FastAPI 路由

**文件**：`app/api/chat.py`

```python
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import litellm
import json

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    model: str
    messages: List[ChatMessage]
    stream: bool = False
    tools: Optional[List[dict]] = None
    reasoning_effort: Optional[str] = None

class ChatResponse(BaseModel):
    id: str
    content: str
    reasoning_content: Optional[str] = None
    usage: dict

@router.post("/completions")
async def chat_completions(request: ChatRequest):
    """标准聊天补全"""
    try:
        response = await litellm.acompletion(
            model=request.model,
            messages=[m.dict() for m in request.messages],
            tools=request.tools,
            stream=False
        )
        
        return ChatResponse(
            id=response.id,
            content=response.choices[0].message.content,
            usage={
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/completions/stream")
async def chat_completions_stream(request: ChatRequest):
    """流式聊天补全 (SSE)"""
    async def generate():
        response = await litellm.acompletion(
            model=request.model,
            messages=[m.dict() for m in request.messages],
            tools=request.tools,
            stream=True
        )
        
        async for chunk in response:
            if chunk.choices[0].delta.content:
                data = {
                    "type": "text",
                    "content": chunk.choices[0].delta.content
                }
                yield f"data: {json.dumps(data)}\n\n"
            
            if chunk.choices[0].delta.tool_calls:
                for tc in chunk.choices[0].delta.tool_calls:
                    data = {
                        "type": "tool_call",
                        "tool_name": tc.function.name,
                        "tool_call_id": tc.id,
                        "args": tc.function.arguments
                    }
                    yield f"data: {json.dumps(data)}\n\n"
        
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/responses")
async def chat_responses(request: ChatRequest):
    """Responses API (支持 reasoning)"""
    try:
        response = await litellm.aresponses(
            model=request.model,
            input=[m.dict() for m in request.messages],
            reasoning_effort=request.reasoning_effort or "medium"
        )
        
        content = ""
        reasoning = ""
        
        for item in response.output:
            if item.type == "message":
                content = item.content[0].text
            elif item.type == "reasoning":
                reasoning = item.content[0].text
        
        return ChatResponse(
            id=response.id,
            content=content,
            reasoning_content=reasoning if reasoning else None,
            usage={
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.total_tokens
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/responses/stream")
async def chat_responses_stream(request: ChatRequest):
    """流式 Responses API (支持 reasoning)"""
    async def generate():
        response = await litellm.aresponses(
            model=request.model,
            input=[m.dict() for m in request.messages],
            stream=True,
            reasoning_effort=request.reasoning_effort or "medium"
        )
        
        async for event in response:
            if event.type == "response.reasoning.delta":
                data = {
                    "type": "reasoning",
                    "content": event.delta
                }
                yield f"data: {json.dumps(data)}\n\n"
            elif event.type == "response.output_text.delta":
                data = {
                    "type": "text",
                    "content": event.delta
                }
                yield f"data: {json.dumps(data)}\n\n"
            elif event.type == "response.completed":
                data = {
                    "type": "done",
                    "usage": {
                        "input_tokens": event.response.usage.input_tokens,
                        "output_tokens": event.response.usage.output_tokens
                    }
                }
                yield f"data: {json.dumps(data)}\n\n"
        
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )
```

### 3.2 上下文窗口管理

**文件**：`app/services/context_manager.py`

```python
import litellm
from typing import List, Dict

class ContextManager:
    """上下文窗口管理器"""
    
    def __init__(self, model: str):
        self.model = model
        self.model_info = litellm.get_model_info(model)
        self.max_tokens = self.model_info.get('max_tokens', 128000)
    
    def count_tokens(self, messages: List[Dict]) -> int:
        """计算消息的 token 数"""
        return litellm.token_counter(
            model=self.model,
            messages=messages
        )
    
    def truncate_messages(
        self,
        messages: List[Dict],
        max_output_tokens: int = 4096,
        preserve_system: bool = True
    ) -> List[Dict]:
        """
        智能截断消息以适应上下文窗口
        
        策略：
        1. 保留系统消息
        2. 保留最近的对话
        3. 如果超出，从最早的消息开始截断
        """
        available_tokens = self.max_tokens - max_output_tokens
        
        # 分离系统消息
        system_msgs = []
        other_msgs = []
        
        for msg in messages:
            if msg['role'] == 'system' and preserve_system:
                system_msgs.append(msg)
            else:
                other_msgs.append(msg)
        
        # 计算系统消息的 token
        system_tokens = self.count_tokens(system_msgs)
        
        if system_tokens > available_tokens:
            # 系统消息本身就超出了
            return self._truncate_single_message(
                system_msgs[0] if system_msgs else {},
                available_tokens
            )
        
        # 从后向前添加消息
        result = system_msgs.copy()
        remaining_tokens = available_tokens - system_tokens
        
        for msg in reversed(other_msgs):
            msg_tokens = self.count_tokens([msg])
            if msg_tokens <= remaining_tokens:
                result.insert(len(system_msgs), msg)
                remaining_tokens -= msg_tokens
            else:
                # 消息太长，尝试截断
                if msg['role'] == 'user':
                    truncated = self._truncate_single_message(msg, remaining_tokens)
                    result.insert(len(system_msgs), truncated)
                break
        
        return result
    
    def _truncate_single_message(
        self,
        message: Dict,
        max_tokens: int
    ) -> Dict:
        """截断单个消息"""
        content = message.get('content', '')
        if isinstance(content, str):
            # 简单截断（实际应用中应该用 tokenizer）
            max_chars = max_tokens * 4  # 粗略估算
            if len(content) > max_chars:
                content = content[:max_chars] + "...[截断]"
        return {**message, 'content': content}
    
    def get_usage_info(self, messages: List[Dict]) -> Dict:
        """获取使用信息"""
        tokens = self.count_tokens(messages)
        return {
            "current_tokens": tokens,
            "max_tokens": self.max_tokens,
            "available_tokens": self.max_tokens - tokens,
            "usage_percentage": (tokens / self.max_tokens) * 100
        }
```

### 3.3 工具调用服务

**文件**：`app/services/tool_service.py`

```python
from typing import Dict, List, Any, Callable
import json

class ToolService:
    """工具调用服务"""
    
    def __init__(self):
        self.tools: Dict[str, Dict] = {}
        self.executors: Dict[str, Callable] = {}
    
    def register_tool(
        self,
        name: str,
        description: str,
        parameters: Dict,
        executor: Callable
    ):
        """注册工具"""
        self.tools[name] = {
            "type": "function",
            "function": {
                "name": name,
                "description": description,
                "parameters": parameters
            }
        }
        self.executors[name] = executor
    
    def get_tools(self) -> List[Dict]:
        """获取所有工具定义"""
        return list(self.tools.values())
    
    async def execute_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any]
    ) -> Dict[str, Any]:
        """执行工具"""
        if tool_name not in self.executors:
            return {
                "error": f"Unknown tool: {tool_name}"
            }
        
        try:
            result = await self.executors[tool_name](arguments)
            return {
                "success": True,
                "result": result
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def format_tool_result(
        self,
        tool_call_id: str,
        result: Dict[str, Any]
    ) -> Dict:
        """格式化工具结果"""
        return {
            "role": "tool",
            "tool_call_id": tool_call_id,
            "content": json.dumps(result)
        }

# 预定义工具示例
tool_service = ToolService()

# 注册天气查询工具
tool_service.register_tool(
    name="get_weather",
    description="获取指定位置的天气信息",
    parameters={
        "type": "object",
        "properties": {
            "location": {
                "type": "string",
                "description": "城市名称，如 '北京'"
            },
            "unit": {
                "type": "string",
                "enum": ["celsius", "fahrenheit"],
                "default": "celsius"
            }
        },
        "required": ["location"]
    },
    executor=lambda args: {
        "location": args["location"],
        "temperature": 22,
        "unit": args.get("unit", "celsius"),
        "condition": "晴天"
    }
)

# 注册代码执行工具
tool_service.register_tool(
    name="execute_code",
    description="执行 Python 代码并返回结果",
    parameters={
        "type": "object",
        "properties": {
            "code": {
                "type": "string",
                "description": "要执行的 Python 代码"
            }
        },
        "required": ["code"]
    },
    executor=lambda args: {
        "output": "代码执行结果",
        "error": None
    }
)
```

---

## 四、前端集成

### 4.1 LiteLLM 适配器

**文件**：`src/adapters/litellm-adapter.ts`

```typescript
import type { ChatModelAdapter } from "@assistant-ui/react";

interface LiteLLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export const createLiteLLMAdapter = (config: LiteLLMConfig): ChatModelAdapter => {
  return {
    async *run({ messages, abortSignal }) {
      // 转换消息格式
      const formattedMessages = messages.map(m => ({
        role: m.role,
        content: m.content
          .filter((p: any) => p.type === "text")
          .map((p: any) => p.text)
          .join("\n")
      }));

      // 调用流式 API
      const response = await fetch(`${config.baseUrl}/api/chat/completions/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: formattedMessages,
          stream: true
        }),
        signal: abortSignal
      });

      if (!response.ok) {
        throw new Error(`LiteLLM error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let content = "";
      let reasoningContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);
            
            if (event.type === "reasoning") {
              reasoningContent += event.content;
            } else if (event.type === "text") {
              content += event.content;
            }

            // 构建返回内容
            const parts: any[] = [];
            
            if (reasoningContent) {
              parts.push({
                type: "reasoning",
                text: reasoningContent
              });
            }
            
            if (content) {
              parts.push({
                type: "text",
                text: content
              });
            }

            yield { content: parts };
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  };
};
```

### 4.2 使用示例

**文件**：`src/routes/_auth/chat/$agentId.tsx`

```tsx
import { createLiteLLMAdapter } from "@/adapters/litellm-adapter";
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";

function ChatPage() {
  const adapter = createLiteLLMAdapter({
    baseUrl: "http://localhost:4000",
    apiKey: "sk-1234",
    model: "glm-4.7"
  });

  const runtime = useLocalRuntime(adapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
```

---

## 五、部署配置

### 5.1 Docker 部署

**文件**：`docker-compose.yml`

```yaml
version: '3.8'

services:
  litellm:
    image: docker.litellm.ai/berriai/litellm:main-latest
    ports:
      - "4000:4000"
    volumes:
      - ./litellm_config.yaml:/app/config.yaml
    environment:
      - ZAI_API_KEY=${ZAI_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - LITELLM_MASTER_KEY=${LITELLM_MASTER_KEY}
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/litellm
    command: --config /app/config.yaml
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=litellm
    volumes:
      - postgres_data:/var/lib/postgresql/data

  gateway-backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - LITELLM_URL=http://litellm:4000
      - LITELLM_API_KEY=${LITELLM_MASTER_KEY}
    depends_on:
      - litellm

  gateway-frontend:
    build: ./web
    ports:
      - "3000:3000"
    environment:
      - API_URL=http://gateway-backend:8000

volumes:
  postgres_data:
```

### 5.2 环境变量

**文件**：`.env`

```bash
# LiteLLM
LITELLM_MASTER_KEY=sk-your-master-key
ZAI_API_KEY=your-zai-api-key
OPENAI_API_KEY=your-openai-api-key

# 数据库
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/litellm

# Gateway
GATEWAY_JWT_SECRET=your-jwt-secret
```

---

## 六、监控和可观测性

### 6.1 成本追踪

```python
import litellm
from litellm import completion

# 配置回调
litellm.success_callback = ["langfuse"]

# 每次调用自动追踪成本
response = completion(
    model="zai/glm-4.7",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(f"成本: ${response._hidden_params.get('response_cost', 0)}")
```

### 6.2 使用统计

```python
# 获取使用统计
from litellm.proxy.proxy_server import get_usage_stats

stats = await get_usage_stats(
    start_date="2026-04-01",
    end_date="2026-04-22"
)

print(f"总调用次数: {stats['total_requests']}")
print(f"总 Token: {stats['total_tokens']}")
print(f"总成本: ${stats['total_cost']}")
```

---

## 七、故障转移和负载均衡

### 7.1 多部署配置

```yaml
model_list:
  - model_name: glm-4.7
    litellm_params:
      model: zai/glm-4.7
      api_key: os.environ/ZAI_API_KEY_1
      rpm: 100
      tpm: 50000
  
  - model_name: glm-4.7
    litellm_params:
      model: zai/glm-4.7
      api_key: os.environ/ZAI_API_KEY_2
      rpm: 100
      tpm: 50000

router_settings:
  routing_strategy: usage-based-routing-v2
  enable_pre_call_checks: true
  retry_after: 1
  num_retries: 3
```

---

## 八、检查清单

- [ ] 安装 `litellm[proxy]`
- [ ] 创建 `litellm_config.yaml` 配置文件
- [ ] 配置环境变量 (API Keys)
- [ ] 实现 FastAPI 路由 (chat.py)
- [ ] 实现 ContextManager
- [ ] 实现 ToolService
- [ ] 创建前端适配器
- [ ] 测试流式响应
- [ ] 测试工具调用
- [ ] 测试 reasoning 展示
- [ ] 配置监控和日志
- [ ] 部署 Docker Compose

---

## 九、参考链接

- [LiteLLM 官方文档](https://docs.litellm.ai)
- [智谱 AI 集成](https://docs.litellm.ai/docs/providers/zai)
- [Responses API](https://docs.litellm.ai/docs/response_api)
- [Proxy Server](https://docs.litellm.ai/docs/simple_proxy)
- [参考文档](../docs/refs/ref_020_litellm_latest.md)
