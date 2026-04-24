/**
 * assistant-ui Thread 容器：消息列表 + Composer（输入/发送/停止）。
 *
 * 设计原则：
 * - 样式走 Ant Design（Avatar/Button/Flex），避免引入 Tailwind 独立类，和现有风格对齐。
 * - Text part 用 `MarkdownText` 渲染，支持代码高亮与复制。
 * - Reasoning 预留组件位（当前后端还没推送 reasoning 事件），后续 B2 可直接点亮。
 */
import { Bot, Send, Square, User as UserIcon } from '@/core/icons';
import {
    AuiIf,
    ComposerPrimitive,
    MessagePrimitive,
    ThreadPrimitive,
} from '@assistant-ui/react';
import { Avatar, Button, Flex, Typography } from 'antd';
import type { FC } from 'react';

import { MarkdownText } from './markdown-text';

const UserMessage: FC = () => (
  <MessagePrimitive.Root>
    <Flex justify="flex-end" gap={10} style={{ margin: '10px 0' }}>
      <div
        style={{
          maxWidth: '78%',
          padding: '10px 14px',
          borderRadius: 12,
          background: '#1677ff',
          color: '#fff',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        <MessagePrimitive.Content components={{ Text: MarkdownText }} />
      </div>
      <Avatar
        style={{ backgroundColor: '#52c41a', flexShrink: 0 }}
        icon={<UserIcon size={16} />}
      />
    </Flex>
  </MessagePrimitive.Root>
);

const AssistantMessage: FC = () => (
  <MessagePrimitive.Root>
    <Flex gap={10} style={{ margin: '10px 0' }}>
      <Avatar
        style={{ backgroundColor: '#1677ff', flexShrink: 0 }}
        icon={<Bot size={16} />}
      />
      <div
        style={{
          maxWidth: '78%',
          padding: '10px 14px',
          borderRadius: 12,
          background: '#fff',
          border: '1px solid #f0f0f0',
          color: '#1f1f1f',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
        }}
      >
        <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
      </div>
    </Flex>
  </MessagePrimitive.Root>
);

const Composer: FC = () => (
  <ComposerPrimitive.Root>
    <Flex gap={8} align="flex-end">
      <ComposerPrimitive.Input
        placeholder="输入消息，Enter 发送，Shift+Enter 换行"
        minRows={2}
        maxRows={6}
        submitMode="enter"
        style={{
          flex: 1,
          resize: 'none',
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid #d9d9d9',
          fontFamily: 'inherit',
          fontSize: 14,
          outline: 'none',
          lineHeight: 1.6,
        }}
      />

      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <Button type="primary" icon={<Send size={16} />}>
            发送
          </Button>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button danger icon={<Square size={16} />}>
            停止
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </Flex>
  </ComposerPrimitive.Root>
);

const ThreadWelcome: FC = () => (
  <Flex
    vertical
    align="center"
    justify="center"
    style={{ height: '100%', color: '#999', padding: '40px 0' }}
  >
    <Bot size={48} />
    <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
      还没有对话。在下方输入框开始第一句话吧。
    </Typography.Paragraph>
  </Flex>
);

export const Thread: FC = () => (
  <ThreadPrimitive.Root
    style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
  >
    <ThreadPrimitive.Viewport
      autoScroll
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        background: '#fafafa',
        borderRadius: 8,
        padding: '12px 16px',
      }}
    >
      <ThreadPrimitive.Empty>
        <ThreadWelcome />
      </ThreadPrimitive.Empty>

      <ThreadPrimitive.Messages
        components={{
          UserMessage,
          AssistantMessage,
          SystemMessage: () => null,
        }}
      />
    </ThreadPrimitive.Viewport>

    <div style={{ paddingTop: 12 }}>
      <Composer />
    </div>
  </ThreadPrimitive.Root>
);
