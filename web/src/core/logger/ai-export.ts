import type { LogEntry, LogLevel } from './formatter';
import { formatAsJSON } from './formatter';
import { collector } from './collector';

export type ExportForAIOptions = {
  level?: LogLevel;
  module?: string;
  traceId?: string;
  last?: number;
};

function selectEntries(options?: ExportForAIOptions): LogEntry[] {
  let entries = collector.getAll();
  if (options?.level !== undefined) {
    entries = entries.filter((e) => e.level === options.level);
  }
  if (options?.module !== undefined) {
    entries = entries.filter((e) => e.module === options.module);
  }
  if (options?.traceId !== undefined) {
    entries = entries.filter((e) => e.traceId === options.traceId);
  }
  if (options?.last !== undefined && options.last > 0) {
    entries = entries.slice(-options.last);
  }
  return entries;
}

function systemSummary(): string {
  const url =
    typeof globalThis !== 'undefined' && 'location' in globalThis
      ? String((globalThis as unknown as { location?: { href?: string } }).location?.href ?? '')
      : '';
  const ua =
    typeof globalThis !== 'undefined' && 'navigator' in globalThis
      ? String((globalThis as unknown as { navigator?: { userAgent?: string } }).navigator?.userAgent ?? '')
      : '';
  const time = new Date().toISOString();
  return [
    '[System]',
    `url: ${url || '(n/a)'}`,
    `userAgent: ${ua || '(n/a)'}`,
    `exportedAt: ${time}`,
    '',
  ].join('\n');
}

function errorSummary(entries: LogEntry[]): string {
  const errors = entries.filter((e) => e.level === 'error');
  if (errors.length === 0) {
    return '';
  }
  const lines = errors.map((e, i) => {
    const parts = [
      `${i + 1}. [${e.timestamp}] ${e.module} — ${e.message}`,
    ];
    if (e.stack) {
      parts.push(`   stack: ${e.stack.split('\n').join('\n   ')}`);
    }
    return parts.join('\n');
  });
  return ['[Error summary]', `count: ${errors.length}`, ...lines, ''].join('\n');
}

export function exportForAI(options?: ExportForAIOptions): string {
  const entries = selectEntries(options);
  const jsonLines = entries.map((e) => formatAsJSON(e));
  const logsBlock = `[\n${jsonLines.join(',\n')}\n]`;
  const summary = errorSummary(entries);
  return [systemSummary(), '[Logs]', logsBlock, '', summary].join('\n').trimEnd() + '\n';
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    const nav = (globalThis as unknown as { navigator?: Navigator }).navigator;
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(text);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function exportAndCopy(options?: ExportForAIOptions): Promise<boolean> {
  return copyToClipboard(exportForAI(options));
}
