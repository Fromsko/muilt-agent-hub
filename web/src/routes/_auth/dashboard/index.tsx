import { statsApi, type RecentMessageItem } from '@/api/agenthub';
import { MetricCard } from '@/components/MetricCard';
import { PageContainer } from '@/components/PageContainer';
import { SimpleLineChart } from '@/components/SimpleLineChart';
import { Bot, FileText, KeyRound, MessageSquare } from '@/core/icons';
import { staggerContainerVariants, staggerItemVariants } from '@/core/motion';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Card, Col, Empty, Flex, Row, Tag, theme, Typography } from 'antd';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import './index.css';

export const Route = createFileRoute('/_auth/dashboard/')({
  component: DashboardPage,
  staticData: { breadcrumb: '仪表盘' },
});

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return d.toLocaleString();
}

function DashboardPage() {
  const { token } = theme.useToken();

  const statsQ = useQuery({
    queryKey: ['stats'],
    queryFn: () => statsApi.get(),
    refetchOnWindowFocus: true,
  });

  const dailyQ = useQuery({
    queryKey: ['stats', 'daily', 7],
    queryFn: () => statsApi.daily(7),
    refetchOnWindowFocus: true,
  });

  const s = statsQ.data;

  const chartData = useMemo(
    () =>
      (dailyQ.data ?? []).map((d) => ({
        // 只展示月-日，避免 X 轴挤在一起
        label: d.day.slice(5),
        value: d.calls,
      })),
    [dailyQ.data],
  );

  const weekCalls = (dailyQ.data ?? []).reduce((a, b) => a + b.calls, 0);
  const weekTokens = (dailyQ.data ?? []).reduce(
    (a, b) => a + b.prompt_tokens + b.completion_tokens,
    0,
  );
  const weekErrors = (dailyQ.data ?? []).reduce((a, b) => a + b.error_count, 0);
  const metrics = [
    {
      title: '智能体',
      value: s?.agent_count ?? '-',
      icon: Bot,
      tone: 'primary' as const,
      detail: '已创建的 Agent 数量',
    },
    {
      title: '提示词',
      value: s?.prompt_count ?? '-',
      icon: FileText,
      tone: 'success' as const,
      detail: '提示词模板数量',
    },
    {
      title: '模型密钥',
      value: s?.key_count ?? '-',
      icon: KeyRound,
      tone: 'warning' as const,
      detail: '已配置的 API Key',
    },
    {
      title: '对话记录',
      value: s?.message_count ?? '-',
      icon: MessageSquare,
      tone: 'info' as const,
      detail: '累计消息条数（含用户与助手）',
    },
  ];

  return (
    <PageContainer
      title="仪表盘"
      subtitle="查看当前账户下的资源总览与最近对话动态。"
      extra={
        <Typography.Text type="secondary">
          {statsQ.isFetching ? '同步中…' : '最后同步：刚刚'}
        </Typography.Text>
      }
    >
      <motion.div variants={staggerContainerVariants} initial="hidden" animate="visible">
        <Row gutter={[16, 16]}>
          {metrics.map((m) => (
            <Col xs={24} sm={12} md={6} key={m.title}>
              <motion.div variants={staggerItemVariants}>
                <MetricCard
                  title={m.title}
                  value={m.value}
                  icon={<m.icon size={20} />}
                  tone={m.tone}
                  detail={m.detail}
                />
              </motion.div>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={16}>
            <motion.div variants={staggerItemVariants}>
              <Card
                title="最近 7 天调用趋势"
                className="dash-card"
                extra={
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    总 {weekCalls} 次 · {weekTokens} tokens · {weekErrors} 失败
                  </Typography.Text>
                }
              >
                {dailyQ.isLoading ? (
                  <Empty description="加载中…" />
                ) : chartData.some((p) => p.value > 0) ? (
                  <SimpleLineChart
                    data={chartData}
                    color={token.colorPrimary}
                    height={220}
                    suffix=" 次"
                  />
                ) : (
                  <Empty
                    description={
                      <span>
                        最近 7 天还没有调用。<Link to="/agents">去进行一轮对话</Link>吧。
                      </span>
                    }
                  />
                )}
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} lg={8}>
            <motion.div variants={staggerItemVariants}>
              <Card
                title="最近对话"
                className="dash-card"
                extra={
                  <Link to="/agents">
                    <Typography.Text type="secondary">管理智能体 →</Typography.Text>
                  </Link>
                }
              >
                {s && s.recent_messages.length > 0 ? (
                  <Flex vertical gap={10}>
                    {s.recent_messages.map((m: RecentMessageItem) => (
                      <Flex
                        key={m.id}
                        justify="space-between"
                        align="flex-start"
                        gap={12}
                        style={{
                          paddingBottom: 10,
                          borderBottom: '1px solid var(--ant-color-split, #f0f0f0)',
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <Flex align="center" gap={8} style={{ marginBottom: 4 }}>
                            <Tag color={m.role === 'user' ? 'blue' : 'purple'}>
                              {m.role === 'user' ? '用户' : '助手'}
                            </Tag>
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              Agent #{m.agent_id}
                            </Typography.Text>
                          </Flex>
                          <Typography.Paragraph
                            ellipsis={{ rows: 2 }}
                            style={{ margin: 0 }}
                          >
                            {m.content_preview}
                          </Typography.Paragraph>
                        </div>
                        <Typography.Text type="secondary" style={{ flexShrink: 0, fontSize: 12 }}>
                          {formatTime(m.created_at)}
                        </Typography.Text>
                      </Flex>
                    ))}
                  </Flex>
                ) : (
                  <Empty
                    description={
                      <span>
                        还没有对话。<Link to="/agents">创建一个智能体</Link>开始对话吧。
                      </span>
                    }
                  />
                )}
              </Card>
            </motion.div>
          </Col>
        </Row>
      </motion.div>
    </PageContainer>
  );
}
