import {
    logsApi,
    type LogItem,
    type LogLevel,
    type LogQuery,
} from '@/api/agenthub';
import { PageContainer } from '@/components/PageContainer';
import { Pause, Play, RefreshCw, Search } from '@/core/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
    App,
    Button,
    Card,
    Descriptions,
    Drawer,
    Input,
    Segmented,
    Space,
    Statistic,
    Switch,
    Table,
    Tag,
    Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';

export const Route = createFileRoute('/_auth/logs/')({
  component: LogsPage,
  staticData: { breadcrumb: '系统日志' },
});

/** 每个级别的配色 + 背景色，用于 Tag 和行高亮。 */
const LEVEL_COLORS: Record<LogLevel, { color: string; bg?: string }> = {
  DEBUG: { color: 'default' },
  INFO: { color: 'blue' },
  WARNING: { color: 'orange', bg: 'rgba(250, 173, 20, 0.08)' },
  ERROR: { color: 'red', bg: 'rgba(255, 77, 79, 0.08)' },
  CRITICAL: { color: 'magenta', bg: 'rgba(235, 47, 150, 0.12)' },
};

const LEVEL_OPTIONS: { label: string; value: LogLevel | '' }[] = [
  { label: '全部', value: '' },
  { label: 'INFO', value: 'INFO' },
  { label: 'WARN', value: 'WARNING' },
  { label: 'ERROR', value: 'ERROR' },
];

