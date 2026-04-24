import type { LogEntry, LogLevel } from './formatter';

const DEFAULT_CAPACITY = 500;

export class LogCollector {
  private static instance: LogCollector | undefined;
  private readonly buffer: LogEntry[] = [];
  private readonly capacity: number;

  private constructor(capacity: number = DEFAULT_CAPACITY) {
    this.capacity = capacity;
  }

  static getInstance(capacity?: number): LogCollector {
    if (!LogCollector.instance) {
      LogCollector.instance = new LogCollector(capacity);
    }
    return LogCollector.instance;
  }

  add(entry: LogEntry): void {
    if (this.buffer.length >= this.capacity) {
      this.buffer.shift();
    }
    this.buffer.push(entry);
  }

  getAll(): LogEntry[] {
    return [...this.buffer];
  }

  getByLevel(level: LogLevel): LogEntry[] {
    return this.buffer.filter((e) => e.level === level);
  }

  getByModule(module: string): LogEntry[] {
    return this.buffer.filter((e) => e.module === module);
  }

  getByTraceId(traceId: string): LogEntry[] {
    return this.buffer.filter((e) => e.traceId === traceId);
  }

  clear(): void {
    this.buffer.length = 0;
  }
}

export const collector = LogCollector.getInstance();
