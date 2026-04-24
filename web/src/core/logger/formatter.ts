export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  traceId?: string;
  data?: unknown;
  stack?: string;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '#999',
  info: '#2196F3',
  warn: '#FF9800',
  error: '#F44336',
};

export function formatAsJSON(entry: LogEntry): string {
  return JSON.stringify(entry);
}

export function formatForConsole(entry: LogEntry): void {
  const color = LEVEL_COLORS[entry.level];
  const label = entry.level.toUpperCase();
  console.groupCollapsed(
    `%c${label}%c ${entry.module}%c ${entry.message}`,
    `color: ${color}; font-weight: 600;`,
    'color: #888;',
    'color: inherit;',
  );
  console.log('%ctimestamp', 'font-weight:600', entry.timestamp);
  if (entry.traceId !== undefined) {
    console.log('%ctraceId', 'font-weight:600', entry.traceId);
  }
  if (entry.data !== undefined) {
    console.log('%cdata', 'font-weight:600', entry.data);
  }
  if (entry.stack !== undefined) {
    console.log('%cstack', 'font-weight:600', entry.stack);
  }
  console.groupEnd();
}
