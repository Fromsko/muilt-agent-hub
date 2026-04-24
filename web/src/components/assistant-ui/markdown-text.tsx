/**
 * assistant-ui 的 Text part 组件 —— 用 react-markdown 渲染流式文本。
 *
 * 注意：props 由 assistant-ui 注入，包含 `{ text, status, type }`。
 * 流式过程中 text 会被不断刷新，react-markdown 会逐步重渲染。
 */
import type { FC } from 'react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { App, Button } from 'antd';
import { Check, Copy } from '@/core/icons';
import type { TextMessagePartComponent } from '@assistant-ui/react';

import 'highlight.js/styles/github.css';

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    return extractText(
      (node as { props: { children?: React.ReactNode } }).props.children,
    );
  }
  return '';
}

const CodeBlock: FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  const { message } = App.useApp();
  const [copied, setCopied] = useState(false);
  const code = extractText(children).replace(/\n$/, '');
  const lang = className?.replace('language-', '') ?? '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      message.error('剪贴板不可用');
    }
  };

  return (
    <div style={{ position: 'relative', margin: '12px 0' }}>
      {lang && (
        <span
          style={{
            position: 'absolute',
            top: 6,
            left: 12,
            fontSize: 11,
            color: '#9ca3af',
            fontFamily: 'monospace',
            userSelect: 'none',
          }}
        >
          {lang}
        </span>
      )}
      <Button
        size="small"
        icon={copied ? <Check size={14} /> : <Copy size={14} />}
        onClick={handleCopy}
        style={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}
      >
        {copied ? '已复制' : '复制'}
      </Button>
      <pre
        style={{
          borderRadius: 8,
          background: '#0b1020',
          color: '#e5e7eb',
          padding: '28px 16px 12px',
          overflowX: 'auto',
          margin: 0,
        }}
      >
        <code className={className}>{code}</code>
      </pre>
    </div>
  );
};

export const MarkdownText: TextMessagePartComponent = ({ text }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        pre: ({ children }) => <>{children}</>,
        code: ({ children, className }) => {
          const isBlock = /language-/.test(className ?? '');
          return isBlock ? (
            <CodeBlock className={className}>{children}</CodeBlock>
          ) : (
            <code
              style={{
                padding: '1px 6px',
                background: 'rgba(0,0,0,0.06)',
                borderRadius: 4,
                fontSize: '0.92em',
              }}
            >
              {children}
            </code>
          );
        },
        p: ({ children }) => <p style={{ margin: '4px 0' }}>{children}</p>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
};