function LogsPage() {
  const qc = useQueryClient();
  const { message } = App.useApp();

  const [level, setLevel] = useState<LogLevel | ''>('');
  const [logger, setLogger] = useState('');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [detail, setDetail] = useState<LogItem | null>(null);

  const query: LogQuery = useMemo(
    () => ({ level: level || undefined, logger: logger || undefined, search: search || undefined, limit: 200 }),
    [level, logger, search],
  );

  const logsQ = useQuery({
    queryKey: ['logs', query],
    queryFn: () => logsApi.list(query),
    refetchInterval: autoRefresh ? 2_000 : false,
    placeholderData: (prev) => prev,
  });

  const statsQ = useQuery({
    queryKey: ['logs-stats'],
    queryFn: () => logsApi.stats(),
    refetchInterval: autoRefresh ? 2_000 : false,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    // query 变化时立即请求一次
    qc.invalidateQueries({ queryKey: ['logs', query] });
  }, [qc, query]);

  const columns: ColumnsType<LogItem> = [
    {
      title: '时间',
      dataIndex: 'ts',
      width: 170,
      render: (v: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {new Date(v).toLocaleString()}
        </span>
      ),
    },
    {
      title: '级别',
      dataIndex: 'level',
      width: 90,
      render: (v: LogLevel) => <Tag color={LEVEL_COLORS[v].color}>{v}</Tag>,
    },
    {
      title: 'Logger',
      dataIndex: 'logger',
      width: 140,
      render: (v: string) => (
        <code style={{ fontSize: 12, color: '#6b7280' }}>{v}</code>
      ),
    },
    {
      title: '消息',
      dataIndex: 'message',
      render: (v: string, r) => (
        <div>
          <div style={{ lineBreak: 'anywhere' }}>{v}</div>
          {r.trace_id && (
            <Typography.Text
              type="secondary"
              style={{ fontSize: 11, fontFamily: 'monospace' }}
            >
              trace={r.trace_id}
              {r.source ? ` · ${r.source}` : ''}
            </Typography.Text>
          )}
        </div>
      ),
    },
    {
      title: '',
      key: 'detail',
      width: 70,
      render: (_, r) => (
        <Button size="small" type="link" onClick={() => setDetail(r)}>
          详情
        </Button>
      ),
    },
  ];

  const stats = statsQ.data;
  const byLevel = stats?.by_level;

  return (
    <PageContainer
      title="系统日志"
      subtitle="实时结构化日志流：应用启动、HTTP 访问、Chat、MCP 工具调用等事件均会落库并在这里展示。默认 2 秒自动刷新。"
      extra={
        <Space>
          <Space size={4}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>自动刷新</span>
            <Switch
              checked={autoRefresh}
              onChange={setAutoRefresh}
              checkedChildren={<Play size={12} />}
              unCheckedChildren={<Pause size={12} />}
            />
          </Space>
          <Button
            icon={<RefreshCw size={16} />}
            onClick={() => {
              qc.invalidateQueries({ queryKey: ['logs'] });
              qc.invalidateQueries({ queryKey: ['logs-stats'] });
              message.success('已刷新');
            }}
          >
            立即刷新
          </Button>
        </Space>
      }
    >
      {/* 级别计数概览 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space size={32} wrap>
          <Statistic title="总计" value={stats?.total ?? '—'} />
          <Statistic
            title="INFO"
            value={byLevel?.INFO ?? 0}
            valueStyle={{ color: '#2563eb' }}
          />
          <Statistic
            title="WARNING"
            value={byLevel?.WARNING ?? 0}
            valueStyle={{ color: '#f59e0b' }}
          />
          <Statistic
            title="ERROR"
            value={byLevel?.ERROR ?? 0}
            valueStyle={{ color: '#ef4444' }}
          />
          <Statistic
            title="CRITICAL"
            value={byLevel?.CRITICAL ?? 0}
            valueStyle={{ color: '#c026d3' }}
          />
        </Space>
      </Card>

      {/* 过滤条 */}
      <Space style={{ marginBottom: 12 }} wrap>
        <Segmented<LogLevel | ''>
          options={LEVEL_OPTIONS}
          value={level}
          onChange={setLevel}
        />
        <Input
          allowClear
          placeholder="logger 前缀，如 app.chat"
          prefix={<code style={{ color: '#9ca3af' }}>logger</code>}
          value={logger}
          onChange={(e) => setLogger(e.target.value)}
          style={{ width: 240 }}
        />
        <Input
          allowClear
          placeholder="搜索 message / trace_id"
          prefix={<Search size={14} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 280 }}
        />
      </Space>

      <Table<LogItem>
        rowKey="id"
        size="small"
        loading={logsQ.isLoading}
        dataSource={(logsQ.data ?? []).slice().reverse() /* 新的在上 */}
        columns={columns}
        pagination={{ pageSize: 50, showSizeChanger: false }}
        onRow={(r) => ({
          style: LEVEL_COLORS[r.level].bg
            ? { background: LEVEL_COLORS[r.level].bg }
            : undefined,
          onClick: () => setDetail(r),
        })}
      />

      <Drawer
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `#${detail.id} · ${detail.level}` : ''}
        width={640}
        destroyOnHidden
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="时间">
              {new Date(detail.ts).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="级别">
              <Tag color={LEVEL_COLORS[detail.level].color}>{detail.level}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Logger">
              <code>{detail.logger}</code>
            </Descriptions.Item>
            <Descriptions.Item label="来源">
              <code>{detail.source ?? '-'}</code>
            </Descriptions.Item>
            <Descriptions.Item label="trace_id">
              <code>{detail.trace_id ?? '-'}</code>
            </Descriptions.Item>
            <Descriptions.Item label="user_id">
              <code>{detail.user_id ?? '-'}</code>
            </Descriptions.Item>
            <Descriptions.Item label="消息">
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {detail.message}
              </pre>
            </Descriptions.Item>
            {detail.extra && Object.keys(detail.extra).length > 0 && (
              <Descriptions.Item label="extra">
                <pre
                  style={{
                    margin: 0,
                    background: 'var(--ant-color-fill-quaternary)',
                    padding: 8,
                    borderRadius: 6,
                    fontSize: 12,
                    overflow: 'auto',
                  }}
                >
                  {JSON.stringify(detail.extra, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
            {detail.exc_text && (
              <Descriptions.Item label="异常堆栈">
                <pre
                  style={{
                    margin: 0,
                    background: 'var(--ant-color-error-bg)',
                    color: 'var(--ant-color-error-text)',
                    padding: 8,
                    borderRadius: 6,
                    fontSize: 12,
                    overflow: 'auto',
                  }}
                >
                  {detail.exc_text}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>
    </PageContainer>
  );
}
