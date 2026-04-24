import { agentApi, chatApi } from '@/api/agenthub';
import { PageContainer } from '@/components/PageContainer';
import { MyRuntimeProvider } from '@/components/assistant-ui/my-runtime-provider';
import { Thread } from '@/components/assistant-ui/thread';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Alert, Flex, Spin } from 'antd';

export const Route = createFileRoute('/_auth/chat/$agentId')({
  component: ChatPage,
  staticData: { breadcrumb: '对话' },
});

function ChatPage() {
  const { agentId } = Route.useParams();
  const agentIdNum = Number(agentId);

  const agentQ = useQuery({
    queryKey: ['agent', agentIdNum],
    queryFn: () => agentApi.get(agentIdNum),
    enabled: Number.isFinite(agentIdNum),
  });

  const historyQ = useQuery({
    queryKey: ['messages', agentIdNum],
    queryFn: () => chatApi.listMessages(agentIdNum),
    enabled: Number.isFinite(agentIdNum),
  });

  if (!Number.isFinite(agentIdNum)) {
    return <Alert type="error" title="无效的 Agent ID" />;
  }

  const loading = agentQ.isLoading || historyQ.isLoading;

  return (
    <PageContainer
      title={agentQ.data ? `与「${agentQ.data.name}」对话` : '对话'}
      subtitle={
        agentQ.data ? (
          <span>
            模型：<code>{agentQ.data.model}</code>　·　温度：
            {agentQ.data.temperature}
          </span>
        ) : undefined
      }
    >
      {loading ? (
        <Flex justify="center" align="center" style={{ flex: 1, minHeight: 400 }}>
          <Spin />
        </Flex>
      ) : (
        <Flex vertical style={{ flex: 1, minHeight: 0, height: '100%' }}>
          <MyRuntimeProvider
            key={agentIdNum}
            agentId={agentIdNum}
            history={historyQ.data ?? []}
          >
            <Thread />
          </MyRuntimeProvider>
        </Flex>
      )}
    </PageContainer>
  );
}
