import { formatForConsole } from './formatter';
import type { LogEntry, LogLevel } from './formatter';
import { collector } from './collector';

export type { LogEntry, LogLevel } from './formatter';
export { formatAsJSON, formatForConsole } from './formatter';

export { collector, LogCollector } from './collector';

export {
  exportForAI,
  copyToClipboard,
  exportAndCopy,
  type ExportForAIOptions,
} from './ai-export';

export type Logger = {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
  withTrace(traceId: string): Logger;
};

function emit(
  module: string,
  level: LogLevel,
  message: string,
  data: unknown | undefined,
  traceId: string | undefined,
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    ...(traceId !== undefined ? { traceId } : {}),
    ...(data !== undefined ? { data } : {}),
    ...(level === 'error' ? { stack: new Error().stack } : {}),
  };
  formatForConsole(entry);
  collector.add(entry);
}

function buildLogger(module: string, traceId?: string): Logger {
  return {
    debug(message, data) {
      emit(module, 'debug', message, data, traceId);
    },
    info(message, data) {
      emit(module, 'info', message, data, traceId);
    },
    warn(message, data) {
      emit(module, 'warn', message, data, traceId);
    },
    error(message, data) {
      emit(module, 'error', message, data, traceId);
    },
    withTrace(id) {
      return buildLogger(module, id);
    },
  };
}

export function createLogger(module: string): Logger {
  return buildLogger(module);
}

export const logger = createLogger('app');
