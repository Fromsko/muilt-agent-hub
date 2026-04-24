# ref_016 — Mermaid 图表语法（论文素材用）

> 对应任务：B4 论文素材
> 来源：
> - https://mermaid.js.org/syntax/entityRelationshipDiagram.html（ER 图）
> - https://mermaid.js.org/syntax/sequenceDiagram.html（时序图）
> - https://mermaid.js.org/syntax/classDiagram.html（类图）
> - https://mermaid.js.org/syntax/flowchart.html（流程图）
> 可信度：★★★★★ 官方文档
> 最后访问：2026-04-22

---

## 1. ER 图（Entity Relationship）

用于论文「数据库设计」章节。

### 1.1 基本语法

```mermaid
erDiagram
    USER ||--o{ PROMPT : owns
    USER ||--o{ KEY : owns
    USER ||--o{ AGENT : owns
    AGENT }o--|| PROMPT : uses
    AGENT }o--|| KEY : uses
    AGENT ||--o{ MESSAGE : has
```

### 1.2 带属性的 ER 图

```mermaid
erDiagram
    USER {
        uuid id PK
        string email
        string hashed_password
        bool is_active
        bool is_superuser
    }
    PROMPT {
        int id PK
        uuid user_id FK
        string name
        text content
        datetime created_at
    }
    KEY {
        int id PK
        uuid user_id FK
        string name
        string provider
        string api_key_encrypted
        string api_base
        datetime created_at
    }
    AGENT {
        int id PK
        uuid user_id FK
        string name
        string description
        int prompt_id FK
        int key_id FK
        string model
        float temperature
        int max_tokens
    }
    MESSAGE {
        int id PK
        int agent_id FK
        string role
        text content
        datetime created_at
    }

    USER ||--o{ PROMPT : owns
    USER ||--o{ KEY : owns
    USER ||--o{ AGENT : owns
    AGENT }o--|| PROMPT : "system prompt"
    AGENT }o--|| KEY : "api key"
    AGENT ||--o{ MESSAGE : has
```

### 1.3 B1 扩展（加 API_TOKEN）

```mermaid
erDiagram
    USER ||--o{ API_TOKEN : issues
    API_TOKEN {
        int id PK
        uuid user_id FK
        string name
        string prefix "ah_"
        string token_hash "SHA-256"
        datetime created_at
        datetime last_used_at
        bool enabled
    }
```

### 1.4 v0.3 扩展（加 TOOL）

```mermaid
erDiagram
    USER ||--o{ TOOL : registers
    AGENT ||--o{ AGENT_TOOL : has
    TOOL ||--o{ AGENT_TOOL : bound_to
    TOOL {
        int id PK
        uuid user_id FK
        string name
        string server_url
        string auth_type
        bool enabled
    }
    AGENT_TOOL {
        int agent_id PK FK
        int tool_id PK FK
    }
```

---

## 2. 时序图（Sequence Diagram）

用于论文「请求流程」「流式对话」章节。

### 2.1 Chat 请求流（当前实现）

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant FastAPI
    participant LiteLLM
    participant LLM

    User->>Frontend: 输入消息
    Frontend->>FastAPI: POST /agents/{id}/chat (stream=true)
    Note over FastAPI: JWT 验证
    Note over FastAPI: 查询 Agent + Prompt + Key
    Note over FastAPI: 解密 Key
    FastAPI->>LiteLLM: acompletion(stream=True)
    LiteLLM->>LLM: API 调用

    loop 流式返回
        LLM-->>LiteLLM: chunk
        LiteLLM-->>FastAPI: delta
        FastAPI-->>Frontend: SSE: data: {"delta": "..."}
        Frontend-->>User: 逐字显示
    end

    LLM-->>LiteLLM: [DONE]
    FastAPI->>FastAPI: 写 messages 表
    FastAPI-->>Frontend: SSE: data: [DONE]
```

### 2.2 B2 MCP 工具调用流（v0.3）

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant AgentHub
    participant LiteLLM
    participant LLM
    participant MCP_Server

    User->>Frontend: "列出 ./data 目录文件"
    Frontend->>AgentHub: POST /agents/{id}/chat
    AgentHub->>MCP_Server: tools/list (发现工具)
    MCP_Server-->>AgentHub: [read_file, list_directory, ...]
    AgentHub->>LiteLLM: acompletion(tools=[...])
    LiteLLM->>LLM: messages + tools

    LLM-->>LiteLLM: tool_call: list_directory(path="./data")
    LiteLLM-->>AgentHub: tool_calls
    AgentHub->>MCP_Server: tools/call list_directory
    MCP_Server-->>AgentHub: ["file1.txt", "file2.txt"]
    AgentHub->>LiteLLM: tool result 继续对话
    LiteLLM->>LLM: messages + tool_result

    LLM-->>LiteLLM: "目录下有 file1.txt 和 file2.txt"
    LiteLLM-->>AgentHub: 最终回复
    AgentHub-->>Frontend: SSE 完整回复
    Frontend-->>User: 显示结果
```

### 2.3 B1 对外 API Token 认证流

