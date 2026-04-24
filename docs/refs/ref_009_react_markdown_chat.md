# ref_009 — Chat 页 Markdown 渲染 + 代码高亮

> 对应任务：A2 Chat 页 UX 增强
> 来源：https://github.com/remarkjs/react-markdown（官方 README）
> 可信度：★★★★★ 官方文档
> 最后访问：2026-04-22

---

## 1. 安装依赖

```bash
cd web
bun add react-markdown remark-gfm rehype-highlight
```

| 包 | 作用 |
|---|---|
| `react-markdown` | React Markdown 渲染组件 |
| `remark-gfm` | GitHub Flavored Markdown（表格、删除线、任务列表） |
| `rehype-highlight` | 代码语法高亮 |

---

## 2. 基础用法

```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {markdownString}
</ReactMarkdown>
```

---

## 3. 代码高亮（rehype-highlight）

```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';  // 主题 CSS

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeHighlight]}
>
  {msg.content}
</ReactMarkdown>
```

### 可选主题

```css
/* highlight.js/styles/ 下有多种主题 */
github.css          /* 浅色 */
github-dark.css     /* 深色 */
atom-one-dark.css   /* 深色，推荐 */
monokai.css
```

---

## 4. 自定义代码块 + 复制按钮

```tsx
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { Button } from 'antd';

function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, '');
  const lang = className?.replace('language-', '') ?? '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: 'relative' }}>
      {lang && (
        <span style={{
          position: 'absolute', top: 4, left: 12,
          fontSize: 12, color: '#999',
        }}>
          {lang}
        </span>
      )}
      <Button
        size="small"
        type="text"
        icon={copied ? <CheckOutlined /> : <CopyOutlined />}
        onClick={handleCopy}
        style={{ position: 'absolute', top: 4, right: 8 }}
      >
        {copied ? '已复制' : '复制'}
      </Button>
      <pre className={className}>
        <code className={className}>{code}</code>
      </pre>
    </div>
  );
}

// 使用
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[rehypeHighlight]}
  components={{
    pre: ({ children }) => <>{children}</>,
    code: ({ children, className }) => {
      const match = /language-(\w+)/.exec(className || '');
      if (match) {
        return <CodeBlock className={className}>{children}</CodeBlock>;
      }
      return <code className={className}>{children}</code>;
    },
  }}
>
  {msg.content}
</ReactMarkdown>
```

---

## 5. 在 MessageBubble 中集成

改造 `web/src/routes/_auth/chat/$agentId.tsx:174-204`：

```tsx
// 替换原来的 {msg.content}
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <Flex gap={8} style={{ marginBottom: 12 }} justify={isUser ? 'flex-end' : 'flex-start'}>
      {!isUser && <Avatar style={{ backgroundColor: '#1677ff' }} icon={<Bot size={16} />} />}
      <div style={{
        maxWidth: '70%',
        padding: '10px 14px',
        borderRadius: 10,
        background: isUser ? '#1677ff' : '#fff',
        color: isUser ? '#fff' : '#111',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
      }}>
        {isUser ? (
          <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              pre: ({ children }) => <>{children}</>,
              code: ({ children, className }) => {
                const match = /language-(\w+)/.exec(className || '');
                return match
                  ? <CodeBlock className={className}>{children}</CodeBlock>
                  : <code className={className}>{children}</code>;
              },
            }}
          >
            {msg.content}
          </ReactMarkdown>
        )}
        {msg.streaming && <span style={{ opacity: 0.5 }}>▌</span>}
      </div>
      {isUser && <Avatar style={{ backgroundColor: '#52c41a' }} icon={<User size={16} />} />}
    </Flex>
  );
}
```

---

## 6. 样式注意事项

| 问题 | 解决 |
|---|---|
| highlight.js 样式冲突 | 用 `@layer` 或 CSS Modules 隔离 |
| 深色主题 | 用 `github-dark.css` 或 `atom-one-dark.css` |
| markdown 表格 | remark-gfm 自动支持，可能需要加 table 样式 |
| 流式渲染闪烁 | rehype-highlight 在流式时可能不完整，可延迟应用 |

### 流式时的处理

```tsx
// 流式中不渲染 markdown，完成后切换
{msg.streaming ? (
  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
) : (
  <ReactMarkdown ...>{msg.content}</ReactMarkdown>
)}
```

---

## 7. Token 用量展示

ChatResponse 已有 `prompt_tokens` / `completion_tokens`，非流式返回时前端可直接展示。流式模式下可在 `[DONE]` 事件中附带 usage：

```python
# 后端 SSE 扩展
yield f"data: {json.dumps({'usage': {'prompt_tokens': ..., 'completion_tokens': ...}})}\n\n"
yield "data: [DONE]\n\n"
```

```tsx
// 前端显示
{usage && (
  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
    {usage.prompt_tokens} + {usage.completion_tokens} tokens
  </Typography.Text>
)}
```
