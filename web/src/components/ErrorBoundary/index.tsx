import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Result, Button, Typography, Space } from 'antd';
import { RefreshCw, Copy, Bug } from '@/core/icons';
import { createLogger } from '@/core/logger';
import { exportAndCopy } from '@/core/logger/ai-export';

const log = createLogger('error-boundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null, copied: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    log.error('Uncaught render error', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  private buildErrorReport(): string {
    const { error, errorInfo } = this.state;
    return JSON.stringify(
      {
        type: 'RENDER_ERROR',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        error: {
          name: error?.name,
          message: error?.message,
          stack: error?.stack,
        },
        componentStack: errorInfo?.componentStack,
      },
      null,
      2,
    );
  }

  private handleCopy = async () => {
    const report = this.buildErrorReport();
    await navigator.clipboard.writeText(report);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <Result
          status="error"
          title="页面发生错误"
          subTitle={this.state.error?.message}
          extra={
            <Space>
              <Button icon={<RefreshCw size={14} />} onClick={this.handleReload}>
                刷新页面
              </Button>
              <Button
                icon={<Copy size={14} />}
                onClick={() => void this.handleCopy()}
                type={this.state.copied ? 'primary' : 'default'}
              >
                {this.state.copied ? '已复制' : '复制错误信息'}
              </Button>
              <Button icon={<Bug size={14} />} onClick={() => void exportAndCopy()}>
                导出完整日志
              </Button>
            </Space>
          }
        >
          <Typography.Paragraph
            type="secondary"
            style={{
              maxHeight: 200,
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: 12,
              whiteSpace: 'pre-wrap',
            }}
          >
            {this.state.error?.stack}
          </Typography.Paragraph>
        </Result>
      );
    }
    return this.props.children;
  }
}