```mermaid
sequenceDiagram
    actor External_Client
    participant AgentHub
    participant DB

    External_Client->>AgentHub: POST /public/agents/1/chat<br/>Authorization: Bearer ah_xxx
    AgentHub->>AgentHub: 提取 ah_ 前缀
    AgentHub->>AgentHub: SHA-256(token) → hash
    AgentHub->>DB: SELECT FROM api_tokens<br/>WHERE token_hash = hash AND enabled = true
    DB-->>AgentHub: api_token record
    AgentHub->>AgentHub: 更新 last_used_at
    AgentHub->>DB: SELECT user WHERE id = token.user_id
    DB-->>AgentHub: user
    Note over AgentHub: 后续逻辑与 JWT 认证一致
    AgentHub-->>External_Client: SSE 流式响应
```

---

## 3. 架构图（Flowchart）

### 3.1 系统分层架构

```mermaid
flowchart TB
    subgraph Client["客户端层"]
        WebUI["Web UI (React)"]
        APIClient["外部 API 客户端"]
    end

    subgraph Server["服务端层 (FastAPI)"]
        Auth["认证层 (JWT + API Token)"]
        Router["路由层 (/api/v1)"]
        Service["服务层 (所有权校验)"]
        DB_Layer["数据层 (SQLModel)"]
    end

    subgraph External["外部服务"]
        LiteLLM["LiteLLM (多模型统一层)"]
        OpenAI["OpenAI"]
        Zhipu["智谱 GLM"]
        Ollama["Ollama (本地)"]
        MCP["MCP Server"]
    end

    subgraph Storage["存储"]
        SQLite["SQLite (data/app.db)"]
    end

    WebUI -->|"HTTPS / SSE"| Auth
    APIClient -->|"Bearer ah_xxx"| Auth
    Auth --> Router
    Router --> Service
    Service --> DB_Layer
    DB_Layer --> SQLite
    Service -->|"acompletion"| LiteLLM
    LiteLLM --> OpenAI
    LiteLLM --> Zhipu
    LiteLLM --> Ollama
    Service -->|"tools/list + tools/call"| MCP
```

### 3.2 模块依赖图

```mermaid
flowchart LR
    User["User / Auth"] --> Prompt["Prompt"]
    User --> Key["Key"]
    User --> Tool["Tool (v0.3)"]
    User --> ApiToken["ApiToken (B1)"]
    Prompt --> Agent["Agent"]
    Key --> Agent
    Tool --> Agent
    Agent --> Message["Message"]
    Agent --> CallLog["CallLog (B3)"]
    Agent --> Chat["Chat"]
```

---

## 4. 类图（Class Diagram）

用于论文「类设计」章节。

```mermaid
classDiagram
    class User {
        +UUID id
        +str email
        +str hashed_password
        +bool is_active
        +bool is_superuser
    }

    class Prompt {
        +int id
        +UUID user_id
        +str name
        +str content
        +datetime created_at
    }

    class Key {
        +int id
        +UUID user_id
        +str name
        +str provider
        +str api_key_encrypted
        +str api_base
    }

    class Agent {
        +int id
        +UUID user_id
        +str name
        +int prompt_id
        +int key_id
        +str model
        +float temperature
        +int max_tokens
    }

    class Message {
        +int id
        +int agent_id
        +str role
        +str content
        +datetime created_at
    }

    class ApiToken {
        +int id
        +UUID user_id
        +str name
        +str token_hash
        +bool enabled
    }

    class CallLog {
        +int id
        +UUID user_id
        +int agent_id
        +str model
        +int prompt_tokens
        +int completion_tokens
        +int duration_ms
        +str status
    }

    User "1" --> "0..*" Prompt : owns
    User "1" --> "0..*" Key : owns
    User "1" --> "0..*" Agent : owns
    User "1" --> "0..*" ApiToken : issues
    Agent "1" --> "0..*" Message : has
    Agent "1" --> "0..*" CallLog : logs
    Agent "0..*" --> "1" Prompt : uses
    Agent "0..*" --> "1" Key : uses
```

---

## 5. 导出方式

### 5.1 Mermaid Live Editor

访问 https://mermaid.live/edit → 粘贴代码 → 导出 SVG/PNG/PDF

### 5.2 Mermaid CLI

```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i diagram.mmd -o diagram.svg
mmdc -i diagram.mmd -o diagram.png -w 1200
```

### 5.3 在 Markdown 中渲染

GitHub、VS Code、Typora 原生支持 mermaid 代码块。

### 5.4 draw.io 备选

对于需要更精细控制的架构图，可以用 https://app.diagrams.net（draw.io）：
- 支持导出 SVG/PNG/PDF
- 可以导入 Mermaid 代码
- 模板更丰富

---

## 6. 论文配图清单

| 图号 | 类型 | 内容 | 来源 |
|---|---|---|---|
| 图 3-1 | 架构图 | 系统分层架构 | ref_016 §3.1 |
| 图 3-2 | 模块图 | 模块依赖关系 | ref_016 §3.2 |
| 图 3-3 | ER 图 | 数据库实体关系 | ref_016 §1.2 |
| 图 3-4 | 类图 | 核心类设计 | ref_016 §4 |
| 图 4-1 | 时序图 | Chat 请求流 | ref_016 §2.1 |
| 图 4-2 | 时序图 | MCP 工具调用流 | ref_016 §2.2 |
| 图 4-3 | 时序图 | API Token 认证流 | ref_016 §2.3 |
| 图 5-1 | 流程图 | 前端登录流程 | 待补充 |
| 图 5-2 | 截图 | Swagger UI | 运行后截图 |
| 图 5-3 | 截图 | Dashboard 页面 | 运行后截图 |
