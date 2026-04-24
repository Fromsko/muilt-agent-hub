import { Avatar, Button, Flex } from 'antd';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/github.css';

import { Bot, Check, Copy, User } from '@/core/icons';

export interface ChatMessageModel {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

function extractTextFromNode(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromNode).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    return extractTextFromNode((node as { props: { children?: React.ReactNode } }).props.children);
  }
  return '';
}

function CodeBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const code = extractTextFromNode(children).replace(/\n$/, '');
  const lang = className?.replace('language-', '') ?? '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div style={{ position: 'relative', margin: '8px 0' }}>
      {lang && (
        <span
          style={{
            position: 'absolute',
            top: 6,
            left: 12,
            fontSize: 11,
            color: '#999',
            fontFamily: 'monospace',
            zIndex: 1,
            userSelect: 'none',
          }}
        >
          {lang}
        </span>
      )}
      <Button
        size="small"
        type="text"
        icon={copied ? <Check size={14} /> : <Copy size={14} />}
        onClick={handleCopy}
        style={{ position: 'absolute', top: 4, right: 6, zIndex: 1 }}
      >
        {copied ? '已复制' : '复制'}
      </Button>
      <pre className={className} style={{ margin: 0 }}>
        <code className={className}>{code}</code>
      </pre>
    </div>
  );
}

export function ChatMessage({ msg }: { msg: ChatMessageModel }) {
  const isUser = msg.role === 'user';
  const bubbleBg = isUser ? '#1677ff' : '#ffffff';
  const bubbleColor = isUser ? '#ffffff' : '#111111';

  return (
    <Flex
      gap={8}
      style={{ marginBottom: 12 }}
      justify={isUser ? 'flex-end' : 'flex-start'}
    >
      {!isUser && (
        <Avatar style={{ backgroundColor: '#1677ff', flexShrink: 0 }} icon={<Bot size={16} />} />
      )}
      <div
        className={isUser ? 'chat-bubble chat-bubble-user' : 'chat-bubble chat-bubble-assistant'}
        style={{
          maxWidth: '78%',
          padding: '10px 14px',
          borderRadius: 10,
          background: bubbleBg,
          color: bubbleColor,
          wordBreak: 'break-word',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        }}
      >
        {isUser || msg.streaming ? (
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {msg.content}
            {msg.streaming && <span style={{ opacity: 0.5 }}>▌</span>}
          </div>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              pre: ({ children }) => <>{children}</>,
              code: ({ children, className }) => {
                const match = /language-(\w+)/.exec(className ?? '');
                return match ? (
                  <CodeBlock className={className}>{children}</CodeBlock>
                ) : (
                  <code className={className}>{children}</code>
                );
              },
              a: ({ children, href }) => (
                <a href={href} target="_blank" rel="noreferrer noopener">
                  {children}
                </a>
              ),
            }}
          >
            {msg.content || ' '}
          </ReactMarkdown>
        )}
      </div>
      {isUser && (
        <Avatar style={{ backgroundColor: '#52c41a', flexShrink: 0 }} icon={<User size={16} />} />
      )}
    </Flex>
  );
}
