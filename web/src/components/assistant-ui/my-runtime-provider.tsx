/**
 * assistant-ui LocalRuntime 提供者 —— 把 Agent 对应的历史消息种入 Thread，
 * 并绑定 `gatewayModelAdapter` 作为 chatModel。
 */
import type { FC, ReactNode } from 'react';
import { useMemo } from 'react';
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ThreadMessageLike,
} from '@assistant-ui/react';

import { makeGatewayModelAdapter } from '@/adapters/gateway-model-adapter';
import type { Message } from '@/api/agenthub';
import { useAuthStore } from '@/stores/auth';

interface Props {
  agentId: number;
  history: readonly Message[];
  children: ReactNode;
  /** 透传给后端的滑动窗口轮数，默认 20 */
  maxTurns?: number;
}

function toInitialMessages(
  history: readonly Message[],
): readonly ThreadMessageLike[] {
  // 后端是按 id desc 返回的，做一次升序排再喂给 assistant-ui
  const sorted = [...history].sort((a, b) => a.id - b.id);
  return sorted
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      id: `h-${m.id}`,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      createdAt: m.created_at ? new Date(m.created_at) : undefined,
    }));
}

export const MyRuntimeProvider: FC<Props> = ({
  agentId,
  history,
  children,
  maxTurns,
}) => {
  // 用 factory 包一层，保证 agentId 切换时 adapter 重建
  const adapter = useMemo(
    () =>
      makeGatewayModelAdapter({
        agentId,
        getToken: () => useAuthStore.getState().tokens?.accessToken ?? '',
        maxTurns,
      }),
    [agentId, maxTurns],
  );

  // initialMessages 只在首渲染被读取，所以 history 异步到达后 key 切换保证 remount
  const initialMessages = useMemo(() => toInitialMessages(history), [history]);

  const runtime = useLocalRuntime(adapter, { initialMessages });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};
