/**
 * 把现有后端 SSE 流（`chatApi.stream`）桥接成 assistant-ui 的 `ChatModelAdapter`。
 *
 * assistant-ui 的 LocalRuntime 通过 `run({ messages, abortSignal })` 拿到整条历史，
 * 但我们后端是「服务端保存历史 + 客户端只传最新 user 消息」的模式，
 * 所以这里只取最后一条 user part 发出去，后端会用 `_get_recent_messages` 组好上下文。
 */
import type { ChatModelAdapter } from '@assistant-ui/react';
import { chatApi } from '@/api/agenthub';

export interface GatewayAdapterOptions {
  agentId: number;
  /** 获取 JWT access token 的函数（在每次 run 时求值，避免闭包里拿到旧 token） */
  getToken: () => string;
  /** 滑动窗口轮数，透传给后端 */
  maxTurns?: number;
}

export function makeGatewayModelAdapter(
  opts: GatewayAdapterOptions,
): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal }) {
      const token = opts.getToken();
      if (!token) {
        throw new Error('尚未登录：缺少访问令牌');
      }

      // 取最后一条用户消息；assistant-ui 在 append 之后会把新消息带进来
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      if (!lastUser) {
        throw new Error('没有可发送的用户消息');
      }

      // content 是 part 数组，拼接所有 text part（目前后端只支持纯文本）
      const userText = lastUser.content
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('\n')
        .trim();

      if (!userText) {
        throw new Error('用户消息为空');
      }

      let acc = '';
      for await (const delta of chatApi.stream(opts.agentId, userText, token, {
        signal: abortSignal,
        ...(opts.maxTurns !== undefined ? { maxTurns: opts.maxTurns } : {}),
      })) {
        acc += delta;
        yield {
          content: [{ type: 'text', text: acc }],
        };
      }
    },
  };
}
